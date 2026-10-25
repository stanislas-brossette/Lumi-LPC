#!/usr/bin/env python3
"""Generate Lumi's offline LPC sound bank; no neural model runs in the app.

Requires piper-tts[alignment]==1.8.0. See voices/README.md for model provenance.
Usage: python scripts/generate-key-voice.py --model /path/fr_FR-siwis-medium.onnx
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import wave

import numpy as np
import onnxruntime as ort
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[1]


def apply_reviewed_consonants(output):
    """Reapply the checked-in, individually reviewed cuts without new synthesis."""
    review = json.loads((ROOT / 'voices/consonant-audit.json').read_text())
    fixture_path = ROOT / 'tests/fixtures/voice-stops-before.wav'
    fixture_meta = json.loads(fixture_path.with_suffix('.json').read_text())
    if hashlib.sha256(fixture_path.read_bytes()).hexdigest() != review['fixtureAudioSha256']:
        raise ValueError('Review fixture fingerprint mismatch')
    manifest = json.loads((output / 'manifest.json').read_text())
    path = output / manifest['audio']
    previous_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    with wave.open(str(path)) as wav:
        rate = wav.getframerate()
        original = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2')
    with wave.open(str(fixture_path)) as wav:
        if wav.getframerate() != rate:
            raise ValueError('Review sample rate mismatch')
        fixture = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2')
    patches = {r['ipa']: r for r in review['units'] if r['status'] == 'replaced'}
    pieces, cursor = [], 0
    for ipa, entry in manifest['keys'].items():
        if ipa in patches:
            reviewed = fixture_meta['keys']['pass-after-' + ipa]
            pcm = fixture[reviewed['start']:reviewed['start'] + reviewed['length']]
            entry.update(patches[ipa]['metadata'], length=len(pcm), end=len(pcm) / rate, vowel=None)
        else:
            pcm = original[entry['start']:entry['start'] + entry['length']]
        entry['start'] = cursor
        pieces.append(pcm)
        cursor += len(pcm)
    with wave.open(str(path), 'wb') as wav:
        wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        wav.writeframes(np.concatenate(pieces).astype('<i2').tobytes())
    manifest.update(audioSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                    consonantRepairBaseSha256=previous_hash,
                    consonantReviewSha256=hashlib.sha256((ROOT / 'voices/consonant-audit.json').read_bytes()).hexdigest())
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(patches)} reviewed consonants applied; every other PCM preserved')


def generate(model, output, audit_dir=None, repair_existing=False, repair_keys=None):
    ort.set_seed(42)
    voice = PiperVoice.load(model, include_alignments=True)
    voice.session.disable_fallback()
    rate = voice.config.sample_rate
    config = SynthesisConfig(length_scale=1.1, noise_scale=0.667, noise_w_scale=0.8)
    keys = json.loads(subprocess.check_output(['node', 'scripts/key-inventory.mjs'], cwd=ROOT))
    previous, previous_audio, base_hash = None, None, None
    if repair_existing or repair_keys:
        previous = json.loads((output / 'manifest.json').read_text())
        source_path = output / previous['audio']
        base_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
        with wave.open(str(source_path)) as wav:
            if wav.getframerate() != rate or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
                raise ValueError('Incompatible source bank')
            previous_audio = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2')
    entries, atlas, cursor = {}, [], 0
    selected = set(repair_keys or [k['ipa'] for k in keys if (k['c'] in {'p', 'b', 't', 'd', 'k', 'g'} and not k['v']) or k['ipa'] == 'to'])
    if selected - {k['ipa'] for k in keys}:
        raise ValueError('Unknown repair keys')
    for key in keys:
        c, v = key['c'], key['v']
        contextual = (c in {'p', 'b', 't', 'd', 'k', 'g'} and not v) or key['ipa'] in {'to', 'pa', 'y'}
        if previous is not None and key['ipa'] not in selected:
            entry = previous['keys'][key['ipa']].copy()
            pcm = previous_audio[entry['start']:entry['start'] + entry['length']].copy()
            entry.update(start=cursor)
            entries[key['ipa']] = entry
            atlas.append(pcm)
            cursor += len(pcm)
            continue
        # French eSpeak (used to train this model) spells the voiced velar stop ɡ.
        consonant = 'ɡ' if c == 'g' else c or ''
        # Single phones are outside the training distribution of a sentence TTS.
        # Give the model a French carrier, then retain only the target unit.
        # /to/ also needs sentence context: its isolated synthesis is unstable.
        carrier = ('ʒə dˈi ' if v else 'ʒə dˈi a') if contextual else ''
        unit = consonant + ('ˈ' + v if v else '')
        suffix = (' .' if v else 'ˈa .') if contextual else ''
        prefix = carrier + consonant + ('ˈ' if v else '')
        phonemes = list(carrier + unit + suffix)
        for p in phonemes:
            if p not in voice.config.phoneme_id_map:
                raise ValueError(f'Unmapped phoneme: {p}')
        ids = voice.phonemes_to_ids(phonemes)
        unit_config = SynthesisConfig(length_scale=2.0, noise_scale=0.667, noise_w_scale=0.8) if key['ipa'] == 'y' else config
        samples, durations = voice.phoneme_ids_to_audio(ids, unit_config, include_alignments=True)
        if durations is None or len(durations) != len(ids) or sum(durations) != len(samples):
            raise ValueError(f'Missing or inconsistent model alignment for {key["ipa"]}')
        def id_index(phones):
            return len(voice.config.phoneme_id_map['^']) + len(voice.config.phoneme_id_map['_']) + sum(
                len(voice.config.phoneme_id_map[p]) + len(voice.config.phoneme_id_map['_']) for p in phones)
        target_start = int(sum(durations[:id_index(carrier)])) if contextual else 0
        target_end = int(sum(durations[:id_index(carrier + unit)])) if contextual else len(samples)
        # Stops need a small release transition to remain distinguishable.
        release = round(0.015 * rate) if contextual and not v else 0
        # /pa/: the model's nominal start falls after the closure/release.
        # Keep 100 ms of pre-roll so the /p/ is not cut into a bare vowel.
        start = max(0, target_start - round((0.100 if key['ipa'] == 'pa' else 0.008) * rate))
        end = min(len(samples), target_end + release)
        if key['ipa'] == 'y':
            # A sustained contextual /y/ avoids the spurious /v/ onset of the
            # isolated synthesis. Alignment is late here: retain the vowel
            # onset 60 ms before it and remove the last 25 ms of vocal fry.
            start = max(0, target_start - round(0.060 * rate))
            end = target_end - round(0.025 * rate)
        # Trim only outside the extracted unit, leaving 12 ms around audible data.
        # The low threshold preserves weak fricatives and plosive releases.
        active = np.flatnonzero(np.abs(samples[start:end]) > 0.001)
        if len(active) == 0:
            raise ValueError(f'Silent key: {key["ipa"]}')
        end = min(end, start + int(active[-1]) + round(0.012 * rate) + 1)
        if key['ipa'] != 'pa':
            start = max(start, start + int(active[0]) - round(0.012 * rate))
        vowel = None
        if c and v:
            # ids: BOS, PAD, then each codepoint's ids followed by PAD, EOS.
            index = id_index(prefix)
            vowel = (int(sum(durations[:index])) - start) / rate
            if key['ipa'] == 'pa':
                # After the preserved closure, use the measured energy rise for
                # mouth opening instead of the late stress-token boundary.
                window = round(0.005 * rate)
                energy = np.array([np.sqrt(np.mean(samples[t:t+window] ** 2)) for t in range(start, end-window, window)])
                threshold = float(energy.max()) * 0.12
                voiced = np.flatnonzero(energy > threshold)
                if len(voiced): vowel = int(voiced[0]) * window / rate
            if not 0 < vowel < (end - start) / rate:
                raise ValueError(f'Vowel outside clip: {key["ipa"]}')
        clip = samples[start:end].copy()
        # Moderate normalization; do not amplify near-silence into a loud buzz.
        peak = float(np.max(np.abs(clip)))
        clip *= min(2.0, 0.85 / peak)
        fade = min(round(0.003 * rate), len(clip) // 2)
        clip[:fade] *= np.linspace(0, 1, fade)
        clip[-fade:] *= np.linspace(1, 0, fade)
        pcm = np.clip(clip * 32767, -32767, 32767).astype('<i2')
        atlas.append(pcm)
        entries[key['ipa']] = {'start': cursor, 'length': len(pcm), 'vowel': vowel, 'end': len(pcm) / rate,
                               'source': 'carrier' if contextual else 'isolated', 'phonemes': ''.join(phonemes),
                               'sourceStart': start, 'sourceEnd': end}
        if key['ipa'] == 'y':
            entries[key['ipa']]['lengthScale'] = 2.0
            entries[key['ipa']]['cropMethod'] = '60 ms pre-roll and 25 ms tail trim'
        if key['ipa'] == 'pa':
            entries[key['ipa']]['vowelMethod'] = 'energy rise after preserved closure'
        if audit_dir:
            audit_dir.mkdir(parents=True, exist_ok=True)
            with wave.open(str(audit_dir / f'{len(entries):03}.wav'), 'wb') as wav:
                wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
                wav.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
        cursor += len(pcm)
        if len(entries) % 50 == 0:
            print(f'{len(entries)}/{len(keys)} keys', flush=True)
    output.mkdir(parents=True, exist_ok=True)
    audio_path = output / 'siwis-keys.wav'
    with wave.open(str(audio_path), 'wb') as wav:
        wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        wav.writeframes(np.concatenate(atlas).tobytes())
    manifest = {
        'version': 1, 'name': 'Piper · Siwis', 'sampleRate': rate,
        'audio': audio_path.name, 'audioSha256': hashlib.sha256(audio_path.read_bytes()).hexdigest(),
        'modelSha256': hashlib.sha256(model.read_bytes()).hexdigest(),
        'generator': 'piper-tts 1.8.0', 'seed': 42,
        'lengthScale': 1.1, 'noiseScale': 0.667, 'noiseWScale': 0.8,
        'alignment': 'Piper model durations with targeted carrier extraction; /y/ boundaries adjusted against contextual audio',
        'method': 'Isolated units with targeted contextual repairs v4',
        'repairBaseSha256': base_hash,
        'keys': entries,
    }
    if previous is not None: manifest = {**previous, **manifest}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(entries)} keys, {cursor / rate:.1f} s, {audio_path.stat().st_size / 1e6:.2f} MB')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'voices')
    parser.add_argument('--audit-dir', type=Path)
    parser.add_argument('--repair-existing', action='store_true', help='Preserve every other clip byte for byte')
    parser.add_argument('--repair-key', action='append', help='Regenerate only this key in an existing bank (repeatable)')
    parser.add_argument('--apply-reviewed-consonants', action='store_true', help='Reapply the archived consonant cuts exactly, without synthesis')
    args = parser.parse_args()
    if args.apply_reviewed_consonants:
        apply_reviewed_consonants(args.output)
    else:
        if args.model is None:
            parser.error('--model is required for synthesis')
        generate(args.model, args.output, args.audit_dir, args.repair_existing, args.repair_key)

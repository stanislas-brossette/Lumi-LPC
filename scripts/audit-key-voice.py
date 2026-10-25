#!/usr/bin/env python3
"""Independent phoneme-recognition screen, not a pedagogical certification.

Optional development dependencies: torch (CPU), transformers, scipy.
The model and generated phrases are processed locally; nothing is uploaded.
"""
import argparse
import hashlib
import itertools
import json
from pathlib import Path
import unicodedata
import wave

import numpy as np
from scipy.signal import resample_poly
import torch
from transformers import Wav2Vec2ForCTC


def normalize(phones):
    return unicodedata.normalize('NFD', phones).replace('g', 'ɡ').replace(' ', '').replace('ː', '').replace('ˈ', '').replace('ˌ', '')


def audit(bank, model_path, output):
    torch.set_num_threads(4)
    model = Wav2Vec2ForCTC.from_pretrained(model_path, local_files_only=True).eval()
    vocab = json.loads((model_path / 'vocab.json').read_text())
    labels = {index: phone for phone, index in vocab.items()}
    blank = model.config.pad_token_id
    manifest = json.loads((bank / 'manifest.json').read_text())
    path = bank / manifest['audio']
    with wave.open(str(path)) as wav:
        rate = wav.getframerate()
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float32) / 32768
    rows = []
    with torch.inference_mode():
        for ipa, entry in manifest['keys'].items():
            clip = samples[entry['start']:entry['start'] + entry['length']]
            signal = resample_poly(clip, 320, 441) if rate == 22050 else resample_poly(clip, 16000, rate)
            # Same 100 ms margins for every unit. Normalize as the model's processor.
            signal = np.pad(signal, (1600, 1600))
            signal = (signal - signal.mean()) / np.sqrt(signal.var() + 1e-7)
            logits = model(torch.tensor(signal[None, :], dtype=torch.float32)).logits[0]
            ids = logits.argmax(-1).tolist()
            decoded = [labels[index] for index, _ in itertools.groupby(ids) if index != blank]
            recognized = ' '.join(decoded)
            rows.append({'ipa': ipa, 'recognized': recognized, 'matches': normalize(ipa) == normalize(recognized)})
            if len(rows) % 50 == 0:
                print(f'{len(rows)}/{len(manifest["keys"])} units', flush=True)
    report = {
        'method': 'Independent CTC phoneme recognition, greedy decoding of each isolated unit',
        'model': 'facebook/wav2vec2-xlsr-53-espeak-cv-ft',
        'revision': '2c733782da5604684829819a5eb744c193fe9398',
        'audioSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'limitation': 'A mismatch is a listening-review flag; a match is not human validation. Very short sounds and nasal vowels are difficult for this recognizer.',
        'units': rows,
    }
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    mismatches = [r for r in rows if not r['matches']]
    print(f'{len(rows)} units screened; {len(mismatches)} listening-review flags.')
    print(json.dumps(mismatches, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bank', type=Path, default=Path('voices'))
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    audit(args.bank, args.model, args.output)

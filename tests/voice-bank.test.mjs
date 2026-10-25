import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { encodeWav, createEspeak } from '@spelling-creator/spellophone';
import { inventory } from '../scripts/key-inventory.mjs';
import { readVoiceBank, synthesizeKeysWithBank, synthesizeKeys, keyAtTime } from '../speech-sync.mjs';

const manifest = JSON.parse(readFileSync('voices/manifest.json'));
const wav = readFileSync('voices/siwis-keys.wav');
const buffer = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength);
const bank = readVoiceBank(manifest, buffer);
const pcm = wav => new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);

test('neural bank covers every LPC sound and CV without extra or missing units', () => {
  assert.equal(inventory.length, 329);
  assert.deepEqual(Object.keys(manifest.keys).sort(), inventory.map(k => k.ipa).sort());
  assert.equal(createHash('sha256').update(wav).digest('hex'), manifest.audioSha256);
  assert.equal(bank.sampleRate, 22050);
  let cursor = 0;
  for (const key of inventory) {
    const entry = manifest.keys[key.ipa];
    assert.equal(entry.start, cursor);
    const clip = bank.samples.subarray(entry.start, entry.start + entry.length);
    assert.ok(clip.some(s => Math.abs(s) > 100), key.ipa + ' must be audible');
    assert.ok(clip.every(s => Math.abs(s) < 32767), key.ipa + ' must not clip');
    assert.ok(entry.end > 0.03 && entry.end < 2, key.ipa + ' duration');
    if (key.c && key.v) assert.ok(entry.vowel > 0 && entry.vowel < entry.end, key.ipa + ' onset');
    else assert.equal(entry.vowel, null);
    cursor += entry.length;
  }
  assert.equal(cursor, bank.samples.length);
});

test('neural montage keeps the exact keys, repeats, clock, vowel marks and isolated replays', () => {
  const byIpa = Object.fromEntries(inventory.map(k => [k.ipa, k]));
  const keys = ['pa', 'pa', 'bɔ̃', 'ʒu', 'ʁ', 'ɥi', 'œ̃', 'ŋ'].map(s => byIpa[s]);
  const packet = synthesizeKeysWithBank(keys, bank, encodeWav);
  assert.equal(packet.keys, keys);
  assert.equal(packet.voice, 'Piper · Siwis');
  assert.equal(packet.warning, '');
  assert.equal(packet.clips.length, keys.length);
  assert.ok(packet.slotDuration >= 1.2);
  assert.deepEqual(packet.clips[0], packet.clips[1]);
  for (const [i, key] of keys.entries()) {
    assert.ok(Math.abs(packet.times[i] - i * packet.slotDuration) < 1 / bank.sampleRate);
    assert.equal(keyAtTime(packet.times, packet.times[i]), i);
    const entry = manifest.keys[key.ipa];
    assert.deepEqual(packet.marks[i], { vowel: entry.vowel, end: entry.end });
    const clip = pcm(packet.clips[i]);
    const lead = Math.round(packet.soundOffset * bank.sampleRate);
    assert.ok(clip.subarray(0, lead).every(s => s === 0), 'hand transition precedes sound');
    assert.ok(clip.subarray(lead + entry.length).every(s => s === 0), 'observation follows sound');
    assert.ok(clip.subarray(lead, lead + entry.length).some(s => Math.abs(s) > 100));
    assert.equal(clip.length, pcm(packet.wav).length / keys.length);
  }
});

test('isolated stops retain a short release burst instead of a sustained fricative-like sound', () => {
  const rms = x => Math.sqrt(x.reduce((sum, s) => sum + s * s, 0) / x.length);
  for (const ipa of ['p', 'b', 't', 'd', 'k', 'g']) {
    const entry = manifest.keys[ipa];
    assert.equal(entry.source, 'carrier', ipa);
    assert.ok(entry.end > 0.03 && entry.end < 0.15, ipa + ' must stay brief');
    const clip = bank.samples.subarray(entry.start, entry.start + entry.length);
    const split = clip.length - Math.round(0.025 * bank.sampleRate);
    assert.ok(rms(clip.subarray(split)) > 1.5 * rms(clip.subarray(0, split)), ipa + ' release must emerge from the closure');
  }
  // This is an acoustic regression check, not proof of the perceived place of articulation.
  assert.equal(manifest.keys.v.source, 'isolated', 'do not replace the sustained /v/ with a stop');
  const before = JSON.parse(readFileSync('tests/fixtures/voice-stops-before.json'));
  assert.ok(manifest.keys.b.end < before.keys.b.end / 3, 'regression: the reported /b/ used to last 310 ms');
  const fixture = readFileSync('tests/fixtures/voice-stops-before.wav');
  const previous = readVoiceBank(before, fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength));
  const a = before.keys.v, b = manifest.keys.v;
  assert.deepEqual(bank.samples.subarray(b.start, b.start + b.length), previous.samples.subarray(a.start, a.start + a.length), 'the /v/ sample must remain unchanged');
});

test('corrupt banks and missing keys are rejected instead of playing mismatched audio', () => {
  assert.throws(() => readVoiceBank(manifest, buffer.slice(0, 50)), /incomplète/);
  assert.throws(() => readVoiceBank({ ...manifest, sampleRate: 16000 }, buffer), /incomplète/);
  const invalid = { ...manifest, keys: { pa: { start: -1, length: 10, vowel: null, end: 1 } } };
  assert.throws(() => readVoiceBank(invalid, buffer), /invalides/);
  assert.throws(() => synthesizeKeysWithBank([{ ipa: 'unknown' }], bank, encodeWav), /absent/);
});

test('network or missing-clip failure falls back to eSpeak for the whole sequence and can retry', async () => {
  const engine = await createEspeak({ languages: ['fr'], phonemeEvents: 'ipa' });
  engine.setVoice('fr');
  const keys = inventory.filter(k => ['pa', 'ɥi'].includes(k.ipa));
  for (const load of [async () => { throw new TypeError('offline'); }, async () => ({ ...bank, manifest: { ...manifest, keys: {} } })]) {
    const packet = await synthesizeKeys(keys, engine, encodeWav, load);
    assert.equal(packet.voice, 'eSpeak NG');
    assert.equal(packet.clips.length, keys.length);
    assert.match(packet.warning, /secours eSpeak/);
    assert.match(packet.warning, /ɥ/);
  }
  const retry = await synthesizeKeys(keys, engine, encodeWav, async () => bank);
  assert.equal(retry.voice, 'Piper · Siwis');
});

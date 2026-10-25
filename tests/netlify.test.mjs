import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import handler from '../netlify/functions/phonemize.mjs';
import health from '../netlify/functions/health.mjs';

const sandbox = {};
vm.runInNewContext(readFileSync('Lumi-LPC-V0.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);
const request = (body, options = {}) => new Request('https://lumi.example/api/phonemize', {
  method: 'POST', body: JSON.stringify(body), ...options,
});

test('Netlify engine is ready and produces LPC keys for French free phrases', async () => {
  assert.equal((await health()).status, 200);
  for (const text of [
    'Demain, les astronautes visiteront une bibliothèque extraordinaire.',
    'J’ai acheté 23 croissants pour mes collègues !',
    'Les écureuils grignotent des noisettes près du vieux château.',
  ]) {
    const response = await handler(request({ text }));
    assert.equal(response.status, 200);
    const { ipa, engine } = await response.json();
    assert.equal(engine, 'eSpeak NG');
    assert.ok(sandbox.LPC.encode(ipa).length > 0);
  }
});

test('accepts same-origin HTTPS requests', async () => {
  const response = await handler(request({ text: 'Bonjour' }, { headers: { Origin: 'https://lumi.example' } }));
  assert.equal(response.status, 200);
});

test('rejects cross-origin calls and wrong methods', async () => {
  assert.equal((await handler(request({ text: 'Bonjour' }, { headers: { Origin: 'https://other.example' } }))).status, 403);
  assert.equal((await handler(new Request('https://lumi.example/api/phonemize'))).status, 405);
});

test('rejects malformed, empty and oversized input', async () => {
  for (const data of [null, [], {}, { text: '' }, { text: 'a'.repeat(301) }, { text: 42 }]) {
    assert.equal((await handler(request(data))).status, 400);
  }
  assert.equal((await handler(request({}, { body: '{' }))).status, 400);
  assert.equal((await handler(request({ text: 'a'.repeat(9000) }))).status, 413);
});

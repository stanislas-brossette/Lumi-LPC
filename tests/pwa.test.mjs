import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
const html = readFileSync('Lumi-LPC-V0.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const pngSize = file => { const b = readFileSync(file); assert.equal(b.toString('latin1', 1, 4), 'PNG', file); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };

test('manifest meets install criteria with real, correctly sized icons', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.name && manifest.short_name.length <= 12);
  for (const icon of manifest.icons) assert.equal(pngSize(icon.src), icon.sizes, icon.src);
  for (const size of ['192x192', '512x512']) assert.ok(manifest.icons.some(i => i.sizes === size && i.purpose === 'any'));
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable'));
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
  assert.match(html, /<meta name="theme-color" content="#315d49">/);
  assert.equal(manifest.theme_color, '#315d49');
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon.png">/);
  assert.match(html, /navigator\.serviceWorker\.register\('sw\.js'\)/);
});

test('service worker cache name follows the app and voice versions', () => {
  const voice = pkg.dependencies['@spelling-creator/spellophone'];
  assert.match(sw, new RegExp(`const CACHE = 'lumi-${pkg.version}-spellophone-${voice}';`));
});

function worker() {
  const handlers = {}, stores = new Map(), fetched = [];
  let online = true;
  const key = r => typeof r === 'string' ? new URL(r, 'https://lumi.test/').href : r.url;
  const caches = {
    async open(name) { if (!stores.has(name)) stores.set(name, new Map()); const s = stores.get(name);
      return { async addAll(list) { for (const p of list) s.set(key(p), { body: p }); }, async put(r, res) { s.set(key(r), res); } }; },
    async keys() { return [...stores.keys()]; }, async delete(name) { return stores.delete(name); },
    async match(r) { const k = key(r).split('?')[0]; for (const s of stores.values()) if (s.has(k)) return s.get(k); },
  };
  const response = url => ({ ok: true, url, clone() { return this; } });
  const self = { location: new URL('https://lumi.test/sw.js'), addEventListener: (n, fn) => handlers[n] = fn, skipWaiting() {}, clients: { claim() {} } };
  vm.runInNewContext(sw, { self, caches, URL, Promise, Response: { error: () => 'error' },
    fetch: async r => { fetched.push(r.url); if (!online) throw new TypeError('offline'); return response(r.url); } });
  const run = (name, request) => { let done, responded; handlers[name]({ request, waitUntil: p => done = p, respondWith: p => responded = p }); return { done, responded }; };
  return { run, stores, fetched, set online(v) { online = v; } };
}

test('offline: the app shell and voice files are served from cache, phrases are never cached', async () => {
  const w = worker();
  await w.run('install').done;
  await w.run('activate').done;
  const get = (path, mode = 'cors') => ({ url: 'https://lumi.test' + path, method: 'GET', mode });
  // Voice files: fetched once, then from cache even offline.
  await w.run('fetch', get('/assets/voice/wasm/espeak-ng.wasm')).responded;
  await new Promise(r => setTimeout(r));
  w.online = false;
  assert.equal((await w.run('fetch', get('/assets/voice/wasm/espeak-ng.wasm')).responded).url, 'https://lumi.test/assets/voice/wasm/espeak-ng.wasm');
  assert.equal(w.fetched.filter(u => u.includes('espeak-ng.wasm')).length, 1);
  for (const module of ['sounds.mjs', 'sound-catalog.mjs']) assert.deepEqual(await w.run('fetch', get('/'+module)).responded, {body:module});
  // Navigation offline falls back to the cached page.
  assert.deepEqual(await w.run('fetch', get('/?x=1', 'navigate')).responded, { body: './' });
  // API calls and POSTs are left to the network and never stored.
  assert.equal(w.run('fetch', get('/api/health')).responded, undefined);
  assert.equal(w.run('fetch', { url: 'https://lumi.test/api/phonemize', method: 'POST', mode: 'cors' }).responded, undefined);
  assert.ok(![...w.stores.values()].some(s => [...s.keys()].some(k => k.includes('/api/'))));
});

test('build publishes the manifest, service worker and icons', () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  for (const file of ['dist/sounds.mjs', 'dist/sound-catalog.mjs', 'dist/manifest.webmanifest', 'dist/sw.js', 'dist/icons/apple-touch-icon.png', ...manifest.icons.map(i => 'dist/' + i.src)]) assert.ok(existsSync(file), file);
  // The built worker precaches every voice file the browser engine needs, all present in dist.
  const voice = JSON.parse(readFileSync('dist/sw.js', 'utf8').match(/const VOICE = (\[.*\]);/)[1]);
  for (const file of ['assets/voice/dist/browser.js', 'assets/voice/wasm/espeak-ng.wasm', 'assets/voice/espeak-ng-data/fr_dict.gz', 'assets/voice/keys/manifest.json', 'assets/voice/keys/siwis-keys.wav', 'assets/voice/keys/README.md', 'assets/voice/keys/MODEL_CARD']) assert.ok(voice.includes(file), file);
  assert.ok(voice.some(f => /^assets\/voice\/dist\/core-.+\.js$/.test(f)));
  assert.ok(!voice.some(f => f.includes('legacy')));
  for (const file of voice) assert.ok(existsSync('dist/' + file), file);
});

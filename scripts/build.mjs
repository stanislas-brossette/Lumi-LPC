import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist', { recursive: true });
await copyFile('Lumi-LPC-V0.html', 'dist/index.html');
await copyFile('Lumi-LPC-V0.html', 'dist/Lumi-LPC-V0.html');
await copyFile('speech-sync.mjs', 'dist/speech-sync.mjs');
// Installable app: manifest, offline service worker and icons.
await copyFile('manifest.webmanifest', 'dist/manifest.webmanifest');
await mkdir('dist/icons', { recursive: true });
for (const file of await readdir('icons')) if (file.endsWith('.png')) await copyFile(join('icons', file), `dist/icons/${file}`);
const pkg = 'node_modules/@spelling-creator/spellophone';
// Self-host only the browser runtime, its licence, core data and French dictionary.
for (const folder of ['dist', 'wasm', 'espeak-ng-data']) await mkdir(`dist/assets/voice/${folder}`, { recursive: true });
const voice = [];
for (const folder of ['dist', 'wasm']) {
  for (const file of await readdir(join(pkg, folder))) {
    if (/\.(js|wasm)$/.test(file) && !/^(node|wasm2js)/.test(file)) {
      await copyFile(join(pkg, folder, file), `dist/assets/voice/${folder}/${file}`);
      if (!file.includes('legacy')) voice.push(`assets/voice/${folder}/${file}`);
    }
  }
}
for (const file of ['manifest.json', 'core.bin.gz', 'fr_dict.gz', 'en_dict.gz']) {
  await copyFile(`${pkg}/espeak-ng-data/${file}`, `dist/assets/voice/espeak-ng-data/${file}`);
  voice.push(`assets/voice/espeak-ng-data/${file}`);
}
// Pre-generated neural sounds are deployed and precached like the phonemizer.
await mkdir('dist/assets/voice/keys', { recursive: true });
for (const file of ['manifest.json', 'siwis-keys.wav', 'README.md', 'MODEL_CARD']) {
  await copyFile(`voices/${file}`, `dist/assets/voice/keys/${file}`);
  voice.push(`assets/voice/keys/${file}`);
}
// The legacy (no WebAssembly) fallback stays out of the precache; it is cached if ever used.
const worker = await readFile('sw.js', 'utf8');
if (!worker.includes('const VOICE = [];')) throw new Error('sw.js: liste VOICE introuvable');
await writeFile('dist/sw.js', worker.replace('const VOICE = [];', `const VOICE = ${JSON.stringify(voice)};`));
await copyFile(`${pkg}/LICENSE`, 'dist/assets/voice/LICENSE');
console.log('Site et voix française générés dans dist/');

import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist', { recursive: true });
await copyFile('Lumi-LPC-V0.html', 'dist/index.html');
await copyFile('Lumi-LPC-V0.html', 'dist/Lumi-LPC-V0.html');
await copyFile('speech-sync.mjs', 'dist/speech-sync.mjs');
const pkg = 'node_modules/@spelling-creator/spellophone';
// Self-host only the browser runtime, its licence, core data and French dictionary.
for (const folder of ['dist', 'wasm', 'espeak-ng-data']) await mkdir(`dist/assets/voice/${folder}`, { recursive: true });
for (const folder of ['dist', 'wasm']) {
  for (const file of await readdir(join(pkg, folder))) {
    if (/\.(js|wasm)$/.test(file) && !/^(node|wasm2js)/.test(file)) await copyFile(join(pkg, folder, file), `dist/assets/voice/${folder}/${file}`);
  }
}
for (const file of ['manifest.json', 'core.bin.gz', 'fr_dict.gz', 'en_dict.gz']) await copyFile(`${pkg}/espeak-ng-data/${file}`, `dist/assets/voice/espeak-ng-data/${file}`);
await copyFile(`${pkg}/LICENSE`, 'dist/assets/voice/LICENSE');
console.log('Site et voix française générés dans dist/');

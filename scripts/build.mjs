import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('Lumi-LPC-V0.html', 'dist/index.html');
await copyFile('Lumi-LPC-V0.html', 'dist/Lumi-LPC-V0.html');
console.log('Site généré dans dist/');

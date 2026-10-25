// Derive the finite audio inventory from Lumi's actual LPC reference.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = {};
vm.runInNewContext(readFileSync(new URL('../Lumi-LPC-V0.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1], context);
const { SHAPES, POSITIONS } = context.LPC;
export const consonants = Object.values(SHAPES).flatMap(s => Array.from(s.ipa));
export const vowels = Object.values(POSITIONS).flatMap(s => Array.from(s.ipa));
export const inventory = [
  ...consonants.map(c => ({ c, v: null, ipa: c })),
  ...vowels.map(v => ({ c: null, v, ipa: v })),
  ...consonants.flatMap(c => vowels.map(v => ({ c, v, ipa: c + v }))),
];
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(inventory));

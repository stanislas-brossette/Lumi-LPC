import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {SOUNDS} from '../sound-catalog.mjs';
const root={};vm.runInNewContext(readFileSync('Lumi-LPC-V0.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],root);
const manifest=JSON.parse(readFileSync('voices/manifest.json'));
test('explorer covers each supported phoneme once with an exact LPC key and an existing voice',()=>{
 const expected=[...Object.values(root.LPC.SHAPES),...Object.values(root.LPC.POSITIONS)].flatMap(g=>Array.from(g.ipa));
 assert.deepEqual(SOUNDS.map(s=>s.ipa).sort(),expected.sort());
 assert.equal(SOUNDS.length,new Set(SOUNDS.map(s=>s.ipa)).size);
 for(const s of SOUNDS){const keys=root.LPC.encode(s.ipa);assert.equal(keys.length,1);assert.ok(manifest.keys[s.ipa]);assert.equal(s.kind,keys[0].v?'vowel':'consonant');}
});
test('every example has a highlighted spelling and includes the actual selected phoneme',()=>{
 for(const s of SOUNDS){
  assert.ok(s.start>=0&&s.end>s.start&&s.end<=s.word.length,s.word);
  assert.ok(root.LPC.tokenize(s.wordIpa).tokens.includes(s.ipa),s.word+' contains '+s.ipa);
  assert.ok(root.LPC.encode(s.wordIpa).length);
 }
 assert.equal(SOUNDS.find(s=>s.ipa==='ɥ').word,'huit');
 assert.equal(SOUNDS.find(s=>s.ipa==='ɥ').word.slice(1,2),'u');
 assert.equal(SOUNDS.find(s=>s.ipa==='œ').word,'neuf');
 assert.equal(SOUNDS.find(s=>s.ipa==='ɔ̃').word,'pont');
});

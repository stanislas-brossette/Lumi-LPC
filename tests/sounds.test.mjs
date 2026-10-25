import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {BASE_SOUNDS as SOUNDS, createSoundCatalog, filterSounds} from '../sound-catalog.mjs';
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

test('a missing explorer module shows a recovery message and working reload button',async()=>{
 const html=readFileSync('Lumi-LPC-V0.html','utf8');
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 for(const protocol of ['http:','file:']){
  const message={hidden:true,children:[],setAttribute(name,value){this[name]=value;},append(...nodes){this.children.push(...nodes);}};
  let reloads=0;
  const doc={getElementById:()=>message,createElement:tag=>({tag,addEventListener(name,fn){this[name]=fn;}})};
  const location={protocol,reload(){reloads++;}};
  // Reject the module load, as the stale local server did with HTTP 404.
  const run=new Function('document','location','load','return '+script.trim().replace("import('./sounds.mjs')",'load()'));
  await run(doc,location,()=>Promise.reject(Error('HTTP 404')));
  assert.equal(message.hidden,false);assert.equal(message.role,'alert');
  assert.match(message.textContent,protocol==='http:'?/redémarre server.py/:/serveur local/);
  const retry=message.children.find(n=>n.tag==='button');assert.equal(retry.textContent,'Recharger la page');retry.click();assert.equal(reloads,1);
 }
});

test('complete catalogue covers the 329 bank units with one exact LPC key each',()=>{
 const all=createSoundCatalog(root.LPC);
 assert.equal(all.length,329);assert.equal(new Set(all.map(s=>s.ipa)).size,329);
 assert.deepEqual(all.map(s=>s.ipa).sort(),Object.keys(manifest.keys).sort());
 for(const s of all){
  const keys=root.LPC.encode(s.ipa);assert.equal(keys.length,1);assert.equal(keys[0].ipa,s.ipa);
  if(s.word){
   assert.ok(s.start>=0&&s.end>s.start&&s.end<=s.word.length,s.ipa+' highlight');
   assert.ok(root.LPC.encode(s.wordIpa).some(k=>k.ipa===s.ipa)||s.kind!=='combined',s.word+' has the key /'+s.ipa+'/');
  }else assert.equal(s.wordIpa,'');
 }
 assert.equal(all.find(s=>s.ipa==='to').word,'tôt');
 assert.equal(all.find(s=>s.ipa==='ŋœ̃').word,'');
});
test('filters expose every unit, singles, CVs and searches with or without an example',()=>{
 const all=createSoundCatalog(root.LPC);
 assert.equal(filterSounds(all,'','single').length,35);
 assert.equal(filterSounds(all,'','combined').length,294);
 assert.equal(filterSounds(all,'','all').length,329);
 assert.equal(filterSounds(all,'/ŋœ̃/','all')[0].ipa,'ŋœ̃');
 assert.equal(filterSounds(all,'/to/','all').length,1);
 assert.equal(filterSounds(all,'TÔT','combined')[0].ipa,'to');
 assert.equal(filterSounds(all,'papa','combined')[0].ipa,'pa');
 assert.equal(filterSounds(all,'introuvable','all').length,0);
});

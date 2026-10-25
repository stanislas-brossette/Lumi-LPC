import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createEspeak, encodeWav } from '@spelling-creator/spellophone';
import { naturalAudio, timelineFromEvents, synthesizeContinuousKeys } from '../speech-sync.mjs';
const context = {};
vm.runInNewContext(readFileSync('Lumi-LPC-V0.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1], context);
const LPC = context.LPC;
const engine = await createEspeak({ languages:['fr'], phonemeEvents:'ipa' });
engine.setVoice('fr');
test('continuous speech preserves the complete waveform and measured variable onsets', () => {
  for (const text of ['Bonjour maman !', 'Papa mange une pomme.', 'Les amis arrivent. Bonjour !', 'Il est bien ici.']) {
    const result = engine.synthesize(text,{rate:175,ssml:false});
    const timeline = timelineFromEvents(result,LPC,'œ');
    const packet = naturalAudio(result,timeline,encodeWav);
    assert.deepEqual(packet.wav,encodeWav(result.samples,result.sampleRate));
    assert.deepEqual(packet.times,timeline.times);
    assert.equal(packet.clips.length,packet.keys.length);
    assert.equal(packet.duration,result.samples.length/result.sampleRate);
    assert.equal(packet.clipTimes[0],0);
    assert.equal(packet.soundOffset,0);
    assert.ok(new Set(packet.times.slice(1).map((t,i)=>Math.round((t-packet.times[i])*100))).size>1);
    for (const [i,key] of packet.keys.entries()) {
      const mark=packet.marks[i];
      assert.ok(mark.end>0);
      if(key.c&&key.v) assert.equal(mark.vowel,timeline.phones[key.phoneStart+1].time-packet.times[i]);
    }
  }
});
test('manual continuous pronunciation preserves keys, word boundaries, repeats and forced pauses', () => {
  for (const ipa of ['papa','pa pa','pa | pa','b jɛ̃','mɑ̃ʒ yn pɔm','ɥi','m','n','l','ŋ']) {
    const keys=LPC.encode(ipa,'œ');
    const packet=synthesizeContinuousKeys(keys,engine,encodeWav,LPC,'œ');
    assert.deepEqual(packet.keys.map(k=>k.ipa),keys.map(k=>k.ipa));
    assert.deepEqual(packet.keys.map(k=>!!k.pauseAfter),keys.map(k=>!!k.pauseAfter));
    assert.equal(packet.mode,'natural');
    if(ipa==='ɥi') assert.match(packet.warning,/approximé/);
  }
  const make=ipa=>synthesizeContinuousKeys(LPC.encode(ipa),engine,encodeWav,LPC,'œ');
  assert.ok(make('pa | pa').duration>make('pa pa').duration);
});
test('ambiguous simultaneous key onsets are rejected instead of guessed', () => {
  assert.throws(()=>naturalAudio({duration:1,sampleRate:10,samples:new Int16Array(10)}, {keys:[{},{}],times:[0,0]},encodeWav),/minutage/);
});

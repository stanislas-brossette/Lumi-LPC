import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createEspeak, encodeWav } from '@spelling-creator/spellophone';
import { timelineFromEvents, keyAtTime, didacticAudio, synthesizeKeysWithEngine, keyToMnemonic } from '../speech-sync.mjs';

const html = readFileSync('Lumi-LPC-V0.html', 'utf8');
const encoder = {};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], encoder);
const engine = await createEspeak({ languages: ['fr'], phonemeEvents: 'ipa' });
engine.setVoice('fr');
function packet(text) {
  const result = engine.synthesize(text, { rate: 175, ssml: false, phonemes: false });
  return { ...timelineFromEvents(result, encoder.LPC, 'œ'), wav: new Uint8Array(), result };
}

test('real French audio supplies every key onset, including numbers, clitics and pauses', () => {
  for (const text of ['Bonjour maman !', 'Papa mange une pomme.', 'J’ai acheté 23 croissants pour mes collègues !', 'Les amis arrivent. Bonjour !', 'Un grand éléphant dans le jardin.']) {
    const { keys, times, ipa, result } = packet(text);
    assert.ok(keys.length > 0);
    assert.equal(keys.length, times.length);
    const expected = encoder.LPC.encode(ipa);
    assert.deepEqual(keys.map(k => k.code), Array.from(expected, k => k.code));
    const onsets = result.events.filter(e => e.type === 'phoneme' && e.phoneme).map(e => e.sample / result.sampleRate);
    for (const [i, time] of times.entries()) {
      assert.ok(onsets.includes(time), `key ${i} must use a measured phoneme onset`);
      assert.equal(keyAtTime(times, time), i);
      if (i) assert.equal(keyAtTime(times, time - 0.000001), i - 1);
    }
    assert.equal(keyAtTime(times, result.duration), keys.length - 1);
  }
});

test('default learning playback is substantially slower than ordinary synthesis', () => {
  const text = 'Papa mange une pomme.';
  const normal = engine.synthesize(text, { rate: 175 });
  const natural = packet(text);
  assert.ok(didacticAudio(natural.result, natural, encodeWav).duration / 0.5 > normal.duration * 3);
});

test('consonant-vowel keys start at their consonant and never join separate words', () => {
  const { keys, times, result } = packet('Papa mange une pomme.');
  assert.deepEqual(keys.map(k => k.ipa), ['pa', 'pa', 'mɑ̃', 'ʒ', 'y', 'n', 'pɔ', 'm']);
  const phonemes = result.events.filter(e => e.type === 'phoneme' && e.phoneme);
  assert.equal(times[0], phonemes[0].sample / result.sampleRate);
  assert.equal(times[1], phonemes[2].sample / result.sampleRate);
  assert.equal(times[2], phonemes[4].sample / result.sampleRate);
});

function app(stored = null, reducedMotion = true) {
  const nodes = new Map(), frames = new Map(), timers = new Map(); let id = 0;
  function element() { return { value: '', dataset: {}, style: {}, children: [], handlers: {}, attrs: {}, classList: { toggle() {} },
    addEventListener(name, fn) { this.handlers[name] = fn; }, setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; }, querySelectorAll() { return []; }, replaceChildren() { this.children = []; },
    append(...children) { this.children.push(...children); }, scrollTo() {} }; }
  const get = name => { if (!nodes.has(name)) nodes.set(name, element()); return nodes.get(name); };
  get('phrase').value = 'Papa mange une pomme.';
  const audios = [], revoked = [];
  class FakeAudio {
    constructor() { this.currentTime = 0; this.paused = true; audios.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; } removeAttribute() {} load() {}
  }
  const context = {
    document: { getElementById: get, querySelectorAll: () => [], createElement: element, addEventListener() {} },
    localStorage: { getItem: () => stored && JSON.stringify(stored), setItem() {} }, location: { protocol: 'file:' }, performance: {now:()=>0},
    matchMedia: () => ({ matches: reducedMotion }), addEventListener() {}, Audio: FakeAudio, Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: url => revoked.push(url) },
    setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
  };
  context.window = context; vm.createContext(context);
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script, context);
  context.location.protocol = 'http:';
  const a = context.LumiTest; const natural = packet(get('phrase').value); a.state.voiceData = didacticAudio(natural.result, natural, encodeWav);
  a.state.keys = a.state.voiceData.keys; a.state.speechModule = { keyAtTime };
  return { ...a, get, frames, timers, audios, revoked,
    frame() { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(); } };
}

test('speed defaults to 1 and preserves saved playback preferences', () => {
  assert.equal(app().state.speed, 1);
  assert.equal(app({ speed: 1 }).state.speed, 1);
  assert.equal(app({ speed: 0.5, speedProfile: 2 }).state.speed, 0.5);
  assert.equal(app({ speed: 0.25, speedProfile: 2 }).state.speed, 0.25);
});

test('visual follows the audio clock at every speed; pause/resume cannot drift', async () => {
  const a = app(); a.togglePlay(); await Promise.resolve();
  const audio = a.audios[0];
  assert.equal(audio.playbackRate, 1);
  assert.equal(a.timers.size, 0, 'no estimated timers alongside audio');
  audio.currentTime = a.state.voiceData.times[3]; a.frame(); assert.equal(a.state.index, 3);
  a.togglePlay(); assert.equal(audio.paused, true); assert.equal(a.frames.size, 0);
  a.get('speed').value = '0.25'; a.get('speed').handlers.change();
  assert.equal(audio.currentTime, a.state.voiceData.times[3]);
  assert.equal(audio.playbackRate, 0.25);
  assert.equal(a.audios.length, 1, 'speed changes do not restart the audio');
  a.togglePlay(); await Promise.resolve();
  // Skip several rendering frames: the next frame must catch up to the sound.
  audio.currentTime = a.state.voiceData.times[6]; a.frame(); assert.equal(a.state.index, 6);
  a.moveTo(1); assert.equal(audio.paused, true); assert.equal(a.frames.size, 0);
  audio.onended(); assert.equal(a.state.index, 1, 'ignore stale ended event');
  assert.equal(a.revoked.length, 1);
});

test('loop reuses timed audio and restarts at the first key', async () => {
  const a = app(); a.state.loop = true; a.togglePlay(); await Promise.resolve();
  a.audios[0].onended(); await Promise.resolve();
  assert.equal(a.audios.length, 2); assert.equal(a.state.index, 0);
  assert.equal(a.audios[1].currentTime, 0); assert.equal(a.frames.size, 1);
  a.stop();
});

test('pending play completion cannot restart animation after pause or navigation', async () => {
  const a = app(); a.togglePlay(); a.togglePlay(); a.togglePlay();
  await Promise.resolve(); assert.equal(a.frames.size, 1);
  a.stop(); assert.equal(a.frames.size, 0);
  const b = app(); b.togglePlay(); b.moveTo(2); await Promise.resolve();
  assert.equal(b.frames.size, 0); assert.equal(b.state.index, 2);
});

test('manual IPA uses audio even when the original text is different or empty', async () => {
  const a=app();a.state.manual=true;a.get('phrase').value='';a.get('ipa').value='fu ʒu | p';
  a.state.speechModule.synthesizePronunciation=async (ipa,LPC,schwa)=>synthesizeKeysWithEngine(LPC.encode(ipa,schwa),engine,encodeWav);
  await a.applyPronunciation('Prononciation appliquée.');
  assert.equal(a.state.busy,false);
  assert.equal(a.get('voice').disabled,false);assert.equal(a.get('voice').checked,true);
  assert.deepEqual(Array.from(a.state.keys,key=>key.ipa),['fu','ʒu','p']);
  assert.equal(a.state.voiceData.clips.length,3);
  a.togglePlay();await Promise.resolve();
  assert.equal(a.audios.length,1);assert.equal(a.timers.size,0);a.stop();
  a.selectKey(2);await Promise.resolve();
  assert.equal(a.state.singleKey,true);assert.equal(a.state.index,2);a.stop();
});

test('direct synthesis covers every LPC consonant, vowel and consonant-vowel combination', () => {
  const consonants=Object.values(encoder.LPC.SHAPES).flatMap(shape=>Array.from(shape.ipa));
  const vowels=Object.values(encoder.LPC.POSITIONS).flatMap(position=>Array.from(position.ipa));
  const ipas=[...consonants,...vowels,...consonants.flatMap(c=>vowels.map(v=>c+v))];
  for(const ipa of ipas){
    let emitted;const checkedEngine={synthesize(...args){emitted=engine.synthesize(...args);return emitted;}};
    const keys=encoder.LPC.encode(ipa),packet=synthesizeKeysWithEngine(keys,checkedEngine,encodeWav);
    assert.equal(packet.clips.length,1,ipa);
    assert.equal(packet.keys[0].ipa,ipa);
    const clip=packet.clips[0],pcm=new Int16Array(clip.buffer,clip.byteOffset+44,(clip.length-44)/2);
    assert.ok(pcm.some(sample=>Math.abs(sample)>8),ipa+' has sound');
    assert.equal(!!packet.warning,ipa.includes('ɥ'));
    const actual=emitted.events.filter(e=>e.type==='phoneme'&&e.phoneme).map(e=>Array.from(encoder.LPC.tokenize(e.phoneme).tokens).join('')).join('');
    assert.equal(actual,ipa.replace('ɥ','y'),'engine must emit the requested sounds');
  }
  assert.equal(keyToMnemonic(encoder.LPC.encode('ʒœ̃')[0]),'Z|W~');
});

test('unsupported manual input blocks audio rather than silently discarding a sound', async () => {
  const a=app();a.state.manual=true;a.get('ipa').value='pa θ';
  await a.applyPronunciation('Prononciation appliquée.');
  assert.equal(a.state.keys.length,0);assert.equal(a.state.voiceData,null);
  assert.match(a.get('status').textContent,/non pris en charge/);
  assert.equal(a.audios.length,0);
});

test('didactic montage gives every key an equal slot with sound after the transition', () => {
  const natural = packet('Papa mange une pomme. Bonjour !');
  const montage = didacticAudio(natural.result, natural, encodeWav);
  const rate = natural.result.sampleRate;
  const slotSamples = Math.round(montage.slotDuration * rate);
  assert.equal(montage.times.length, natural.keys.length);
  assert.ok(montage.slotDuration >= 1.2);
  assert.equal(montage.duration, slotSamples * natural.keys.length / rate);
  for (let i = 0; i < montage.times.length; i++) {
    assert.equal(montage.times[i], i * slotSamples / rate);
    const clip = montage.clips[i];
    assert.equal(clip.length, 44 + slotSamples * 2);
    const samples = new Int16Array(clip.buffer, clip.byteOffset + 44, slotSamples);
    const lead = Math.round(montage.soundOffset * rate);
    assert.ok(samples.subarray(0, lead).every(sample => sample === 0), 'silence while the hand moves');
    assert.ok(samples.subarray(lead).some(sample => sample !== 0), 'each key has audible samples');
    assert.ok(samples.subarray(-Math.round(0.15 * rate)).every(sample => sample === 0), 'time to observe before the next transition');
    const whole = new Int16Array(montage.wav.buffer, montage.wav.byteOffset + 44 + i * slotSamples * 2, slotSamples);
    assert.deepEqual(samples, whole, 'single-key replay has the same sound as sequential playback');
  }
});

test('selecting a key plays only its own slot and preserves its index on completion', async () => {
  const a = app(); a.state.loop = true; a.selectKey(3); await Promise.resolve();
  const audio = a.audios[0];
  assert.equal(a.state.singleKey, true); assert.equal(audio.currentTime, 0);
  audio.currentTime = a.state.voiceData.slotDuration / 2; a.frame();
  assert.equal(a.state.index, 3);
  assert.match(a.get('hand-art').attrs.transform,/rotate\(/);
  audio.onended();
  assert.equal(a.state.index, 3); assert.equal(a.state.playing, false);
  assert.equal(a.audios.length, 1, 'single-key replay does not start the full sequence or loop');
});


test('key audio cuts never include the beginning of the next key', () => {
  const samples = new Int16Array(600);
  samples.fill(1000, 0, 100); samples.fill(2000, 100, 300); samples.fill(3000, 300);
  const montage = didacticAudio({ samples, sampleRate: 1000 }, { times: [0, 0.1, 0.3] }, encodeWav);
  montage.clips.forEach((wav, i) => {
    const pcm = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);
    assert.equal(Math.max(...pcm), (i + 1) * 1000);
    assert.equal(pcm.filter(sample => sample !== 0).length <= [100, 200, 300][i], true);
  });
});


test('editing manual IPA during audio preparation discards the obsolete audio', async () => {
  const a=app();a.state.manual=true;a.get('ipa').value='pa';
  let finish;
  a.state.speechModule.synthesizePronunciation=()=>new Promise(resolve=>{finish=resolve;});
  const pending=a.applyPronunciation('Préparation');
  assert.equal(a.state.busy,true);
  a.get('ipa').value='fu';a.get('ipa').handlers.input();
  finish(synthesizeKeysWithEngine(encoder.LPC.encode('pa'),engine,encodeWav));
  await pending;
  assert.equal(a.state.voiceData,null);assert.equal(a.state.keys.length,0);
  assert.equal(a.state.busy,false);
});


test('lengthening increases voiced samples rather than just adding silence', () => {
  function activeDuration(samples,rate){
    const first=samples.findIndex(sample=>Math.abs(sample)>8);
    let last=samples.length-1;while(last>first&&Math.abs(samples[last])<=8)last--;
    return (last-first+1)/rate;
  }
  for(const ipa of ['pa','u','ʒu','s','ʃ','m','n','l','ŋ']){
    const keys=encoder.LPC.encode(ipa);
    const before=engine.synthesize('[['+keyToMnemonic(keys[0])+']]',{rate:175,phonemes:true,ssml:false});
    const after=synthesizeKeysWithEngine(keys,engine,encodeWav);
    const wav=after.clips[0],pcm=new Int16Array(wav.buffer,wav.byteOffset+44,(wav.length-44)/2);
    assert.ok(activeDuration(pcm,before.sampleRate)>activeDuration(before.samples,before.sampleRate)*1.25,ipa+' must sustain audible sound');
    assert.equal(after.times[0],0);assert.ok(after.slotDuration>=1.2);
  }
  const stop=engine.synthesize('[[p]]',{rate:175,phonemes:true});
  const held=synthesizeKeysWithEngine(encoder.LPC.encode('p'),engine,encodeWav).clips[0];
  const pcm=new Int16Array(held.buffer,held.byteOffset+44,(held.length-44)/2);
  assert.ok(activeDuration(pcm,stop.sampleRate)<0.15,'a plosive must not turn into a long artificial buzz');
});


test('restored mirror preference also mirrors the reference hand drawings',()=>{
  const a=app({mirror:true});
  assert.match(a.get('avatar-mirror').attrs.transform,/scale\(-1 1\)/);
  assert.match(a.get('shape-reference').innerHTML,/translate\(142 0\) scale\(-1 1\)/);
  assert.match(a.get('shape-reference').innerHTML,/main droite · miroir/);
});

test('eSpeak /y/ before a vowel in the same word becomes the LPC semi-vowel /ɥ/', () => {
  const cases = { 'plyˈi': 'plɥˈi', 'nyˈi': 'nɥˈi', 'yˈit': 'ɥˈit', 'nyˈaʒ': 'nɥˈaʒ', 'tyˈe': 'tɥˈe', 'esyijˈe': 'esɥijˈe',
    'bʁyˈi': 'bʁɥˈi', 'oʒuʁdyˈi': 'oʒuʁdɥˈi', 'kʁyˈɛl': 'kʁyˈɛl', 'tʁyˈɑ̃': 'tʁyˈɑ̃', 'ɡlyˈɑ̃': 'ɡlyˈɑ̃',
    'ty ˈɛ': 'ty ˈɛ', 'statˈy': 'statˈy', 'yn pˈɔm': 'yn pˈɔm', 'ʒə- syˈi.': 'ʒə- sɥˈi.' };
  for (const [espeak, expected] of Object.entries(cases)) assert.equal(encoder.LPC.glides(espeak), expected, espeak);
  assert.deepEqual(Array.from(encoder.LPC.encode(encoder.LPC.glides('plyˈi')), k => k.ipa + ' ' + k.code), ['p 1-s', 'l 6-s', 'ɥi 4-m']);
});

test('real French audio codes ui words with /ɥ/ and keeps every onset measured', () => {
  for (const [text, expected] of [['Pluie', ['p', 'l', 'ɥi']], ['Il fait nuit.', ['i', 'l', 'fɛ', 'n', 'ɥi']], ['Huit', ['ɥi', 't']]]) {
    const { keys, times, ipa, result } = packet(text);
    assert.deepEqual(keys.map(k => k.ipa), expected, text);
    assert.ok(ipa.includes('ɥ') && !/y[iɛ]/.test(ipa), ipa);
    const onsets = result.events.filter(e => e.type === 'phoneme' && e.phoneme).map(e => e.sample / result.sampleRate);
    for (const time of times) assert.ok(onsets.includes(time));
  }
});

test('a repeated key is tapped: the contact ring waits for the hand to come back', () => {
  const a = app(null, false);
  assert.deepEqual(a.state.keys.slice(0, 3).map(k => k.code), ['1-s', '1-s', '5-m'], 'Papa repeats pa');
  a.moveTo(0); a.moveTo(1);
  assert.match(a.get('reference-points').innerHTML, /class="pulse"[^>]*animation-delay:280ms/);
  assert.match(a.get('current-meta').textContent, /clé tapée/);
  a.get('mirror').handlers.click();
  assert.doesNotMatch(a.get('reference-points').innerHTML, /animation-delay/, 'redrawing the same key does not tap again');
  a.moveTo(2);
  assert.doesNotMatch(a.get('reference-points').innerHTML, /animation-delay/);
  assert.doesNotMatch(a.get('current-meta').textContent, /tapée/);
  a.get('speed').value = '0.5'; a.get('speed').handlers.change(); a.moveTo(1);
  assert.doesNotMatch(a.get('reference-points').innerHTML, /animation-delay/, 'arriving from a different key is a transition, not a tap');
  a.moveTo(0);
  assert.match(a.get('reference-points').innerHTML, /animation-delay:560ms/, 'tap slows down with the playback speed');
});

test('reduced motion keeps the tap label but moves nothing', () => {
  const a = app(); a.moveTo(0); a.moveTo(1);
  assert.doesNotMatch(a.get('reference-points').innerHTML, /animation-delay/);
  assert.match(a.get('current-meta').textContent, /clé tapée/);
});

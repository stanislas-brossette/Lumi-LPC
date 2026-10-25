// Automatic text supplies the LPC keys; each key is then voiced on its own.
// Automatic and manual pronunciations share the same didactic sound generation.
export function timelineFromEvents(result, LPC, schwa) {
  const keys = [], times = [], phrases = [];
  let phonemes = [];
  function flush(pause = false) {
    if (!phonemes.length) {
      if (pause && keys.length && !keys.at(-1).pauseAfter) { keys.at(-1).pauseAfter = true; phrases[phrases.length - 1] += '|'; }
      return;
    }
    const ipa = phonemes.map(p => p.sound).join('');
    const group = LPC.encode(ipa, schwa);
    let consumed = 0;
    for (const key of group) {
      times.push(phonemes[consumed].time);
      consumed += Number(!!key.c) + Number(!!key.v);
      keys.push(key);
    }
    if (consumed !== phonemes.length) throw new Error('Alignement phonétique incohérent.');
    if (group.length) { keys.at(-1).wordAfter = true; keys.at(-1).pauseAfter = pause; }
    phrases.push(ipa + (pause ? '|' : ''));
    phonemes = [];
  }
  for (const event of result.events) {
    if (event.type === 'word') flush();
    if (event.type === 'end') flush(true);
    if (event.type !== 'phoneme') continue;
    if (!event.phoneme) { flush(true); continue; }
    const { tokens, unknown } = LPC.tokenize(event.phoneme, schwa);
    if (unknown.length) throw new Error('Son vocal non pris en charge : ' + unknown.join(' '));
    const sounds = tokens.filter(t => t !== '|' && t !== '¦');
    // A multi-part engine event has a single onset; never invent extra times.
    for (const sound of sounds) phonemes.push({ sound, time: event.sample / result.sampleRate });
  }
  flush();
  if (!keys.length || times.some((time, i) => !Number.isFinite(time) || time < 0 || time > result.duration || (i && time < times[i - 1]))) {
    throw new Error('Le moteur vocal n’a pas fourni un minutage exploitable.');
  }
  return { keys, times, ipa: phrases.join(' ') };
}

export function keyAtTime(times, seconds) {
  let low = 0, high = times.length;
  while (low < high) { const mid = (low + high) >>> 1; if (times[mid] <= seconds) low = mid + 1; else high = mid; }
  return Math.max(0, low - 1);
}

let ready;
async function engine() {
  if (!ready) ready = import('./assets/voice/dist/browser.js').then(async ({ createEspeak, encodeWav }) => {
    const espeak = await createEspeak({ dataUrl: new URL('./assets/voice/espeak-ng-data/', import.meta.url), languages: ['fr'], phonemeEvents: 'ipa' });
    espeak.setVoice('fr');
    return { espeak, encodeWav };
  }).catch(error => { ready = undefined; throw error; });
  return ready;
}
export async function synthesize(text, LPC, schwa) {
  const { espeak, encodeWav } = await engine();
  const result = espeak.synthesize(text, { rate: 175, phonemes: false, ssml: false });
  const timeline = timelineFromEvents(result, LPC, schwa);
  const packet=synthesizeKeysWithEngine(timeline.keys,espeak,encodeWav);
  packet.ipa=timeline.ipa;
  return packet;
}

// Give every key the same slot. Keep its complete audio excerpt, preceded by
// time for the hand transition and followed by silence for observation.
export function didacticAudio(result, timeline, encodeWav) {
  const rate = result.sampleRate, lead = Math.round(0.3 * rate);
  const excerpts = timeline.times.map((time, i) => {
    const start = Math.round(time * rate);
    const boundary = i + 1 < timeline.times.length ? Math.round(timeline.times[i + 1] * rate) : result.samples.length;
    let end = boundary;
    // Remove trailing silence only; never prolong a plosive or add a vowel.
    while (end > start && Math.abs(result.samples[end - 1]) < 8) end--;
    end = Math.min(boundary, end + Math.round(0.01 * rate));
    return result.samples.slice(start, end);
  });
  const slotSamples = Math.max(Math.round(1.2 * rate), lead + Math.max(...excerpts.map(p => p.length)) + Math.round(0.2 * rate));
  const samples = new Int16Array(slotSamples * excerpts.length);
  const clips = excerpts.map((excerpt, i) => {
    const clip = new Int16Array(slotSamples);
    clip.set(excerpt, lead);
    // Tiny fades avoid clicks at cuts between coarticulated phonemes.
    const fade = Math.min(Math.round(0.004 * rate), Math.floor(excerpt.length / 2));
    for (let j = 0; j < fade; j++) {
      clip[lead + j] *= j / fade;
      clip[lead + excerpt.length - 1 - j] *= j / fade;
    }
    samples.set(clip, i * slotSamples);
    return encodeWav(clip, rate);
  });
  return { ...timeline, times: excerpts.map((_, i) => i * slotSamples / rate),
    slotDuration: slotSamples / rate, soundOffset: lead / rate,
    clips, wav: encodeWav(samples, rate), duration: samples.length / rate };
}

// eSpeak French phoneme mnemonics, never spelling or names of IPA letters.
// French eSpeak lacks /ɥ/: render a short /y/ and expose that approximation.
const frenchSounds = {
  p:'p',b:'b',t:'t',d:'d',k:'k',g:'g',f:'f',v:'v',s:'s',z:'z',m:'m',n:'n',l:'l',j:'j',w:'w',
  'ʃ':'S','ʒ':'Z','ʁ':'r','ɲ':'n^','ŋ':'N','ɥ':'y-',
  a:'a',e:'e','ɛ':'E',i:'i',o:'o','ɔ':'O',u:'u',y:'y','ø':'Y','œ':'W',
  'ɛ̃':'E~','ɑ̃':'A~','ɔ̃':'O~','œ̃':'W~',
};
export function keyToMnemonic(key) {
  return [key.c,key.v].filter(Boolean).map(sound=>{
    if (!Object.hasOwn(frenchSounds,sound)) throw new Error('Son vocal non pris en charge : '+sound);
    return frenchSounds[sound];
  }).join('|');
}
// Ask the synthesizer to sustain the sound itself. Syllabic nasals/liquids
// hold their consonant without adding a vowel. Plosive attacks stay brief.
function sustainedMnemonic(key) {
  const base=keyToMnemonic(key);
  if(key.v) return base+':';
  const held={m:'m-',n:'n-','ŋ':'N-',l:'l-'};
  if(held[key.c]) return held[key.c];
  return ['f','v','s','z','ʃ','ʒ','ʁ'].includes(key.c)?base+':':base;
}
export function synthesizeKeysWithEngine(keys, espeak, encodeWav) {
  if (!keys.length) throw new Error('Aucune clé à prononcer.');
  const cache = new Map(), pieces = [], times = [];
  let length = 0;
  for (const key of keys) {
    const mnemonic = sustainedMnemonic(key);
    if (!cache.has(mnemonic)) {
      const result = espeak.synthesize('[['+mnemonic+']]', { rate:125, phonemes:true, ssml:false });
      if (!result.samples.some(sample=>Math.abs(sample)>8)) throw new Error('Aucun son obtenu pour /'+key.ipa+'/.');
      cache.set(mnemonic,result);
    }
    const result = cache.get(mnemonic);
    if (pieces.length && result.sampleRate !== pieces[0].sampleRate) throw new Error('Fréquence audio incohérente.');
    times.push(length/result.sampleRate);pieces.push(result);length+=result.samples.length;
  }
  const samples = new Int16Array(length);let offset=0;
  for (const piece of pieces) { samples.set(piece.samples,offset);offset+=piece.samples.length; }
  const packet = didacticAudio({ samples, sampleRate:pieces[0].sampleRate }, { keys,times,ipa:keys.map(key=>key.ipa).join(' ') },encodeWav);
  packet.warning=keys.some(key=>key.c==='ɥ')?'Le son /ɥ/ est approximé par un /y/ bref dans cette voix.':'';
  return packet;
}
export async function synthesizePronunciation(ipa, LPC, schwa) {
  // Validate the full input before starting the engine; no unsupported sounds
  // may disappear silently, and key boundaries remain exactly those of LPC.
  const keys=LPC.encode(ipa,schwa);
  const { espeak,encodeWav }=await engine();
  return synthesizeKeysWithEngine(keys,espeak,encodeWav);
}

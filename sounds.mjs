import { createSoundCatalog, filterSounds } from './sound-catalog.mjs';
import { synthesizePronunciation } from './speech-sync.mjs';

const $=id=>document.getElementById(id), LPC=window.LPC, visual=window.LPCVisual;
const SOUNDS=createSoundCatalog(LPC);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let selected=SOUNDS[0], audio=null,url=null,frame=null,request=0;
const packets=new Map();
function stop(){
 request++;if(frame!==null)cancelAnimationFrame(frame);frame=null;
 if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
 if(url)URL.revokeObjectURL(url);url=null;
 $('sound-listen').disabled=!/^https?:$/.test(location.protocol);
 $('sound-listen').textContent='Écouter le son';
 if(mouth)mouth.paint(visual.visemeOf(LPC.encode(selected.ipa)[0]));
}
// Scope every SVG identifier so the simulator and explorer can coexist.
$('sound-avatar').innerHTML=visual.avatar().replace(/id="([^"]+)"/g,'id="sound-$1"').replace(/url\(#([^)]+)\)/g,'url(#sound-$1)').replace('aria-labelledby="avatar-title avatar-desc"','aria-labelledby="sound-avatar-title sound-avatar-desc"');
const scoped={getElementById:id=>$('sound-'+id)};
const mouth=visual.createMouth(scoped);
function show(item){
 stop();selected=item;
 const key=LPC.encode(item.ipa)[0],position=LPC.POSITIONS[key.position];
 $('sound-ipa').textContent='/'+item.ipa+'/';
 $('sound-meta').textContent=`Configuration ${key.shape} · ${position.name}`;
 $('sound-description').textContent=LPC.SHAPES[key.shape].title+(key.c&&key.v?' · consonne + voyelle.':key.c?' · consonne seule, sans voyelle ajoutée.':' · voyelle seule.');
 $('sound-word').replaceChildren();
 $('sound-use-word').disabled=!item.word;
 if(item.word){
  $('sound-word').append(document.createTextNode(item.word.slice(0,item.start)));
  const highlight=document.createElement('mark');highlight.textContent=item.word.slice(item.start,item.end);$('sound-word').append(highlight,document.createTextNode(item.word.slice(item.end)));
  $('sound-word-ipa').textContent='/'+item.wordIpa+'/';$('sound-note').textContent=item.note;
 }else{
  $('sound-word').textContent='Pas d’exemple courant proposé';$('sound-word-ipa').textContent='';
  $('sound-note').textContent='Cette combinaison appartient à la banque vocale. Tu peux l’écouter et observer sa clé, même sans mot d’exemple.';
 }
 $('sound-status').textContent=/^https?:$/.test(location.protocol)?'Choisis « Écouter le son » pour entendre la voix des clés.':'Ouvre Lumi depuis le site ou le serveur local pour écouter les sons.';
 const pose=visual.frameFor(key.shape,{...position,id:key.position}),anchor=visual.anchorFor(pose.pose);
 $('sound-hand-art').innerHTML=visual.hand(key.shape,true,'sound-finger-');
 $('sound-hand-art').setAttribute('transform',`rotate(${pose.angle}) scale(.88) translate(${-anchor[0]} ${-anchor[1]})`);
 $('sound-animated-hand').setAttribute('transform',`translate(${position.x} ${position.y})`);
 $('sound-reference-points').innerHTML=Object.entries(LPC.POSITIONS).map(([id,p])=>`<circle cx="${p.x}" cy="${p.y}" r="${id===key.position?9:4}" fill="${p.color}" stroke="white" stroke-width="2"/>`).join('');
 mouth.paint(visual.visemeOf(key));
 for(const b of $('sound-grid').querySelectorAll('button')) b.setAttribute('aria-pressed',String(b.dataset.sound===item.ipa));
}
function render(){
 const query=$('sound-search').value.trim().toLocaleLowerCase('fr'),kind=$('sound-filter').value;
 const matches=filterSounds(SOUNDS,query,kind);
 $('sound-grid').replaceChildren();
 for(const s of matches){const button=document.createElement('button');button.type='button';button.className='sound-choice';button.dataset.sound=s.ipa;button.setAttribute('aria-pressed',String(s===selected));button.setAttribute('aria-label',`Son ${s.ipa}${s.word?", comme dans "+s.word:", sans exemple courant"}`);const ipa=document.createElement('strong');ipa.textContent='/'+s.ipa+'/';const word=document.createElement('span');word.textContent=s.word||'Sans exemple';button.append(ipa,word);button.addEventListener('click',()=>{show(s);if(matchMedia('(max-width:850px)').matches)$('sound-detail').scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});});$('sound-grid').append(button);}
 $('sound-results').textContent=matches.length?`${matches.length} son${matches.length>1?'s':''} · choisir un son pour voir son geste`:'Aucun son trouvé. Essaie un autre mot ou un autre filtre.';
}
async function listen(){
 stop();const req=request,item=selected;
 $('sound-listen').disabled=true;$('sound-status').textContent='Préparation du son…';
 try{
  let packet=packets.get(item.ipa);
  if(!packet){
   packet=await synthesizePronunciation(item.ipa,LPC,'œ');
   if(!packet.warning)packets.set(item.ipa,packet);
  }
  if(req!==request)return;
  url=URL.createObjectURL(new Blob([packet.clips[0]],{type:'audio/wav'}));audio=new Audio(url);
  audio.onended=()=>{if(req!==request)return;stop();$('sound-status').textContent='Son terminé · '+packet.voice;};
  audio.onerror=()=>{if(req!==request)return;stop();$('sound-status').textContent='Son indisponible. Réessaie.';};
  await audio.play();if(req!==request)return;
  $('sound-listen').disabled=false;$('sound-listen').textContent='Réécouter le son';
  $('sound-status').textContent=packet.warning||packet.voice+' · /'+item.ipa+'/';
  const animate=()=>{if(req!==request||!audio)return;mouth.paint(visual.mouthAt(packet.keys[0],packet.marks[0],audio.currentTime,packet.soundOffset,reduced.matches));frame=requestAnimationFrame(animate);};animate();
 }catch{if(req!==request)return;stop();$('sound-status').textContent='Impossible de charger le son. Vérifie la connexion puis réessaie.';}
}
$('sound-search').addEventListener('input',render);$('sound-filter').addEventListener('change',render);
$('sound-listen').addEventListener('click',listen);
$('sound-use-word').addEventListener('click',()=>{if(!selected.word)return;stop();window.dispatchEvent(new CustomEvent('lumi-example',{detail:selected}));});
document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.addEventListener('click',stop));
window.addEventListener('pagehide',stop);
$('sound-loading').hidden=true;$('sound-use-word').disabled=false;
render();show(selected);

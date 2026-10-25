// Explicit examples: the target sound is highlighted in the spelling, not inferred.
// /ɑ/ is outside Lumi's inventory; regional /œ̃/ and borrowed /ŋ/ are kept explicit.
export const BASE_SOUNDS = [
 ['p','p','apa','papa'], ['b','b','allon','balɔ̃'], ['t','t','apis','tapi'], ['d','d','omino','domino'],
 ['k','c','adeau','kado'], ['g','g','âteau','gato'], ['f','f','usée','fyze'], ['v','v','élo','velo'],
 ['s','s','oleil','sɔlɛj'], ['z','z','éro','zeʁo'], ['ʃ','ch','at','ʃa'], ['ʒ','j','ardin','ʒaʁdɛ̃'],
 ['m','m','aman','mamɑ̃'], ['n','n','ez','ne'], ['l','l','apin','lapɛ̃'], ['ʁ','r','ouge','ʁuʒ'],
 ['ɲ','monta','gne','mɔ̃taɲ',5], ['ŋ','parki','ng','paʁkiŋ',5],
 ['j','sole','il','sɔlɛj',4], ['w','oi','seau','wazo'], ['ɥ','h','u','ɥit',1,'it'],
 ['a','a','vion','avjɔ̃'], ['e','é','té','ete'], ['ɛ','ai','le','ɛl'], ['i','i','mage','imaʒ'],
 ['o','eau','','o'], ['ɔ','o','range','ɔʁɑ̃ʒ'], ['u','ou','rs','uʁs'], ['y','u','sine','yzin'],
 ['ø','f','eu','fø',1], ['œ','n','eu','nœf',1,'f'],
 ['ɛ̃','p','ain','pɛ̃',1], ['ɑ̃','en','fant','ɑ̃fɑ̃'], ['ɔ̃','p','on','pɔ̃',1,'t'], ['œ̃','br','un','bʁœ̃',2],
].map(([ipa,a,b,wordIpa,start=0,tail='']) => {
 const word=a+b+tail;
 // A nonzero start means the second segment carries the highlighted spelling.
 return { ipa,word,wordIpa,start,end:start+(start?b.length:a.length),
   kind:['a','e','ɛ','i','o','ɔ','u','y','ø','œ','ɛ̃','ɑ̃','ɔ̃','œ̃'].includes(ipa)?'vowel':'consonant',
   note:ipa==='œ̃'?'Selon les régions, « brun » peut se prononcer comme « brin ».':ipa==='ŋ'?'Son rencontré dans des mots empruntés, comme « parking ».':ipa==='ɥ'?'Dans « huit », le son /ɥ/ commence à la lettre u ; le h est muet.':'' };
});

// Curated spans in common words. No spelling or word is invented for rare CVs.
const CV_EXAMPLES = [
 ['pa','papa','papa',0,2],['pe','pétale','petal',0,2],['pɛ','pelle','pɛl',0,2],['pi','pirate','piʁat',0,2],['po','peau','po',0,4],['pɔ','pomme','pɔm',0,2],['pu','poule','pul',0,3],['py','pull','pyl',0,2],['pø','peu','pø',0,3],['pœ','peur','pœʁ',0,3],['pɛ̃','pain','pɛ̃',0,4],['pɑ̃','pantalon','pɑ̃talɔ̃',0,3],['pɔ̃','pont','pɔ̃',0,3],
 ['ba','banane','banan',0,2],['be','bébé','bebe',0,2],['bɛ','belle','bɛl',0,2],['bi','biberon','bibʁɔ̃',0,2],['bo','beau','bo',0,4],['bɔ','botte','bɔt',0,2],['bu','bouche','buʃ',0,3],['by','bus','bys',0,2],['bœ','beurre','bœʁ',0,3],['bɛ̃','bain','bɛ̃',0,4],['bɑ̃','banc','bɑ̃',0,3],['bɔ̃','bonbon','bɔ̃bɔ̃',0,3],
 ['ta','tapis','tapi',0,2],['te','téléphone','telefɔn',0,2],['tɛ','tête','tɛt',0,2],['ti','tigre','tigʁ',0,2],['to','tôt','to',0,2],['tɔ','tortue','tɔʁty',0,2],['tu','toupie','tupi',0,3],['ty','tulipe','tylip',0,2],['tø','chanteuse','ʃɑ̃tøz',4,7],['tœ','moteur','mɔtœʁ',2,5],['tɛ̃','timbre','tɛ̃bʁ',0,3],['tɑ̃','tambour','tɑ̃buʁ',0,3],['tɔ̃','tomber','tɔ̃be',0,3],
 ['da','dame','dam',0,2],['de','dé','de',0,2],['dɛ','dette','dɛt',0,2],['di','dimanche','dimɑ̃ʃ',0,2],['do','dos','do',0,2],['dɔ','dormir','dɔʁmiʁ',0,2],['du','doux','du',0,3],['dy','dur','dyʁ',0,2],['dø','deux','dø',0,3],['dœ','demain','dœmɛ̃',0,2],['dɛ̃','dinde','dɛ̃d',0,3],['dɑ̃','dent','dɑ̃',0,3],['dɔ̃','don','dɔ̃',0,3],
 ['ka','cadeau','kado',0,2],['ke','képi','kepi',0,2],['kɛ','caisse','kɛs',0,4],['ki','kiwi','kiwi',0,2],['ko','côté','kote',0,2],['kɔ','coq','kɔk',0,2],['ku','couteau','kuto',0,3],['ky','cube','kyb',0,2],['kø','queue','kø',0,4],['kœ','cœur','kœʁ',0,3],['kɛ̃','quinze','kɛ̃z',0,4],['kɑ̃','camp','kɑ̃',0,3],['kɔ̃','conte','kɔ̃t',0,3],
 ['ga','gâteau','gato',0,2],['ge','guépard','gepaʁ',0,3],['gɛ','guerre','gɛʁ',0,3],['gi','guitare','gitaʁ',0,3],['go','gaufre','gofʁ',0,3],['gɔ','gomme','gɔm',0,2],['gu','goûter','gute',0,3],['gy','légume','legym',2,4],['gɑ̃','gant','gɑ̃',0,3],['gɔ̃','gonfler','gɔ̃fle',0,3],
 ['fa','farine','faʁin',0,2],['fe','fée','fe',0,2],['fɛ','fête','fɛt',0,2],['fi','filet','filɛ',0,2],['fo','faux','fo',0,3],['fɔ','forêt','fɔʁɛ',0,2],['fu','four','fuʁ',0,3],['fy','fusée','fyze',0,2],['fø','feu','fø',0,3],['fœ','feuille','fœj',0,3],['fɛ̃','fin','fɛ̃',0,3],['fɑ̃','enfant','ɑ̃fɑ̃',2,5],['fɔ̃','fond','fɔ̃',0,3],
 ['va','vache','vaʃ',0,2],['ve','vélo','velo',0,2],['vɛ','vert','vɛʁ',0,2],['vi','visage','vizaʒ',0,2],['vo','veau','vo',0,4],['vɔ','vol','vɔl',0,2],['vu','vous','vu',0,3],['vy','vue','vy',0,2],['vø','cheveux','ʃœvø',3,6],['vœ','veuve','vœv',0,3],['vɛ̃','vingt','vɛ̃',0,3],['vɑ̃','vent','vɑ̃',0,3],['vɔ̃','savon','savɔ̃',2,5],
 ['ma','maman','mamɑ̃',0,2],['me','maison','mezɔ̃',0,3],['mɛ','mère','mɛʁ',0,2],['mi','midi','midi',0,2],['mo','mot','mo',0,2],['mɔ','morceau','mɔʁso',0,2],['mu','mouton','mutɔ̃',0,3],['my','musée','myze',0,2],['mø','meute','møt',0,3],['mœ','meuble','mœbl',0,3],['mɛ̃','main','mɛ̃',0,4],['mɑ̃','manteau','mɑ̃to',0,3],['mɔ̃','montagne','mɔ̃taɲ',0,3],
 ['na','navire','naviʁ',0,2],['ne','nez','ne',0,2],['nɛ','neige','nɛʒ',0,3],['ni','nid','ni',0,2],['no','nos','no',0,2],['nɔ','note','nɔt',0,2],['nu','nounours','nunuʁs',0,3],['ny','nu','ny',0,2],['nø','nœud','nø',0,3],['nœ','neuf','nœf',0,3],['nɛ̃','nain','nɛ̃',0,4],['nɔ̃','non','nɔ̃',0,3],
 ['sa','sac','sak',0,2],['se','céréale','seʁeal',0,2],['sɛ','sel','sɛl',0,2],['si','citron','sitʁɔ̃',0,2],['so','saut','so',0,3],['sɔ','soleil','sɔlɛj',0,2],['su','souris','suʁi',0,3],['sy','sucre','sykʁ',0,2],['sø','ceux','sø',0,3],['sœ','sœur','sœʁ',0,3],['sɛ̃','singe','sɛ̃ʒ',0,3],['sɑ̃','sang','sɑ̃',0,3],['sɔ̃','son','sɔ̃',0,3],
 ['za','lézard','lezaʁ',2,4],['ze','zéro','zeʁo',0,2],['zɛ','zèbre','zɛbʁ',0,2],['zi','usine','yzin',1,3],['zo','zoo','zo',0,3],['zɔ','zone','zɔn',0,2],['zu','bisou','bizu',2,5],['zy','mesure','məzyʁ',2,4],['zɔ̃','maison','mezɔ̃',3,6],
 ['ʃa','chat','ʃa',0,3],['ʃe','chez','ʃe',0,3],['ʃɛ','chaise','ʃɛz',0,5],['ʃi','chiffre','ʃifʁ',0,3],['ʃo','chaud','ʃo',0,4],['ʃɔ','chocolat','ʃɔkɔla',0,3],['ʃu','chou','ʃu',0,4],['ʃy','chute','ʃyt',0,3],['ʃœ','chemin','ʃœmɛ̃',0,3],['ʃɛ̃','prochain','pʁɔʃɛ̃',3,8],['ʃɑ̃','champ','ʃɑ̃',0,4],['ʃɔ̃','cochon','kɔʃɔ̃',2,6],
 ['ʒa','jardin','ʒaʁdɛ̃',0,2],['ʒe','manger','mɑ̃ʒe',3,6],['ʒɛ','geste','ʒɛst',0,2],['ʒi','girafe','ʒiʁaf',0,2],['ʒo','jaune','ʒon',0,3],['ʒɔ','joli','ʒɔli',0,2],['ʒu','joue','ʒu',0,3],['ʒy','jupe','ʒyp',0,2],['ʒø','jeu','ʒø',0,3],['ʒœ','jeune','ʒœn',0,3],['ʒɛ̃','engin','ɑ̃ʒɛ̃',2,5],['ʒɑ̃','jambe','ʒɑ̃b',0,3],['ʒɔ̃','jonquille','ʒɔ̃kij',0,3],
 ['la','lapin','lapɛ̃',0,2],['le','les','le',0,2],['lɛ','lettre','lɛtʁ',0,2],['li','livre','livʁ',0,2],['lo','lot','lo',0,2],['lɔ','cloche','klɔʃ',1,3],['lu','loup','lu',0,3],['ly','lune','lyn',0,2],['lø','bleu','blø',1,4],['lœ','fleur','flœʁ',1,4],['lɛ̃','lin','lɛ̃',0,3],['lɑ̃','lampe','lɑ̃p',0,3],['lɔ̃','long','lɔ̃',0,3],
 ['ʁa','radis','ʁadi',0,2],['ʁe','réveil','ʁevɛj',0,2],['ʁɛ','règle','ʁɛgl',0,2],['ʁi','riz','ʁi',0,2],['ʁo','rose','ʁoz',0,2],['ʁɔ','robe','ʁɔb',0,2],['ʁu','roue','ʁu',0,3],['ʁy','rue','ʁy',0,2],['ʁø','heureux','øʁø',3,6],['ʁɛ̃','rein','ʁɛ̃',0,4],['ʁɑ̃','ranger','ʁɑ̃ʒe',0,3],['ʁɔ̃','rond','ʁɔ̃',0,3],['ʁœ̃','brun','bʁœ̃',1,4],
 ['ja','yaourt','jauʁt',0,2],['je','papier','papje',2,6],['jɛ','hier','jɛʁ',0,3],['jo','yoyo','jojo',0,2],['ju','caillou','kaju',2,7],['jø','yeux','jø',0,3],['jɛ̃','bien','bjɛ̃',1,4],['jɔ̃','avion','avjɔ̃',2,5],
 ['wa','oiseau','wazo',0,2],['wɛ','ouest','wɛst',0,3],['wi','oui','wi',0,3],['wɛ̃','coin','kwɛ̃',1,4],['ɥi','huit','ɥit',1,3],['ɥɛ','muet','mɥɛ',1,3],
 ['ɲe','gagner','gaɲe',2,6],['ɲɔ̃','champignon','ʃɑ̃piɲɔ̃',6,10],
];

export function createSoundCatalog(LPC) {
 const consonants=Object.values(LPC.SHAPES).flatMap(s=>s.ipa);
 const vowels=Object.values(LPC.POSITIONS).flatMap(s=>s.ipa);
 const examples=new Map(CV_EXAMPLES.map(([ipa,word,wordIpa,start,end])=>[ipa,{word,wordIpa,start,end}]));
 return [...BASE_SOUNDS,...consonants.flatMap(c=>vowels.map(v=>{
  const ipa=c+v,example=examples.get(ipa);
  return {ipa,kind:'combined',word:'',wordIpa:'',start:0,end:0,note:'',...example};
 }))];
}

export function filterSounds(sounds,query,kind) {
 const input=query.trim().toLocaleLowerCase('fr'),exact=/^\/.*\/$/.test(input),q=input.replace(/^\/(.*)\/$/,'$1');
 return sounds.filter(s=>(kind==='all'||(kind==='single'?s.kind!=='combined':s.kind===kind))&&(!q||(exact?s.ipa===q:s.ipa.includes(q)||s.word.toLocaleLowerCase('fr').includes(q))));
}

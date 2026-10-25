// Explicit examples: the target sound is highlighted in the spelling, not inferred.
// /ɑ/ is outside Lumi's inventory; regional /œ̃/ and borrowed /ŋ/ are kept explicit.
export const SOUNDS = [
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

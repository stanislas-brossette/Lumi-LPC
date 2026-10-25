import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('Lumi-LPC-V0.html','utf8');
const context={};context.window=context;
vm.runInNewContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1],context);
const visual=context.LPCVisual;
const expected={1:['index'],2:['index','middle'],3:['little','ring','middle'],4:['little','ring','middle','index'],5:['little','ring','middle','index'],6:['index'],7:['index','middle'],8:['index','middle']};

test('eight right-hand poses use the intended fingers and an unambiguous thumb side',()=>{
  for(let shape=1;shape<=8;shape++){
    const pose=visual.pose(shape);
    assert.deepEqual(Object.entries(pose.fingers).filter(([,f])=>f.curl===0).map(([name])=>name).sort(),expected[shape].sort());
    const xs=Array.from(visual.fingerOrder,name=>pose.fingers[name].points[0][0]);
    assert.deepEqual(xs,[114,97,80,63]);
    assert.ok(pose.thumb[3][0]<=xs[3]);
    const anchor=visual.anchor(shape),reference=[1,6].includes(shape)?'index':'middle';
    assert.deepEqual(Array.from(anchor),Array.from(pose.fingers[reference].points[3]));
  }
  assert.ok(visual.pose(3).fingers.index.curl>0&&visual.pose(3).fingers.index.curl<1);
  assert.ok(visual.pose(8).fingers.middle.points[3][0]-visual.pose(8).fingers.index.points[3][0]>30);
});

function animator(reduced=false){
  const nodes=new Map();let replacements=0,markup='',time=0,id=0;const callbacks=new Map();
  const node=()=>({attrs:{},style:{},setAttribute(key,value){this.attrs[key]=value;}});
  context.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
  const art=node(),container=node();
  Object.defineProperty(art,'innerHTML',{get:()=>markup,set(value){replacements++;markup=value;}});
  const rig=visual.createAnimator(art,container,()=>reduced,{now:()=>time,raf(fn){callbacks.set(++id,fn);return id;},cancel(id){callbacks.delete(id);}});
  return {rig,art,container,nodes,callbacks,get replacements(){return replacements;},advance(to){time=to;const pending=[...callbacks.values()];callbacks.clear();for(const fn of pending)fn();},setTime(to){time=to;}};
}
const pos=(id='m')=>({id,x:id==='m'?282:194,y:244});
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));

test('all 64 shape transitions are continuous and retain the same SVG elements',()=>{
  for(let from=1;from<=8;from++)for(let to=1;to<=8;to++){
    const a=animator();a.rig.goTo(from,pos(),.5);
    const original=a.rig.snapshot(),indexNode=a.nodes.get('avatar-finger-index-skin');
    a.rig.goTo(to,pos(),.5);same(a.rig.snapshot(),original);
    a.advance(240);const middle=a.rig.snapshot();
    assert.ok(Object.values(middle.pose.fingers).every(f=>f.points.flat().every(Number.isFinite)));
    if(from!==to)assert.notEqual(JSON.stringify(middle.pose),JSON.stringify(original.pose));
    a.advance(480);same(a.rig.snapshot().pose,visual.pose(to));
    same(a.rig.snapshot().position,[282,244]);
    assert.equal(a.nodes.get('avatar-finger-index-skin'),indexNode);
    assert.equal(a.replacements,1,'do not replace the hand markup during animation');
    assert.equal(a.callbacks.size,0);
  }
});

test('changing shape and position mid-transition starts from the current pose without a snap',()=>{
  const a=animator();a.rig.goTo(1,pos('s'),.5);a.rig.goTo(5,pos(),.5);a.advance(120);
  const current=a.rig.snapshot();a.rig.goTo(8,{id:'b',x:254,y:211},.5);same(a.rig.snapshot(),current);
  a.advance(360);assert.notEqual(JSON.stringify(a.rig.snapshot().position),JSON.stringify(current.position));
  a.advance(600);same(a.rig.snapshot().pose,visual.pose(8));same(a.rig.snapshot().position,[254,211]);
  const anchor=visual.anchorFor(a.rig.snapshot().pose);
  assert.ok(a.art.attrs.transform.includes(`translate(${-anchor[0]} ${-anchor[1]})`));
});

test('pause freezes finger animation and resume completes within its remaining duration',()=>{
  const a=animator();a.rig.goTo(1,pos(),.5);a.rig.goTo(2,pos(),.5);a.advance(120);a.rig.pause();
  const paused=a.rig.snapshot();a.advance(1000);same(a.rig.snapshot(),paused);assert.equal(a.callbacks.size,0);
  a.rig.resume();a.advance(1180);assert.notEqual(JSON.stringify(a.rig.snapshot()),JSON.stringify(paused));
  a.advance(1360);same(a.rig.snapshot().pose,visual.pose(2));assert.equal(a.callbacks.size,0);
});

test('reduced motion applies the destination immediately and mirror uses the same poses',()=>{
  const a=animator(true);a.rig.goTo(1,pos(),.5);a.rig.goTo(7,pos('s'),.5);
  same(a.rig.snapshot().pose,visual.pose(7));assert.equal(a.callbacks.size,0);
  for(let shape=1;shape<=8;shape++){
    assert.match(visual.handSVG(shape,true),/translate\(142 0\) scale\(-1 1\)/);
    assert.match(visual.handSVG(shape,false),/main droite vue de dos/);
    for(const name of ['index','middle','ring','little','thumb'])assert.ok(visual.handSVG(shape).includes(`data-finger="${name}"`));
  }
});


test('ki has the index above the middle finger and the folded fingers below, as in the photo reference',()=>{
  const frame=visual.frameFor(2,pos());
  function project(p){
    const anchor=visual.anchorFor(frame.pose),angle=frame.angle*Math.PI/180;
    const x=(p[0]-anchor[0])*.88,y=(p[1]-anchor[1])*.88;
    return [frame.position[0]+x*Math.cos(angle)-y*Math.sin(angle),frame.position[1]+x*Math.sin(angle)+y*Math.cos(angle)];
  }
  const index=project(frame.pose.fingers.index.points[3]);
  const middle=project(frame.pose.fingers.middle.points[3]);
  const ring=project(frame.pose.fingers.ring.points[1]);
  const little=project(frame.pose.fingers.little.points[1]);
  assert.ok(index[1]<middle[1],'index must be above middle near the mouth');
  assert.ok(ring[1]>middle[1]&&little[1]>middle[1],'folded ring and little fingers are underneath the extended pair');
  const thumb=project(frame.pose.thumb[2]);
  assert.ok(thumb[1]<ring[1],'folded thumb sits above the curled fingers, not under the palm');
  const drawing=visual.hand(2,true);
  assert.ok(drawing.indexOf('data-finger="thumb"')<drawing.indexOf('data-finger="index"'),'folded thumb belongs behind the fingers and dorsal surface');
  assert.match(visual.handSVG(2),/data-view="direct"/);
  assert.match(visual.handSVG(2,true),/data-view="mirror"/);
});

test('a tap leaves the face and returns to the same contact, pausable and interruptible',()=>{
  const a=animator();a.rig.goTo(5,pos(),1);const contact=a.rig.snapshot();
  assert.equal(contact.lift,0);
  assert.equal(a.rig.tap(5,pos(),1),280);same(a.rig.snapshot(),contact);
  a.advance(140);const away=a.rig.snapshot();
  assert.ok(away.lift>.99,'fully withdrawn halfway');
  same(away.pose,contact.pose);same(away.position,contact.position);
  assert.match(a.art.attrs.transform,/rotate\(55\) translate\(0 22\) scale\(0\.968\)/);
  a.advance(210);a.rig.pause();const paused=a.rig.snapshot();a.advance(1000);same(a.rig.snapshot(),paused);
  assert.ok(paused.lift>0&&paused.lift<away.lift);
  a.rig.resume();a.advance(1070);same(a.rig.snapshot(),contact);assert.equal(a.callbacks.size,0);
  assert.doesNotMatch(a.art.attrs.transform,/translate\(0 /,'back in contact');
  // A different key during a tap starts from the withdrawn hand, without a snap.
  a.rig.tap(5,pos(),1);a.advance(1210);const mid=a.rig.snapshot();a.rig.goTo(1,pos('s'),1);same(a.rig.snapshot(),mid);
  a.advance(1700);same(a.rig.snapshot().pose,visual.pose(1));assert.equal(a.rig.snapshot().lift,0);
  assert.equal(a.rig.tap(1,pos('s'),.25),900,'slow motion is capped');
});

test('reduced motion taps without moving',()=>{
  const a=animator(true);a.rig.goTo(5,pos(),1);
  assert.equal(a.rig.tap(5,pos(),1),0);assert.equal(a.rig.snapshot().lift,0);assert.equal(a.callbacks.size,0);
});

test('every LPC sound has a mouth shape: closed bilabials, bitten f/v, spread i, rounded u, open a',()=>{
  const rest=visual.visemeOf(null),shape=s=>visual.visemeFor(s);
  for(const s of ['p','b','m','f','v','t','d','n','l','s','z','k','g','ʁ','ŋ','ʃ','ʒ','j','ɲ','w','ɥ','a','ɑ̃','e','ɛ','ɛ̃','i','o','ɔ̃','ɔ','u','y','ø','œ','œ̃'])assert.notEqual(shape(s),rest,s);
  for(const s of ['p','b','m'])assert.equal(shape(s).open,0);
  for(const s of ['f','v'])assert.equal(shape(s).bite,1);
  assert.ok(shape('i').w>shape('e').w&&shape('e').w>shape('o').w&&shape('o').w>shape('u').w,'spread to rounded');
  assert.ok(['e','ɛ','i','o','u','y','ø','œ'].every(s=>shape('a').open>shape(s).open),'a is the most open');
  assert.equal(shape('ʃ').w<shape('s').w,true,'ch is rounded, s is not');
  // The resting mouth keeps the original drawing.
  const d=visual.mouthPaths(rest);
  assert.match(d.lips,/^M293 244 Q304 235 318 240 Q332 235 343 244 Q318 264 293 244Z$/);
  assert.equal(d.inner,'M295 244 Q318 248 341 244 Q318 248 295 244Z');assert.equal(d.teeth,'');
});

test('mouth timeline: anticipation, consonant, vowel, hold, rest — without jumps',()=>{
  const key={c:'p',v:'a'},marks={vowel:.02,end:.29},lead=.3,at=t=>visual.mouthAt(key,marks,t,lead);
  same(at(0),visual.visemeOf(null));same(at(lead),visual.visemeFor('p'));
  same(at(lead+.2),visual.visemeFor('a'));same(at(lead+marks.end+.35),visual.visemeOf(null));
  let previous=at(0);
  for(let t=.005;t<1.2;t+=.005){const m=at(t);assert.ok(Math.abs(m.open-previous.open)<4.5&&Math.abs(m.w-previous.w)<4.5,`no snap at ${t.toFixed(3)}`);previous=m;}
  // An isolated consonant keeps its own shape for the whole sound; a lone vowel starts open.
  same(visual.mouthAt({c:'m',v:null},{vowel:null,end:.24},lead+.2,lead),visual.visemeFor('m'));
  same(visual.mouthAt({c:null,v:'u'},{vowel:null,end:.3},lead,lead),visual.visemeFor('u'));
  // Reduced motion: no in-between shapes.
  for(let t=0;t<1.2;t+=.01){const m=visual.mouthAt(key,marks,t,lead,true);assert.ok([visual.visemeOf(null),visual.visemeFor('p'),visual.visemeFor('a')].some(v=>JSON.stringify(v)===JSON.stringify(m)));}
});

test('mouth painter updates the SVG in place and only bites for f/v',()=>{
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});return nodes.get(id);};
  const mouth=visual.createMouth({getElementById:get});
  mouth.paint(visual.visemeFor('a'));
  assert.equal(get('mouth-inner').attrs.d,visual.mouthPaths(visual.visemeFor('a')).inner);
  assert.equal(get('mouth-clip-path').attrs.d,get('mouth-inner').attrs.d);
  assert.equal(get('mouth-teeth').attrs['clip-path'],'url(#mouth-clip)');
  mouth.paint(visual.visemeFor('f'));assert.equal(get('mouth-teeth').attrs['clip-path'],undefined,'teeth rest on the lower lip');
  assert.match(visual.avatar(),/<g id="mouth"><path id="mouth-lips"/);
});

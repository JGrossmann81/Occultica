
/* ===== Quaternius Bestiary monsters (Imp, Puglin): sculpted, normal-mapped, emissive, driven by the same animation set as the people ===== */
(function(){
 if(typeof THREE==="undefined"||!window.QM_Z||!window.pako||!window.ABOM||!window.__HUM||!window.__fig)return;
 const T=THREE,QM=window.QMON={ok:{},sc:{},vt:window.QM_V||null};
 const HANIM={idle:"Idle_Loop",walk:"Walk_Loop",run:"Jog_Fwd_Loop",attack:"Sword_Attack",cast:"Spell_Simple_Shoot",hit:"Hit_Chest",die:"Death01",talk:"Idle_Talking_Loop"};
 let Hh=0;
 function humH(){if(Hh)return Hh;try{const b=new T.Box3().setFromObject(__HUM.sc.base_m.scene);Hh=Math.max(1.2,b.max.y-b.min.y)}catch(e){Hh=1.8}return Hh}
 const VT={};
 function varTex(k,i,root){const key=k+i;let tx=VT[key];if(!tx){const b64=window.QMON.vt[k]&&window.QMON.vt[k][i];if(!b64)return;const im=new Image();tx=VT[key]=new T.Texture(im);tx.flipY=false;tx.encoding=T.sRGBEncoding;tx.anisotropy=8;im.onload=()=>{tx.needsUpdate=true};im.src="data:image/jpeg;base64,"+b64}
  root.traverse(o=>{if(o.material&&o.material.map)o.material.map=tx})}
 function make(k,c){
  const G=QM.sc[k],root=T.SkeletonUtils.clone(G.scene);
  const meshes=[],mats=[];root.traverse(o=>{if(!(o.isSkinnedMesh||o.isMesh))return;o.frustumCulled=false;o.castShadow=true;const m=o.material=o.material.clone();m.roughness=Math.max(.25,m.roughness==null?.6:m.roughness);if(m.envMapIntensity!=null)m.envMapIntensity=.6;meshes.push(o);if(m.color)mats.push(m)});
  if(c.qv!=null&&window.QMON.vt)varTex(k,c.qv,root);
  root.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(root),h=Math.max(.2,bb.max.y-bb.min.y),sc=humH()/h;root.scale.setScalar(sc);root.position.y=-bb.min.y*sc;
  const g=new T.Group();g.add(root);const s=c.s||1,w=c.w||1;g.scale.set(s*w,s,s*w);
  const mixer=new T.AnimationMixer(root),acts={},AN=__HUM.sc.anims.animations;
  Object.keys(HANIM).forEach(n=>{const cl=AN.find(a=>a.name===HANIM[n]);if(cl){const cl2=cl.clone();/* keep the root from sliding: drop root/pelvis translation */cl2.tracks=cl2.tracks.filter(t=>!/\.position$/.test(t.name)||!/^(root|pelvis)\./.test(t.name));acts[n]=mixer.clipAction(cl2)}});
  ["attack","cast","hit","die"].forEach(n=>{const a=acts[n];if(a){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true}});
  const F={g,root,mixer,acts,mats,meshes,sh:true,base:1.35,spd:2.6,runBase:3.3,cur:"",one:0,dead:false,qm:1,
   play(n,ts){const a=acts[n];if(!a||this.dead)return;if(n===this.cur&&(n==="idle"||n==="walk"||n==="run"||n==="talk")){a.setEffectiveTimeScale(ts||1);return}
    const prev=acts[this.cur];a.reset().setEffectiveTimeScale(ts||1).setEffectiveWeight(1);if(prev&&prev!==a)prev.crossFadeTo(a,.2,false);a.play();
    if(n==="idle"||n==="walk"||n==="run"||n==="talk")a.time=Math.random()*a.getClip().duration;
    this.cur=n;this.one=(n==="idle"||n==="walk"||n==="run"||n==="talk")?0:a.getClip().duration/(ts||1);if(n==="die")this.dead=true},
   update(dt){if(this.hold)return;mixer.update(dt);if(this.one>0){this.one-=dt;if(this.one<=0&&this.cur!=="die"){this.cur="";this.play("idle")}}}};
  g.userData.qm=1;g.userData.fig=F;g.userData.mats=mats;F.eye=c.eye||0;F.shells=[];if(c.far)g.userData.far=true;
  window.__ALL.add(F);F.play("idle");return F}
 /* decode and parse each model once; until it is ready the old model is used */
 Object.keys(window.QM_Z).forEach(k=>{try{const bin=atob(window.QM_Z[k]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const ab=pako.inflate(u).buffer;
   new T.GLTFLoader().parse(ab,"",gl=>{QM.sc[k]=gl;QM.ok[k]=1;ABOM[k==="imp"?"qimp":"qpug"]=c=>{try{return make(k,c)}catch(e){console.warn("qmon make",e);return window.__fig(Object.assign({},c,{build:null}))}}},e=>console.warn("qmon glb",k,e))}catch(e){console.warn("qmon",k,e)}});
 window.QM_Z=null;
})();

/* ===== monster extras: no two alike (tint and wear), glowing veins on the unholy, breathing eyes ===== */
(function(){
 if(typeof THREE==="undefined"||typeof AGE==="undefined"||!AGE.foe)return;
 const T=THREE,MX=window.MONX={on:1};
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296};
 let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 /* vein texture: a branching net of fine lines, tiled */
 let veinTex=null;
 function veins(){if(veinTex)return veinTex;const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");g.fillStyle="#000";g.fillRect(0,0,256,256);g.lineCap="round";
  let s=7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
  function branch(x,y,a,len,w,d){if(d>5||len<6)return;g.lineWidth=w;g.strokeStyle="rgba(255,255,255,"+(.35+.65*(1-d/6))+")";g.beginPath();g.moveTo(x,y);
   const n=Math.floor(len/8);for(let i=0;i<n;i++){a+=(r()-.5)*.7;x+=Math.cos(a)*8;y+=Math.sin(a)*8;g.lineTo((x+256)%256,(y+256)%256)}g.stroke();
   if(r()<.9)branch(x,y,a+.6+r()*.5,len*.62,w*.7,d+1);if(r()<.8)branch(x,y,a-.6-r()*.5,len*.58,w*.7,d+1);branch(x,y,a+(r()-.5)*.3,len*.7,w*.85,d+1)}
  for(let i=0;i<7;i++)branch(r()*256,r()*256,r()*6.28,90,2.6,0);
  veinTex=new T.CanvasTexture(c);veinTex.wrapS=veinTex.wrapT=T.RepeatWrapping;veinTex.repeat.set(2,2);veinTex.anisotropy=8;return veinTex}
 const KIND=[
  [/Demon|Imp|Fiend|Bael|Hell|Balrog|Devil|Succubus|Incubus|Magma|Fire|Flame|Infern|Archon/i,[1,.28,.06],1.5],
  [/Ghoul|Wraith|Wight|Lich|Draugr|Revenant|Shade|Hollow|Lemure|Zombie|Mummy|Barrow|Ushabti|Dead/i,[.35,1,.5],1.1],
  [/Weaver|Spider|Aboml|Abom|Void|Eldritch|Elder|Tentacle/i,[.7,.35,1],1.2],
  [/Frost|Ice|Yeti|Winter/i,[.4,.75,1],.9]];
 const live=[],bodies=[],breath=[];const BLOOD=new T.Color(0x5a0c0c);let fightT0=0,wasC=false;
 function dress(g,name){
  const k=hash(name+Math.floor(performance.now()/997))+rnd();seed=(seed+Math.floor(k*1e6))>>>0;
  const kind=KIND.find(x=>x[0].test(name)),tint=.82+rnd()*.34,warm=(rnd()-.5)*.16;
  const done=new Map();
  try{const F=g.userData&&g.userData.fig;if(F&&F.root&&F.root.scale&&!F.root.userData.mxb){const j=.92+rnd()*.16,w=.96+rnd()*.08;F.root.scale.x*=j*w;F.root.scale.y*=j;F.root.scale.z*=j*w;F.root.userData.mxb=1;breath.push({F,b:F.root.scale.clone(),ph:rnd()*6.28,sp:1.5+rnd()*.8})}}catch(e){}
  g.traverse(o=>{if(!o.material||!(o.isMesh||o.isSkinnedMesh))return;
   const arr=Array.isArray(o.material),ms=arr?o.material:[o.material];
   const out=ms.map(m=>{if(!m||!m.color)return m;if(done.has(m))return done.get(m);
    if(/Eye|Orb|Glass|Flame|Fire/i.test(m.name||"")){
     if(m.emissive&&m.emissiveIntensity>1){const c=m.clone();c.userData.eye=1;c.userData.base=m.emissiveIntensity;c.userData.ph=rnd()*6.28;live.push([g,c]);done.set(m,c);return c}return m}
    const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;c.color.multiplyScalar(tint);c.color.r=Math.min(1,c.color.r*(1+warm));c.color.b=Math.min(1,c.color.b*(1-warm));
    if(kind&&/Skin|Flesh|Scale|Belly|Body|Hide|Mouth|Chitin|Shell|Fur/i.test(m.name||"")&&c.isMeshStandardMaterial&&c.map&&!/Shell\d|Fur/i.test(m.name||"")){
     c.emissiveMap=veins();c.emissive=new T.Color(kind[1][0],kind[1][1],kind[1][2]);c.emissiveIntensity=0;c.userData.vein=kind[2];c.userData.ph=rnd()*6.28;live.push([g,c])}
    c.userData.mx=1;c.userData.b0=c.color.clone();bodies.push([g,c]);done.set(m,c);return c});
   o.material=arr?out:out[0]})}
 const _f=AGE.foe;AGE.foe=function(g,name){const r=_f.apply(this,arguments);try{if(MX.on&&g)dress(g,String(name||""))}catch(e){console.warn("monx",e)}return r};
 const _vu=typeof vmUpdate!=="undefined"?vmUpdate:null;
 if(_vu)vmUpdate=function(dt){_vu(dt);try{const tb=performance.now()/1000;for(let i=breath.length-1;i>=0;i--){const o=breath[i];if(!o.F.root.parent){breath.splice(i,1);continue}if(o.F.dead)continue;const s=Math.sin(tb*o.sp+o.ph);o.F.root.scale.set(o.b.x*(1+.006*s),o.b.y*(1+.014*s),o.b.z*(1+.006*s))}}catch(e){}
  try{if(!live.length)return;const t=performance.now()/1000;
   for(let i=live.length-1;i>=0;i--){const[g,m]=live[i];let p=g,ok=false;while(p){if(p===scene){ok=true;break}p=p.parent}
    if(!ok){if(!g.parent)live.splice(i,1);continue}
    if(m.userData.vein){const pulse=.5+.5*Math.sin(t*1.7+m.userData.ph),ang=(typeof C!=="undefined"&&C)?1.35:.7;m.emissiveIntensity=m.userData.vein*.5*ang*(.3+.7*pulse)}
    else if(m.userData.eye){m.emissiveIntensity=m.userData.base*(.8+.35*Math.sin(t*2.3+m.userData.ph)+(Math.random()<.01?.5:0))}}}catch(e){}};
 /* wounds show: the more hurt it is, the darker and redder its hide; death flavours; a slow push-in on the camera when a fight begins */
 const _vu2=vmUpdate;
 vmUpdate=function(dt){_vu2(dt);try{const fighting=typeof C!=="undefined"&&C&&!C.over;
   if(fighting&&!wasC)fightT0=performance.now();wasC=!!fighting;
   if(fighting&&window.CFX){const k=Math.min(1,(performance.now()-fightT0)/1700),e=1-Math.pow(1-k,3),push=4+10*(1-e);CFX.fov=Math.max(CFX.fov||0,push)}
   if(fighting&&C.e&&C.e.max>0){const r=Math.max(0,Math.min(1,1-C.e.hp/C.e.max))*.42;
    for(let i=bodies.length-1;i>=0;i--){const[g,m]=bodies[i];if(!g.parent){bodies.splice(i,1);continue}if(m.userData.b0)m.color.copy(m.userData.b0).lerp(BLOOD,r)}}}catch(e){}};
 try{if(window.fx3&&fx3.die){const _d=fx3.die;fx3.die=function(){let nm="",c=null;try{nm=(C&&C.e&&C.e.name)||"";c=this.g&&this.ctr().clone()}catch(e){}const r=_d.apply(this,arguments);
   try{if(c&&window.vfx){const k=KIND.find(x=>x[0].test(nm)),V=new T.Vector3();
    if(k&&k[1][0]>.9&&k[1][2]<.2)vfx.burst(c,0xff7a20,40,2.4,.1,1.8,-2.6);           /* demons: embers lift away */
    else if(k&&k[1][1]>.9)vfx.burst(c,0x9dffc0,36,1.6,.14,2.2,-3.2);               /* the dead: wisps rise */
    else for(let i=0;i<7;i++){V.set(c.x+(Math.random()-.5)*1.4,(c.y||0)-.8+Math.random()*.4,c.z+(Math.random()-.5)*1.4);try{vfx.smoke(V.clone())}catch(e){}}}}catch(e){}return r}}}catch(e){}
})();

/* ===== audio detail: wandering monsters growl and breathe as they close in (panned to where they are); a heartbeat when you are badly hurt ===== */
(function(){
 if(typeof vmUpdate==="undefined")return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const A2=window.AUDIO2={on:1};let X=null,lp=null,nbuf=null;
 function ctx(){if(X)return X;try{X=new AC();const n=X.sampleRate*2,b=X.createBuffer(1,n,X.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}nbuf=b;return X}catch(e){return null}}
 ["pointerdown","keydown"].forEach(e=>addEventListener(e,()=>{const x=ctx();if(x&&x.state==="suspended")x.resume()},{passive:true}));
 const R=(a,b)=>a+Math.random()*(b-a);
 function pan(p){const n=X.createStereoPanner?X.createStereoPanner():null;if(n)n.pan.value=Math.max(-1,Math.min(1,p));return n}
 function out(node,p){const n=pan(p);if(n){node.connect(n);n.connect(X.destination)}else node.connect(X.destination)}
 function growl(v,p,size){const t=X.currentTime,f=Math.max(38,95/size),len=R(.7,1.3);
  const o=X.createOscillator();o.type="sawtooth";o.frequency.setValueAtTime(f*1.2,t);o.frequency.exponentialRampToValueAtTime(f*.8,t+len);
  const lfo=X.createOscillator(),lg=X.createGain();lfo.frequency.value=R(18,32);lg.gain.value=f*.18;lfo.connect(lg);lg.connect(o.frequency);
  const fl=X.createBiquadFilter();fl.type="lowpass";fl.frequency.value=320+160*Math.random();fl.Q.value=4;
  const g=X.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.25);g.gain.linearRampToValueAtTime(0,t+len);
  o.connect(fl);fl.connect(g);out(g,p);o.start(t);lfo.start(t);o.stop(t+len+.05);lfo.stop(t+len+.05);
  const ns=X.createBufferSource();ns.buffer=nbuf;const nf=X.createBiquadFilter();nf.type="bandpass";nf.frequency.value=R(260,520);nf.Q.value=.9;const ng=X.createGain();ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(v*.7,t+.3);ng.gain.linearRampToValueAtTime(0,t+len);ns.connect(nf);nf.connect(ng);out(ng,p);ns.start(t);ns.stop(t+len+.05)}
 function breathe(v,p){const t=X.currentTime,len=R(.9,1.4),ns=X.createBufferSource();ns.buffer=nbuf;const f=X.createBiquadFilter();f.type="bandpass";f.frequency.value=R(700,1100);f.Q.value=.7;const g=X.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+len*.45);g.gain.linearRampToValueAtTime(0,t+len);ns.connect(f);f.connect(g);out(g,p);ns.start(t);ns.stop(t+len+.05)}
 function thump(v){const t=X.currentTime;[0,.17].forEach((dt,i)=>{const o=X.createOscillator();o.type="sine";o.frequency.setValueAtTime(i?52:62,t+dt);o.frequency.exponentialRampToValueAtTime(34,t+dt+.14);const g=X.createGain();g.gain.setValueAtTime(0,t+dt);g.gain.linearRampToValueAtTime(v*(i?.7:1),t+dt+.02);g.gain.exponentialRampToValueAtTime(.001,t+dt+.18);o.connect(g);g.connect(X.destination);o.start(t+dt);o.stop(t+dt+.2)})}
 const next=new WeakMap();let hbT=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!A2.on||!X||X.state!=="running"||document.hidden||typeof hero==="undefined"||!hero)return;
   const n=performance.now();
   /* heartbeat when hurt */
   const mh=typeof maxHP==="function"?maxHP():hero.maxHp;if(hero.hp>0&&mh&&hero.hp/mh<.3&&n>hbT){hbT=n+(hero.hp/mh<.15?650:950);thump(.18*(1-hero.hp/mh))}
   if(typeof C!=="undefined"&&C)return;if(typeof DG!=="undefined"&&DG)return;
   const cx=P.x,cz=P.z,ys=Math.sin(yaw),yc=Math.cos(yaw);
   (window.__ROAM||[]).forEach(r=>{const g=r.F&&r.F.g;if(!g||!g.visible)return;const dx=g.position.x-cx,dz=g.position.z-cz,d=Math.hypot(dx,dz);if(d>22||d<.5)return;
    const due=next.get(r)||0;if(n<due)return;next.set(r,n+R(3200,6500)*(.5+d/22));
    /* listener faces (-sin yaw, -cos yaw); sideways component for panning */
    const fx=-ys,fz=-yc,side=(dx*(-fz)+dz*fx)/d,vol=.07*Math.pow(1-d/22,1.4),size=g.scale&&g.scale.y?g.scale.y:1;
    if(window.MV&&MV.on&&MV.live)return;if(Math.random()<.55)growl(vol,side*.85,size);else breathe(vol*.8,side*.85)})}catch(e){if(!A2.err){A2.err=1;console.warn("AUDIO2",e)}}};
})();

/* ===== living air: fireflies on dark hours, drifting pollen and dust in the light, a Detail switch in the options ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,L=window.LIFE={on:1};
 const hour=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 let pts=null,pos,vel,N=0,mat;
 function dot(){const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d"),r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,"rgba(255,255,255,1)");r.addColorStop(.35,"rgba(255,255,255,.35)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,32,32);return new T.CanvasTexture(c)}
 function init(){N=q()>=3?220:q()>=2?140:70;const g=new T.BufferGeometry();pos=new Float32Array(N*3);vel=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=P.x+(Math.random()-.5)*30;pos[i*3+1]=0;pos[i*3+2]=P.z+(Math.random()-.5)*30;vel[i*3]=(Math.random()-.5)*.5;vel[i*3+1]=(Math.random()-.5)*.25;vel[i*3+2]=(Math.random()-.5)*.5}
  g.setAttribute("position",new T.BufferAttribute(pos,3));mat=new T.PointsMaterial({size:.22,map:dot(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffe48a,opacity:.0,fog:true,sizeAttenuation:true});
  pts=new T.Points(g,mat);pts.frustumCulled=false;scene.add(pts);pts.userData.ys=new Float32Array(N).map(()=>.4+Math.random()*2)}
 let t=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!L.on||typeof P==="undefined"||typeof world==="undefined"||!world)return;if(!pts){if(q()<1)return;init()}
   const out=world.visible&&!(typeof DG!=="undefined"&&DG)&&!(typeof C!=="undefined"&&C),h=hour(),night=h==="Moon"||h==="Saturn"||h==="Venus";
   pts.visible=!!out;if(!out)return;t+=dt;
   mat.color.setHex(night?0xc8ff7a:0xfff2c0);mat.size=night?.2:.09;
   const goal=night?.95:.45;mat.opacity+=(goal-mat.opacity)*Math.min(1,dt*1.5);
   const ys=pts.userData.ys;
   for(let i=0;i<N;i++){let x=pos[i*3],z=pos[i*3+2];
    if(Math.abs(x-P.x)>15||Math.abs(z-P.z)>15){x=P.x+(Math.random()-.5)*28;z=P.z+(Math.random()-.5)*28;pos[i*3]=x;pos[i*3+2]=z;ys[i]=.4+Math.random()*2}
    pos[i*3]+=(vel[i*3]+Math.sin(t*.9+i)*.35)*dt;pos[i*3+2]+=(vel[i*3+2]+Math.cos(t*.7+i*1.3)*.35)*dt;
    const gy=(typeof hfn==="function"?hfn(pos[i*3],pos[i*3+2]):0);pos[i*3+1]=gy+ys[i]+Math.sin(t*1.3+i*2)*.25}
   pts.geometry.attributes.position.needsUpdate=true}catch(e){if(!L.err){L.err=1;console.warn("LIFE",e)}}};
})();

/* ===== village life and wet world: chimney smoke, glowing windows, puddles in rain, foam on the shorelines, drifting cloud shadows ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined"||typeof POIS==="undefined"||typeof hfn==="undefined")return;
 const T=THREE,VL=window.VLIFE={on:1};
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 const hour=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const HOFF=[[-5,-3],[5,-4],[-6,3],[6,3],[0,-7]];
 let houses=null,glows=[],sm=0,built=0;
 function glowTex(){const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,"rgba(255,215,140,1)");r.addColorStop(.4,"rgba(255,170,70,.55)");r.addColorStop(1,"rgba(255,140,40,0)");g.fillStyle=r;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
 function build(){const v=POIS.find(p=>p.id==="village");if(!v||typeof world==="undefined"||!world)return;built=1;
  const bx=v.x*TW+1,bz=v.y*TW+1,tex=glowTex();houses=HOFF.map(o=>({x:bx+o[0],z:bz+o[1],y:hfn(bx+o[0],bz+o[1])}));
  houses.forEach((h,i)=>{
   const dx=bx-h.x,dz=bz-h.z,l=Math.hypot(dx,dz)||1,fx=dx/l,fz=dz/l,sx=-fz,sz=fx;
   [-1.1,1.1].forEach((s,k)=>{const m=new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,fog:true}),sp=new T.Sprite(m);
    sp.scale.set(1.35,1.1,1);sp.position.set(h.x+fx*2.75+sx*s,h.y+1.55,h.z+fz*2.75+sz*s);sp.userData.ph=i*1.7+k*2.3;world.add(sp);glows.push(sp)})})}
 /* puddles: dark glassy discs on open ground while it rains */
 let pud=null,pl=0,pc=1e9,pz=1e9,pt=0;
 function puddles(){const g=new T.CircleGeometry(1,14);g.rotateX(-Math.PI/2);const m=new T.MeshStandardMaterial({color:0x1a2530,roughness:.05,metalness:.7,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  pud=new T.InstancedMesh(g,m,90);pud.count=0;pud.frustumCulled=false;world.add(pud)}
 const hash=(x,y,s)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
 const mm=new T.Matrix4(),qq=new T.Quaternion(),pp=new T.Vector3(),ss=new T.Vector3();
 function placePud(cx,cz){let n=0;const c=3.2,R=22;for(let ix=Math.floor((cx-R)/c);ix<=Math.floor((cx+R)/c)&&n<90;ix++)for(let iz=Math.floor((cz-R)/c);iz<=Math.floor((cz+R)/c)&&n<90;iz++){
   if(hash(ix,iz,1)>.28)continue;const x=(ix+hash(ix,iz,2))*c,z=(iz+hash(ix,iz,3))*c,tx=Math.floor(x/TW),ty=Math.floor(z/TW);if(tx<0||ty<0||tx>=W||ty>=H)continue;
   const tn=map[ty][tx];if(tn!=="grass"&&tn!=="hill"&&tn!=="bog"&&tn!=="rock")continue;const y=hfn(x,z);if(y<.12)continue;const r=.5+hash(ix,iz,4)*1.1;
   pp.set(x,y+.04,z);qq.identity();ss.set(r,1,r*(.7+hash(ix,iz,5)*.5));mm.compose(pp,qq,ss);pud.setMatrixAt(n++,mm)}
  pud.count=n;pud.instanceMatrix.needsUpdate=true}
 /* shoreline foam: pale flecks where the ground meets the water line */
 let foam=null,fx0=1e9,fz0=1e9;
 function foamInit(){const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d"),r=g.createRadialGradient(16,16,1,16,16,16);r.addColorStop(0,"rgba(255,255,255,.95)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,32,32);
  const geo=new T.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);foam=new T.InstancedMesh(geo,new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,opacity:.6,fog:true,color:0xeaf6ff}),900);foam.count=0;foam.frustumCulled=false;world.add(foam)}
 function foamBuild(cx,cz){let n=0;const c=.9,R=28;for(let ix=Math.floor((cx-R)/c);ix<=Math.floor((cx+R)/c)&&n<900;ix++)for(let iz=Math.floor((cz-R)/c);iz<=Math.floor((cz+R)/c)&&n<900;iz++){
   const x=(ix+hash(ix,iz,7))*c,z=(iz+hash(ix,iz,8))*c,y=hfn(x,z);if(Math.abs(y+.02)>.07)continue;const s=.5+hash(ix,iz,9)*.9;
   pp.set(x,.02,z);qq.setFromAxisAngle(new T.Vector3(0,1,0),hash(ix,iz,6)*6.28);ss.set(s*1.4,1,s);mm.compose(pp,qq,ss);foam.setMatrixAt(n++,mm)}
  foam.count=n;foam.instanceMatrix.needsUpdate=true}
 let t=0,sBase=null,sWrote=null;
 const _vu=vmUpdate;
 vmUpdate=function(dt){
  /* cloud shadows: the sun slowly breathes as clouds pass */
  try{if(VL.on&&typeof sunL!=="undefined"&&sunL&&sWrote!=null&&Math.abs(sunL.intensity-sWrote)<1e-6)sunL.intensity=sBase}catch(e){}
  _vu(dt);
  try{if(!VL.on||typeof world==="undefined"||!world)return;
   t+=dt;const out=world.visible&&!(typeof DG!=="undefined"&&DG);
   if(typeof sunL!=="undefined"&&sunL&&out){sBase=sunL.intensity;const f=.82+.18*(.5+.5*Math.sin(t*.13)*Math.sin(t*.071+1.3)+.0);sWrote=sBase*Math.min(1,f+.1);sunL.intensity=sWrote}else sWrote=null;
   if(!built&&q()>=1)build();
   const night=["Moon","Saturn","Venus"].includes(hour()),near=houses&&houses[0]&&Math.hypot(P.x-houses[0].x,P.z-houses[0].z)<60;
   glows.forEach(s=>{s.visible=!!out;if(!out)return;const goal=(night?.9:.28)*(near?1:0),fl=.88+.12*Math.sin(t*7+s.userData.ph)*Math.sin(t*3.3+s.userData.ph);s.material.opacity+=(goal*fl-s.material.opacity)*Math.min(1,dt*2)});
   /* chimney smoke */
   sm-=dt;if(out&&near&&sm<=0&&window.vfx&&vfx.smoke){sm=1.1;const h=houses[Math.floor(Math.random()*houses.length)];try{vfx.smoke(new T.Vector3(h.x+(Math.random()-.5)*.6,h.y+4.6,h.z+(Math.random()-.5)*.6))}catch(e){}}
   /* puddles */
   const rainy=typeof WX!=="undefined"&&WX&&(WX.state==="drizzle"||WX.state==="storm");
   if(q()>=2&&out){if(!pud)puddles();pt+=dt;if(Math.hypot(P.x-pc,P.z-pz)>6||pt>6){pt=0;pc=P.x;pz=P.z;placePud(P.x,P.z)}
    const goal=rainy?.75:0;pud.material.opacity+=(goal-pud.material.opacity)*Math.min(1,dt*.5);pud.visible=pud.material.opacity>.02}
   else if(pud)pud.visible=false;
   /* foam */
   if(q()>=2&&out){if(!foam)foamInit();foam.visible=true;if(Math.hypot(P.x-fx0,P.z-fz0)>8){fx0=P.x;fz0=P.z;foamBuild(P.x,P.z)}foam.material.opacity=.45+.15*Math.sin(t*1.6)}else if(foam)foam.visible=false
  }catch(e){if(!VL.err){VL.err=1;console.warn("VLIFE",e)}}};
})();

/* ===== bosses stand apart: a spiked crown, hanging chains, a ring of slow runes and a heavier presence; townsfolk turn their heads to watch you ===== */
(function(){
 if(typeof THREE==="undefined"||typeof startCombat==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,BS=window.BOSSX={on:1};
 const iron=()=>new T.MeshStandardMaterial({color:0x4a4640,metalness:.85,roughness:.45});
 function runeTex(){const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d"),gl=["♄","♃","♂","☉","♀","☿","☽"];g.fillStyle="rgba(0,0,0,0)";g.clearRect(0,0,128,128);g.font="84px serif";g.textAlign="center";g.textBaseline="middle";g.fillStyle="#ffd890";g.shadowColor="#ff7a30";g.shadowBlur=14;g.fillText(gl[Math.floor(Math.random()*7)],64,68);return new T.CanvasTexture(c)}
 let ring=null;
 function dress(){try{if(!BS.on||!C||!C.boss||!fx3.g||fx3.g.userData.boss)return;const g=fx3.g;g.userData.boss=1;
  const bb=new T.Box3().setFromObject(g),top=(bb.max.y-g.position.y)/(g.scale.y||1),w=Math.max(.3,(bb.max.x-bb.min.x)/(g.scale.x||1)*.22);
  /* crown of iron spikes */
  const cr=new T.Group(),m=iron();for(let i=0;i<8;i++){const a=i/8*6.283,sp=new T.Mesh(new T.ConeGeometry(.03,.2+.06*(i%2),5),m);sp.position.set(Math.cos(a)*.14,.1,Math.sin(a)*.14);sp.rotation.z=-Math.cos(a)*.18;sp.rotation.x=Math.sin(a)*.18;cr.add(sp)}
  const band=new T.Mesh(new T.TorusGeometry(.14,.025,6,16),m);band.rotation.x=Math.PI/2;cr.add(band);cr.position.set(0,top-.02,0);g.add(cr);
  /* chains hanging from the shoulders */
  const ch=new T.Group();[-1,1].forEach(side=>{for(let r=0;r<2;r++){for(let i=0;i<9;i++){const l=new T.Mesh(new T.TorusGeometry(.034,.011,5,8),m);const t=i/8;l.position.set(side*(.2+.08*Math.sin(t*3.1)+r*.05),top*.74-t*top*.42+(r?.05:0),.16+(r?.03:0));l.rotation.set(i%2?Math.PI/2:0,0.2,i*.4);ch.add(l)}}});g.add(ch);
  /* ring of slow runes around its feet */
  ring=new T.Group();for(let i=0;i<7;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:runeTex(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,opacity:.85}));const a=i/7*6.283;sp.position.set(Math.cos(a)*1.6,.15,Math.sin(a)*1.6);sp.scale.set(.55,.55,1);ring.add(sp)}
  ring.userData.t=0;g.add(ring);BS.ring=ring;
  try{toast("A great presence fills the air.")}catch(e){}}catch(e){console.warn("boss",e)}}
 const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);setTimeout(dress,500);setTimeout(dress,1800);return r};
 /* head-turn for townsfolk and companions */
 const _vu=vmUpdate,hb=new WeakMap();
 const headOf=F=>{let s=null;F.root&&F.root.traverse(o=>{if(!s&&o.isSkinnedMesh)s=o.skeleton});return s&&(s.bones.find(b=>b.name==="Head")||s.bones.find(b=>/head/i.test(b.name)))};
 vmUpdate=function(dt){_vu(dt);
  try{if(BS.ring&&BS.ring.parent){BS.ring.rotation.y+=dt*.5;BS.ring.children.forEach((s,i)=>{s.position.y=.15+.12*Math.sin(performance.now()/700+i)})}}catch(e){}
  try{if(!BS.on||!window.__ALL||(typeof C!=="undefined"&&C)||(typeof DG!=="undefined"&&DG))return;
   __ALL.forEach(F=>{try{const g=F.g;if(!g||!g.visible||!g.parent||!F.hum)return;const dx=P.x-g.position.x,dz=P.z-g.position.z,d=Math.hypot(dx,dz);
    let rec=hb.get(F);if(!rec){rec={b:headOf(F),cur:0};hb.set(F,rec)}if(!rec.b)return;
    let want=0;if(d<8){const a=Math.atan2(dx,dz)-g.rotation.y;const w=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(w)<1.9)want=Math.max(-.7,Math.min(.7,w))*Math.min(1,(8-d)/3)}
    rec.cur+=(want-rec.cur)*Math.min(1,dt*3);rec.b.rotation[BS.axis]+=rec.cur}catch(e){}})}catch(e){}};
 BS.axis="z";
})();

/* ===== look: colour grade by region, soft edge focus in fights and talk, stronger glow on lights, a sun disc, rainbows after storms, ripples in water, photo mode ===== */
(function(){
 if(typeof THREE==="undefined"||typeof POST==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,GR=window.GRADE={on:1,photo:0};
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 const TINT={forest:[1,1.03,.96],swamp:[.9,1.06,.86],desert:[1.1,1.0,.82],tundra:[.9,.98,1.12],mountain:[1,1,1.05],hills:[1.03,1.03,.94]};
 const cur=new T.Vector3(1,1,1),goal=new T.Vector3(1,1,1);let dof=0,patched=0;
 function patch(){try{const m=POST.mComp;if(!m||patched)return;let f=m.fragmentShader;if(f.indexOf("gtint")>=0){patched=1;return}
  f=f.replace("uniform float sharp;","uniform float sharp;uniform vec3 gtint;uniform float dofk;");
  const a="vec3 col=vec3(texture2D(tS,uv+off).r,texture2D(tS,uv).g,texture2D(tS,uv-off).b);";if(f.indexOf(a)<0)return;
  f=f.replace(a,a+"{float bk=dofk*smoothstep(.04,.3,r2);if(bk>.001){vec2 bp=bk*tpx*7.;vec3 s=col;s+=texture2D(tS,uv+vec2(bp.x,0.)).rgb;s+=texture2D(tS,uv-vec2(bp.x,0.)).rgb;s+=texture2D(tS,uv+vec2(0.,bp.y)).rgb;s+=texture2D(tS,uv-vec2(0.,bp.y)).rgb;s+=texture2D(tS,uv+bp).rgb;s+=texture2D(tS,uv-bp).rgb;s+=texture2D(tS,uv+vec2(bp.x,-bp.y)).rgb;s+=texture2D(tS,uv+vec2(-bp.x,bp.y)).rgb;col=mix(col,s/9.,min(1.,bk*1.6));}}");
  const v="col*=1.-smoothstep(.12,.62,r2*1.8)*vig;";if(f.indexOf(v)<0)return;f=f.replace(v,"col*=gtint;"+v);
  m.fragmentShader=f;m.uniforms.gtint={value:cur};m.uniforms.dofk={value:0};m.needsUpdate=true;patched=1}catch(e){console.warn("grade patch",e)}}
 /* sun disc */
 let sun=null,rb=null,rbT=0,lastW="clear",rip=[],rpT=0;
 function mkSun(){const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d"),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,"rgba(255,250,225,1)");r.addColorStop(.12,"rgba(255,244,200,1)");r.addColorStop(.2,"rgba(255,220,150,.55)");r.addColorStop(.6,"rgba(255,180,90,.12)");r.addColorStop(1,"rgba(255,160,70,0)");g.fillStyle=r;g.fillRect(0,0,128,128);
  sun=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,fog:false,opacity:.0}));sun.scale.set(50,50,1);sun.renderOrder=-1;scene.add(sun)}
 function mkRainbow(){const g=new T.RingGeometry(220,245,64,6,0,Math.PI),n=g.attributes.position.count,col=new Float32Array(n*3),p=g.attributes.position,C=[[1,.2,.2],[1,.6,.15],[1,.95,.3],[.3,.9,.4],[.3,.6,1],[.5,.3,.9]];
  for(let i=0;i<n;i++){const rr=Math.hypot(p.getX(i),p.getY(i)),k=Math.min(.999,Math.max(0,(rr-220)/25))*5,i0=Math.floor(k),f=k-i0,a=C[i0],b=C[Math.min(5,i0+1)];col[i*3]=a[0]+(b[0]-a[0])*f;col[i*3+1]=a[1]+(b[1]-a[1])*f;col[i*3+2]=a[2]+(b[2]-a[2])*f}
  g.setAttribute("color",new T.BufferAttribute(col,3));rb=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,fog:false,blending:T.AdditiveBlending}));rb.renderOrder=-1;scene.add(rb)}
 /* ripples in water */
 function mkRip(){const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");g.strokeStyle="rgba(255,255,255,.9)";g.lineWidth=3;g.beginPath();g.arc(32,32,26,0,6.283);g.stroke();const tx=new T.CanvasTexture(c);
  for(let i=0;i<6;i++){const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,opacity:0,fog:true}));m.rotation.x=-Math.PI/2;m.visible=false;m.userData.t=1;scene.add(m);rip.push(m)}}
 /* photo mode */
 function photo(on){GR.photo=on?1:0;try{let st=document.getElementById("photocss");if(!st){st=document.createElement("style");st.id="photocss";st.textContent="body.photo>*:not(canvas):not(#photohint){visibility:hidden!important}#photohint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99;padding:5px 14px;border-radius:14px;background:rgba(0,0,0,.55);color:#e9ddbf;font:12px Cinzel,Georgia,serif;opacity:0;transition:opacity 2s;pointer-events:none}body.photo #photohint{visibility:visible!important;opacity:.9}";document.head.appendChild(st);const h=document.createElement("div");h.id="photohint";h.textContent="Photo mode: look around, then press Win+Shift+S to capture. F9 or Esc to return.";document.body.appendChild(h)}
  document.body.classList.toggle("photo",!!on);if(on)setTimeout(()=>{const h=document.getElementById("photohint");if(h)h.style.opacity=0},4000)}catch(e){}}
 addEventListener("keydown",e=>{if(e.key==="F9"){e.preventDefault();photo(!GR.photo)}else if(e.key==="Escape"&&GR.photo)photo(false)});
 GR.setPhoto=photo;
 const _vu=vmUpdate;let t=0;
 vmUpdate=function(dt){_vu(dt);try{if(!GR.on)return;t+=dt;patch();
   if(POST.mBright&&q()>=2)POST.mBright.uniforms.th.value=1.02;
   /* grade by region */
   if(typeof biome!=="undefined"&&typeof P!=="undefined"){const tx=Math.floor(P.x/TW),ty=Math.floor(P.z/TW);const b=biome[ty]&&biome[ty][tx],tt=TINT[b]||[1,1,1];goal.set(tt[0],tt[1],tt[2]);cur.lerp(goal,Math.min(1,dt*.6))}
   /* edge focus */
   const talk=typeof D!=="undefined"&&D,fight=typeof C!=="undefined"&&C&&!C.over;const dg=talk?.7:fight?.5:0;dof+=(dg-dof)*Math.min(1,dt*2.5);
   if(POST.mComp&&POST.mComp.uniforms.dofk)POST.mComp.uniforms.dofk.value=q()>=2?dof:0;
   const out=typeof world!=="undefined"&&world&&world.visible&&!(typeof DG!=="undefined"&&DG);
   /* sun disc */
   if(q()>=2&&!sun&&scene)mkSun();
   if(sun){let o=0;if(out&&typeof sunL!=="undefined"&&sunL&&sunL.intensity>.55){const d=new T.Vector3().subVectors(sunL.position,sunL.target?sunL.target.position:new T.Vector3()).normalize();sun.position.copy(camera.position).addScaledVector(d,290);
     const fw=new T.Vector3();camera.getWorldDirection(fw);o=Math.max(0,fw.dot(d))*.95}
    sun.material.opacity+=(o-sun.material.opacity)*Math.min(1,dt*3);sun.visible=sun.material.opacity>.01}
   /* rainbow after rain */
   if(typeof WX!=="undefined"&&WX){if((lastW==="storm"||lastW==="drizzle")&&WX.state==="clear"&&out){rbT=100;if(!rb&&q()>=2)mkRainbow();if(rb){const fw=new T.Vector3();camera.getWorldDirection(fw);rb.userData.yaw=Math.atan2(fw.x,fw.z)+Math.PI}}lastW=WX.state}
   if(rb){if(rbT>0){rbT-=dt;const k=Math.min(1,rbT/20,(100-rbT)/6);rb.material.opacity=.32*Math.max(0,k);rb.position.copy(camera.position);rb.position.y-=40;rb.rotation.set(0,rb.userData.yaw||0,0);rb.rotation.y=(rb.userData.yaw||0)+Math.PI;rb.visible=true}else rb.visible=false}
   /* ripples */
   if(out&&q()>=2&&typeof hfn==="function"){if(!rip.length)mkRip();const inW=hfn(P.x,P.z)<0;rpT-=dt;if(inW&&rpT<=0&&(window.__lastMove===undefined||true)){rpT=.45;const m=rip.find(r=>r.userData.t>=1);if(m){m.userData.t=0;m.position.set(P.x,.04,P.z);m.visible=true}}
    rip.forEach(m=>{if(m.userData.t<1){m.userData.t+=dt*.7;const k=m.userData.t;m.scale.set(.5+k*3.2,.5+k*3.2,1);m.material.opacity=.5*(1-k);if(k>=1)m.visible=false}})}
  }catch(e){if(!GR.err){GR.err=1;console.warn("GRADE",e)}}};
})();

/* ===== water: moving ripples, sky reflection at low angles, sun glitter ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const W2=window.WATER2={on:1,done:0};
 const U={uT:{value:0},uSky:{value:new THREE.Color(.6,.72,.85)},uSun:{value:new THREE.Vector3(.3,.8,.3)},uSI:{value:1},uK:{value:1}};
 function patch(){try{
  if(typeof waterM==="undefined"||!waterM||!waterM.material)return;const m=waterM.material;
  m.onBeforeCompile=function(sh){Object.assign(sh.uniforms,U);
   sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>","#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;");
   sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 vWP;uniform float uT,uSI,uK;uniform vec3 uSky,uSun;")
   .replace("#include <normal_fragment_maps>","#include <normal_fragment_maps>\n{vec3 p=vWP;vec2 g=vec2(cos(p.x*1.1+uT*.9)+.7*cos(p.x*2.3+p.z*1.7-uT*1.3)+.5*cos(p.z*3.7+uT*1.9),cos(p.z*1.0-uT*.8)+.7*cos(p.z*2.1-p.x*1.9+uT*1.1)+.5*cos(p.x*4.1-uT*1.7));vec3 tw=vec3(-g.x,.0,-g.y)*.045*uK;normal=normalize(normal+mat3(viewMatrix)*tw);}")
   .replace("#include <dithering_fragment>","#include <dithering_fragment>\n{vec3 V=normalize(vViewPosition);float fr=pow(1.-clamp(dot(normalize(normal),V),0.,1.),3.);gl_FragColor.rgb=mix(gl_FragColor.rgb,uSky,clamp(.04+fr*.5,0.,.55)*uK);vec3 R=reflect(-V,normalize(normal));vec3 sv=normalize(mat3(viewMatrix)*uSun);float gl=pow(max(dot(R,sv),0.),220.)*uSI*3.5+pow(max(dot(R,sv),0.),24.)*uSI*.15;gl_FragColor.rgb+=vec3(1.,.93,.78)*gl*uK;}");};
  m.customProgramCacheKey=()=>"water2";m.needsUpdate=true;W2.done=1}catch(e){console.warn("WATER2",e)}}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!W2.done){patch();return}
   U.uT.value=performance.now()/1000;U.uK.value=W2.on?1:0;
   if(typeof scene!=="undefined"&&scene.fog){const c=scene.fog.color;U.uSky.value.setRGB(Math.min(1,c.r*.95+.02),Math.min(1,c.g*.95+.03),Math.min(1,c.b*1.0+.06))}
   if(typeof sunL!=="undefined"&&sunL){U.uSun.value.copy(sunL.position).sub(sunL.target?sunL.target.position:new THREE.Vector3()).normalize();U.uSI.value=Math.min(1.5,sunL.intensity)*(sunL.visible?1:0)}
  }catch(e){}};
})();

/* ===== wear: blood and grime build up on your weapon; village banners ripple in the wind ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,WR=window.WEAR={on:1,blood:0,dirt:0,wind:1};
 /* ---------- weapon grime ---------- */
 const mats=[],armM=[];let lastRoot=null;
 function collect(root){mats.length=0;armM.length=0;root.traverse(o=>{if(!o.isSkinnedMesh||!o.material)return;let p=o,w=false;while(p){if(/^(Sword|Mace|Dagger|Holy|Staff|Bow|Arrow|Orb)/.test(p.name||"")){w=true;break}p=p.parent}if(w)return;(Array.isArray(o.material)?o.material:[o.material]).forEach((m,i)=>{if(!m.color)return;const c=m.clone();if(m.onBeforeCompile)c.onBeforeCompile=m.onBeforeCompile;if(Array.isArray(o.material))o.material[i]=c;else o.material=c;armM.push({m:c,c0:c.color.clone(),r0:c.roughness===undefined?.7:c.roughness})})});root.traverse(o=>{if(!o.isMesh||!o.material)return;let p=o,ok=false;while(p){if(/^(Sword|Mace|Dagger|Holy|Staff)/.test(p.name||"")){ok=true;break}p=p.parent}
   if(!ok)return;const arr=Array.isArray(o.material)?o.material:[o.material];
   arr.forEach((m,i)=>{if(!m.color)return;const c=m.clone();if(m.onBeforeCompile)c.onBeforeCompile=m.onBeforeCompile;if(Array.isArray(o.material))o.material[i]=c;else o.material=c;
    mats.push({mesh:o,m:c,c0:c.color.clone(),r0:c.roughness===undefined?.5:c.roughness,mt0:c.metalness===undefined?0:c.metalness,l:(c.color.r+c.color.g+c.color.b)/3})})})}
 const BL=new T.Color(0x3c0707),DT=new T.Color(0x4a3a24),tmp=new T.Color();
 try{const _fd=foeDamage;foeDamage=function(n){const r=_fd.apply(this,arguments);try{if(typeof n==="number"&&n>0)WR.blood=Math.min(1,WR.blood+.07+Math.min(.12,n*.012));WR.dirt=Math.min(.6,WR.dirt+.02)}catch(e){}return r}}catch(e){}
 let sig=-1,tClean=0;
 const _vu0=vmUpdate;
 vmUpdate=function(dt){_vu0(dt);try{
   if(typeof hero==="undefined"||!hero)return;
   const root=(typeof vmScene!=="undefined")?vmScene:null;
   if(root&&(!mats.length||mats[0].mesh.material!==mats[0].m)&&(!WR._ct||performance.now()-WR._ct>1500)){WR._ct=performance.now();collect(root);sig=-1}
   /* blood dries and fades slowly, a wash in water cleans it */
   WR.blood=Math.max(0,WR.blood-dt*.0035);
   try{if(typeof hfn==="function"&&typeof P!=="undefined"&&hfn(P.x,P.z)<-.05){WR.blood=Math.max(0,WR.blood-dt*.25);WR.dirt=Math.max(0,WR.dirt-dt*.1)}}catch(e){}
   try{if(typeof P!=="undefined"&&(!WR._px||Math.hypot(P.x-WR._px,P.z-WR._pz)>.5)){if(WR._px!==undefined)WR.dirt=Math.min(.6,WR.dirt+.0006+((window.SKY2&&SKY2.wet>.5)?.0012:0));WR._px=P.x;WR._pz=P.z}}catch(e){}
   const s=Math.round(WR.blood*40)*100+Math.round(WR.dirt*40)+(WR.on?0:99999);
   if(s!==sig&&mats.length){sig=s;const b=WR.on?WR.blood:0,d=WR.on?WR.dirt:0;
    armM.forEach(o=>{tmp.copy(o.c0).lerp(DT,Math.min(.5,d*.8)).lerp(BL,Math.min(.2,b*.22));o.m.color.copy(tmp);if(o.m.roughness!==undefined)o.m.roughness=Math.min(1,o.r0+d*.3)});
    mats.forEach(o=>{const metal=o.l>.72?1:.3;tmp.copy(o.c0).lerp(DT,d*.6*metal).lerp(BL,Math.min(.85,b*.9*metal));o.m.color.copy(tmp);
     if(o.m.roughness!==undefined)o.m.roughness=Math.min(1,o.r0+(b*.35+d*.4)*metal);if(o.m.metalness!==undefined)o.m.metalness=o.mt0*(1-(b*.6+d*.4)*metal)})}
  }catch(e){if(!WR._e){WR._e=1;console.warn("WEAR",e)}}};
 /* ---------- banners ---------- */
 const U={uT:{value:0},uW:{value:1}};let ban=null,built=0;
 const COLS=[["#7a1a1a","#e0b050"],["#1a3a6a","#d8d8e8"],["#2a5a2a","#e8d890"],["#5a2a6a","#e0c0f0"],["#8a5a14","#2a1a08"]];
 function tex(i){const c=document.createElement("canvas");c.width=128;c.height=192;const g=c.getContext("2d"),[a,b]=COLS[i%COLS.length];
  g.fillStyle=a;g.fillRect(0,0,128,192);g.fillStyle=b;g.fillRect(0,0,128,10);g.fillRect(0,182,128,10);
  g.strokeStyle=b;g.lineWidth=4;g.beginPath();for(let k=0;k<7;k++){const an=-Math.PI/2+k*3*2*Math.PI/7;g.lineTo(64+36*Math.cos(an),88+36*Math.sin(an))}g.closePath();g.stroke();
  g.beginPath();g.arc(64,88,46,0,6.283);g.lineWidth=3;g.stroke();g.beginPath();g.moveTo(0,192);g.lineTo(64,150);g.lineTo(128,192);g.fillStyle="rgba(0,0,0,.25)";g.fill();
  const t=new T.CanvasTexture(c);t.anisotropy=4;return t}
 function build(){try{const v=POIS.find(p=>p.id==="village");if(!v||typeof world==="undefined"||!world)return;built=1;ban=new T.Group();
   const bx=v.x*TW+1,bz=v.y*TW+1,spots=[[-3,-2],[3,-2.5],[-3.5,2],[3.5,2],[0,-5]];
   spots.forEach((o,i)=>{const x=bx+o[0],z=bz+o[1],y=hfn(x,z),h=4.2;
    const pole=new T.Mesh(new T.CylinderGeometry(.045,.06,h,6),new T.MeshStandardMaterial({color:0x4a3220,roughness:.9}));pole.position.set(x,y+h/2,z);ban.add(pole);
    const gm=new T.PlaneGeometry(1.1,1.7,10,14);gm.translate(.55,-.85,0);
    const mt=new T.MeshStandardMaterial({map:tex(i),side:T.DoubleSide,roughness:.85});
    mt.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT,uW;").replace("#include <begin_vertex>","#include <begin_vertex>\n{float k=uv.x;float ph=uT*3.1-position.x*4.5+position.y*1.2;transformed.z+=sin(ph)*.16*k*uW+sin(ph*1.9+1.)*.05*k*uW;transformed.y-=k*k*.06*uW*(.5+.5*sin(ph));}")};
    const fl=new T.Mesh(gm,mt);fl.position.set(x+.05,y+h-.2,z);fl.rotation.y=i*1.3;fl.userData.ph=i;ban.add(fl);fl.userData.top=y+h;
    const bar=new T.Mesh(new T.CylinderGeometry(.03,.03,1.15,5),new T.MeshStandardMaterial({color:0x4a3220}));bar.rotation.z=Math.PI/2;bar.position.set(x+.6,y+h-.18,z);bar.rotation.y=fl.rotation.y;
    /* rotate bar around the pole to follow the cloth */
    const piv=new T.Group();piv.position.set(x,0,z);piv.rotation.y=fl.rotation.y;bar.rotation.y=0;bar.position.set(.6,y+h-.18,0);piv.add(bar);bar.rotation.set(0,0,Math.PI/2);ban.add(piv)});
   world.add(ban)}catch(e){console.warn("BAN",e)}}
 const _vu1=vmUpdate;
 vmUpdate=function(dt){_vu1(dt);try{
   if(!built){if(typeof world==="undefined"||!world||typeof POIS==="undefined")return;build()}
   if(!ban)return;
   const lv=(window.VIL&&VIL.lv>0)?VIL.lv:0,show=WR.on&&(lv>=2||WR.force)&&!(typeof DG!=="undefined"&&DG);ban.visible=!!show;if(!show)return;
   U.uT.value=performance.now()/1000;let w=1;try{const s=WX.state||WX.cur||"clear";w=({storm:2.2,drizzle:1.4,mist:.7,clear:1,snow:1.1,dust:1.6})[s]||1}catch(e){}U.uW.value=w*(WR.wind?1:0)
  }catch(e){}};
})();

/* ===== sky and ground weather: billowing clouds that follow the weather, cloud shadows drifting over the land, rain-wet ground, snow that settles ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,SK=window.SKY2={on:1,shadow:1,wet:0,snow:0,cs:0,sh:1,wetOn:1,snowOn:1};
 const U={uD:{value:new T.Vector2()},uCS:{value:0},uWet:{value:0},uSnow:{value:0},uDay:{value:1},uMud:{value:0}};
 /* ---------- ground shader patch (shared by terrain, trees, rocks, roofs) ---------- */
 const GLSL=`float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float cmk(vec2 p){return vn(p)*.55+vn(p*2.1+7.)*.3+vn(p*4.3+3.)*.15;}`;
 function patch(m,fig){if(!m||m.__sk2||m.transparent||!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial))return;m.__sk2=1;if(fig)m.defines=Object.assign({},m.defines,{SK2_FIG:1});
  const prev=m.onBeforeCompile,pk=m.customProgramCacheKey?m.customProgramCacheKey():"";
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);Object.assign(sh.uniforms,U);
   if(sh.vertexShader.indexOf("vSkW")<0){
    sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vSkW;varying vec3 vSkN;varying float vSkH;")
     .replace("#include <project_vertex>","#include <project_vertex>\n{vec4 wq=vec4(transformed,1.);vec3 nq=objectNormal;\n#ifdef USE_INSTANCING\nwq=instanceMatrix*wq;nq=mat3(instanceMatrix)*nq;\n#endif\nvSkW=(modelMatrix*wq).xyz;vSkH=vSkW.y-modelMatrix[3][1];vSkN=normalize(mat3(modelMatrix)*nq);}");
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 vSkW;varying vec3 vSkN;varying float vSkH;uniform vec2 uD;uniform float uCS,uWet,uSnow,uDay,uMud;\n"+GLSL)
     .replace("#include <alphatest_fragment>","#include <alphatest_fragment>\n{float up=clamp(vSkN.y,0.,1.);float sn=uSnow*smoothstep(.35,.75,up)*(.75+.25*vn(vSkW.xz*.9+vSkW.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.94,1.),clamp(sn,0.,1.));diffuseColor.rgb*=1.-.3*uWet*(1.-uSnow*.8);}\n#ifdef SK2_FIG\n{float mh=smoothstep(.62,.0,vSkH)*(.5+.5*vn(vSkW.xz*9.+vSkW.y*4.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.15,.1,.06),clamp(mh*uMud*1.4,0.,.85));}\n#endif")
     .replace("#include <dithering_fragment>","#include <dithering_fragment>\n{float cm=smoothstep(.46,.68,cmk(vSkW.xz*.013+uD));gl_FragColor.rgb*=1.-uCS*cm;}");
    if(sh.fragmentShader.indexOf("#include <roughnessmap_fragment>")>=0)sh.fragmentShader=sh.fragmentShader.replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,min(roughnessFactor,.38),uWet*clamp(vSkN.y,0.,1.)*(1.-uSnow));")}};
  m.customProgramCacheKey=()=>pk+"sk2";m.needsUpdate=true}
 SK.patch=patch;let scanT=0,patched=0;
 function scan(){if(typeof world==="undefined"||!world)return;let n=0;world.traverse(o=>{if(!(o.isMesh||o.isInstancedMesh)||!o.material)return;if(o.userData&&o.userData.nosk)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m.__sk2){patch(m);n++}})});patched+=n}
 /* ---------- clouds ---------- */
 function cloudTex(seed){const S=256,c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d");let s=seed*977+13;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  g.clearRect(0,0,S,S);
  /* many soft puffs; the middle is denser (so it reads as a thick body seen from below) */
  for(let k=0;k<70;k++){const a=rnd()*6.283,d=Math.pow(rnd(),.7)*S*.34,x=S/2+Math.cos(a)*d*1.25,y=S/2+Math.sin(a)*d*.8,r=S*(.05+rnd()*.12);
   const gr=g.createRadialGradient(x,y,0,x,y,r),sh=Math.round(205+rnd()*50-d*.2);gr.addColorStop(0,`rgba(${sh},${sh},${Math.min(255,sh+6)},${.22+rnd()*.15})`);gr.addColorStop(1,`rgba(${sh},${sh},${sh},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  /* underside shading: a soft darker core */
  const core=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S*.32);core.addColorStop(0,"rgba(120,126,140,.32)");core.addColorStop(1,"rgba(120,126,140,0)");g.globalCompositeOperation="source-atop";g.fillStyle=core;g.fillRect(0,0,S,S);
  /* fade the border so no hard edge appears */
  g.globalCompositeOperation="destination-in";const f=g.createRadialGradient(S/2,S/2,S*.18,S/2,S/2,S*.5);f.addColorStop(0,"rgba(0,0,0,1)");f.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=f;g.fillRect(0,0,S,S);
  const t=new T.CanvasTexture(c);t.anisotropy=2;return t}
 let CL=null;
 const COV={clear:.38,drizzle:.8,storm:1,mist:.3,snow:.75,dust:.45},DARK={clear:1,drizzle:.62,storm:.38,mist:.9,snow:.78,dust:.82},SPD={clear:1.5,drizzle:2.6,storm:5,mist:.8,snow:1.8,dust:3.2};
 function initClouds(){if(typeof cloudG==="undefined"||!cloudG||!cloudG.children.length)return;
  const tx=[1,2,3,4].map(cloudTex),base=cloudG.children.slice();CL=[];
  const mk=(c,i)=>{c.material=new T.MeshBasicMaterial({map:tx[i%4],transparent:true,opacity:.0,depthWrite:false,fog:false,color:0xffffff});c.rotation.z=i*1.7;CL.push({m:c,i,o:0})};
  base.forEach((c,i)=>{const s=1.5+(i%3)*.3;c.scale.set(s,s,1);mk(c,i)});
  /* a second, lower and higher layer of clouds */
  for(let i=0;i<20;i++){const c=new T.Mesh(new T.PlaneGeometry(90+((i*37)%70),55+((i*13)%35)),null);c.rotation.x=Math.PI/2;const h=((i*7919)%1000)/1000,h2=((i*104729)%1000)/1000,h3=((i*15485863)%1000)/1000;c.position.set((h-.5)*500,70+h2*60,(h3-.5)*500);c.scale.set(1.6,1.6,1);cloudG.add(c);mk(c,i+16)}}
 /* ---------- state ---------- */
 const vu=vmUpdate;let drift=0,spd=1.5;
 vmUpdate=function(dt){vu(dt);try{
   if(typeof hero==="undefined"||!hero)return;
   if(!CL)initClouds();
   if((scanT-=dt)<=0){scanT=patched<30?1.5:6;scan()}
   let st="clear";try{st=WX.state||"clear"}catch(e){}
   const wetT=(st==="drizzle"?1:st==="storm"?1:0),snowT=st==="snow"?1:0,d=Math.min(dt,.1);
   SK.wet=Math.max(0,Math.min(1,SK.wet+(wetT?d*(st==="storm"?.03:.018):-d*.0035)));
   SK.snow=Math.max(0,Math.min(1,SK.snow+(snowT?d*.012:-d*.0045)));
   const day=(typeof todDay!=="undefined")?Math.max(0,Math.min(1,todDay+.15)):1;
   const csT=(SK.on&&SK.shadow?({clear:.3,drizzle:.14,storm:.1,mist:.05,snow:.1,dust:.16})[st]||.2:0)*(.15+.85*day);
   SK.cs+=(csT-SK.cs)*Math.min(1,d*.5);
   spd+=((SPD[st]||1.5)-spd)*Math.min(1,d*.3);drift+=d*spd*.0085;
   U.uD.value.set(drift*1.6,drift*.5);U.uMud.value=SK.wet*.9;if(window.CLK){CLK.uT.value=performance.now()/1000;CLK.uW.value=({clear:1,drizzle:1.5,storm:2.8,mist:.6,snow:1.3,dust:2.2})[st]||1}U.uCS.value=SK.cs;U.uWet.value=SK.wetOn?SK.wet:0;U.uSnow.value=SK.snowOn?SK.snow:0;
   /* clouds: more of them, greyer and lower in bad weather */
   if(CL){const cov=SK.on?(COV[st]||.4):0,dk=DARK[st]||1,lit=.22+.78*day,col=lit*dk;
    CL.forEach(o=>{const want=(o.i%36)/36<cov?1:0;o.o+=(want-o.o)*Math.min(1,d*.35);o.m.material.opacity=o.o*(st==="storm"?.85:st==="mist"?.35:.62);o.m.visible=o.o>.02;
     let tint=col;o.m.material.color.setRGB(tint*(st==="storm"?.82:1),tint*(st==="storm"?.84:1),tint*(st==="storm"?.92:st==="snow"?1.02:1));{const ph=(clock/DAYLEN+.1)%1,sh=Math.sin(ph*6.2832),du=Math.exp(-Math.pow(sh*3.4,2))*(st==='storm'?.4:1),cm=o.m.material.color;cm.r=cm.r*(1+du*.25)+du*.18;cm.g=cm.g*(1-du*.12)+du*.02;cm.b=cm.b*(1-du*.35)}
     if(o.m.visible){o.m.position.x+=d*(spd-1.5)*(1+(o.i%3)*.2);if(o.m.position.x>250)o.m.position.x-=500}})}
  }catch(e){if(!SK._e){SK._e=1;console.warn("SKY2",e)}}};
})();

/* ===== light: glowing windows that really light the lane at night, and warm bounce light off the floor around dungeon torches ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined"||typeof POIS==="undefined")return;
 const T=THREE,LT=window.LIGHT2={on:1};
 const HS=[[-5,-3,.3],[5,-4,-.4],[-6,3,.8],[6,3,-.9],[0,-7,0]];
 let win=null,bounce=null;const q=()=>(typeof GFX!=="undefined"?GFX.q:2),v3=new T.Vector3();
 const flick=(t,i)=>.9+.1*Math.sin(t*7.3+i*2.1)*Math.sin(t*3.1+i)+.05*Math.sin(t*19+i*5);
 function mkWin(){win=[0,1,2].map(i=>{const l=new T.PointLight(0xffa850,0,9,2);scene.add(l);return l})}
 function rmWin(){if(win){win.forEach(l=>scene.remove(l));win=null}}
 function mkB(){bounce=[0,1].map(i=>{const l=new T.PointLight(0xff6a22,0,13,2);scene.add(l);return l})}
 function rmB(){if(bounce){bounce.forEach(l=>scene.remove(l));bounce=null}}
 const vu=vmUpdate;let tt=0;
 vmUpdate=function(dt){vu(dt);try{
   if(typeof hero==="undefined"||!hero||typeof scene==="undefined"||!scene)return;
   const inDg=typeof DG!=="undefined"&&DG,t=performance.now()/1000;
   /* ---- village windows ---- */
   const wantW=LT.on&&!inDg&&q()>=2;
   if(wantW&&!win&&typeof world!=="undefined"&&world)mkWin();else if(!wantW&&win)rmWin();
   if(win){const v=POIS.find(p=>p.id==="village");const day=(typeof todDay!=="undefined")?todDay:1,nk=Math.max(0,Math.min(1,(.55-day)/.45));
    if(v&&nk>.01){const bx=v.x*TW+1,bz=v.y*TW+1;
     const hs=HS.map((o,i)=>{const x=bx+o[0]+Math.sin(o[2])*2.1,z=bz+o[1]+Math.cos(o[2])*2.1;return{x,z,i,d:Math.hypot(x-P.x,z-P.z)}}).sort((a,b)=>a.d-b.d);
     win.forEach((l,k)=>{const h=hs[k],on=h&&h.d<46;if(on){l.position.set(h.x,hfn(h.x,h.z)+1.5,h.z);l.intensity+=((1.1*nk*flick(t,h.i))-l.intensity)*Math.min(1,dt*4)}else l.intensity+=(0-l.intensity)*Math.min(1,dt*4)})}
    else win.forEach(l=>{l.intensity=0})}
   /* ---- dungeon bounce ---- */
   const wantB=LT.on&&inDg&&q()>=3&&typeof dg3!=="undefined"&&dg3.g&&dg3.g.userData&&dg3.g.userData.lights&&dg3.g.userData.lights.length>0;
   if(wantB&&!bounce)mkB();else if(!wantB&&bounce)rmB();
   if(bounce){const L=dg3.g.userData.lights.slice().map(l=>{l.getWorldPosition(v3);return{l,x:v3.x,y:v3.y,z:v3.z,d:Math.hypot(v3.x-camera.position.x,v3.z-camera.position.z)}}).sort((a,b)=>a.d-b.d);
    bounce.forEach((b,k)=>{const o=L[k];if(!o){b.intensity=0;return}b.position.set(o.x,Math.max(.5,o.y-1.6),o.z);b.distance=Math.max(9,(o.l.distance||14)*.9);b.intensity+=((o.l.intensity*.34)-b.intensity)*Math.min(1,dt*6)})}
  }catch(e){if(!LT._e){LT._e=1;console.warn("LIGHT2",e)}}};
})();

/* ===== atmosphere: a richer sky (sun glow, horizon haze, warm dusk bands), clouds lit from below at dusk, morning and swamp mist, light shafts through the trees ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,AT=window.ATMOS={on:1,shafts:1,sky:1};
 let skyOk=0;
 const U={uSun:{value:new T.Vector3(.5,.7,.3)},uDay:{value:1},uDusk:{value:0},uOn:{value:1}};
 function initSky(){try{if(typeof skyM==="undefined"||!skyM||!skyM.material||!skyM.material.uniforms)return;const m=skyM.material;
   Object.assign(m.uniforms,U);
   m.fragmentShader=`uniform vec3 top;uniform vec3 hor;uniform vec3 uSun;uniform float uDay,uDusk,uOn;varying vec3 vP;
float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(hor,top,pow(clamp(h*1.5,0.,1.),.7));
 if(uOn>.5){
  vec3 sd=normalize(uSun);float mu=max(dot(d,sd),0.);float up=smoothstep(-.12,.2,sd.y);
  /* haze: the air near the horizon is paler and brighter */
  float hz=exp(-max(h,0.)*4.2);c=mix(c,hor*1.1+vec3(.04,.04,.05),hz*.38*uDay);
  /* a deeper zenith */
  c*=1.-.14*smoothstep(.45,1.,h)*uDay;
  /* sun glow: wide warm halo plus a tight bright core */
  vec3 sc=mix(vec3(1.,.93,.78),vec3(1.,.5,.2),clamp(uDusk*1.3,0.,1.));
  c+=sc*(pow(mu,6.)*.22+pow(mu,48.)*.5+pow(mu,700.)*1.2)*up*(.45+uDusk*.9);
  /* dusk and dawn: a burning band on the horizon toward the sun, a rose band opposite */
  vec2 az=normalize(d.xz+1e-5),sz=normalize(sd.xz+1e-5);float a1=pow(max(dot(az,sz),0.),2.5),a2=pow(max(-dot(az,sz),0.),1.6);
  c+=vec3(1.,.38,.12)*uDusk*a1*exp(-abs(h-.02)*6.5)*.85;
  c+=vec3(.95,.5,.62)*uDusk*a2*exp(-abs(h-.07)*9.)*.28;
  /* below the horizon the sky blends into the ground fog colour */
  c=mix(c,hor,smoothstep(0.,-.25,h)*.6);
 }
 c+=(hh(gl_FragCoord.xy)-.5)/200.;gl_FragColor=vec4(c,1.);}`;
   m.needsUpdate=true;skyOk=1}catch(e){console.warn("ATMOS sky",e)}}
 /* ---------- light shafts ---------- */
 let SH=null,anchor=null;const N=8;
 function shaftTex(){const w=64,h=256,cv=document.createElement("canvas");cv.width=w;cv.height=h;const g=cv.getContext("2d");const im=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=(x/(w-1))*2-1,v=y/(h-1);const a=Math.exp(-u*u*3.2)*Math.min(1,v*5)*Math.min(1,(1-v)*2.2)*(.75+.25*Math.sin(y*.21+x*.4));const i=(y*w+x)*4;im.data[i]=255;im.data[i+1]=240;im.data[i+2]=200;im.data[i+3]=Math.max(0,Math.min(255,a*255))}
  g.putImageData(im,0,0);const t=new T.CanvasTexture(cv);return t}
 function mkShafts(){SH=[];const tex=shaftTex();for(let i=0;i<N;i++){const m=new T.Mesh(new T.PlaneGeometry(3.4+(i%3)*1.4,30),new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,fog:false,side:2}));m.frustumCulled=false;m.userData={ph:i*1.9,s:i*17+3,k:0};m.renderOrder=3;scene.add(m);SH.push(m)}}
 const hs=(a,b)=>{const x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)};
 const vu=vmUpdate,v1=new T.Vector3(),v2=new T.Vector3(),v3=new T.Vector3(),mx=new T.Matrix4();let tt=0;
 vmUpdate=function(dt){vu(dt);try{
   if(typeof hero==="undefined"||!hero||typeof scene==="undefined")return;
   if(!skyOk)initSky();
   const t=performance.now()/1000,inDg=typeof DG!=="undefined"&&DG;
   const ph=(clock/DAYLEN+.1)%1,sh=Math.sin(ph*6.2832),dusk=Math.exp(-Math.pow(sh*3.4,2));
   U.uSun.value.copy(SUN);U.uDay.value=todDay;U.uDusk.value=dusk;U.uOn.value=AT.on&&AT.sky?1:0;
   let st="clear";try{st=WX.state||"clear"}catch(e){}
   const key=(typeof tgt!=="undefined"&&tgt&&tgt.key)||"forest";
   /* ground fog: thicker at dawn and in the swamp, a little in forests in the morning */
   if(AT.on&&!inDg&&typeof worldFog!=="undefined"&&scene.fog===worldFog){const dawn=dusk*(Math.cos(ph*6.2832)>0?1:0),sw=key==="swamp"?1:0,fo=key==="forest"?.35:0;
    const k=1-Math.min(.55,dawn*.38+sw*.3+fo*dawn*.4);worldFog.far*=k;worldFog.near*=1-Math.min(.5,dawn*.3+sw*.25)}
   /* shafts */
   const q=(typeof GFX!=="undefined")?GFX.q:2;
   if(!SH&&q>=2&&typeof camera!=="undefined"&&camera)mkShafts();
   if(SH){const elev=SUN.y,want=AT.on&&AT.shafts&&!inDg&&q>=2&&elev>.1&&elev<.7&&todDay>.45&&(st==="clear"||st==="mist"||st==="drizzle")&&/forest|swamp|hills/.test(key);
    if(!anchor||Math.hypot(anchor.x-P.x,anchor.z-P.z)>34){anchor={x:P.x,z:P.z};SH.forEach((m,i)=>{m.userData.s=Math.floor(P.x/30)*7+Math.floor(P.z/30)*13+i*5.1})}
    SH.forEach((m,i)=>{const u=m.userData,a=hs(u.s,1)*6.283,r=7+hs(u.s,2)*24,x=anchor.x+Math.cos(a)*r,z=anchor.z+Math.sin(a)*r,y=hfn(x,z);
     u.k+=((want?(.5+.5*Math.sin(t*.25+u.ph))*(st==="mist"?1.6:1):0)-u.k)*Math.min(1,dt*.7);
     const near=Math.hypot(x-camera.position.x,z-camera.position.z);m.material.opacity=u.k*.2*Math.min(1,near/6);m.visible=m.material.opacity>.003;if(!m.visible)return;
     v1.copy(SUN).normalize();v2.set(x,y,z).addScaledVector(v1,13);m.position.copy(v2);
     v3.copy(camera.position).sub(v2);v3.addScaledVector(v1,-v3.dot(v1)).normalize();const xx=new T.Vector3().crossVectors(v1,v3).normalize();mx.makeBasis(xx,v1,v3);m.quaternion.setFromRotationMatrix(mx)})}
  }catch(e){if(!AT._e){AT._e=1;console.warn("ATMOS",e)}}};
})();

/* ===== SANITY: the mind frays in the dark; the screen breathes and swims, things stand where nothing stands, and some herbs open the door on purpose ===== */
(function(){
 if(typeof THREE==="undefined"||typeof POST==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,SN=window.SAN={on:1,k:0,p:0,trip:0,ev:null,rate:1,msgT:0};
 try{if(localStorage.getItem("occultica.sanity")==="0")SN.on=0}catch(e){}
 SN.setOn=v=>{SN.on=v?1:0;try{localStorage.setItem("occultica.sanity",v?"1":"0")}catch(e){}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 /* ---- screen: wobble, breathing, swirl pulses, sickly colour ---- */
 const U={sanK:{value:0},sanT:{value:0},sanP:{value:0}};let patched=0;
 function patch(){try{const m=POST.mComp;if(!m||patched)return;let f=m.fragmentShader;
  if(f.indexOf("sanW")>=0){patched=1;return}
  const a="varying vec2 vUv;",b="vec2 uv=vUv,c=uv-.5;",v="col*=1.-smoothstep(.12,.62,r2*1.8)*vig;";
  if(f.indexOf(a)<0||f.indexOf(b)<0||f.indexOf(v)<0)return;
  f=f.replace(a,a+"uniform float sanK,sanT,sanP;vec2 sanW(vec2 p){vec2 c=p-.5;float r=length(c);float k=sanK;vec2 w=vec2(sin(p.y*9.+sanT*1.3)+.6*sin(p.y*23.-sanT*.8),cos(p.x*8.-sanT*1.1)+.6*cos(p.x*19.+sanT*.9))*.008*k*k;float br=sin(sanT*.75)*.028*k*smoothstep(.05,.7,r);vec2 sw=vec2(-c.y,c.x)*sanP*.35*smoothstep(.0,.6,r)*sin(sanT*3.+r*9.);return w-c*br+sw+c*sanP*.05;}");
  f=f.replace(b,"vec2 uv=vUv+sanW(vUv),c=uv-.5;");
  f=f.replace(v,v+"if(sanK>.01||sanP>.01){float L=dot(col,vec3(.3,.59,.11));col=mix(col,vec3(L)*vec3(.94,1.0,.9),sanK*.6);col*=1.-sanK*.5*smoothstep(.12,.55,r2*1.7)*(.7+.3*sin(sanT*1.9));col+=vec3(.5,.02,.12)*sanP*.1*(1.-smoothstep(0.,.35,r2));col=mix(col,col.gbr,sanP*.12);}");
  m.fragmentShader=f;Object.assign(m.uniforms,U);m.needsUpdate=true;patched=1}catch(e){console.warn("SAN patch",e)}}
 /* ---- sound: low thud, breath of noise, own AudioContext ---- */
 const AC=window.AudioContext||window.webkitAudioContext;let X=null,nz=null;
 const sfxOn=()=>{try{return localStorage.getItem("occultica.sfx.on")!=="0"}catch(e){return true}};
 ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{try{if(!X&&AC){X=new AC();const n=X.sampleRate,b=X.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;nz=b}if(X&&X.state==="suspended")X.resume()}catch(e){}},{passive:true}));
 function thud(a){if(!X||X.state!=="running"||!sfxOn())return;const t=X.currentTime,o=X.createOscillator(),g=X.createGain();o.type="sine";o.frequency.setValueAtTime(64,t);o.frequency.exponentialRampToValueAtTime(30,t+.25);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g);g.connect(X.destination);o.start(t);o.stop(t+.5)}
 function hiss(a,f,len,pan){if(!X||X.state!=="running"||!sfxOn()||!nz)return;const t=X.currentTime,s=X.createBufferSource();s.buffer=nz;const bp=X.createBiquadFilter();bp.type="bandpass";bp.frequency.value=f;bp.Q.value=4;const g=X.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+len*.3);g.gain.linearRampToValueAtTime(0,t+len);s.connect(bp);bp.connect(g);
  if(X.createStereoPanner){const p=X.createStereoPanner();p.pan.value=pan||0;g.connect(p);p.connect(X.destination)}else g.connect(X.destination);s.start(t);s.stop(t+len+.05)}
 function step(a,pan){hiss(a,380+Math.random()*200,.09,pan)}
 SN.hiss=hiss;SN.thud=thud;
 /* ---- things that are not there ---- */
 let grp=null;const props=[];
 const eyeTex=()=>SN._et||(SN._et=radTex(255,60,40));
 function ensureG(){if(grp||typeof scene==="undefined"||!scene)return;grp=new T.Group();scene.add(grp)}
 function spawnPhantom(){ensureG();const a=yaw+(Math.random()<.5?-1:1)*(.5+Math.random()*.7),d=13+Math.random()*10,x=P.x-Math.sin(a)*d,z=P.z-Math.cos(a)*d;if(typeof blocked==="function"&&blocked(x,z,.5))return false;
  const g=new T.Group(),mat=new T.MeshBasicMaterial({color:0x040506,transparent:true,opacity:0,fog:true});
  const body=new T.Mesh(new T.CylinderGeometry(.16,.32,1.75,7),mat);body.position.y=.9;g.add(body);const head=new T.Mesh(new T.SphereGeometry(.2,8,6),mat);head.position.y=1.95;head.scale.set(.9,1.25,.9);g.add(head);
  [-1,1].forEach(s=>{const e=new T.Sprite(new T.SpriteMaterial({map:eyeTex(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,fog:false}));e.scale.set(.32,.32,1);e.position.set(s*.08,1.98,-.17);g.add(e)});
  g.position.set(x,hfn(x,z),z);g.userData={kind:"ph",age:0,seen:0,mat,life:14+Math.random()*10};grp.add(g);props.push(g);return true}
 function spawnEyes(){ensureG();const a=yaw+(Math.random()<.5?-1:1)*(.45+Math.random()*.9),d=9+Math.random()*14,x=P.x-Math.sin(a)*d,z=P.z-Math.cos(a)*d,g=new T.Group();
  const y=.9+Math.random()*1.6,gap=.1+Math.random()*.08;[-1,1].forEach(s=>{const e=new T.Sprite(new T.SpriteMaterial({map:eyeTex(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,fog:false}));e.scale.set(.3,.3,1);e.position.set(s*gap,0,0);g.add(e)});
  g.position.set(x,hfn(x,z)+y,z);g.userData={kind:"ey",age:0,seen:0,life:7+Math.random()*7,mat:null};grp.add(g);props.push(g);return true}
 function lookDot(g){const dx=g.position.x-P.x,dz=g.position.z-P.z,d=Math.hypot(dx,dz)||1,fx=-Math.sin(yaw),fz=-Math.cos(yaw);return[(dx*fx+dz*fz)/d,d]}
 function killProp(g,fast){grp.remove(g);const i=props.indexOf(g);if(i>=0)props.splice(i,1);g.traverse(o=>{if(o.material)o.material.dispose&&o.material.dispose()})}
 function updProps(dt){for(let i=props.length-1;i>=0;i--){const g=props[i],u=g.userData;u.age+=dt;const[dt2,d]=lookDot(g),fade=Math.min(1,u.age/2.2)*Math.min(1,(u.life-u.age)/1.5);
   if(u.kind==="ph"){g.rotation.y=Math.atan2(P.x-g.position.x,P.z-g.position.z);const nearEdge=dt2>.93;if(nearEdge)u.seen+=dt;else u.seen=Math.max(0,u.seen-dt*.5);
    u.mat.opacity=clamp(fade,0,1)*.92;g.children.forEach(c=>{if(c.isSprite)c.material.opacity=clamp(fade,0,1)*(.7+.3*Math.sin(clock*9+i))});
    if(u.seen>.55||d<7||u.age>u.life){if(u.seen>.55||d<7){SN.p=Math.max(SN.p,.55);thud(.5);hiss(.12,900,.5,0);SN.hit(3)}killProp(g)}}
   else{g.children.forEach(c=>c.material.opacity=clamp(fade,0,1)*(Math.sin(clock*1.7+i)>.92?0:.9));if(dt2>.9)u.seen+=dt;if(u.seen>.35||u.age>u.life)killProp(g)}}}
 const WORDS=["…behind you…","You were here before.","It is learning your walk.","Not that way.","Something is wearing your name.","Count the trees. There is one more than there was.","The sky is a lid.","They are still smiling.","Do not answer it.","Your shadow is late."];
 function whisperLine(){try{const n=hero&&hero.name?hero.name:"you";const L=WORDS.slice();L.push(n+".",n+"? ");say(L[(Math.random()*L.length)|0]);hiss(.1,700+Math.random()*500,.9,Math.random()*2-1)}catch(e){}}
 /* ---- bookkeeping ---- */
 const san=()=>hero&&typeof hero.san==="number"?hero.san:100;
 SN.hit=function(n){if(!hero)return;hero.san=clamp(san()-n,0,100);SN.msgT=3};
 SN.heal=function(n){if(!hero)return;hero.san=clamp(san()+n,0,100);SN.msgT=3};
 SN.tripNow=function(sec){SN.trip=Math.max(SN.trip,sec||55);SN.p=Math.max(SN.p,.9)};
 /* herbs that open doors */
 try{const _gh=gatherHerb;gatherHerb=function(){const names=["Henbane","Nightshade","Mugwort","Wormwood","Jasmine"],b={};names.forEach(n=>b[n]=hero.inv[n]||0);const r=_gh.apply(this,arguments);try{if(SN.on&&names.some(n=>(hero.inv[n]||0)>b[n])&&Math.random()<.4){SN.tripNow(50);say("The pollen is sweet and wrong. The edges of the world begin to slide.")}}catch(e){}return r}}catch(e){}
 /* the meter */
 let chip=null;function chipUp(){if(!chip){const cw=document.querySelector(".cw");if(!cw)return;chip=document.createElement("div");chip.id="sanchip";chip.style.cssText="position:absolute;right:12px;top:104px;z-index:3;padding:2px 9px;border-radius:12px;background:rgba(18,12,30,.7);color:#d8c8ff;font:700 .72rem Cinzel,serif;letter-spacing:.06em;opacity:0;transition:opacity 1.2s;pointer-events:none";cw.appendChild(chip)}
  chip.textContent="Mind "+Math.round(san());chip.style.opacity=(SN.msgT>0||san()<60)?.85:0}
 let nextEv=40,nextEye=25,stepT=0,lastX=0,lastZ=0,hb=0,tmr=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady)return;dt=Math.min(dt,.06);patch();
  if(typeof hero.san!=="number")hero.san=100;
  const outdoors=!DG&&world&&world.visible,fighting=!!(C&&!C.over),night=typeof todDay==="number"?1-todDay:0;
  let safe=false;try{safe=!!(window.RT&&RT.safe&&outdoors&&RT.safe(P.x,P.z))||!!(nearSite&&nearSite())}catch(e){}
  /* drain and recovery, per second */
  let d=0;
  if(SN.on&&!(window.GRADE&&GRADE.photo)){
   if(safe)d=.45;else if(DG)d=-.1;else if(fighting)d=-.22;else if(outdoors){d=night>.55?-.12*(night):.07;if(window.SEA&&SEA.B&&SEA.B.on&&night>.45)d-=.05}}
  else d=.6;
  d*=(d<0?SN.rate:1)*(SN.trip>0?0:1);
  hero.san=clamp(san()+d*dt,0,100);
  /* level of fraying: begins below 75 */
  const tk=SN.on?Math.pow(clamp((75-san())/75,0,1),1.1):0;SN.k+=(tk-SN.k)*Math.min(1,dt*.8);
  /* trips: strong and short, no drain */
  if(SN.trip>0){SN.trip-=dt;SN.k=Math.max(SN.k,.55+.25*Math.sin(clock*.4));if(Math.random()<dt*.35)SN.p=Math.max(SN.p,.5+Math.random()*.4)}
  SN.p=Math.max(0,SN.p-dt*.7);
  U.sanK.value=SN.k;U.sanT.value=performance.now()/1000%3600;U.sanP.value=SN.p;
  /* breath and heartbeat when low */
  if(SN.k>.5&&SN.on){hb-=dt;if(hb<=0){const per=1.05-SN.k*.4;hb=per;thud(.1+SN.k*.18);setTimeout(()=>thud(.07+SN.k*.1),per*280)}}
  /* events */
  const free=outdoors&&!fighting&&!occOpen&&!D&&!packOpen;
  if(SN.on&&SN.k>.12&&free){
   nextEv-=dt;nextEye-=dt;
   if(nextEv<=0){nextEv=clamp(70-SN.k*58,10,70)*(.7+Math.random()*.6);const r=Math.random();
    if(r<.3&&night>.2){if(spawnPhantom())hiss(.06,300,1.5,0)}else if(r<.55)whisperLine();else if(r<.8){SN.p=Math.max(SN.p,.5+SN.k*.4);thud(.3)}else if(night>.3)spawnEyes()}
   if(nextEye<=0){nextEye=clamp(50-SN.k*40,8,50)*(.6+Math.random()*.8);if(night>.35&&props.length<4)spawnEyes()}
   /* echoing footsteps: a half-beat behind you, a little too slow */
   const mv=Math.hypot(P.x-lastX,P.z-lastZ);if(mv>.01&&SN.k>.4){stepT+=mv;if(stepT>1.7){stepT=0;setTimeout(()=>step(.05+SN.k*.07,Math.random()*.6-.3),380)}}
  }
  lastX=P.x;lastZ=P.z;
  if(grp)updProps(dt);if(!free&&props.length)for(let i=props.length-1;i>=0;i--)killProp(props[i]);
  if(SN.msgT>0)SN.msgT-=dt;tmr-=dt;if(tmr<=0){tmr=.5;chipUp()}
 }catch(e){if(!window.__sanE){window.__sanE=1;console.warn("SAN",e);SN.err=String(e&&e.stack||e)}}};
 /* combat chips at the mind; kills and the dead steady it a little */
 try{const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{SN.hit(2.5)}catch(e){}return r}}catch(e){}
})();

/* ===== SEA (dread): fog banks that swallow the barque, a phantom barque, faces under the water, the sirens' pull ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined"||!window.SEA||!SEA.on||!SEA.makeBoat)return;
 const T=THREE,S=SEA,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TX=x=>x*TW+1;
 const st={fog:0,ph:null,nextPh:50,nextFace:18,faces:[],siren:0,sirenMsg:0,pullT:0};S.dread=st;st.spawnPhantom=()=>spawnPhantom();st.spawnFaces=()=>spawnFaces();
 const isWater=(x,z)=>{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);if(tx<0||ty<0||tx>=W||ty>=H)return true;return map[ty][tx]==="water"||S.ford.has(ty*W+tx)};
 const teal=new T.Color(0x6f8f8a);
 /* faces: pale ovals with dark sockets and an open mouth */
 let faceTex=null;function mkFace(){const c=document.createElement("canvas");c.width=c.height=96;const g=c.getContext("2d");
  const r=g.createRadialGradient(48,48,6,48,48,44);r.addColorStop(0,"rgba(215,235,230,.95)");r.addColorStop(.7,"rgba(160,190,185,.7)");r.addColorStop(1,"rgba(120,150,150,0)");g.fillStyle=r;g.beginPath();g.ellipse(48,48,30,40,0,0,6.283);g.fill();
  g.fillStyle="rgba(8,18,20,.95)";g.beginPath();g.ellipse(36,40,6,8,0,0,6.283);g.ellipse(60,40,6,8,0,0,6.283);g.fill();g.beginPath();g.ellipse(48,66,7,11,0,0,6.283);g.fill();
  faceTex=new T.CanvasTexture(c)}
 function spawnFaces(){if(!faceTex)mkFace();const n=3+((Math.random()*4)|0),ang0=Math.random()*6.283;
  for(let i=0;i<n;i++){const a=ang0+i*(1.2+Math.random()*.8),d=4+Math.random()*7,x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d;if(!isWater(x,z))continue;
   const m=new T.Mesh(new T.PlaneGeometry(1.1,1.4),new T.MeshBasicMaterial({map:faceTex,transparent:true,opacity:0,depthWrite:false,fog:true}));m.rotation.x=-Math.PI/2;m.rotation.z=Math.random()*6.283;m.position.set(x,-.62,z);m.userData={age:0,life:6+Math.random()*4,vx:(Math.random()-.5)*.3,vz:(Math.random()-.5)*.3};scene.add(m);st.faces.push(m)}}
 /* phantom barque: the same hull, ghost-pale, with its lantern burning */
 function ghostify(g){g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();const m=o.material;m.transparent=true;m.opacity=.0;m.depthWrite=false;if(m.emissive){m.emissive.setHex(0x1a6a5a);m.emissiveIntensity=.8}if(m.color)m.color.lerp(teal,.55);o.castShadow=false;o.userData.go=1}
   else if(o.isSprite){o.material=o.material.clone();o.userData.go=1;o.userData.so=o.material.opacity}})}
 function spawnPhantom(){const a=yaw+(Math.random()<.5?-1:1)*(.6+Math.random()*.8),d=34+Math.random()*16,x=P.x-Math.sin(a)*d,z=P.z-Math.cos(a)*d;if(!isWater(x,z))return false;
  const dx=P.x-x,dz=P.z-z,l=Math.hypot(dx,dz),px=-dz/l,pz=dx/l,side=Math.random()<.5?-1:1;const vx=(dx/l*.5+px*side*.85)*3.2,vz=(dz/l*.5+pz*side*.85)*3.2;for(let q=0;q<=20;q+=2)if(!isWater(x+vx*q,z+vz*q))return false;
  const g=S.makeBoat();ghostify(g);scene.add(g);
  /* it drifts across your bow, never quite toward you */
  st.ph={g,x,z,vx:(dx/l*.5+px*side*.85)*3.2,vz:(dz/l*.5+pz*side*.85)*3.2,age:0,seen:0,life:24,op:0};g.rotation.y=Math.atan2(-st.ph.vx,-st.ph.vz);return true}
 function killPhantom(hard){if(!st.ph)return;scene.remove(st.ph.g);st.ph.g.traverse(o=>{if(o.material)o.material.dispose&&o.material.dispose()});st.ph=null;if(hard&&window.SAN){SAN.thud(.45);SAN.hiss(.14,800,.7,0)}}
 /* the pull: from far off, a song, and the boat drifts toward the rock */
 const sirenIsle=()=>S.isles.find(i=>i.k==="sirens");
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady||typeof worldFog==="undefined")return;dt=Math.min(dt,.06);const B=S.B,t=performance.now()/1000,night=typeof todDay==="number"?1-todDay:0,k=window.SAN?SAN.k:0;
  const sailing=!!(B&&B.on&&!DG&&!C&&!occOpen);
  /* fog banks: slow, uneven, thicker at night and when the mind is thin */
  const bank=clamp(Math.sin(t*.035)*.6+Math.sin(t*.011+2)*.5+.15,0,1),goal=sailing?clamp(bank*(.55+.6*night+.35*k),0,1):0;st.fog+=(goal-st.fog)*Math.min(1,dt*.35);
  if(st.fog>.01&&scene.fog===worldFog){const m=1-.74*st.fog;worldFog.far*=m;worldFog.near*=1-.8*st.fog;worldFog.color.lerp(teal,.35*st.fog)}
  /* events, only on the water and only when the hull is moving or still, not in fights */
  if(sailing){
   st.nextPh-=dt*(.6+night+k);st.nextFace-=dt*(.5+night*.8+k);
   if(!st.ph&&st.nextPh<=0){st.nextPh=70+Math.random()*80;if(night>.25||st.fog>.35){if(spawnPhantom()){if(window.SAN)SAN.hiss(.05,260,2,0);say("A lantern, out on the water. Not yours.")}}}
   if(st.nextFace<=0){st.nextFace=30+Math.random()*50;if(night>.2||k>.2)spawnFaces()}
  }
  if(st.ph){const p=st.ph;p.age+=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;const dd=Math.hypot(p.x-P.x,p.z-P.z),fx=-Math.sin(yaw),fz=-Math.cos(yaw),dot=((p.x-P.x)*fx+(p.z-P.z)*fz)/(dd||1);
   const want=clamp(Math.min(p.age/4,(p.life-p.age)/3),0,1)*.55;p.op+=(want-p.op)*Math.min(1,dt*2);
   p.g.position.set(p.x,-.35+Math.sin(t*1.4)*.04,p.z);p.g.traverse(o=>{if(o.userData.go){if(o.isSprite)o.material.opacity=p.op*1.2;else o.material.opacity=p.op}});
   if(dot>.94&&dd<26)p.seen+=dt;else p.seen=Math.max(0,p.seen-dt*.3);
   if(!isWater(p.x,p.z)||p.age>p.life||!sailing){killPhantom(false)}else if(p.seen>3.2||dd<9){if(window.SAN)SAN.hit(4);killPhantom(true);if(window.SAN)SAN.p=Math.max(SAN.p,.8)}}
  for(let i=st.faces.length-1;i>=0;i--){const f=st.faces[i],u=f.userData;u.age+=dt;f.position.x+=u.vx*dt;f.position.z+=u.vz*dt;f.position.y=-.62+Math.sin(t*1.1+i)*.02;
   const o=clamp(Math.min(u.age/1.8,(u.life-u.age)/2),0,1)*.5;f.material.opacity=o;f.rotation.z+=dt*.08;
   if(u.age>u.life||!sailing){scene.remove(f);f.material.dispose();f.geometry.dispose();st.faces.splice(i,1)}}
  /* sirens */
  const si=sirenIsle();
  if(sailing&&si){const dx=TX(si.x)-P.x,dz=TX(si.y)-P.z,d=Math.hypot(dx,dz),near=d<70&&d>10&&night>.35;st.siren+=((near?clamp((70-d)/55,0,1):0)-st.siren)*Math.min(1,dt*.5);
   if(st.siren>.05){if(!st.sirenMsg){st.sirenMsg=1;say("Somewhere out on the water, a woman is singing. It sounds like someone you know.")}
    st.pullT-=dt;if(st.pullT<=0&&window.SAN){st.pullT=1.6+Math.random()*2;SAN.hiss(.02+.03*st.siren,1100+Math.random()*900,1.6,clamp(dx/70,-1,1))}
    const pull=.8*st.siren*dt;const nx=dx/d*pull,nz=dz/d*pull;if(!blocked(P.x+nx,P.z,.45))P.x+=nx;if(!blocked(P.x,P.z+nz,.45))P.z+=nz;if(window.SAN&&hero)hero.san=clamp((hero.san||100)-.1*st.siren*dt*3,0,100)}
   else if(d>90)st.sirenMsg=0}
 }catch(e){if(!window.__sea2E){window.__sea2E=1;console.warn("SEA2",e);S.err2=String(e&&e.stack||e)}}};
})();

/* ===== WRONG SKY: the world goes quiet, a bell nobody rings tolls once, and the sky is not what it was =====
   Events: twin (a second, cold sun), black (the sun goes dark and the stars come out at noon), red (the moon is open and the wrong colour),
   bells (distant tolling in a rising mist). Every event begins with silence - music, wind, birds, all of it stops - and then one toll.
   API for later steps: WSKY.silence(sec), WSKY.toll(n), WSKY.start(type) */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,W=window.WSKY={on:1,ev:null,e:0,silent:0};
 try{if(localStorage.getItem("occultica.wrongsky")==="0")W.on=0}catch(e){}
 W.setOn=v=>{W.on=v?1:0;try{localStorage.setItem("occultica.wrongsky",v?"1":"0")}catch(e){}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,k)=>a+(b-a)*k;
 /* ---- audio: find every context the game opened, so silence can really be silence ---- */
 const CT=new Set(),AC=window.AudioContext||window.webkitAudioContext;
 try{const _c=AudioNode.prototype.connect;AudioNode.prototype.connect=function(){try{const c=this.context;if(c&&!c.__ws&&!CT.has(c))CT.add(c)}catch(e){}return _c.apply(this,arguments)}}catch(e){}
 let X=null;const sfxOn=()=>{try{return localStorage.getItem("occultica.sfx.on")!=="0"}catch(e){return true}};
 ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{try{if(!X&&AC){X=new AC();X.__ws=1}if(X&&X.state==="suspended")X.resume()}catch(e){}},{passive:true}));
 let silT=0,silOn=false;
 function applySilence(on){silOn=on;W.silent=on?1:0;
  try{const tr=window.MUS&&MUS.tracks;if(tr)for(const k in tr)tr[k].a.muted=on}catch(e){}
  CT.forEach(c=>{try{if(on){if(c.state==="running")c.suspend()}else if(c.state==="suspended")c.resume()}catch(e){}})}
 W.silence=function(sec){silT=Math.max(silT,sec||4);if(!silOn)applySilence(true)};
 function bell(vol,pan,far){if(!X||X.state!=="running"||!sfxOn())return;const t=X.currentTime,out=X.createGain(),lp=X.createBiquadFilter();out.gain.value=vol;lp.type="lowpass";lp.frequency.value=far?1000:2400;
  const base=88*(1+(Math.random()-.5)*.02);
  [[1,1,10],[2.0,.55,8],[2.76,.5,6.5],[4.07,.28,4.5],[5.43,.2,3.2],[6.8,.1,2.2]].forEach(r=>{const o=X.createOscillator(),g=X.createGain();o.type="sine";o.frequency.value=base*r[0]*(1+(Math.random()-.5)*.006);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(r[1]*.45,t+.012);g.gain.exponentialRampToValueAtTime(.0004,t+r[2]);o.connect(g);g.connect(lp);o.start(t);o.stop(t+r[2]+.1)});
  /* the strike: a short clank of filtered noise */
  try{const n=X.sampleRate*.12,b=X.createBuffer(1,n,X.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/n*9);const s=X.createBufferSource();s.buffer=b;const bp=X.createBiquadFilter();bp.type="bandpass";bp.frequency.value=900;bp.Q.value=1.2;const g=X.createGain();g.gain.value=.5;s.connect(bp);bp.connect(g);g.connect(lp);s.start(t)}catch(e){}
  const dest=X.destination,dl=X.createDelay(1),fb=X.createGain(),l2=X.createBiquadFilter(),eg=X.createGain();dl.delayTime.value=.47;fb.gain.value=.4;l2.type="lowpass";l2.frequency.value=800;eg.gain.value=.55;
  lp.connect(out);dl.connect(fb);fb.connect(l2);l2.connect(dl);l2.connect(eg);
  let tail=out;if(X.createStereoPanner){const p=X.createStereoPanner();p.pan.value=pan||0;out.connect(p);eg.connect(p);p.connect(dest)}else{out.connect(dest);eg.connect(dest)}
  out.connect(dl)}
 W.toll=function(n,far,pan){n=n||1;for(let i=0;i<n;i++)setTimeout(()=>{try{bell((far?.34:.5)*(1-i*.1),pan!==undefined?pan:(Math.random()*1.2-.6),far)}catch(e){}},i*3900)};
 /* ---- the sky ---- */
 let sec=null,glow=null,corona=null,ringTex=null,orig=null;
 function ring(){if(ringTex)return ringTex;const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d");x.strokeStyle="#000";x.lineWidth=7;x.beginPath();x.arc(64,64,36,0,6.2832);x.stroke();x.strokeStyle="rgba(0,0,0,.35)";x.lineWidth=16;x.beginPath();x.arc(64,64,34,0,6.2832);x.stroke();return ringTex=new T.CanvasTexture(c)}
 function mkTwin(){sec=new T.Group();sec.add(new T.Mesh(new T.SphereGeometry(8.5,16,12),new T.MeshBasicMaterial({color:0xeaf6ef,fog:false,transparent:true})));
  const g=new T.Sprite(new T.SpriteMaterial({map:radTex(190,255,225),transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending}));g.scale.set(80,80,1);sec.add(g);
  const r=new T.Sprite(new T.SpriteMaterial({map:ring(),transparent:true,depthWrite:false,fog:false}));r.scale.set(40,40,1);sec.add(r);sec.visible=false;scene.add(sec)}
 function mkCorona(){if(corona)return;corona=new T.Sprite(new T.SpriteMaterial({map:radTex(255,40,20),transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending}));corona.scale.set(64,64,1);corona.material.opacity=0;sunM.add(corona)}
 function saveOrig(){if(orig)return;orig={top:null,sunC:sunM.children[0].material.color.clone(),sunG:sunM.children[1]?sunM.children[1].material.color.clone():null,moonC:moonM.children[0].material.color.clone(),moonG:moonM.children[1]?moonM.children[1].material.color.clone():null,
  star:(starsM.material&&starsM.material.color)?starsM.material.color.clone():null,moonLC:moonL.color.clone()}}
 Object.defineProperty(W,"sec",{get:()=>sec});
 const _a=new T.Color(),_b=new T.Color();
 const DIR=new T.Vector3();
 function look(d){const cp=Math.cos(pitch);const fx=-Math.sin(yaw)*cp,fy=Math.sin(pitch),fz=-Math.cos(yaw)*cp;return fx*d.x+fy*d.y+fz*d.z}
 /* ---- the event ---- */
 const MSG={twin:"A second sun has risen. It gives no warmth.",black:"The sun has gone dark. It is still looking at you.",red:"The moon is the wrong colour. It is open.",bells:"A bell, far off. There is no tower that way."};
 W.start=function(type,force){if(W.ev&&!force)return false;if(!hero)return false;saveOrig();if(type==="twin"&&!sec)mkTwin();if(type==="black")mkCorona();
  W.ev={type,t:0,dur:type==="bells"?55:68+Math.random()*30,tolled:0,end:0,swirl:0};W.silence(5.2);return true};
 let tm=100,lastT=0;
 function envOf(ev){const t=ev.t-5.5;if(t<0)return 0;if(t<8)return t/8;if(t<ev.dur)return 1;return clamp(1-(t-ev.dur)/10,0,1)}
 function apply(type,e){
  const inDg=typeof DG!=="undefined"&&DG;if(inDg)return;
  const f=worldFog;
  if(type==="twin"&&sec){sec.visible=e>.01;if(sec.visible){const a=-lastT*.011+1.15;DIR.set(SUN.x*Math.cos(a)-SUN.z*Math.sin(a),0,SUN.x*Math.sin(a)+SUN.z*Math.cos(a));DIR.y=.0;DIR.normalize();DIR.multiplyScalar(.8);DIR.y=.3+.12*Math.sin(lastT*.05);DIR.normalize();
    sec.position.copy(skyM.position).addScaledVector(DIR,236);sec.scale.setScalar(.35+.65*e);sec.children[0].material.opacity=e;sec.children[1].material.opacity=e*.9;sec.children[2].material.opacity=e;
    skyM.material.uniforms.top.value.lerp(_a.setHex(0x6d8f86),.28*e);skyM.material.uniforms.hor.value.lerp(_a.setHex(0xaecbc0),.3*e);
    if(f)f.color.lerp(_a.setHex(0xa9bdb4),.3*e);sunL.intensity*=1-.18*e;
    if(look(DIR)>.93){W.lookAt=1}}}
  else if(type==="black"){const c=sunM.children[0],g=sunM.children[1];c.material.color.copy(orig.sunC).lerp(_b.setHex(0x000000),e);if(g&&orig.sunG)g.material.color.copy(orig.sunG).lerp(_b.setHex(0x701008),e);corona.material.opacity=e*.9;corona.scale.setScalar(52+6*Math.sin(lastT*1.3));
    sunL.intensity*=1-.7*e;hemi.intensity*=1-.4*e;skyM.material.uniforms.top.value.lerp(_a.setHex(0x120a10),.75*e);skyM.material.uniforms.hor.value.lerp(_a.setHex(0x55241a),.6*e);
    if(f){f.color.lerp(_a.setHex(0x2a1210),.55*e);f.far*=1-.3*e}
    if(starsM&&starsM.material)starsM.material.opacity=Math.max(starsM.material.opacity,.85*e);
    DIR.copy(SUN);if(look(DIR)>.94)W.lookAt=1}
  else if(type==="red"){const c=moonM.children[0],g=moonM.children[1];c.material.color.copy(orig.moonC).lerp(_b.setHex(0xb0150f),e);if(g&&orig.moonG)g.material.color.copy(orig.moonG).lerp(_b.setHex(0xff2a18),e);moonM.scale.setScalar(1+.8*e);
    moonL.color.copy(orig.moonLC).lerp(_b.setHex(0xff3a22),e*.8);moonL.intensity*=1+.5*e;
    skyM.material.uniforms.top.value.lerp(_a.setHex(0x2a0508),.5*e);skyM.material.uniforms.hor.value.lerp(_a.setHex(0x4e1210),.5*e);
    if(f){f.color.lerp(_a.setHex(0x2c0a0a),.4*e)}
    if(starsM.material&&starsM.material.color&&orig.star)starsM.material.color.copy(orig.star).lerp(_b.setHex(0xff6a50),e);
    DIR.copy(SUN).negate();if(look(DIR)>.94)W.lookAt=1}
  else if(type==="bells"){if(f){f.far*=1-.45*e;f.near*=1-.5*e;f.color.lerp(_a.setHex(0x9aa8a6),.3*e)}}}
 function restore(){try{if(!orig)return;sunM.children[0].material.color.copy(orig.sunC);if(orig.sunG&&sunM.children[1])sunM.children[1].material.color.copy(orig.sunG);if(corona)corona.material.opacity=0;
  moonM.children[0].material.color.copy(orig.moonC);if(orig.moonG&&moonM.children[1])moonM.children[1].material.color.copy(orig.moonG);moonM.scale.setScalar(1);moonL.color.copy(orig.moonLC);
  if(starsM.material&&starsM.material.color&&orig.star)starsM.material.color.copy(orig.star);if(sec)sec.visible=false}catch(e){}}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady)return;dt=Math.min(dt,.1);lastT+=dt;
   if(silOn){silT-=dt;if(silT<=0)applySilence(false)}
   const inDg=typeof DG!=="undefined"&&DG,fight=(typeof C!=="undefined"&&C&&!C.over);
   if(!W.on){if(W.ev){W.ev=null;restore()}return}
   if(!W.ev){tm-=dt;if(tm<=0){const day=typeof todDay==="number"?todDay:1;let ty;
     if(inDg||fight||(typeof occOpen!=="undefined"&&occOpen)||(typeof packOpen!=="undefined"&&packOpen)){tm=15;return}
     if(day>.62)ty=Math.random()<.5?"twin":"black";else if(day<.3)ty="red";else ty="bells";
     W.start(ty);const k=window.SAN?SAN.k:0;tm=(210+Math.random()*190)*(1-.4*clamp(k,0,1))}return}
   const ev=W.ev;ev.t+=dt;W.lookAt=0;
   if(ev.t>=5.5&&!ev.tolled){ev.tolled=1;W.toll(ev.type==="bells"?3:1,ev.type==="bells");try{say(MSG[ev.type])}catch(e){}}
   let e=envOf(ev);if(inDg||fight)ev.t=Math.max(ev.t,5.5+ev.dur);
   apply(ev.type,e);W.e=e;
   if(e>.3&&window.SAN){SAN.hit(dt*.1*e);if(W.lookAt){SAN.hit(dt*.35*e);SAN.p=Math.max(SAN.p,.25*e)}}
   if(ev.t>5.5+ev.dur+10){if(ev.type!=="bells"){W.toll(1,true)}restore();W.ev=null;W.e=0}
  }catch(e){}};
})();

/* ===== INNER VOICE: the character's own thoughts, spoken low and caption-lit, only at the moments that matter.
   The DM narrates from outside; this is from inside. One line at a time, never during a fight or a menu, never over the DM.
   Each moment fires once per character (hero.inner), with a long cooldown, so it stays rare. ===== */
(function(){
 if(typeof vmUpdate==="undefined")return;
 const N=window.INN={on:1,voice:"m",last:0,q:null,n:0};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.inner."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.inner."+k,v)}catch(e){}};
 N.on=LSg("on","1")==="1"?1:0;N.voice=LSg("voice","m");
 N.setOn=v=>{N.on=v?1:0;LSs("on",N.on?"1":"0");if(!N.on)hide()};
 N.cycle=()=>{N.voice=N.voice==="m"?"f":N.voice==="f"?"text":"m";LSs("voice",N.voice);return N.voice};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 /* ---- the thoughts: a few variants for each moment, written in the first person, present tense ---- */
 const L={
  night:["Night. The Occultica sleeps badly, and so should I. Keep to firelight. Keep my back to something solid.","Dark already. Whatever walks here walks now. Stay near the road, stay near a wall."],
  san60:["My hands won't hold still. It's only the dark. It's only the dark.","I keep seeing movement where the trees thin out. Don't chase it. Daylight, or a roof, or herbs that steady the mind."],
  san35:["I heard my name. Nobody here knows my name. Breathe. Find a wall, a lamp, a living face.","The edges of things are swimming. I'm still here. I'm still the one holding the sword."],
  san15:["Hold on. Hold on. Whatever this is wants me to stop thinking. I won't.","One thing at a time. Stand still. Count my breaths. The hours turn, and morning comes whether it wants to or not."],
  sky_twin:["That is not the sun. The shadows still point the old way. Don't look at it. Keep walking.","A second sun, and it gives no warmth. Whoever hung it there wanted me to look up. I'll keep my eyes on the road."],
  sky_black:["The sun has gone out and the day hasn't noticed. Stars at noon. Whatever is watching is patient.","The light has the wrong weight. Dark sun, bright stars. Find shelter. Wait it out."],
  sky_red:["The moon is open like an eye, and the colour of my own pulse. Stay under the trees.","Red moon. The old books call it a door. I'd like to be far from any door tonight."],
  sky_bells:["Bells. There is no village that way. I counted three. I won't count them again.","Something is ringing for someone. I don't want to learn who."],
  sail:["The water is black glass. Whatever moves this boat, it isn't the current. Keep both hands on the oars.","Out on the river, the dead are not far below. I won't look down."],
  barque:["A barque with no one aboard, and it's turning toward me. I won't wave. I won't wave.","That boat is full of nothing. Look away. Keep rowing."],
  dungeon:["Cold. The stone remembers. I came here for the work: the book, the answer, the thing that was taken. Stay on task.","Down here, the dark is older than my fear. Walk carefully. Remember why I came."],
  hurt:["Blood in my mouth. Not yet. Not here. Drink something, step back, breathe.","I'm hurt worse than I'm letting on. Fall back, mend, then finish it."]};
 /* ---- the caption, in the lower middle, fading ---- */
 let box=null,hideT=0;
 function mk(){if(box)return;box=document.createElement("div");box.id="innerline";box.style.cssText="position:fixed;left:50%;bottom:17%;transform:translateX(-50%);max-width:min(70vw,640px);text-align:center;z-index:9;pointer-events:none;font:italic 1.05rem/1.45 Georgia,'Times New Roman',serif;color:#d8e0ee;text-shadow:0 0 6px #000,0 1px 3px #000,0 0 18px rgba(20,30,60,.9);opacity:0;transition:opacity 1.6s ease;padding:6px 14px";document.body.appendChild(box)}
 function show(t,sec){mk();box.textContent=t;box.style.opacity=".92";hideT=sec}
 function hide(){if(box)box.style.opacity="0";hideT=0}
 /* ---- the voice: low, slow, quieter than the DM ---- */
 function speak(t){if(N.voice==="text")return;if(window.NV&&NV.usable("inner")){NV.speak(t,"inner").catch(()=>speakWin(t));return}speakWin(t)}
 function speakWin(t){if(!window.speechSynthesis)return;try{const OVv=window.OV;let v=null;if(OVv&&OVv.pref)v=OVv.pref(N.voice==="f"?"f":"m",((hero&&hero.name)||"").length+7);
   const u=new SpeechSynthesisUtterance(t);if(v){u.voice=v;u.lang=v.lang}
   const san=(typeof hero!=="undefined"&&hero&&typeof hero.san==="number")?hero.san:100;
   u.rate=.8-(100-san)*.0006;u.pitch=(N.voice==="f"?.92:.72)-(100-san)*.0008;u.volume=.55;speechSynthesis.speak(u)}catch(e){}}
 const spokenLen=t=>Math.max(5,t.length*.075+2.5);
 N.say=function(t){if(!N.on)return;show(t,spokenLen(t));speak(t);N.last=0;N.n++};
 /* ---- when ---- */
 N.fire=function(id,delay){if(!N.on||!hero)return false;hero.inner=hero.inner||{};if(hero.inner[id])return false;if(N.q&&N.q.id===id)return false;hero.inner[id]=1;N.q={id,t:delay||0,wait:0};return true};
 const busyNow=()=>{const fight=(typeof C!=="undefined"&&C&&!C.over);return fight||(typeof occOpen!=="undefined"&&occOpen)||(typeof packOpen!=="undefined"&&packOpen)||(window.WSKY&&WSKY.silent)||(window.OV&&OV.busy&&OV.busy())||(window.SAN&&SAN.trip>0&&Math.random()<.01)};
 let cd=45,wasBoat=false,wasDg=false,wasPh=false,poll=0;
 /* the sky events speak a few seconds after the toll */
 try{if(window.WSKY){const _s=WSKY.start;WSKY.start=function(t,f){const r=_s.apply(this,arguments);if(r)N.fire("sky_"+t,9);return r}}}catch(e){}
 N.skip=()=>{cd=0};
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady)return;dt=Math.min(dt,.1);
   if(hideT>0){hideT-=dt;if(hideT<=0)hide()}
   if(!N.on)return;cd-=dt;
   const inDg=typeof DG!=="undefined"&&DG;
   poll-=dt;if(poll<=0){poll=.5;
    const san=typeof hero.san==="number"?hero.san:100;
    if(san<60)N.fire("san60",2);if(san<35)N.fire("san35",2);if(san<15)N.fire("san15",1);
    const mhp=(typeof maxHP==="function")?maxHP():0;if(mhp&&hero.hp>0&&hero.hp/mhp<.28)N.fire("hurt",1);
    if(inDg&&!wasDg)N.fire("dungeon",3);wasDg=!!inDg;
    const boat=!!(window.SEA&&SEA.B&&SEA.B.on);if(boat&&!wasBoat)N.fire("sail",6);wasBoat=boat;
    const ph=!!(window.SEA&&SEA.dread&&SEA.dread.ph);if(ph&&!wasPh)N.fire("barque",3);wasPh=ph;
    if(!inDg&&typeof todDay==="number"&&todDay<.2&&hero.xp!==undefined)N.fire("night",8)}
   if(N.q){const q=N.q;if(q.t>0){q.t-=dt;return}
    if(cd>0||busyNow()){q.wait+=dt;if(q.wait>45)N.q=null;return}
    const a=L[q.id];if(a){N.say(a[(Math.random()*a.length)|0]);cd=110}N.q=null}
  }catch(e){N.err=String(e&&e.stack||e).slice(0,300)}};
})();

/* ===== NEURAL VOICES: Kokoro (offline, in the desktop app) for the narrator, villagers and the inner voice; optional ElevenLabs for the narrator + inner voice.
   Anything that goes wrong falls back to the Windows voice, so the game is never silent because of this module. ===== */
(function(){
 const API=window.occulticaTTS,AC=window.AudioContext||window.webkitAudioContext;
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.nv."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.nv."+k,v)}catch(e){}};
 const NV=window.NV={api:!!API,ready:false,status:API?"Checking the neural voice...":"Neural voices run in the desktop app (PC edition). This window is using the system voice.",err:"",playing:0,
  mode:LSg("mode","auto"),dm:+LSg("dm","26"),innerM:+LSg("innerM","16"),innerF:+LSg("innerF","6"),elKey:LSg("elkey",""),elDm:LSg("eldm","JBFqnCBsd6RMkjVDRZzb"),elIn:LSg("elin","nPczCjzI2devNBz1zQrb"),elModel:LSg("elmodel","eleven_turbo_v2_5"),last:""};
 const DMV=[[26,"George (British, steady)"],[27,"Lewis (British, dry)"],[25,"Fable (storyteller)"],[24,"Daniel (British, calm)"],[17,"Onyx (deep, American)"],[14,"Fenrir (rough)"],[16,"Michael (American)"]];
 const INV_M=[[16,"Michael"],[17,"Onyx"],[14,"Fenrir"],[12,"Echo"],[26,"George"]],INV_F=[[6,"Nicole (soft)"],[3,"Heart"],[22,"Isabella"],[10,"Sky"],[9,"Sarah"]];
 const NPC_M=[11,13,15,18,24,27,12,25],NPC_F=[2,9,10,21,22,7,1,3,23];
 if(!API){NV.usable=()=>false;NV.speak=()=>Promise.reject(new Error("no engine"));return}
 const O=window.OV;
 /* ---- audio plumbing ---- */
 let ctx=null,token=0,cur=null,irBuf=null;
 const getCtx=()=>{if(!ctx){ctx=new AC();}if(ctx.state==="suspended")ctx.resume().catch(()=>{});return ctx};
 ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{try{getCtx()}catch(e){}},{passive:true}));
 function ir(){if(irBuf)return irBuf;const c=getCtx(),n=Math.floor(c.sampleRate*1.5),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}return irBuf=b}
 const clean=t=>String(t||"").replace(/\bgp\b/gi,"gold pieces").replace(/\bHP\b/g,"hit points").replace(/\bXP\b/g,"experience").replace(/\bAC\b/g,"armor class").replace(/\bd20\b/gi,"d twenty").replace(/[|_*#\[\]{}<>~^]/g," ").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,"").replace(/\s+/g," ").trim();
 function chunks(t){const parts=t.match(/[^.!?;:]+[.!?;:]*\s*/g)||[t],out=[];let c="";for(const p of parts){if((c+p).length<190)c+=p;else{if(c)out.push(c.trim());c=p}}if(c)out.push(c.trim());return out}
 const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};
 function npcVoice(who){const seed=(who&&typeof who.seed==="number")?who.seed:hash((who&&who.name)||"x");const fem=(O&&O.genderOf?O.genderOf(who||{})==="f":false);
  const L=(fem?NPC_F:NPC_M).filter(s=>s!==NV.dm);return L[seed%L.length]}
 const san=()=>{try{return(typeof hero!=="undefined"&&hero&&typeof hero.san==="number")?hero.san:100}catch(e){return 100}};
 function params(role,who){
  if(role==="inner"){const f=(window.INN&&INN.voice==="f");return{sid:f?NV.innerF:NV.innerM,len:1.14+(100-san())*.0012}}
  if(role==="dm")return{sid:NV.dm,len:1.08};
  return{sid:npcVoice(who),len:1.02}}
 /* ---- getting audio ---- */
 const toBuf=async u8=>{const ab=u8.buffer.slice(u8.byteOffset,u8.byteOffset+u8.byteLength);return await getCtx().decodeAudioData(ab)};
 async function kokoro(text,p,t0){const r=await API.say({text,sid:p.sid,len:p.len,t0});if(!r||r.error)throw new Error((r&&r.error)||"no audio");return toBuf(r.audio)}
 async function eleven(text,role,t0){const voice=role==="inner"?NV.elIn:NV.elDm,ck="el|"+voice+"|"+NV.elModel+"|"+text;
  try{const c=await API.cacheGet(ck);if(c)return toBuf(c)}catch(e){}
  const r=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voice)+"?output_format=mp3_44100_128",{method:"POST",headers:{"xi-api-key":NV.elKey,"Content-Type":"application/json",Accept:"audio/mpeg"},
   body:JSON.stringify({text,model_id:NV.elModel,voice_settings:role==="inner"?{stability:.55,similarity_boost:.75,style:.25}:{stability:.45,similarity_boost:.8,style:.35}})});
  if(!r.ok){let m="";try{m=(await r.text()).slice(0,120)}catch(e){}throw new Error("ElevenLabs "+r.status+" "+m)}
  const ab=await r.arrayBuffer();try{API.cachePut(ck,new Uint8Array(ab.slice(0)))}catch(e){}
  return await getCtx().decodeAudioData(ab)}
 function premium(role){return NV.mode==="premium"&&NV.elKey&&(role==="dm"||role==="inner")}
 async function getAudio(text,role,p,t0){
  if(premium(role)){try{NV.last="ElevenLabs";return await eleven(text,role,t0)}catch(e){NV.err=String(e.message||e);if(!NV.ready)throw e}}
  NV.last="Kokoro (voice "+p.sid+")";return kokoro(text,p,t0)}
 /* ---- playing ---- */
 function playBuf(buf,role){return new Promise(res=>{const c=getCtx();const src=c.createBufferSource();src.buffer=buf;let tail=src;
  const out=c.createGain();
  if(role==="inner"){src.playbackRate.value=.96;const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3600;src.connect(lp);const dry=c.createGain();dry.gain.value=.8;const cv=c.createConvolver();cv.buffer=ir();const wet=c.createGain();wet.gain.value=.5;lp.connect(dry);lp.connect(cv);cv.connect(wet);dry.connect(out);wet.connect(out);out.gain.value=.62}
  else{src.connect(out);out.gain.value=role==="dm"?1:.95}
  out.connect(c.destination);cur={src,out};src.onended=()=>{try{out.disconnect()}catch(e){}if(cur&&cur.src===src)cur=null;res()};src.start()})}
 function stopAudio(){token++;if(cur){try{cur.src.onended=null;cur.src.stop()}catch(e){}try{cur.out.disconnect()}catch(e){}cur=null}try{API.cancel()}catch(e){}if(NV.playing){NV.playing=0;try{window.MUS&&MUS.duck(0)}catch(e){}}}
 NV.stop=stopAudio;
 NV.render=async function(text,sid,len,who,warmOnly){text=clean(text);if(!text)return null;const b=await kokoro(text,{sid:sid|0,len:len||1},Date.now());return b};
 NV.usable=role=>NV.mode!=="windows"&&NV.ready;
 NV.speak=async function(text,role,who){
  text=clean(text);if(!text)return;stopAudio();const my=token,p=params(role,who),list=chunks(text),t0=Date.now();
  const jobs=list.map(c=>getAudio(c,role,p,t0));jobs.forEach(j=>j.catch(()=>{}));
  let first;try{first=await jobs[0]}catch(e){if(my===token)NV.err=String(e.message||e);throw e}
  if(my!==token)return;NV.playing=1;try{window.MUS&&MUS.duck(1)}catch(e){}
  try{for(let i=0;i<jobs.length;i++){const b=i?await jobs[i].catch(()=>null):first;if(my!==token)return;if(!b)break;await playBuf(b,role);if(my!==token)return;if(i<jobs.length-1)await new Promise(r=>setTimeout(r,role==="inner"?260:170));if(my!==token)return}}
  finally{if(my===token){NV.playing=0;try{window.MUS&&MUS.duck(0)}catch(e){}}}
 };
 /* ---- hook into the game's existing voice entry points ---- */
 try{if(O){const _say=O.say,_stop=O.stop,_busy=O.busy;NV._say=_say;NV._busy=_busy;
  O.say=function(text,who){if(!NV.usable())return _say.apply(O,arguments);try{_stop()}catch(e){}NV.speak(text,who==="dm"?"dm":"npc",who==="dm"?null:who).catch(()=>{try{_say(text,who)}catch(e){}})};
  O.stop=function(){try{NV.stop()}catch(e){}return _stop.apply(O,arguments)};
  O.busy=function(){return !!NV.playing||_busy.apply(O,arguments)}}}catch(e){}
 try{const _sp=speak;speak=function(t,n){if(typeof voiceOn==="undefined"||!voiceOn)return;if(NV.usable()&&window.OV){OV.say(t,n);return}return _sp.apply(this,arguments)}}catch(e){}
 /* ---- engine status ---- */
 let pollT=0;
 async function poll(){try{const s=await API.status();NV.ready=!!s.ready;NV.err=s.err||"";
   NV.status=s.ready?"Neural voice ready (offline).":s.busy?s.busy:s.err?"Neural voice unavailable: "+s.err+" (using the Windows voice)":"Preparing the neural voice...";
   clearTimeout(pollT);pollT=setTimeout(poll,s.ready?20000:(s.err?30000:2500))}catch(e){NV.status="Neural voice unavailable (using the Windows voice).";pollT=setTimeout(poll,30000)}}
 poll();
 /* ---- the Voices panel ---- */
 const css=document.createElement("style");css.textContent="#nvsec{border-bottom:1.5px solid #1c1a3a55;margin:2px 0 8px;padding-bottom:8px}#nvsec b{font:700 .8rem 'Cinzel',serif}#nvsec .st{font-size:.82rem;margin:3px 0 4px}#nvsec small{display:block;opacity:.75;margin-top:4px}";document.head.appendChild(css);
 const mkSel=(label,opts,val,fn)=>{const l=document.createElement("label");l.textContent=label;const s=document.createElement("select");opts.forEach(o=>{const e=document.createElement("option");e.value=o[0];e.textContent=o[1];if(String(o[0])===String(val))e.selected=true;s.appendChild(e)});s.onchange=()=>fn(s.value);return[l,s]};
 const mkBtn=(t,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=fn;return b};
 const LINE="The torchlight gutters. Somewhere beneath the cellar, something turns over in its sleep, and listens for you.";
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function waitFree(){for(let i=0;i<400;i++){if(!(NV._busy&&NV._busy()))return;await sleep(250)}}
 async function compare(st){try{st.textContent="1 of 2: the Windows voice...";if(O&&NV._say){const m=NV.mode;NV.mode="windows";O.say(LINE,"dm");NV.mode=m}await sleep(900);await waitFree();
   st.textContent="2 of 2: the neural voice...";await sleep(500);try{await NV.speak(LINE,"dm");}catch(e){st.textContent="Neural voice not ready: "+(NV.err||e.message);return}
   if(NV.elKey){st.textContent="3 of 3: ElevenLabs...";await sleep(700);const m=NV.mode;NV.mode="premium";try{await NV.speak(LINE,"dm")}catch(e){st.textContent="ElevenLabs problem: "+(NV.err||e.message);NV.mode=m;return}NV.mode=m}
   st.textContent=NV.status}catch(e){st.textContent="Test stopped: "+e.message}}
 function ui(){const p=document.getElementById("ovp");if(!p||p.hidden)return;const old=document.getElementById("nvsec");if(old)old.remove();
  const sec=document.createElement("div");sec.id="nvsec";const h=document.createElement("b");h.textContent="Voice engine";sec.appendChild(h);
  const st=document.createElement("div");st.className="st";st.textContent=NV.status;sec.appendChild(st);
  const t=setInterval(()=>{if(!document.getElementById("nvsec")){clearInterval(t);return}if(!NV.last||NV.playing===0)st.textContent=NV.status},1500);
  const m=mkSel("Engine",[["auto","Neural, offline (falls back to Windows)"],["windows","Windows voices only"],["premium","Premium: ElevenLabs narrator + inner voice (needs a key)"]],NV.mode,v=>{NV.mode=v;LSs("mode",v)});sec.appendChild(m[0]);sec.appendChild(m[1]);
  const d=mkSel("Narrator voice (neural)",DMV,NV.dm,v=>{NV.dm=+v;LSs("dm",v);NV.speak("The road is long, traveller, and the night is longer.","dm").catch(()=>{})});sec.appendChild(d[0]);sec.appendChild(d[1]);
  const im=mkSel("Inner voice, male",INV_M,NV.innerM,v=>{NV.innerM=+v;LSs("innerM",v)}),inf=mkSel("Inner voice, female",INV_F,NV.innerF,v=>{NV.innerF=+v;LSs("innerF",v)});[im[0],im[1],inf[0],inf[1]].forEach(e=>sec.appendChild(e));
  const kl=document.createElement("label");kl.textContent="ElevenLabs key (optional, type it here yourself)";const ki=document.createElement("input");ki.type="password";ki.placeholder="Paste key, then press Save";ki.value=NV.elKey;ki.autocomplete="off";sec.appendChild(kl);sec.appendChild(ki);
  const l2=document.createElement("label");l2.textContent="ElevenLabs narrator voice ID";const i2=document.createElement("input");i2.value=NV.elDm;sec.appendChild(l2);sec.appendChild(i2);
  const l3=document.createElement("label");l3.textContent="ElevenLabs inner voice ID";const i3=document.createElement("input");i3.value=NV.elIn;sec.appendChild(l3);sec.appendChild(i3);
  sec.appendChild(mkBtn("Save key and IDs",()=>{NV.elKey=ki.value.trim();NV.elDm=i2.value.trim()||NV.elDm;NV.elIn=i3.value.trim()||NV.elIn;LSs("elkey",NV.elKey);LSs("eldm",NV.elDm);LSs("elin",NV.elIn);st.textContent=NV.elKey?"Key saved on this PC.":"Key cleared."}));
  sec.appendChild(mkBtn("Compare: Windows vs neural",()=>compare(st)));
  sec.appendChild(mkBtn("Villager (man)",()=>{NV.speak("Well met, traveler. Sit by the fire and rest a while.","npc",{name:"Tobias",seed:3}).catch(e=>st.textContent="Not ready: "+(NV.err||e.message))}));
  sec.appendChild(mkBtn("Villager (woman)",()=>{NV.speak("Well met, traveler. Sit by the fire and rest a while.","npc",{name:"Edda",seed:4,job:"herbalist"}).catch(e=>st.textContent="Not ready: "+(NV.err||e.message))}));
  sec.appendChild(mkBtn("Inner voice",()=>{NV.speak("Hold on. Whatever this is wants me to stop thinking. I won't.","inner").catch(e=>st.textContent="Not ready: "+(NV.err||e.message))}));
  if(NV.err)sec.appendChild(mkBtn("Try the neural voice again",()=>{st.textContent="Trying again...";API.retry().then(poll)}));
  const n=document.createElement("small");n.textContent="Neural voices are generated on this PC and need no internet. The ElevenLabs key is stored only on this PC and is used for the narrator and inner voice.";sec.appendChild(n);
  p.insertBefore(sec,p.children[1]||null)}
 document.addEventListener("click",e=>{if(e.target&&e.target.id==="ovbtn")setTimeout(ui,30)});
 window.NV.ui=ui;
})();

window.__MVCAL={"growl": 0.646, "roar": 0.495, "snarl": 0.745, "bark": 0.598, "howl": 0.437, "yelp": 0.589, "hiss": 2.292, "rattle": 2.489, "chitter": 7.639, "moan": 0.769, "wail": 0.381, "grunt": 0.561, "shout": 0.64, "groan": 0.664, "cackle": 0.597, "sing": 0.952, "gurgle": 1.467, "grind": 1.351, "mutter": 1.322, "flame": 1.627, "boom": 0.967, "clang": 0.897, "chime": 1.499, "horn": 0.371, "choir": 1.294, "whoosh": 3.767, "heartbeat": 1.528};

/* ===== MONSTER VOICES: layered, formant-shaped creature sounds for every monster family (notice, attack, hurt, death, idle),
   placed in space (distance, direction, room), with processed speech for the ones that talk, and voices for the guardian angels and your companions.
   Drop recorded clips into  audio/monsters/  and they replace the synthesised sound for that creature + event (see the README there). ===== */
(function(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const MV=window.MV={on:1,live:false,lines:1,vol:1,last:"",clips:{}};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.mv."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.mv."+k,v)}catch(e){}};
 MV.on=LSg("on","1")==="1"?1:0;MV.lines=LSg("lines","1")==="1"?1:0;
 MV.setOn=v=>{MV.on=v?1:0;LSs("on",MV.on?"1":"0")};MV.setLines=v=>{MV.lines=v?1:0;LSs("lines",MV.lines?"1":"0")};
 const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[(Math.random()*a.length)|0];
 /* ================= synthesis library (works on a live or an offline context) ================= */
 const NB=new WeakMap(),CV=new Map();
 const noiseBuf=X=>{let b=NB.get(X);if(!b){const n=X.sampleRate*2|0;b=X.createBuffer(1,n,X.sampleRate);const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;NB.set(X,b)}return b};
 const curve=k=>{let c=CV.get(k);if(!c){c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;c[i]=Math.tanh(x*k)/Math.tanh(k)}CV.set(k,c)}return c};
 const VOW={a:[800,1150,2900],o:[500,800,2830],u:[320,800,2200],e:[530,1840,2480],i:[270,2290,3010],m:[250,1000,2200],r:[420,1300,1600]};
 const envG=(X,t,dur,att,rel,peak)=>{const g=X.createGain();att=Math.min(att,dur*.45);rel=Math.min(rel,dur*.55);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+att);g.gain.setValueAtTime(peak,t+Math.max(att,dur-rel));g.gain.linearRampToValueAtTime(0,t+dur);return g};
 /* the core: a buzzing source pushed through three vowel formants, with vibrato, growl-roughness, breath and a sub layer */
 function vox(X,dest,t,o){
  const dur=o.dur,f1=o.f1==null?o.f0:o.f1,fs=o.fs||1,out=envG(X,t,dur,o.att==null?.05:o.att,o.rel==null?.2:o.rel,o.gain==null?.3:o.gain);
  const osc=X.createOscillator();osc.type=o.wave||"sawtooth";osc.frequency.setValueAtTime(o.f0,t);osc.frequency.exponentialRampToValueAtTime(Math.max(18,f1),t+dur);
  if(o.vib){const l=X.createOscillator(),g=X.createGain();l.frequency.value=o.vib[0];g.gain.value=o.f0*o.vib[1];l.connect(g);g.connect(osc.frequency);l.start(t);l.stop(t+dur+.1)}
  if(o.det){osc.detune.value=o.det}
  let src=osc;if(o.drive){const w=X.createWaveShaper();w.curve=curve(o.drive);osc.connect(w);src=w}
  const v0=VOW[(o.vow&&o.vow[0])||"a"],v1=VOW[(o.vow&&o.vow[1])||(o.vow&&o.vow[0])||"a"],sum=X.createGain();sum.gain.value=1;
  const bands=[1,.65,.35];
  for(let i=0;i<3;i++){const bp=X.createBiquadFilter();bp.type="bandpass";bp.Q.value=(o.q||6)*(i?1.5:1);bp.frequency.setValueAtTime(v0[i]*fs,t);if(v1!==v0)bp.frequency.linearRampToValueAtTime(v1[i]*fs,t+dur);
   const g=X.createGain();g.gain.value=bands[i]*(o.boost||4);src.connect(bp);bp.connect(g);g.connect(sum)}
  if(o.air){const n=X.createBufferSource();n.buffer=noiseBuf(X);n.loop=true;const bp=X.createBiquadFilter();bp.type="bandpass";bp.frequency.setValueAtTime(v0[1]*fs,t);if(v1!==v0)bp.frequency.linearRampToValueAtTime(v1[1]*fs,t+dur);bp.Q.value=1.1;const g=X.createGain();g.gain.value=o.air*.9;n.connect(bp);bp.connect(g);g.connect(sum);n.start(t,Math.random());n.stop(t+dur+.05)}
  let node=sum;
  if(o.am){const amg=X.createGain();amg.gain.value=1-o.am[1];const l=X.createOscillator(),lg=X.createGain();l.type="triangle";l.frequency.value=o.am[0];lg.gain.value=o.am[1];l.connect(lg);lg.connect(amg.gain);sum.connect(amg);node=amg;l.start(t);l.stop(t+dur+.1)}
  node.connect(out);
  if(o.sub){const s=X.createOscillator(),g=X.createGain();s.type="sine";s.frequency.setValueAtTime(o.f0*.5,t);s.frequency.exponentialRampToValueAtTime(Math.max(18,f1*.5),t+dur);g.gain.value=o.sub;s.connect(g);g.connect(out);s.start(t);s.stop(t+dur+.05)}
  out.connect(dest);osc.start(t);osc.stop(t+dur+.05);return dur}
 function nband(X,dest,t,o){const n=X.createBufferSource();n.buffer=noiseBuf(X);n.loop=true;const bp=X.createBiquadFilter();bp.type=o.type||"bandpass";bp.frequency.setValueAtTime(o.f,t);if(o.f2)bp.frequency.exponentialRampToValueAtTime(o.f2,t+o.dur);bp.Q.value=o.q||1;
  const g=envG(X,t,o.dur,o.att==null?.02:o.att,o.rel==null?.1:o.rel,o.gain==null?.2:o.gain);let nd=bp;
  if(o.am){const amg=X.createGain();amg.gain.value=1-o.am[1];const l=X.createOscillator(),lg=X.createGain();l.type="square";l.frequency.value=o.am[0];lg.gain.value=o.am[1];l.connect(lg);lg.connect(amg.gain);bp.connect(amg);nd=amg;l.start(t);l.stop(t+o.dur+.1)}
  n.connect(bp);nd.connect(g);g.connect(dest);n.start(t,Math.random());n.stop(t+o.dur+.05);return o.dur}
 function tone(X,dest,t,o){const s=X.createOscillator();s.type=o.type||"sine";s.frequency.setValueAtTime(o.f,t);if(o.f2)s.frequency.exponentialRampToValueAtTime(o.f2,t+o.dur);const g=X.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(o.gain||.2,t+(o.att||.005));g.gain.exponentialRampToValueAtTime(.0008,t+o.dur);s.connect(g);g.connect(dest);s.start(t);s.stop(t+o.dur+.05);return o.dur}
 /* ---- the sounds ---- */
 const R={
  growl(X,d,t,p){const s=p.s,f=rnd(72,96)/s,dur=rnd(.75,1.1);return vox(X,d,t,{f0:f*1.15,f1:f*.82,dur,vow:["o","a"],fs:1/Math.sqrt(s),q:7,vib:[7,.03],am:[rnd(26,38),.7],drive:3,air:.4,sub:.45,gain:.5,att:.12,rel:.3})},
  roar(X,d,t,p){const s=p.s,f=rnd(62,80)/s,dur=rnd(1.2,1.7);vox(X,d,t,{f0:f*1.3,f1:f*.7,dur,vow:["a","o"],fs:1/Math.sqrt(s),q:6,vib:[6,.025],am:[rnd(18,24),.55],drive:6,air:.55,sub:.5,gain:.55,att:.08,rel:.5});
   return nband(X,d,t,{f:500,f2:220,dur:dur*.9,q:.7,gain:.18,att:.1,rel:.5})},
  snarl(X,d,t,p){const s=p.s,f=rnd(105,125)/s,dur=rnd(.35,.55);return vox(X,d,t,{f0:f*1.1,f1:f*.8,dur,vow:["e","a"],fs:1/Math.sqrt(s),q:6,am:[rnd(38,50),.75],drive:4,air:.5,sub:.2,gain:.5,att:.03,rel:.15})},
  bark(X,d,t,p){const s=p.s,f=rnd(170,200)/s;return vox(X,d,t,{f0:f,f1:f*.6,dur:.24,vow:["a","o"],fs:1/Math.sqrt(s),q:6,drive:2,air:.45,gain:.55,att:.01,rel:.1})},
  howl(X,d,t,p){const s=p.s,f=rnd(230,270)/s,dur=2.3;vox(X,d,t,{f0:f,f1:f*1.25,dur:dur*.55,vow:["o","u"],fs:1/Math.sqrt(s),q:9,vib:[5.2,.03],drive:1.5,air:.12,gain:.4,att:.5,rel:.05,wave:"sawtooth"});
   return vox(X,d,t+dur*.5,{f0:f*1.25,f1:f*.8,dur:dur*.5,vow:["u","o"],fs:1/Math.sqrt(s),q:9,vib:[5.6,.04],drive:1.5,air:.12,gain:.4,att:.05,rel:.9})},
  yelp(X,d,t,p){const s=p.s,f=rnd(480,560)/s;return vox(X,d,t,{f0:f,f1:f*.5,dur:rnd(.25,.38),vow:["e","a"],fs:1/Math.sqrt(s),q:7,drive:1.2,air:.2,gain:.45,att:.01,rel:.12})},
  hiss(X,d,t,p){const dur=rnd(.9,1.4);nband(X,d,t,{f:5200,f2:7800,dur,q:1.6,gain:.2,att:.12,rel:.4,type:"bandpass"});nband(X,d,t,{f:2800,dur,q:.8,gain:.07,att:.1,rel:.4,am:[rnd(22,32),.45]});return dur},
  rattle(X,d,t,p){const n=(rnd(9,14))|0;let tt=0;for(let i=0;i<n;i++){tone(X,d,t+tt,{f:rnd(150,260),f2:90,dur:.06,gain:.16});nband(X,d,t+tt,{f:rnd(1600,3400),dur:.05,q:4,gain:.25,att:.002,rel:.03});tt+=rnd(.035,.085)}return tt+.1},
  chitter(X,d,t,p){const n=(rnd(16,24))|0;let tt=0;for(let i=0;i<n;i++){nband(X,d,t+tt,{f:rnd(3200,6200),dur:.025,q:9,gain:.2*(.6+.4*Math.sin(i*.8)),att:.001,rel:.015});tt+=rnd(.022,.045)}return tt+.05},
  moan(X,d,t,p){const s=p.s,f=rnd(92,125)/s,dur=rnd(1.7,2.5);return vox(X,d,t,{f0:f*1.08,f1:f*.82,dur,vow:["o","u"],fs:1/Math.sqrt(s),q:5,vib:[4.4,.035],am:[3.2,.25],drive:1.2,air:.55,gain:.4,att:.45,rel:.8})},
  wail(X,d,t,p){const f=rnd(500,600)/Math.sqrt(p.s),dur=rnd(1.7,2.4);[0,14].forEach((dt,i)=>vox(X,d,t+i*.04,{f0:f,f1:f*1.35,dur:dur*.5,vow:["i","a"],q:7,vib:[6,.05],det:dt,air:.25,gain:.22,att:.4,rel:.05}));
   [0,14].forEach((dt,i)=>vox(X,d,t+dur*.5+i*.04,{f0:f*1.35,f1:f*.6,dur:dur*.5,vow:["a","o"],q:7,vib:[6.4,.06],det:dt,air:.3,gain:.22,att:.03,rel:.9}));return dur},
  grunt(X,d,t,p){const s=p.s,f=rnd(98,140)/s;return vox(X,d,t,{f0:f*1.1,f1:f*.8,dur:rnd(.18,.3),vow:["u","a"],fs:1/Math.sqrt(s),q:5,drive:2,air:.4,gain:.5,att:.01,rel:.1})},
  shout(X,d,t,p){const s=p.s,f=rnd(145,185)/s,dur=rnd(.45,.7);return vox(X,d,t,{f0:f,f1:f*.72,dur,vow:["a","o"],fs:1/Math.sqrt(s),q:6,vib:[6,.02],drive:2.5,air:.4,gain:.5,att:.03,rel:.2})},
  groan(X,d,t,p){const s=p.s,f=rnd(105,135)/s,dur=rnd(1,1.5);return vox(X,d,t,{f0:f*1.1,f1:f*.5,dur,vow:["a","o"],fs:1/Math.sqrt(s),q:5,vib:[4,.03],drive:1.5,air:.5,gain:.42,att:.1,rel:.7})},
  cackle(X,d,t,p){const s=p.s,n=(rnd(4,6))|0,f=rnd(380,460)/s;let tt=0;for(let i=0;i<n;i++){vox(X,d,t+tt,{f0:f*(i%2?.8:1),f1:f*(i%2?.62:.8),dur:.11,vow:[i%2?"e":"a","a"],fs:1/Math.sqrt(s),q:6,drive:1.5,air:.45,gain:.4,att:.01,rel:.05});tt+=.17}return tt},
  sing(X,d,t,p){const f=rnd(300,350),sc=[0,3,7,5];let tt=0;for(let i=0;i<4;i++){const ff=f*Math.pow(2,sc[i]/12);[0,9,-9].forEach(dt=>vox(X,d,t+tt,{f0:ff,f1:ff*1.01,dur:.85,vow:["a","o"],q:8,vib:[5.2,.02],det:dt,wave:"triangle",air:.12,gain:.13,att:.18,rel:.3}));tt+=.62}return tt+.4},
  gurgle(X,d,t,p){const dur=rnd(1,1.5);nband(X,d,t,{f:420,type:"lowpass",dur,q:1,gain:.25,att:.1,rel:.4,am:[11,.8]});for(let i=0;i<6;i++)tone(X,d,t+rnd(0,dur*.85),{f:rnd(180,320),f2:rnd(500,900),dur:.09,gain:.14});vox(X,d,t,{f0:90/Math.sqrt(p.s),f1:70/Math.sqrt(p.s),dur,vow:["u","u"],q:4,am:[9,.6],air:.4,gain:.2,att:.3,rel:.4});return dur},
  grind(X,d,t,p){const dur=rnd(.9,1.3);nband(X,d,t,{f:180,f2:90,dur,q:1.2,gain:.4,att:.05,rel:.4,am:[rnd(12,18),.7]});tone(X,d,t,{f:48,f2:30,dur:.8,gain:.4});tone(X,d,t+.35,{f:42,f2:28,dur:.7,gain:.3});return dur},
  mutter(X,d,t,p){const f=rnd(105,135),dur=rnd(1,1.5);vox(X,d,t,{f0:f,f1:f*.9,dur,vow:["m","o"],q:5,am:[4.2,.8],air:.5,gain:.3,att:.2,rel:.4});return vox(X,d,t+.1,{f0:f*1.5,f1:f*1.35,dur:dur*.9,vow:["o","m"],q:5,am:[5.1,.8],air:.4,gain:.18,att:.2,rel:.4})},
  flame(X,d,t,p){const dur=rnd(.8,1.2);nband(X,d,t,{f:400,f2:2400,dur,q:.7,gain:.35,att:.1,rel:.5});for(let i=0;i<9;i++)nband(X,d,t+rnd(0,dur),{f:rnd(2500,6000),type:"highpass",dur:.025,q:.5,gain:.15,att:.001,rel:.02});return dur},
  boom(X,d,t,p){tone(X,d,t,{f:70,f2:28,dur:.9,gain:.55});nband(X,d,t,{f:300,f2:90,dur:.7,type:"lowpass",q:.8,gain:.3,att:.005,rel:.5});return .9},
  clang(X,d,t,p){[[1300,.5],[2100,.3],[3300,.2],[4700,.12]].forEach((a,i)=>tone(X,d,t,{f:a[0]*rnd(.99,1.01),dur:.9-i*.12,gain:a[1]*.28}));nband(X,d,t,{f:3000,type:"highpass",dur:.06,q:.5,gain:.3,att:.001,rel:.04});return .9},
  chime(X,d,t,p){[880,1109,1319,1760].forEach((f,i)=>{tone(X,d,t+i*.13,{f,dur:1.6,gain:.14});tone(X,d,t+i*.13,{f:f*2.01,dur:1,gain:.05})});return 2.2},
  horn(X,d,t,p){const f=233;[1,1.5].forEach((m,i)=>vox(X,d,t+i*.5,{f0:f*m*.97,f1:f*m,dur:1.4,vow:["o","a"],q:3,boost:3,drive:1.5,gain:.3,att:.08,rel:.5,sub:.2}));return 2.1},
  choir(X,d,t,p){const dur=p.dur||4,base=p.f||196;[1,1.25,1.5,2,2.5].forEach((m,i)=>{[0,7,-7].forEach(dt=>vox(X,d,t+i*.12,{f0:base*m,f1:base*m*1.004,dur,vow:["a","o"],q:9,vib:[4.8+i*.2,.012],det:dt,wave:"triangle",air:.05,gain:.05,att:1.1,rel:1.6}))});return dur},
  whoosh(X,d,t,p){return nband(X,d,t,{f:300,f2:2800,dur:.7,q:.9,gain:.3,att:.1,rel:.4})},
  heartbeat(X,d,t,p){tone(X,d,t,{f:60,f2:36,dur:.2,gain:.4});tone(X,d,t+.2,{f:52,f2:34,dur:.22,gain:.3});return .5}
 };
 const CAL=window.__MVCAL||{};MV._CAL=CAL;
 Object.keys(R).forEach(k=>{const f=R[k];R[k]=function(X,d,t,p){const c=CAL[k];if(c&&Math.abs(c-1)>.02){const g=X.createGain();g.gain.value=c;g.connect(d);return f(X,g,t,p)}return f(X,d,t,p)}});
 MV._R=R;MV._S={vox,nband,tone,rnd,pick,clamp};
 /* ---- families: which words map to which voice, how big they sound, and which sound each event uses ---- */
 const FAMS=[
  ["canine",/Wolf|Hound|Dog|Jackal|Hyena/i,.75],["bigbeast",/Yeti|Bear|Boar|Lion|Panther|Tiger|Cat\b/i,1.5],["vermin",/Rat|Spider|Scorpion|Wasp|Worm|Bat\b|Beetle|Ant\b/i,.5],
  ["reptile",/Snake|Lizard|Croc|Basilisk|Serpent/i,.9],["hydra",/Hydra|Dragon|Drake|Leviathan/i,2.2],["skeleton",/Skeleton|Bones/i,1],
  ["wraith",/Wraith|Ghost|Shade|Spirit|Phantom|Banshee/i,1],["lich",/Lich|King/i,1.3],["ghoul",/Zombie|Ghoul|Mummy|Drowned|Sailor|Courtier|Revenant|Wight/i,1],["demon",/Demon|Balor|Dust|Ammit/i,1.5],["imp",/\bImp\b|Bog Imp|Sprite|Fae|Wisp/i,.5],
  ["giant",/Giant|Ogre|Troll|Colossus|Titan/i,2.3],["golem",/Golem|Elemental|Statue/i,2],["beholder",/Beholder|Eye/i,1.6],["goblin",/Goblin/i,.7],["orc",/\bOrc|Dwarf|Lizardfolk/i,1.2],
  ["siren",/Siren|Nymph|Mermaid/i,1],["caster",/Magician|Mage|Wizard|Witch|Cultist|Priest|Sorcer/i,1],["human",/Bandit|Paladin|Rogue|Knight|Archer|Guard|Man\b|Villager/i,1.05]];
 const famOf=name=>{name=String(name||"");for(const f of FAMS)if(f[1].test(name))return{key:f[0],s:f[2]};return{key:"human",s:1}};
 MV.famOf=famOf;
 const A=(...a)=>a;
 const EV={
  canine:{notice:p=>[R.howl(...p)||0],attack:p=>[R.snarl(...p),R.bark(...p)],hurt:p=>[R.yelp(...p)],death:p=>[R.yelp(...p),R.moan(...p)],idle:p=>[R.growl(...p)]},
  bigbeast:{notice:p=>[R.roar(...p)],attack:p=>[R.roar(...p)],hurt:p=>[R.snarl(...p)],death:p=>[R.roar(...p)],idle:p=>[R.growl(...p)]},
  vermin:{notice:p=>[R.chitter(...p)],attack:p=>[R.hiss(...p),R.chitter(...p)],hurt:p=>[R.chitter(...p)],death:p=>[R.chitter(...p)],idle:p=>[R.chitter(...p)]},
  reptile:{notice:p=>[R.hiss(...p)],attack:p=>[R.hiss(...p),R.snarl(...p)],hurt:p=>[R.hiss(...p)],death:p=>[R.hiss(...p)],idle:p=>[R.hiss(...p)]},
  hydra:{notice:p=>[R.roar(...p),R.hiss(...p)],attack:p=>[R.roar(...p)],hurt:p=>[R.hiss(...p),R.snarl(...p)],death:p=>[R.roar(...p),R.gurgle(...p)],idle:p=>[R.hiss(...p)]},
  skeleton:{notice:p=>[R.rattle(...p)],attack:p=>[R.rattle(...p),R.clang(...p)],hurt:p=>[R.rattle(...p)],death:p=>[R.rattle(...p),R.rattle(...p)],idle:p=>[R.rattle(...p)]},
  ghoul:{notice:p=>[R.moan(...p)],attack:p=>[R.groan(...p),R.snarl(...p)],hurt:p=>[R.groan(...p)],death:p=>[R.moan(...p),R.gurgle(...p)],idle:p=>[R.moan(...p)]},
  wraith:{notice:p=>[R.wail(...p)],attack:p=>[R.wail(...p)],hurt:p=>[R.wail(...p)],death:p=>[R.wail(...p),R.wail(...p)],idle:p=>[R.moan(...p)]},
  lich:{notice:p=>[R.moan(...p),R.boom(...p)],attack:p=>[R.groan(...p),R.boom(...p)],hurt:p=>[R.groan(...p)],death:p=>[R.wail(...p),R.boom(...p)],idle:p=>[R.mutter(...p)]},
  demon:{notice:p=>[R.roar(...p),R.boom(...p)],attack:p=>[R.roar(...p)],hurt:p=>[R.growl(...p)],death:p=>[R.roar(...p),R.flame(...p)],idle:p=>[R.growl(...p)]},
  imp:{notice:p=>[R.cackle(...p)],attack:p=>[R.cackle(...p)],hurt:p=>[R.yelp(...p)],death:p=>[R.yelp(...p),R.cackle(...p)],idle:p=>[R.cackle(...p)]},
  giant:{notice:p=>[R.roar(...p),R.boom(...p)],attack:p=>[R.roar(...p),R.boom(...p)],hurt:p=>[R.growl(...p)],death:p=>[R.roar(...p),R.boom(...p)],idle:p=>[R.growl(...p)]},
  golem:{notice:p=>[R.grind(...p)],attack:p=>[R.grind(...p),R.boom(...p)],hurt:p=>[R.grind(...p)],death:p=>[R.grind(...p),R.boom(...p)],idle:p=>[R.grind(...p)]},
  beholder:{notice:p=>[R.gurgle(...p),R.wail(...p)],attack:p=>[R.growl(...p),R.wail(...p)],hurt:p=>[R.gurgle(...p)],death:p=>[R.wail(...p),R.gurgle(...p)],idle:p=>[R.gurgle(...p)]},
  goblin:{notice:p=>[R.cackle(...p)],attack:p=>[R.shout(...p)],hurt:p=>[R.yelp(...p)],death:p=>[R.yelp(...p),R.groan(...p)],idle:p=>[R.grunt(...p)]},
  orc:{notice:p=>[R.shout(...p)],attack:p=>[R.shout(...p),R.grunt(...p)],hurt:p=>[R.grunt(...p)],death:p=>[R.groan(...p)],idle:p=>[R.grunt(...p)]},
  siren:{notice:p=>[R.sing(...p)],attack:p=>[R.wail(...p)],hurt:p=>[R.yelp(...p)],death:p=>[R.wail(...p)],idle:p=>[R.sing(...p)]},
  caster:{notice:p=>[R.mutter(...p)],attack:p=>[R.mutter(...p),R.whoosh(...p)],hurt:p=>[R.grunt(...p)],death:p=>[R.groan(...p)],idle:p=>[R.mutter(...p)]},
  human:{notice:p=>[R.shout(...p)],attack:p=>[R.shout(...p)],hurt:p=>[R.grunt(...p)],death:p=>[R.groan(...p)],idle:p=>[R.grunt(...p)]}
 };
 MV._EV=EV;MV._FAMS=FAMS;
 /* calibration: loudness of each recipe, so everything sits at a similar level (measured offline) */
 /* offline rendering (used for tests and available to the sound-clip tool) */
 MV.render=function(fam,ev,size,sec){const sr=44100,X=new OfflineAudioContext(2,Math.floor(sr*(sec||4)),sr),m=X.createGain();m.connect(X.destination);const f=EV[fam]&&EV[fam][ev];if(!f)return null;
  const d=f([X,m,.05,{s:size||1}]);return X.startRendering()};
 /* ================= live engine ================= */
 let X=null,mix=null,rvOut=null,rvDry=null,rvIn={out:null,dg:null},irs={};
 const mkIR=(sec,dec)=>{const n=X.sampleRate*sec|0,b=X.createBuffer(2,n,X.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,dec)}return b};
 function init(){if(X)return true;try{X=new AC();mix=X.createGain();mix.gain.value=.9;const comp=X.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;mix.connect(comp);comp.connect(X.destination);
  ["out","dg"].forEach(k=>{const cv=X.createConvolver();cv.buffer=k==="out"?mkIR(.9,3):mkIR(2.4,2.4);const g=X.createGain();g.gain.value=1;cv.connect(g);g.connect(mix);const inn=X.createGain();inn.connect(cv);rvIn[k]={inn,out:g}});MV.live=true;return true}catch(e){return false}}
 ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{if(!X)init();if(X&&X.state==="suspended")X.resume().catch(()=>{})},{passive:true}));
 const inDg=()=>{try{return typeof DG!=="undefined"&&!!DG}catch(e){return false}};
 /* place a sound: distance (muffling + quieter), direction, room */
 function place(pos){let d=4,pan=0;try{if(pos){const dx=pos.x-P.x,dz=pos.z-P.z;d=Math.hypot(dx,dz)||.1;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);pan=clamp((dx*(-fz)+dz*fx)/d,-1,1)*.85}}catch(e){}
  return{d,pan,g:clamp(1.25/(1+d*.09),.12,1.1),lp:clamp(16000/(1+d*.1),1500,16000),rv:(inDg()?.5:.16)+clamp(d*.01,0,.2),room:inDg()?"dg":"out"}}
 function route(node,pl,gain){const g=X.createGain();g.gain.value=(gain==null?1:gain)*pl.g*MV.vol;const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=pl.lp;node.connect(g);g.connect(lp);let o=lp;
  if(X.createStereoPanner){const p=X.createStereoPanner();p.pan.value=pl.pan;lp.connect(p);o=p}o.connect(mix);const s=X.createGain();s.gain.value=pl.rv;o.connect(s);const r=rvIn[pl.room];s.connect(r.inn);
}
 /* a bus the recipes write into */
 function bus(){const b=X.createGain();b.gain.value=1;return b}
 /* ---- recorded clips (optional): audio/monsters/<Name or family>_<event>[_n].wav|ogg|mp3 ---- */
 const clipBuf=new Map();
 async function clipFor(keys,ev){const A=window.occulticaTTS;for(const k of keys){const l=MV.clips[k.toLowerCase()+"_"+ev];if(l&&l.length){const f=pick(l);if(clipBuf.has(f))return clipBuf.get(f);try{let ab=null;if(A&&A.clipGet){const r=await A.clipGet(f);if(r)ab=r.buffer.slice(r.byteOffset,r.byteOffset+r.byteLength)}else{const r=await fetch("audio/monsters/"+f);if(r.ok)ab=await r.arrayBuffer()}
    if(ab){const b=await X.decodeAudioData(ab);clipBuf.set(f,b);return b}}catch(e){}}}return null}
 async function loadClipList(){try{const A=window.occulticaTTS;let l=null;if(A&&A.clipList)l=await A.clipList();else if(location.protocol!=="file:"){try{const r=await fetch("audio/monsters/manifest.json");if(r.ok)l=await r.json()}catch(e){}}
  if(!l)return;const m={};l.forEach(f=>{const mm=/^(.+?)_(notice|attack|hurt|death|idle|summon|join|cast|guard|grow|line)(?:_\d+)?\.(wav|ogg|mp3|m4a|flac)$/i.exec(f);if(mm){const k=mm[1].replace(/_/g," ").toLowerCase()+"_"+mm[2].toLowerCase();(m[k]=m[k]||[]).push(f)}});
  MV.clips=m;MV.clipCount=l.length}catch(e){}}
 /* ---- play a monster event ---- */
 const lastEv={};
 MV.event=async function(ev,name,pos,o){o=o||{};if(!MV.on||!init())return;if(X.state==="suspended")try{X.resume()}catch(e){}if(X.state!=="running")return;
  const key=name+"|"+ev,now=performance.now();if(lastEv[key]&&now-lastEv[key]<(o.gap||350))return;lastEv[key]=now;
  const fam=famOf(name),pl=place(pos),sz=(o.s||fam.s)*(o.sz||1);MV.last=name+" "+ev+" ("+fam.key+")";
  const cb=await clipFor([String(name).toLowerCase(),fam.key],ev);
  if(cb){const s=X.createBufferSource();s.buffer=cb;s.playbackRate.value=rnd(.95,1.05);route(s,pl,1);s.start();return cb.duration}
  const f=EV[fam.key]&&EV[fam.key][ev];if(!f)return;const b=bus();route(b,pl,(o.gain||1)*(ev==="idle"?.55:1));
  const t=X.currentTime+.02,parts=f([X,b,t,{s:sz}]);return 1};
 /* ================= processed speech =================
    Kokoro renders the words; these chains turn them into a demon, a corpse, a ghost, a cultist, an angel. */
 const KIND=[["ghost",/Wraith|Ghost|Shade|Spirit|Siren|Phantom|Banshee/i],["demon",/Demon|Imp|Balor|Beholder|Dust|Ammit|Hydra/i],["undead",/Skeleton|Zombie|Mummy|Lich|King|Ghoul|Drowned|Sailor|Courtier|Revenant|Wight/i],["cult",/Magician|Mage|Wizard|Witch|Cultist|Priest|Sorcer/i],["man",/Paladin|Dwarf|Bandit|Rogue|Orc|Goblin|Giant/i]];
 const kindOf=n=>{for(const k of KIND)if(k[1].test(n))return k[0];return"man"};
 const SID={demon:17,undead:14,ghost:6,cult:16,man:24,Raphael:3,Michael:26,Uriel:14,Gabriel:7};
 const LINES={
  "Dark Magician":["Your soul is already spoken for.","Kneel."],"Fallen Paladin":["I kept my oath. What did you keep?","Come, then. Let it end."],"Bog Imp":["Sweet blood, sweet blood."],"Frost Demon":["I was old when your mountain was a seed.","Cold is mercy."],
  "Dust Demon":["The sand remembers every name.","Burn."],"Mummy":["Water... give me water.","Bring... back... my heart."],"Frost Wraith":["Cold... so cold. Stay with us."],"Bog Wraith":["The mud is warm. Come down."],"River Wraith":["Pay the ferryman."],
  "Drowned Sailor":["The sea keeps what it takes."],"The Drowned King":["Come down. All come down.","I am the tide that waits."],"Siren":["Come closer. Closer."],"Water Demon":["The deep has your name."],"Beholder":["I see you. I see all of you."],
  "Renegade Dwarf":["You trespass under my mountain!"],"Stone Giant":["Little thing. Little, little thing."],"Hill Giant":["Fee. Fi. Fo. Fum? No. Just fum."],"Hydra":["Hissss. Many mouths. One hunger."],"Lich":["Death is a door. I hold the key."],
  "Skeleton":["Rattle, rattle."],"Orc Raider":["For the horde!"],"Orc Warrior":["Blood and iron!"],"Nymph":["Stay, stay. Be still."],"Leviathan Spawn":["Hunger."]};
 const ALLY={aldric:{who:{name:"Ser Aldric Thorne",seed:7788},join:["Steel is drawn."],attack:["Hah!","For the road!","Take that!","Stand fast!"],guard:["Behind me!"],line:[]},
  sera:{who:{name:"Sera Vane",job:"witch",seed:41},join:["The Moon sees."],cast:["Be mended.","Quiet now.","Breathe."],attack:[],guard:[],line:[]}};
 const ANGEL={Raphael:"Rise. God heals.",Michael:"Who is like God? Stand behind me.",Uriel:"Let there be light.",Gabriel:"Fear not. Strength is given to you."};
 function proc(buf,kind,pl){
  const out=X.createGain();out.gain.value=1;const mk=(rate,g)=>{const s=X.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;const gg=X.createGain();gg.gain.value=g;s.connect(gg);return{s,g:gg}};
  const L=[];let dur=buf.duration;
  if(kind==="demon"){const a=mk(.74,.95),b=mk(.52,.6);L.push(a,b);dur=buf.duration/.52;const w=X.createWaveShaper();w.curve=curve(2.2);const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3200;a.g.connect(w);b.g.connect(w);w.connect(lp);
   const rm=X.createGain();rm.gain.value=.7;const l=X.createOscillator(),lg=X.createGain();l.frequency.value=37;lg.gain.value=.3;l.connect(lg);lg.connect(rm.gain);l.start();l.stop(X.currentTime+dur+1);lp.connect(rm);rm.connect(out)}
  else if(kind==="undead"){const a=mk(.9,.9),b=mk(.87,.5);L.push(a,b);dur=buf.duration/.87;const hp=X.createBiquadFilter();hp.type="highpass";hp.frequency.value=180;const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2400;a.g.connect(hp);b.g.connect(hp);hp.connect(lp);
   const tr=X.createGain();tr.gain.value=.78;const l=X.createOscillator(),lg=X.createGain();l.frequency.value=5;lg.gain.value=.22;l.connect(lg);lg.connect(tr.gain);l.start();l.stop(X.currentTime+dur+1);lp.connect(tr);tr.connect(out)}
  else if(kind==="ghost"){const a=mk(1,.8);L.push(a);const hp=X.createBiquadFilter();hp.type="highpass";hp.frequency.value=320;const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=5200;a.g.connect(hp);hp.connect(lp);
   [.019,.031].forEach(dl=>{const d=X.createDelay(.1);d.delayTime.value=dl;const g=X.createGain();g.gain.value=.45;lp.connect(d);d.connect(g);g.connect(out)});lp.connect(out);
   const l=X.createOscillator(),lg=X.createGain();l.frequency.value=5.5;lg.gain.value=.035;l.connect(lg);lg.connect(a.s.playbackRate);l.start();l.stop(X.currentTime+dur+1)}
  else if(kind==="cult"){const a=mk(.94,.7);L.push(a);const hp=X.createBiquadFilter();hp.type="highpass";hp.frequency.value=650;const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3000;a.g.connect(hp);hp.connect(lp);lp.connect(out)}
  else if(kind==="angel"){const a=mk(1,.8),b=mk(1.006,.5),c=mk(.994,.5);L.push(a,b,c);const lp=X.createBiquadFilter();lp.type="lowpass";lp.frequency.value=9000;[a,b,c].forEach(x=>x.g.connect(lp));lp.connect(out);
   const d=X.createDelay(.2);d.delayTime.value=.043;const dg=X.createGain();dg.gain.value=.3;lp.connect(d);d.connect(dg);dg.connect(out)}
  else{const a=mk(.96,1);L.push(a);a.g.connect(out)}
  const t=X.currentTime+.03;L.forEach(x=>x.s.start(t));route(out,pl,kind==="demon"?1.1:1);return dur}
 /* say a line as a creature (needs the neural voice; otherwise stays silent, the synth sound has already played) */
 MV.say=async function(text,kind,pos,sidOverride,who){if(!MV.on||!MV.lines||!window.NV||!NV.ready||NV.mode==="windows"||!NV.render)return false;if(!init())return false;if(X.state!=="running")return false;
  try{const sid=sidOverride||SID[kind]||24;const buf=await NV.render(text,sid,kind==="undead"||kind==="demon"?1.05:1.0,who);if(!buf)return false;proc(buf,kind,place(pos));return true}catch(e){return false}};
 /* ================= hooks into the game ================= */
 const foeName=()=>{try{return(C&&C.e&&C.e.name)||""}catch(e){return""}};
 const foePos=()=>{try{return fx3&&fx3.g?fx3.g.position:null}catch(e){return null}};
 const talkCool={};
 function maybeLine(name,when){if(!MV.lines||!LINES[name]||!window.NV||!NV.ready)return;const p=when==="spawn"?.45:.25;if(Math.random()>p)return;const k=name+when,n=performance.now();if(talkCool[k]&&n-talkCool[k]<20000)return;talkCool[k]=n;
  const t=pick(LINES[name]);setTimeout(()=>{if(!MV.on)return;MV.say(t,kindOf(name),foePos());try{if(typeof say==="function")say(name+": “"+t+"”")}catch(e){}},when==="spawn"?900:300)}
 function hook(){
  try{const o=fx3.spawn;fx3.spawn=function(f){const r=o.apply(this,arguments);try{if(MV.on&&f&&f[0]){const big=(typeof DG!=="undefined"&&DG&&DG.th&&f[0]===DG.th.boss);MV.event("notice",f[0],foePos(),{gain:big?1.2:1,gap:6000});maybeLine(f[0],"spawn")}}catch(e){}return r}}catch(e){}
  try{const o=fx3.strike;fx3.strike=function(){try{if(MV.on)MV.event("attack",foeName(),foePos(),{gap:500})}catch(e){}return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.hit;fx3.hit=function(n){try{if(MV.on&&typeof n==="number"&&(n>=8||Math.random()<.6))MV.event("hurt",foeName(),foePos(),{gap:450,gain:n>=10?1.15:1})}catch(e){}return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.die;fx3.die=function(){try{if(MV.on){const nm=foeName();MV.event("death",nm,foePos(),{gap:1500});maybeLine(nm,"death")}}catch(e){}return o.apply(this,arguments)}}catch(e){}
  /* the older generic growl would double up with the new voices */
  try{if(window.ENV&&ENV.S){const g=ENV.S.growl;ENV.S.growl=function(){if(MV.on&&MV.live)return;return g.apply(this,arguments)}}}catch(e){}
 }
 /* roaming monsters: idle sounds as they close in, and a cry when they notice you */
 const roamT=new WeakMap();
 function roamTick(){try{if(!MV.on||!MV.live||!X||X.state!=="running"||document.hidden||typeof hero==="undefined"||!hero)return;if(typeof C!=="undefined"&&C)return;if(inDg())return;const now=performance.now();
  (window.__ROAM||[]).forEach(r=>{const g=r.F&&r.F.g;if(!g||!g.visible||r.dead)return;const dx=g.position.x-P.x,dz=g.position.z-P.z,d=Math.hypot(dx,dz);if(d>26||d<.8)return;
   let st=roamT.get(r);if(!st){st={mode:r.mode,next:now+rnd(1500,5000)};roamT.set(r,st)}
   if(r.mode==="chase"&&st.mode!=="chase"){st.mode="chase";MV.event("notice",r.f[0],g.position,{gap:4000,gain:1});st.next=now+rnd(4000,8000);return}
   st.mode=r.mode;if(now<st.next)return;st.next=now+rnd(4500,9500)*(.6+d/26);if(Math.random()<.7)MV.event("idle",r.f[0],g.position,{gap:2500})})}catch(e){}}
 setInterval(roamTick,400);
 /* ================= angels and allies ================= */
 MV.angel=async function(name){if(!MV.on||!init())return;if(X.state==="suspended")try{X.resume()}catch(e){}if(X.state!=="running")return;const pl=place(null);pl.g=1.05;pl.rv=.55;pl.room="dg";
  const b=bus();route(b,pl,1);const t=X.currentTime+.02;R.choir(X,b,t,{dur:5,f:name==="Gabriel"?220:name==="Uriel"?174:name==="Michael"?165:196});
  if(name==="Gabriel")R.horn(X,b,t+.2,{});else if(name==="Michael"){R.clang(X,b,t+.4,{});R.whoosh(X,b,t+.2,{})}else if(name==="Uriel"){R.flame(X,b,t+.2,{});R.boom(X,b,t+.2,{})}else R.chime(X,b,t+.3,{});
  const line=ANGEL[name];if(line&&MV.lines&&window.NV&&NV.ready)setTimeout(()=>MV.say(line,"angel",null,SID[name]),1200)};
 const allyCool={};
 MV.ally=async function(id,ev){if(!MV.on||!init())return;if(X.state==="suspended")try{X.resume()}catch(e){}if(X.state!=="running")return;const a=ALLY[id];if(!a)return;const pl=place(foePos()?{x:P.x+Math.cos(yaw)*2,z:P.z-Math.sin(yaw)*2}:null);pl.rv=pl.rv*.8;
  const b=bus();route(b,pl,.9);const t=X.currentTime+.02;
  if(id==="aldric"){if(ev==="attack"){R.clang(X,b,t,{});R.grunt(X,b,t+.02,{s:1.05})}else if(ev==="guard")R.clang(X,b,t,{});else if(ev==="join")R.clang(X,b,t,{})}
  else if(id==="sera"){if(ev==="cast"||ev==="join")R.chime(X,b,t,{})}
  const arr=a[ev];if(arr&&arr.length&&MV.lines&&window.NV&&NV.ready&&NV.render){const n=performance.now();if(allyCool[id]&&n-allyCool[id]<7000)return;if(Math.random()>.55&&ev!=="join")return;allyCool[id]=n;
   const text=pick(arr);try{const sid=id==="aldric"?11:2;const buf=await NV.render(text,sid,1.0,a.who);if(buf)proc(buf,"man",place({x:P.x+Math.cos(yaw)*2,z:P.z-Math.sin(yaw)*2}))}catch(e){}}};
 /* ================= warming the cache (so lines are instant) ================= */
 let warmI=0,warmList=null;
 function warmAll(){if(!window.NV||!NV.ready||!NV.render||NV.mode==="windows"||!MV.lines)return;if(typeof C!=="undefined"&&C)return;
  if(!warmList){warmList=[];for(const n in LINES)LINES[n].forEach(t=>warmList.push([t,SID[kindOf(n)]||24,kindOf(n)==="undead"||kindOf(n)==="demon"?1.05:1.0]));for(const n in ANGEL)warmList.push([ANGEL[n],SID[n],1.0]);
   for(const id in ALLY){const a=ALLY[id];["join","attack","cast","guard"].forEach(e=>(a[e]||[]).forEach(t=>warmList.push([t,id==="aldric"?11:2,1.0,a.who])))}}
  if(warmI>=warmList.length)return;const w=warmList[warmI++];NV.render(w[0],w[1],w[2],w[3],true).catch(()=>{})}
 setInterval(warmAll,6000);
 /* ================= settings and startup ================= */
 hook();loadClipList();MV.reloadClips=loadClipList;
 const perf=()=>{};
})();

/* ===== FAMILIARS: small creatures that bind to you, follow you, and help in fights on their own (a witch's familiar, a ranger's hawk).
   How many you may keep depends on the class: Magician and Cleric 3, Rogue and Ranger 2, Fighter and Paladin 1.
   Slots open with your level (3, 6, 9) or early with the Whistle of Small Things (found once a first dungeon is cleared).
   A free slot makes a wild creature turn up now and then, calling out; follow the sound, press E to befriend it. Press V for the Familiars panel.
   They use the monster sound engine (MV) for every cry, call and flutter, placed in space. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined"||typeof fx3==="undefined")return;
 const T=THREE,FM=window.FAM={on:1,list:[],wild:null,cd:25,log:""};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.fam."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.fam."+k,v)}catch(e){}};
 FM.on=LSg("on","1")==="1"?1:0;FM.setOn=v=>{FM.on=v?1:0;LSs("on",FM.on?"1":"0");sync()};
 const R=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
 const CAP={Magician:3,Cleric:3,Rogue:2,Ranger:2,Fighter:1,Paladin:1};
 const TIER=[3,6,9];
 const BOND=[0,3,8,15,25];
 const DUN=["crypt","mine","lair","sunk","tomb","cave"];
 const cleared=()=>{try{return hero&&hero.dg?DUN.filter(i=>hero.dg[i]&&hero.dg[i].clr&&hero.dg[i].clr[5]).length:0}catch(e){return 0}};
 const st=()=>{hero.fam=hero.fam||{own:[],wh:0,ann:0};return hero.fam};
 FM.cap=()=>CAP[hero&&hero.cls]||1;
 FM.slots=()=>{if(!hero)return 0;const lv=hero.level||1;let n=TIER.filter(t=>lv>=t).length;if(st().wh)n+=1;return Math.min(FM.cap(),n)};
 const nextTxt=()=>{const lv=hero.level||1,n=FM.slots(),cap=FM.cap();if(n>=cap)return "All "+cap+" slot"+(cap>1?"s":"")+" for a "+hero.cls+" are open.";const nxt=TIER.find(t=>t>lv&&TIER.indexOf(t)>=n-(st().wh?1:0));return "Next slot at level "+(nxt||"?")+(st().wh?"":", or sooner with the Whistle of Small Things (clear a dungeon).")};
 const ground=(x,z)=>{try{if(typeof DG!=="undefined"&&DG)return Math.max(0,camera.position.y-1.6);return Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 const outdoors=()=>typeof world!=="undefined"&&world&&world.visible&&!DG&&hero;
 const okTile=(x,z)=>{try{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);return tx>1&&ty>1&&tx<W-2&&ty<H-2&&reach[ty*W+tx]&&!tileSolid(tx,ty)&&hfn(x,z)>-.2}catch(e){return false}};

 /* ---------- the creatures ---------- */
 const lam=(c,e)=>new T.MeshLambertMaterial({color:c,emissive:e||0});
 const bas=c=>new T.MeshBasicMaterial({color:c});
 function mesh(g,geo,mat,x,y,z,sx,sy,sz){const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(sx!=null)m.scale.set(sx,sy==null?sx:sy,sz==null?sx:sz);g.add(m);return m}
 const SPH=new T.SphereGeometry(1,10,8),CON=new T.ConeGeometry(1,1,6),BOX=new T.BoxGeometry(1,1,1),CYL=new T.CylinderGeometry(1,1,1,6);
 function glow(col,size,op){const c=document.createElement("canvas");c.width=c.height=32;const x=c.getContext("2d"),gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.3,"rgba(255,255,255,.5)");gr.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=gr;x.fillRect(0,0,32,32);
  const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:op||.8,fog:false}));s.scale.set(size,size,1);return s}
 /* each builder returns a group at floor level; parts get animated by name */
 const BUILD={
  raven(){const g=new T.Group(),k=lam(0x15151c);const p={};
   mesh(g,SPH,k,0,.45,0,.16,.15,.26);mesh(g,SPH,k,0,.58,.22,.1,.1,.1);mesh(g,CON,lam(0x6a5a30),0,.57,.36,.035,.12,.035).rotation.x=Math.PI/2;
   [-1,1].forEach(s=>{mesh(g,SPH,bas(0xe8e0a0),s*.05,.61,.3,.018);const w=new T.Group();w.position.set(s*.12,.5,0);g.add(w);mesh(w,BOX,k,s*.2,0,0,.4,.02,.2);p[s<0?"wl":"wr"]=w});
   mesh(g,BOX,k,0,.43,-.3,.1,.02,.22);return{g,p,fly:1,h:1.7}},
  cat(){const g=new T.Group(),k=lam(0x101014),p={};
   mesh(g,SPH,k,0,.22,0,.12,.12,.26);mesh(g,SPH,k,0,.34,.24,.1,.09,.09);
   [-1,1].forEach(s=>{mesh(g,CON,k,s*.06,.45,.23,.035,.07,.035);mesh(g,SPH,bas(0xd8f060),s*.04,.36,.32,.02,.025,.012);[.15,-.15].forEach(z=>mesh(g,CYL,k,s*.07,.08,z,.025,.16,.025))});
   const t=new T.Group();t.position.set(0,.3,-.25);g.add(t);mesh(t,CYL,k,0,.12,-.05,.02,.3,.02).rotation.x=.5;p.tail=t;return{g,p,fly:0,h:0}},
  toad(){const g=new T.Group(),k=lam(0x4a5a2a),p={};
   mesh(g,SPH,k,0,.14,0,.17,.12,.2);mesh(g,SPH,lam(0x6a7a3a),0,.1,.06,.12,.06,.14);
   [-1,1].forEach(s=>{mesh(g,SPH,k,s*.08,.27,.1,.045);mesh(g,SPH,bas(0xf0c040),s*.08,.28,.13,.022);mesh(g,SPH,k,s*.14,.06,-.1,.06,.04,.1)});
   return{g,p,fly:0,h:0}},
  owl(){const g=new T.Group(),k=lam(0x7a6a58),p={};
   mesh(g,SPH,k,0,.4,0,.17,.24,.17);mesh(g,SPH,lam(0xb8a890),0,.36,.1,.12,.17,.07);mesh(g,SPH,k,0,.68,.02,.15,.13,.14);
   [-1,1].forEach(s=>{mesh(g,SPH,bas(0xffcc40),s*.06,.7,.12,.045);mesh(g,SPH,bas(0x080808),s*.06,.7,.15,.02);mesh(g,CON,k,s*.09,.83,.02,.035,.09,.035);
    const w=new T.Group();w.position.set(s*.16,.5,0);g.add(w);mesh(w,BOX,k,s*.13,-.08,0,.22,.3,.04);p[s<0?"wl":"wr"]=w});
   mesh(g,CON,lam(0xd09030),0,.66,.15,.025,.06,.025).rotation.x=Math.PI/2;return{g,p,fly:1,h:1.5}},
  wisp(){const g=new T.Group(),p={};
   mesh(g,SPH,bas(0xbfe8ff),0,.4,0,.09);const gl=glow(0x80c8ff,1.5,.85);gl.position.y=.4;g.add(gl);p.gl=gl;
   const o=new T.Group();o.position.y=.4;g.add(o);for(let i=0;i<3;i++)mesh(o,SPH,bas(0xe0f4ff),Math.cos(i*2.09)*.28,0,Math.sin(i*2.09)*.28,.03);p.orb=o;return{g,p,fly:1,h:1.4,light:1}},
  imp(){const g=new T.Group(),k=lam(0x8a2a1a,0x2a0800),p={};
   mesh(g,SPH,k,0,.3,0,.1,.13,.09);mesh(g,SPH,k,0,.5,.02,.08,.08,.08);
   [-1,1].forEach(s=>{mesh(g,CON,lam(0x2a1008),s*.05,.6,0,.02,.08,.02);mesh(g,SPH,bas(0xffd040),s*.03,.52,.08,.014);
    const w=new T.Group();w.position.set(s*.08,.38,-.05);g.add(w);mesh(w,BOX,lam(0x5a1a12),s*.12,.02,0,.2,.015,.14);p[s<0?"wl":"wr"]=w;mesh(g,CYL,k,s*.04,.12,0,.02,.16,.02)});
   const f=glow(0xff8030,.7,.7);f.position.set(0,.76,0);g.add(f);p.fl=f;
   const t=new T.Group();t.position.set(0,.22,-.08);g.add(t);mesh(t,CYL,k,0,0,-.1,.012,.24,.012).rotation.x=1.3;p.tail=t;return{g,p,fly:1,h:1.2}},
  pup(){const g=new T.Group(),k=lam(0x6a6a72),p={};
   mesh(g,SPH,k,0,.25,0,.12,.13,.24);mesh(g,SPH,k,0,.36,.25,.1,.1,.11);mesh(g,SPH,lam(0x3a3a40),0,.32,.36,.05,.045,.06);
   [-1,1].forEach(s=>{mesh(g,CON,k,s*.06,.47,.24,.03,.07,.03);mesh(g,SPH,bas(0xffd890),s*.04,.4,.34,.015);[.15,-.15].forEach(z=>mesh(g,CYL,k,s*.07,.09,z,.03,.18,.03))});
   const t=new T.Group();t.position.set(0,.3,-.24);g.add(t);mesh(t,CON,k,0,.1,-.04,.03,.22,.03).rotation.x=-.7;p.tail=t;return{g,p,fly:0,h:0}},
  stalker(){if(window.STK&&STK.mkFig){const b=STK.mkFig();return{g:b.g,p:{stk:b.p},fly:0,h:0,tall:1}}const g=new T.Group();mesh(g,CYL,bas(0x07070b),0,1.7,0,.2,3.4,.2);return{g,p:{},fly:0,h:0,tall:1}},
  spider(){const g=new T.Group(),k=lam(0x1a1018),p={};
   mesh(g,SPH,k,0,.14,-.06,.1,.09,.13);mesh(g,SPH,k,0,.14,.1,.07,.06,.06);mesh(g,SPH,bas(0xe03030),0,.03+.14,.17,.012);mesh(g,SPH,bas(0xe03030),.03,.17,.16,.01);mesh(g,SPH,bas(0xe03030),-.03,.17,.16,.01);
   p.legs=[];for(let i=0;i<8;i++){const s=i<4?1:-1,j=i%4,l=new T.Group();l.position.set(0,.14,.05-j*.07);g.add(l);mesh(l,CYL,k,s*.1,0,0,.01,.22,.01).rotation.z=s*1.1;p.legs.push(l)}
   return{g,p,fly:0,h:0}}
 };
 /* species: ability, rhythm, voice */
 const SP={
  raven:{n:"Ash Raven",cd:5200,dmg:1.6,abil:"Pecks the eyes. Once a fight it blinds the foe, dulling its strikes.",names:["Cinder","Mourn","Pitch","Hugin"],flavor:"A raven watches from a branch, head cocked, as if waiting for you to notice."},
  cat:{n:"Black Cat",cd:4300,dmg:1.4,abil:"Quick claws. Often lands a lucky double strike.",names:["Soot","Nox","Mab","Pyewacket"],flavor:"A black cat sits in the road, tail curled, perfectly sure you will stop."},
  toad:{n:"Hearth Toad",cd:9500,dmg:0,abil:"Sings a slow charm that mends your wounds.",names:["Bramble","Moss","Old Warty","Pip"],flavor:"A fat toad blinks at you from the mud. Something about its song is restful."},
  owl:{n:"Grey Owl",cd:8800,dmg:.8,abil:"Steadies your mind: restores mana or stamina as the fight runs.",names:["Sage","Hesper","Moth","Athene"],flavor:"A grey owl turns its whole head toward you and does not blink."},
  wisp:{n:"Marsh Wisp",cd:6800,dmg:3.4,abil:"Hurls a bolt of cold light. The strongest single hit of the lot.",names:["Glim","Lantern","Will","Ember-not"],flavor:"A pale light hangs over the grass, bobbing, though there is no wind."},
  imp:{n:"Ember Imp",cd:5600,dmg:2.4,abil:"Spits flame that keeps burning a moment after it lands.",names:["Snick","Cackle","Scorch","Tinder"],flavor:"A little red thing perches on a stone, picking its teeth with a match."},
  pup:{n:"Wolf Pup",cd:4000,dmg:2.2,abil:"Bites hard, and grows fiercer as the bond deepens.",names:["Ash","Fang","Rook","Sorrel"],flavor:"A grey wolf pup watches you, ears up, belly low, deciding."},
  stalker:{n:"The Stalker",cd:6500,dmg:5,abil:"Walks through the foe and takes its health and its nerve (foe attack drops). At full bond it turns aside a third of every blow aimed at you. Only moves when you are not looking. Wears on your mind a little.",names:["The Stalker"],flavor:"It stands in the road and waits."},
  spider:{n:"Crypt Spider",cd:5400,dmg:.8,abil:"Venomous: its bite keeps hurting the foe for a few seconds.",names:["Weaver","Lace","Eight","Nettle"],flavor:"A pale spider the size of a hand descends on a thread, unbothered."}
 };
 FM.SP=SP;
 const ORDER=Object.keys(SP).filter(k=>k!=="stalker");

 /* ---------- sounds (through the monster sound engine) ---------- */
 const S=()=>window.MV&&MV._S,snd={};
 function mkSounds(){const s=S();if(!s||snd.ok)return!!snd.ok;const {vox,nband,tone,rnd}=s,Rr=MV._R;
  const caw=(X,d,t,p)=>{let tt=0;const n=1+(Math.random()*2|0);for(let i=0;i<n;i++){vox(X,d,t+tt,{f0:rnd(430,520),f1:rnd(290,350),dur:.26,vow:["a","o"],q:5,drive:3,air:.5,gain:.5,att:.015,rel:.08,am:[70,.5]});tt+=.37}return tt};
  const flutter=(X,d,t)=>nband(X,d,t,{f:1900,dur:.4,q:1.4,gain:.1,am:[18,.8],att:.02,rel:.12});
  const meow=(X,d,t)=>{vox(X,d,t,{f0:460,f1:720,dur:.3,vow:["e","a"],q:7,vib:[6,.02],air:.15,gain:.35,att:.04,rel:.05});return vox(X,d,t+.28,{f0:720,f1:430,dur:.5,vow:["a","o"],q:7,vib:[6,.03],air:.15,gain:.33,att:.02,rel:.25})};
  const purr=(X,d,t)=>{nband(X,d,t,{f:160,type:"lowpass",dur:1.4,q:1,gain:.35,att:.25,rel:.45,am:[24,.85]});tone(X,d,t,{f:72,dur:1.3,gain:.1});return 1.5};
  const ribbit=(X,d,t)=>{vox(X,d,t,{f0:150,f1:230,dur:.2,vow:["o","e"],q:6,am:[38,.8],air:.2,gain:.5,att:.01,rel:.05});return vox(X,d,t+.3,{f0:125,f1:210,dur:.24,vow:["o","e"],q:6,am:[34,.8],air:.2,gain:.5,att:.01,rel:.06})};
  const hoot=(X,d,t)=>{vox(X,d,t,{f0:340,f1:300,dur:.5,vow:["u","o"],wave:"triangle",q:6,vib:[5,.02],air:.12,gain:.45,att:.08,rel:.15});return vox(X,d,t+.7,{f0:330,f1:280,dur:.6,vow:["u","o"],wave:"triangle",q:6,vib:[5,.02],air:.12,gain:.4,att:.06,rel:.3})};
  const spark=(X,d,t)=>{tone(X,d,t,{f:1568,f2:2093,dur:.7,gain:.12});tone(X,d,t+.1,{f:2349,dur:.6,gain:.07});nband(X,d,t,{f:5200,type:"highpass",dur:.4,q:.6,gain:.04,att:.01,rel:.3});return .8};
  const zap=(X,d,t)=>{tone(X,d,t,{f:2400,f2:500,dur:.3,gain:.14,type:"triangle"});nband(X,d,t,{f:3000,f2:900,dur:.3,q:2,gain:.12,att:.005,rel:.15});return .35};
  const cack=(X,d,t)=>Rr.cackle(X,d,t,{s:.4}),flame=(X,d,t)=>Rr.flame(X,d,t,{s:1}),yip=(X,d,t)=>{Rr.yelp(X,d,t,{s:.4});return Rr.yelp(X,d,t+.3,{s:.35})},
   pgrowl=(X,d,t)=>Rr.growl(X,d,t,{s:.4}),pbark=(X,d,t)=>Rr.bark(X,d,t,{s:.4}),skit=(X,d,t)=>Rr.chitter(X,d,t,{s:.4}),shis=(X,d,t)=>Rr.hiss(X,d,t,{s:.5}),
   hiss=shis,bell=(X,d,t)=>Rr.chime(X,d,t,{s:1});
  const E=(o)=>{const r={};for(const k in o){const a=o[k];r[k]=p=>{let m=0;a.forEach((f,i)=>{if(i===0)m=f(p[0],p[1],p[2],p[3]);else f(p[0],p[1],p[2]+.12*i,p[3])});return[m]}}return r};
  const EV=MV._EV,FA=MV._FAMS;
  EV.fam_raven=E({notice:[caw],attack:[caw,flutter],hurt:[caw],death:[caw],idle:[caw],summon:[flutter,caw],join:[caw],cast:[flutter,spark],grow:[caw,bell]});
  EV.fam_cat=E({notice:[meow],attack:[hiss,meow],hurt:[meow],death:[meow],idle:[purr],summon:[purr,meow],join:[meow],cast:[meow,spark],grow:[purr,bell]});
  EV.fam_toad=E({notice:[ribbit],attack:[ribbit],hurt:[ribbit],death:[ribbit],idle:[ribbit],summon:[ribbit],join:[ribbit],cast:[ribbit,spark],grow:[ribbit,bell]});
  EV.fam_owl=E({notice:[hoot],attack:[flutter,hoot],hurt:[hoot],death:[hoot],idle:[hoot],summon:[flutter,hoot],join:[hoot],cast:[hoot,spark],grow:[hoot,bell]});
  EV.fam_wisp=E({notice:[spark],attack:[zap,spark],hurt:[spark],death:[spark],idle:[spark],summon:[spark,bell],join:[spark],cast:[spark],grow:[bell,spark]});
  EV.fam_imp=E({notice:[cack],attack:[flame,cack],hurt:[cack],death:[cack],idle:[cack],summon:[flame,cack],join:[cack],cast:[flame],grow:[cack,bell]});
  EV.fam_pup=E({notice:[yip],attack:[pgrowl,pbark],hurt:[yip],death:[yip],idle:[yip],summon:[yip,pbark],join:[pbark],cast:[pbark,spark],grow:[yip,bell]});
  EV.fam_spider=E({notice:[skit],attack:[skit,hiss],hurt:[skit],death:[skit],idle:[skit],summon:[skit],join:[skit],cast:[skit,spark],grow:[skit,bell]});
  ORDER.forEach(k=>{if(!FA.some(f=>f[0]==="fam_"+k))FA.unshift(["fam_"+k,new RegExp("^Familiar "+SP[k].n+"$","i"),1])});
  snd.ok=1;return true}
 function sfx(ev,o,gain,pos){try{if(o.sp==="stalker"){if(window.STK&&STK.sfxAt)STK.sfxAt(ev,pos||o.g.position,gain);return}if(!mkSounds()||!window.MV||!MV.on)return;MV.event(ev,"Familiar "+SP[o.sp].n,pos||o.g.position,{gap:o.gap||250,gain:gain||1})}catch(e){}}

 /* ---------- spawning figures ---------- */
 function mkFig(sp){const b=BUILD[sp]();const g=b.g;g.userData.fam=sp;scene.add(g);return b}
 function addOwned(rec){const b=mkFig(rec.sp),x=P.x+R(-2,2),z=P.z+R(-2,2);const o={rec,sp:rec.sp,g:b.g,p:b.p,fly:b.fly,h:b.h,x,z,hd:0,ph:Math.random()*9,act:0,dash:0,nx:0,idle:performance.now()+R(8000,18000),gap:250};b.g.position.set(x,ground(x,z)+(b.fly?b.h:0),z);FM.list.push(o);return o}
 function sync(){if(!hero||!FM.on){FM.list.forEach(o=>{o.g.visible=false});return}
  const own=st().own;
  for(let i=FM.list.length-1;i>=0;i--){const o=FM.list[i];if(!own.includes(o.rec)){scene.remove(o.g);FM.list.splice(i,1)}else o.g.visible=true}
  own.forEach(r=>{if(!FM.list.some(o=>o.rec===r))addOwned(r)})}

 /* ---------- following ---------- */
 function slotPos(i,n,fight){const a=[-2.3,2.3,0.0][i%3]+(n===1?(i%2?2.3:-2.3):0),back=fight?-1.4:(i===2?3.3:2.4);const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  return{x:P.x-fx*back+rx*(a>0?1:a<0?-1:0)*(fight?2.6:1.9),z:P.z-fz*back+rz*(a>0?1:a<0?-1:0)*(fight?2.6:1.9)}}
 function seenBy(o){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=o.x-P.x,dz=o.z-P.z,d=Math.hypot(dx,dz)||1;return (fx*dx+fz*dz)/d>Math.cos(.62)}
 let stkHb=0;
 function move(o,dt,i,n,t){const fight=!!(C&&!C.over);let tx,tz;
  if(o.sp==="stalker"){const seen=seenBy(o);try{if(typeof hero.san==="number"&&!fight)hero.san=Math.max(0,hero.san-dt/36)}catch(e){}
   stkHb-=dt;if(stkHb<=0){stkHb=60/48;try{if(window.STK&&STK.thump)STK.thump(.08)}catch(e){}}
   const far=Math.hypot(o.x-P.x,o.z-P.z);
   if(seen&&!o.dash&&far<30){/* frozen: face the player, idle sway only */o.g.position.set(o.x,ground(o.x,o.z),o.z);o.g.rotation.y=Math.atan2(P.x-o.x,P.z-o.z);if(o.p.stk){o.p.stk.hd.rotation.z=Math.sin(t*.7+o.ph)*.12}return}}
  if(o.rec.mode==="wait"){tx=o.x;tz=o.z}else{const s=slotPos(i,n,fight);tx=s.x;tz=s.z}
  let dashing=false,fy=null;
  if(o.dash>0&&fx3.g){o.dash-=dt;dashing=true;const fp=fx3.g.position,dx=fp.x-P.x,dz=fp.z-P.z,d=Math.hypot(dx,dz)||1;tx=fp.x-dx/d*1.1;tz=fp.z-dz/d*1.1;fy=fp.y+.9}
  const dx=tx-o.x,dz=tz-o.z,d=Math.hypot(dx,dz),far=Math.hypot(o.x-P.x,o.z-P.z);let spd=0;
  if(far>34&&o.rec.mode!=="wait"){const a=Math.random()*6.28;o.x=P.x+Math.cos(a)*4;o.z=P.z+Math.sin(a)*4}
  else if(d>.3){spd=dashing?14:(far>10?9:far>5?5.2:2.8)*(o.fly?1.15:1);const st2=Math.min(d,spd*dt),nx=o.x+dx/d*st2,nz=o.z+dz/d*st2;
   if(o.fly||dashing||(typeof DG!=="undefined"&&DG)||!tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))){o.x=nx;o.z=nz}else{const ax=o.x+dx/d*st2;if(!tileSolid(Math.floor(ax/TW),Math.floor(o.z/TW)))o.x=ax;else{const az=o.z+dz/d*st2;if(!tileSolid(Math.floor(o.x/TW),Math.floor(az/TW)))o.z=az}}
   const face=Math.atan2(dx,dz);let a=face-o.hd;while(a>Math.PI)a-=6.2832;while(a<-Math.PI)a+=6.2832;o.hd+=a*Math.min(1,dt*8)}
  else{const face=Math.atan2(P.x-o.x,P.z-o.z);let a=face-o.hd;while(a>Math.PI)a-=6.2832;while(a<-Math.PI)a+=6.2832;o.hd+=a*Math.min(1,dt*3)}
  const gy=ground(o.x,o.z);let y=gy;
  if(o.fly){y=fy!=null?fy:gy+o.h+Math.sin(t*2.1+o.ph)*.18+(spd>3?.1:0)}
  else{const hop=o.sp==="toad"?(spd>.4?Math.abs(Math.sin(t*9+o.ph))*.28:0):(spd>.4?Math.abs(Math.sin(t*12+o.ph))*.05:0);y=gy+hop;if(o.sp==="toad"&&spd<=.4)y=gy}
  o.g.position.set(o.x,y,o.z);o.g.rotation.y=o.hd;
  /* animation */
  const p=o.p,fl=o.fly?Math.sin(t*(spd>.4||dashing?22:9)+o.ph):0;
  if(p.wl){p.wl.rotation.z=-.15+fl*.7;p.wr.rotation.z=.15-fl*.7}
  if(p.tail){p.tail.rotation.y=Math.sin(t*3+o.ph)*.5;if(o.sp==="imp")p.tail.rotation.y=Math.sin(t*5+o.ph)*.8}
  if(p.orb){p.orb.rotation.y=t*3+o.ph;if(p.gl)p.gl.material.opacity=.7+Math.sin(t*4+o.ph)*.15}
  if(p.fl)p.fl.material.opacity=.55+Math.sin(t*13+o.ph)*.2;
  if(p.legs&&spd>.4)p.legs.forEach((l,k)=>{l.rotation.y=Math.sin(t*14+k*1.6)*.35});
  if(p.stk){const w=t*(spd>.4||dashing?5.5:.8)+o.ph,mv=spd>.4||dashing;p.stk.legs[0].rotation.x=Math.sin(w)*(mv?.55:.03);p.stk.legs[1].rotation.x=-Math.sin(w)*(mv?.55:.03);p.stk.hd.rotation.z=Math.sin(t*.7+o.ph)*.12}
  if(o.act>0){o.act-=dt;o.g.scale.setScalar(1+Math.sin(Math.min(1,o.act/.5)*Math.PI)*.18)}else if(o.g.scale.x!==1)o.g.scale.setScalar(1)}

 /* ---------- helping in fights ---------- */
 let fightId=null;
 const bondLv=r=>{let l=1;for(let i=1;i<BOND.length;i++)if(r.bond>=BOND[i])l=i+1;return l};
 function dealt(o,d,txt,ev){const c=C;try{if(!C||C.over||!C.e||C.e.hp<=0)return;o.act=.5;o.dash=.7;sfx(ev||"attack",o,1);if(d>0){foeDamage(d)}clog("✦ "+o.rec.nm+" "+txt+(d>0?" ("+d+").":"."));o.rec.did=1}catch(e){}}
 function tick(){
  if(!C||C.over||!C.e||C.e.hp<=0||!fx3.g||!FM.on)return;
  const now=performance.now();
  if(fightId!==C){fightId=C;C.famBl=0;FM.list.forEach((o,i)=>{o.rec.did=0;o.nx=now+R(2200,3600)+i*700;o.tk=0;setTimeout(()=>sfx("join",o,.9),300+i*380)});if(FM.list.length)try{clog("✦ "+FM.list.map(o=>o.rec.nm).join(", ")+" bristle"+(FM.list.length>1?"":"s")+" at your side.")}catch(e){}}
  const lvl=hero.level||1;
  FM.list.forEach(o=>{if(now<o.nx||C.over)return;const sp=SP[o.sp],b=bondLv(o.rec),mult=1+.14*(b-1),base=sp.dmg*mult+lvl*.18;o.nx=now+sp.cd*R(.85,1.15);o.tk++;const cref=C;
   const alive=()=>C===cref&&!C.over&&C.e&&C.e.hp>0;
   switch(o.sp){
    case"raven":{let d=Math.max(1,Math.round(base));let t="pecks at its eyes";if(!C.famBl&&o.tk>=2){C.famBl=1;C.e.atk=Math.max(1,(C.e.atk||1)-1);t="rakes the foe's eyes: its strikes weaken";sfx("cast",o,1)}dealt(o,d,t);break}
    case"cat":{let d=Math.max(1,Math.round(base));let t="rakes with quick claws";if(Math.random()<.25+.05*b){d*=2;t="lands a lucky double strike";}dealt(o,d,t);break}
    case"toad":{const h=Math.ceil(hero.maxHp*.05*mult);hero.hp=Math.min(hero.maxHp,hero.hp+h);o.act=.7;sfx("cast",o,1);try{clog("✦ "+o.rec.nm+" sings a slow charm: you mend "+h+".");hud()}catch(e){}o.rec.did=1;break}
    case"owl":{const a=2+b;try{const before=hero.mana;hero.mana=Math.min(maxMP(),hero.mana+a);sfx("cast",o,1);o.act=.7;clog("✦ "+o.rec.nm+" steadies you: +"+(hero.mana-before)+" "+RES[hero.cls].toLowerCase()+".");hud()}catch(e){}o.rec.did=1;if(o.tk%2===0)dealt(o,1,"snaps at the foe");break}
    case"wisp":dealt(o,Math.max(2,Math.round(base)),"hurls a bolt of cold light","attack");sfx("cast",o,.7);break;
    case"imp":{const d=Math.max(1,Math.round(base));dealt(o,d,"spits flame");setTimeout(()=>{if(alive()){try{foeDamage(Math.max(1,Math.round(b)));clog("✦ The flame still burns ("+Math.max(1,Math.round(b))+").")}catch(e){}}},1800);break}
    case"pup":dealt(o,Math.max(1,Math.round(base)),"bites down hard");break;
    case"stalker":{const d=Math.max(3,Math.round(base*1.3));let t="walks through the foe";if(!C.stkNerve||o.tk%3===0){C.stkNerve=1;C.e.atk=Math.max(1,(C.e.atk||1)-1);t="walks through the foe and takes its nerve"}dealt(o,d,t,"attack");break}
    case"spider":{dealt(o,Math.max(1,Math.round(base)),"sinks its fangs in");const n=3,v=Math.max(1,Math.round(.6+b*.5));for(let k=1;k<=n;k++)setTimeout(()=>{if(alive()){try{foeDamage(v);if(k===n)clog("✦ The venom works ("+v+" x"+n+").")}catch(e){}}},1500*k);break}
   }})}
 /* fight end: bond grows for those who took part */
 let lastC=null;
 function endCheck(){if(lastC&&(lastC!==C||lastC.over)){lastC=null;FM.list.forEach(o=>{if(o.rec.did){o.rec.did=0;const r=o.rec,before=bondLv(r);r.bond++;if(bondLv(r)>before){try{toast("✦ "+r.nm+" the "+SP[r.sp].n+" grows closer to you (bond "+bondLv(r)+").")}catch(e){}sfx("grow",o,1)}}})}if(C&&!C.over)lastC=C}
 /* things that hurt you make them cry out */
 try{const _h=fx3.hurt;fx3.hurt=function(d){try{const sk=FM.on&&FM.list.find(o=>o.sp==="stalker"&&bondLv(o.rec)>=5);if(sk&&typeof d==="number"&&d>1){const r=Math.floor(d*.33);if(r>0){hero.hp=Math.min(hero.maxHp,hero.hp+r);try{clog("✦ The Stalker steps into the blow: "+r+" turned aside.")}catch(e){}}}if(FM.on&&FM.list.length&&typeof d==="number"&&d>2&&Math.random()<.35){const o=pick(FM.list);sfx("hurt",o,.9)}}catch(e){}return _h.apply(this,arguments)}}catch(e){}

 /* ---------- unlocking ---------- */
 function checkUnlocks(){
  const s=st();
  if(!s.wh&&cleared()>=1){s.wh=1;const msg="You find a small bone whistle tucked in the cleared dungeon: the Whistle of Small Things. Creatures that would never come to a shout may come to this.";try{toast("✦ Artifact: Whistle of Small Things (+1 familiar slot)");if(!(window.CIN&&CIN.play("whistle",null,{once:"whistle"})))say(msg)}catch(e){}try{if(mkSounds()&&window.MV&&MV.on)MV.event("summon","Familiar Marsh Wisp",null,{gap:1000})}catch(e){}}
  const n=FM.slots();
  if(n>s.ann){const first=s.ann===0;s.ann=n;if(hero.level>=3||s.wh){const msg=first?"Something small has begun to follow your tracks at the edge of the trees. As a "+hero.cls+" you may keep "+FM.cap()+" familiar"+(FM.cap()>1?"s":"")+". Watch for a creature calling out, and press E to befriend it. (V opens your familiars.)":"A new familiar slot has opened ("+n+" of "+FM.cap()+"). Another creature will find you.";try{say(msg);toast("✦ Familiar slot "+n+" of "+FM.cap()+" opened")}catch(e){}FM.cd=Math.min(FM.cd,18);try{if(mkSounds()&&window.MV&&MV.on)MV.event("summon","Familiar Marsh Wisp",null,{gap:1000})}catch(e){}}}
 }

 /* ---------- wild candidates ---------- */
 function pickSp(){const night=typeof todDay==="number"&&todDay<.3,owned=st().own.map(r=>r.sp);const w=ORDER.filter(k=>!owned.includes(k)).map(k=>[k,(night?(["cat","owl","wisp","spider"].includes(k)?3:.5):(["raven","toad","pup","imp"].includes(k)?3:.6))]);
  if(!w.length)return null;let t=w.reduce((a,b)=>a+b[1],0),r=Math.random()*t;for(const x of w){r-=x[1];if(r<=0)return x[0]}return w[0][0]}
 function spawnWild(){const sp=pickSp();if(!sp)return;
  for(let k=0;k<14;k++){const dist=R(11,18);
   const fx=-Math.sin(yaw),fz=-Math.cos(yaw),ang=R(-.7,.7),cx=fx*Math.cos(ang)-fz*Math.sin(ang),cz=fx*Math.sin(ang)+fz*Math.cos(ang),wx=P.x+cx*dist,wz=P.z+cz*dist;
   if(!okTile(wx,wz))continue;
   const b=mkFig(sp),g=b.g,gy=ground(wx,wz);g.position.set(wx,gy+(b.fly?b.h*.8:0),wz);
   const ring=glow(0xfff0b0,1.9,.55);ring.position.y=.7;g.add(ring);
   FM.wild={sp,g,p:b.p,fly:b.fly,x:wx,z:wz,t:0,call:performance.now()+1500,ring,ph:Math.random()*9,gap:700};
   sfx("notice",FM.wild,1.1);FM.cd=R(90,150);return}
  FM.cd=20}
 function clearWild(){if(FM.wild){scene.remove(FM.wild.g);FM.wild=null}}
 function wildTick(dt,t){const w=FM.wild;if(!w)return;w.t+=dt;
  if(!outdoors()||w.t>170||(C&&!C.over)){if(w.t>170||!outdoors())clearWild();return}
  const now=performance.now();if(now>w.call){w.call=now+R(7000,12000);sfx("idle",w,1.1)}
  const d=Math.hypot(w.x-P.x,w.z-P.z);
  if(d<5)w.g.rotation.y=Math.atan2(P.x-w.x,P.z-w.z);
  if(w.fly){w.g.position.y=ground(w.x,w.z)+1.1+Math.sin(t*2+w.ph)*.14;if(w.p.wl){const f=Math.sin(t*10+w.ph);w.p.wl.rotation.z=-.15+f*.5;w.p.wr.rotation.z=.15-f*.5}}
  if(w.p.orb)w.p.orb.rotation.y=t*3;
  w.ring.material.opacity=.4+Math.sin(t*3)*.15}

 /* ---------- E to befriend ---------- */
 const prevN=window.HW&&HW.near,prevL=window.HW&&HW.label,prevU=window.HW&&HW.use;
 function nearW(){if(!FM.on||!FM.wild||!outdoors()||C||D||packOpen||occOpen)return null;return Math.hypot(FM.wild.x-P.x,FM.wild.z-P.z)<3.6?FM.wild:null}
 if(window.HW){
  HW.near=()=>{try{if(nearW())return true}catch(e){}return prevN()};
  HW.label=()=>{try{const w=nearW();if(w)return"Befriend the "+SP[w.sp].n}catch(e){}return prevL()};
  HW.use=()=>{try{const w=nearW();if(w)return befriend(w)}catch(e){}return prevU()}}
 function befriend(w){const sp=SP[w.sp];const b=occPanel(sp.n,"#d8c8a0");
  b.appendChild(el("p",sp.flavor,"sub"));b.appendChild(el("p",sp.abil,"sub"));
  const free=FM.slots()-st().own.length;
  b.appendChild(el("p","Familiar slots: "+st().own.length+" of "+FM.slots()+" in use (a "+hero.cls+" may keep "+FM.cap()+").","sub"));
  const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
  if(free>0)m.appendChild(btn("Offer your hand and bind it to you",()=>{bind(w);occClose()},"go"));else m.appendChild(btn("No free slot",()=>{},"alt",true));
  m.appendChild(btn("Leave it be",()=>occClose(),"alt"))}
 function bind(w){const nm=pick(SP[w.sp].names.filter(n=>!st().own.some(r=>r.nm===n))||SP[w.sp].names)||SP[w.sp].names[0];
  const rec={sp:w.sp,nm:nm||SP[w.sp].names[0],bond:0,mode:"follow",did:0};st().own.push(rec);
  const g=w.g,pos=g.position.clone();clearWild();sync();const o=FM.list.find(x=>x.rec===rec);if(o){o.x=pos.x;o.z=pos.z;o.g.position.copy(pos)}
  if(o){sfx("summon",o,1.1);setTimeout(()=>sfx("idle",o,.9),900)}
  try{toast("✦ "+rec.nm+" the "+SP[rec.sp].n+" is bound to you.");say(rec.nm+" the "+SP[rec.sp].n+" settles beside you. "+SP[rec.sp].abil);hud()}catch(e){}
  try{if(window.INN&&!hero.inner)hero.inner={};if(window.INN&&INN.on&&!(hero.inner&&hero.inner.fam1)){hero.inner.fam1=1;setTimeout(()=>INN.say("It chose me. Small, and watching, and mine now. I am less alone on this road."),6000)}}catch(e){}}

 FM.bindStalker=function(pos){if(st().own.some(r=>r.sp==="stalker"))return;const rec={sp:"stalker",nm:"The Stalker",bond:0,mode:"follow",did:0};st().own.push(rec);sync();const o=FM.list.find(x=>x.rec===rec);
  if(o&&pos){o.x=pos.x;o.z=pos.z;o.g.position.set(pos.x,ground(pos.x,pos.z),pos.z)}
  try{toast("✦ The Stalker is bound to you. It will not hunt you again.");say("It rises and takes its place behind you, and the night, for the first time in a long while, is only a night.");hud()}catch(e){}
  try{if(window.INN&&INN.on&&hero.inner&&!hero.inner.stk){hero.inner.stk=1;setTimeout(()=>INN.say("I can feel it behind me, where I can't see. I always could. The difference is that now I don't have to run."),7000)}}catch(e){}};
 /* ---------- V: the familiars panel ---------- */
 function panel(){if(!hero||C||D||packOpen)return;if(occOpen){occClose();return}
  const b=occPanel("Familiars","#d8c8a0"),s=st();
  b.appendChild(el("p","As a "+hero.cls+" you may keep up to "+FM.cap()+". "+FM.slots()+" slot"+(FM.slots()===1?" is":"s are")+" open now. "+nextTxt(),"sub"));
  if(s.wh)b.appendChild(el("p","Artifact: Whistle of Small Things (+1 slot).","sub"));
  if(!s.own.length)b.appendChild(el("p",FM.slots()>0?"None yet. Listen for a creature calling out nearby, and press E beside it.":"None yet. Reach level 3 or find the Whistle of Small Things to open the first slot.","sub"));
  s.own.forEach(r=>{const sp=SP[r.sp],bl=bondLv(r);b.appendChild(el("p",r.nm+", "+sp.n+", bond "+bl+(bl<5?" ("+(BOND[bl]-r.bond)+" fights to next)":" (full)"),"sub"));b.appendChild(el("p",sp.abil,"sub"));
   const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr 1fr";b.appendChild(m);
   m.appendChild(btn(r.mode==="wait"?"Call to follow":"Ask to stay here",()=>{r.mode=r.mode==="wait"?"follow":"wait";occClose();panel()},"alt"));
   m.appendChild(btn("Set free",()=>{const o=FM.list.find(x=>x.rec===r);if(o)sfx("notice",o,1);s.own.splice(s.own.indexOf(r),1);if(r.sp==="stalker"){hero.stk=hero.stk||{};hero.stk.gone=1}sync();occClose();try{say(r.sp==="stalker"?"It turns and walks into the dark without looking back. It will not come again, as hunter or as anything else.":r.nm+" looks back once, then goes.")}catch(e){}},"alt"))});
  const m2=el("div",null,"menu");m2.style.gridTemplateColumns="1fr 1fr";b.appendChild(m2);
  m2.appendChild(btn("Familiars: "+(FM.on?"on":"off"),()=>{FM.setOn(!FM.on);occClose();panel()},"alt"));m2.appendChild(btn("Close",()=>occClose(),"go"))}
 FM.panel=panel;
 addEventListener("keydown",e=>{if(!hero||e.repeat||e.ctrlKey||e.altKey||/TEXTAREA|INPUT|SELECT/.test((e.target&&e.target.tagName)||""))return;if(e.key==="v"||e.key==="V")panel()});

 /* ---------- the loop ---------- */
 let tAcc=0,uT=0,chk=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady||typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.1);tAcc+=dt;
   chk-=dt;if(chk<=0){chk=2;checkUnlocks();sync()}
   if(!FM.on)return;
   const n=FM.list.length;FM.list.forEach((o,i)=>{move(o,dt,i,n,tAcc);
     if(!(C&&!C.over)&&outdoors()){const now=performance.now();if(now>o.idle){o.idle=now+R(14000,30000);sfx("idle",o,.7)}}});
   tick();endCheck();
   if(FM.wild)wildTick(dt,tAcc);
   else if(outdoors()&&!(C&&!C.over)&&FM.slots()>st().own.length&&FM.slots()>0){FM.cd-=dt;if(FM.cd<=0)spawnWild()}
  }catch(e){FM.log=String(e&&e.stack||e).slice(0,300)}};
})();

/* ===== CINEMATICS: short, skippable scenes shot inside the game itself: letterbox bars, a scripted camera, the narrator, and sound cues
   (wrong-sky toll, angel choir, monster voices). Each scene is a list of beats; a beat is a camera move plus one line of narration,
   and it ends when the line has been spoken. Scenes: "ending" (the Great Work). Replayable from Settings. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,CIN=window.CIN={on:0,cur:null,scenes:{},last:"",now:()=>performance.now()};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.cin."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.cin."+k,v)}catch(e){}};
 CIN.enabled=LSg("on","1")==="1";CIN.setOn=v=>{CIN.enabled=!!v;LSs("on",v?"1":"0")};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 const ground=(x,z)=>{if(CIN.floor!=null)return CIN.floor;try{return Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 /* ---------- overlay ---------- */
 let ov=null,top,bot,cap,fade,warm,title,hint;
 function build(){if(ov)return;ov=document.createElement("div");ov.id="cinov";ov.style.cssText="position:fixed;inset:0;z-index:99990;pointer-events:none;display:none";
  const bar=(p)=>{const d=document.createElement("div");d.style.cssText="position:absolute;left:0;right:0;"+p+":0;height:13vh;background:#000;transform:translateY("+(p==="top"?"-101%":"101%")+");transition:transform 1.4s cubic-bezier(.2,.7,.2,1)";ov.appendChild(d);return d};
  warm=document.createElement("div");warm.style.cssText="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 70%,rgba(255,200,110,.55),rgba(255,150,60,.15) 60%,rgba(255,120,40,0) 100%);mix-blend-mode:screen;opacity:0;transition:opacity 3s ease";ov.appendChild(warm);
  top=bar("top");bot=bar("bottom");
  cap=document.createElement("div");cap.style.cssText="position:absolute;left:50%;bottom:15.5vh;transform:translateX(-50%);max-width:min(78vw,760px);text-align:center;font:italic 1.2rem/1.5 Georgia,'Times New Roman',serif;color:#f0e8d0;text-shadow:0 0 8px #000,0 1px 3px #000;opacity:0;transition:opacity 1.2s ease;padding:4px 12px";ov.appendChild(cap);
  title=document.createElement("div");title.style.cssText="position:absolute;left:0;right:0;top:38%;text-align:center;font:600 clamp(1.6rem,6vw,3.6rem)/1.15 Georgia,'Times New Roman',serif;letter-spacing:.28em;color:#ffe8b0;text-shadow:0 0 24px rgba(255,190,90,.8),0 2px 6px #000;opacity:0;transition:opacity 2.4s ease;padding-left:.28em";ov.appendChild(title);
  fade=document.createElement("div");fade.style.cssText="position:absolute;inset:0;background:#000;opacity:1;transition:opacity 1.6s ease";ov.appendChild(fade);
  hint=document.createElement("div");hint.style.cssText="position:absolute;right:16px;bottom:calc(13vh + 10px);font:.8rem system-ui,sans-serif;color:#fff;opacity:0;transition:opacity 1s;text-shadow:0 1px 3px #000";hint.textContent="Space or click to skip";ov.appendChild(hint);
  document.body.appendChild(ov);
  const st=document.createElement("style");st.textContent="body.cin *{visibility:hidden!important}body.cin canvas.cinc,body.cin #cinov,body.cin #cinov *{visibility:visible!important}";document.head.appendChild(st)}
 const gate=()=>{const k=e=>{if(!CIN.on)return;if(e.type==="keydown"&&!(e.code==="Space"||e.code==="Enter"||e.code==="Escape"))return;e.preventDefault();e.stopPropagation();CIN.skip()};
  addEventListener("keydown",k,true);addEventListener("pointerdown",k,true)};gate();
 /* ---------- the silhouette of the hero ---------- */
 function mkHero(){const g=new T.Group(),k=new T.MeshBasicMaterial({color:0x06060a});
  const body=new T.Mesh(new T.ConeGeometry(.55,1.5,10),k);body.position.y=.75;g.add(body);
  const sh=new T.Mesh(new T.SphereGeometry(.34,10,8),k);sh.scale.set(1.2,.6,.8);sh.position.y=1.5;g.add(sh);
  const hd=new T.Mesh(new T.SphereGeometry(.2,10,8),k);hd.position.y=1.82;g.add(hd);
  const st=new T.Mesh(new T.CylinderGeometry(.03,.03,2.2,5),k);st.position.set(.5,1.05,.1);g.add(st);
  const gem=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:0xffd890}));gem.position.set(.5,2.2,.1);g.add(gem);
  return g}
 /* ---------- speech ---------- */
 const sayLine=t=>{try{if(window.OV&&typeof voiceOn!=="undefined"&&voiceOn)OV.say(t,"dm")}catch(e){}};
 const spokenMin=t=>clamp(t.length*.07+2.4,4,16);
 /* ---------- running a scene ---------- */
 CIN.skip=function(){const c=CIN.cur;if(!c||c.ending)return;c.skipped=1;c.ending=1;c.endAt=CIN.now();try{OV&&OV.stop&&OV.stop()}catch(e){}fade.style.transition="opacity .7s ease";fade.style.opacity="1";title.style.opacity="0";cap.style.opacity="0"};
 CIN.play=function(id,after,opt){opt=opt||{};const sc=CIN.scenes[id];
  if(!sc||CIN.on||!hero||(!CIN.enabled&&!opt.force)||(typeof C!=="undefined"&&C&&!C.over)||(typeof occOpen!=="undefined"&&occOpen)){if(after)try{after()}catch(e){}return false}
  if(opt.once){hero.cin=hero.cin||{};if(hero.cin[opt.once]){if(after)try{after()}catch(e){}return false}hero.cin[opt.once]=1}
  CIN.arg=opt.arg;CIN.floor=(typeof DG!=="undefined"&&DG)?camera.position.y-1.6:null;
  build();const beats=sc.beats();
  const f={x:-Math.sin(yaw),z:-Math.cos(yaw)},r={x:Math.cos(yaw),z:-Math.sin(yaw)};
  const c=CIN.cur={id,beats,i:-1,bt:0,after,anchor:{x:P.x,z:P.z,f,r},saved:{yaw,pitch,fov:camera.fov,vis:[]},hero:mkHero(),line:null,lineEnd:0,sayAt:0,done:0};
  c.hero.position.set(P.x,ground(P.x,P.z),P.z);c.hero.rotation.y=Math.atan2(f.x,f.z);scene.add(c.hero);
  try{if(vmG){c.saved.vis.push([vmG,vmG.visible]);vmG.visible=false}}catch(e){}
  document.querySelectorAll("canvas").forEach(cv=>cv.classList.remove("cinc"));try{renderer.domElement.classList.add("cinc")}catch(e){}CIN.on=1;document.body.classList.add("cin");ov.style.display="block";fade.style.transition="none";fade.style.opacity="1";void fade.offsetWidth;
  top.style.transform="translateY(0)";bot.style.transform="translateY(0)";hint.style.opacity=".55";setTimeout(()=>{try{hint.style.opacity="0"}catch(e){}},4500);
  try{if(window.MUS&&MUS.duck)MUS.duck(1)}catch(e){}
  c.t0=CIN.now();CIN.next();setTimeout(()=>{if(CIN.cur===c&&!c.ending){fade.style.transition="opacity 2.2s ease";fade.style.opacity="0"}},200);return true};
 CIN.next=function(){const c=CIN.cur;if(!c)return;c.i++;
  if(c.i>=c.beats.length){CIN.finish();return}
  const b=c.beats[c.i];c.bt=0;c.b=b;c.bstart=CIN.now();c.min=(b.min||0)*1000;
  if(b.warm!=null)warm.style.opacity=String(b.warm);
  if(b.title){title.innerHTML=b.title;title.style.opacity="1"}else if(b.title===null)title.style.opacity="0";
  if(b.fadeOut){fade.style.transition="opacity "+(b.fadeOut)+"s ease";fade.style.opacity="1"}
  if(b.line){cap.textContent=b.line;cap.style.opacity="1";c.sayAt=CIN.now()+(b.delay||0)*1000;c.said=0;c.min=Math.max(c.min,(b.delay||0)*1000+spokenMin(b.line)*1000*(b.holdScale||1))}else{cap.style.opacity="0";c.said=1}
  if(b.cue)(Array.isArray(b.cue)?b.cue:[b.cue]).forEach(q=>setTimeout(()=>{if(CIN.cur===c&&!c.ending)try{q.fn()}catch(e){}},(q.t||0)*1000))};
 CIN.finish=function(){const c=CIN.cur;if(!c||c.done)return;c.done=1;c.ending=1;
  fade.style.transition="opacity 1s ease";fade.style.opacity="1";
  setTimeout(()=>{try{scene.remove(c.hero);c.saved.vis.forEach(v=>v[0].visible=v[1]);yaw=c.saved.yaw;pitch=c.saved.pitch;camera.fov=c.saved.fov;camera.updateProjectionMatrix();
   document.body.classList.remove("cin");ov.style.display="none";top.style.transform="translateY(-101%)";bot.style.transform="translateY(101%)";cap.style.opacity="0";title.style.opacity="0";warm.style.opacity="0";
   if(window.MUS&&MUS.duck)MUS.duck(0)}catch(e){}CIN.on=0;CIN.cur=null;CIN.floor=null;CIN.last=c.id;if(c.after)try{c.after()}catch(e){console.warn("cin after",e)}},c.skipped?250:1000)};
 /* ---------- camera ---------- */
 function cam(c,now){const b=c.b;if(!b||!b.cam)return;const k=b.cam,d=Math.max(1,(b.camT||c.min/1000||8)),t=clamp((now-c.bstart)/1000/d,0,1),e=ease(t),a=c.anchor;
  const W=p=>{const x=a.x+a.r.x*p[0]+a.f.x*p[2],z=a.z+a.r.z*p[0]+a.f.z*p[2];return[x,Math.max(ground(x,z)+p[1],ground(x,z)+.35),z]};
  const mix=(p,q)=>[lerp(p[0],q[0],e),lerp(p[1],q[1],e),lerp(p[2],q[2],e)];
  const pos=W(mix(k.a,k.b||k.a)),look=mix(k.la,k.lb||k.la);const lw=(()=>{const x=a.x+a.r.x*look[0]+a.f.x*look[2],z=a.z+a.r.z*look[0]+a.f.z*look[2];return[x,ground(x,z)+look[1],z]})();
  const sw=Math.sin(now/1700)*.04;camera.position.set(pos[0]+sw,pos[1],pos[2]);camera.lookAt(lw[0],lw[1],lw[2]);
  if(k.fov){camera.fov=lerp(k.fov[0],k.fov[1],e);camera.updateProjectionMatrix()}}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{const c=CIN.cur;if(!c)return;const now=CIN.now();
   cam(c,now);try{if(vmG)vmG.visible=false}catch(e){}
   if(c.ending){if(c.skipped&&!c.done&&now-c.endAt>600)CIN.finish();return}
   if(!c.said&&now>=c.sayAt){c.said=1;sayLine(c.b.line)}
   const el=now-c.bstart,over=c.said&&el>=c.min&&!(window.OV&&OV.busy&&OV.busy()&&el<c.min+14000);
   if(over||(c.b.hold&&el>=c.b.hold*1000))CIN.next()}catch(e){CIN.last="err "+String(e&&e.stack||e).slice(0,200)}};
 /* freeze the player while a scene runs */
 try{const _m=move;move=function(){if(CIN.on)return;return _m.apply(this,arguments)}}catch(e){}

 /* ================= THE ENDING ================= */
 const names=()=>{const a=[];try{const s=hero.cmp||{};if(s.aldric)a.push("Ser Aldric Thorne");if(s.sera)a.push("Sera Vane");if(window.FAM&&hero.fam)hero.fam.own.forEach(r=>a.push(r.nm))}catch(e){}return a};
 const joinN=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
 CIN.scenes.ending={beats:()=>{
  const san=typeof hero.san==="number"?hero.san:100,who=names(),nm=hero.name||"Hero";
  const l3=who.length?"Beside you stand "+joinN(who)+", who walked this road when walking it was a mistake.":"You came here alone, and you stand here alone, and it is enough.";
  const l4=san>70?"Your mind held. That is rarer than courage, and it is the thing that won this.":san>30?"Your mind is scarred, but it is yours, and it came through the dark with you.":"You will hear the bells for the rest of your life. You will hear the morning, too.";
  const toll=()=>{try{if(window.WSKY&&WSKY.toll)WSKY.toll(3,true,0)}catch(e){}};
  const choir=()=>{try{if(window.MV&&MV.angel)MV.angel("Raphael")}catch(e){}};
  return[
   {min:2,hold:2.2,warm:0,cam:{a:[-2.6,.5,-7.5],b:[-2,.8,-6.5],la:[0,2.4,12],lb:[0,2.4,12],fov:[58,54]},camT:2.2,cue:[{t:.2,fn:toll}]},
   {line:"The Unmoved One comes apart the way a clock does when the last wheel lets go.",delay:1.4,cam:{a:[-2.6,.8,-6.5],b:[-1.4,1.5,-4.2],la:[0,2.4,12],lb:[0,2.6,8],fov:[54,48]},camT:9,warm:0},
   {line:"Somewhere above Occultica, the hours begin again. Seven chords, one after another. Then the sun.",delay:.8,cam:{a:[0,.5,-3],b:[.6,.6,-2],la:[0,1.5,10],lb:[0,11,9],fov:[56,60]},camT:10,warm:.25,cue:[{t:3,fn:choir}]},
   {line:l3,delay:.8,cam:{a:[3.2,1.4,7],b:[1.6,1.6,5],la:[0,1.5,-1],lb:[0,1.7,-1.6],fov:[52,46]},camT:10,warm:.4},
   {line:l4,delay:.8,cam:{a:[1.4,1.2,-2.2],b:[.7,1.7,-1.5],la:[0,1.7,.5],lb:[0,2,4],fov:[48,42]},camT:10,warm:.5},
   {line:"The Great Work is done.",delay:.6,cam:{a:[0,1.6,-3],b:[0,12,-18],la:[0,2,2],lb:[0,3,4],fov:[54,62]},camT:12,warm:.55,
    cue:[{t:2.2,fn:()=>{try{title.innerHTML="THE GREAT WORK<div style=\"font:italic .32em/1.6 Georgia,serif;letter-spacing:.12em;margin-top:.9em;color:#f4e0b8\">"+nm.replace(/</g,"")+", Hero of Occultica</div>";title.style.opacity="1"}catch(e){}}}]},
   {min:5.5,hold:5.5,cue:[{t:3,fn:()=>{try{fade.style.transition='opacity 2.4s ease';fade.style.opacity='1'}catch(e){}}}],cam:{a:[0,12,-18],b:[0,16,-24],la:[0,3,4],lb:[0,4,6],fov:[62,64]},camT:6}]}};
 /* ================= MORE SCENES ================= */
 const MVe=(ev,n,g)=>()=>{try{if(window.MV)MV.event(ev,n,null,{gap:100,gain:g||1})}catch(e){}};
 CIN.scenes.boss={beats:()=>{const n=CIN.arg||"Something";
  const lines=["The air goes still. Ahead, in the dark, "+n+" lifts its head.","Everything in the room has stopped breathing. "+n+" has not."];
  return[{min:2,cam:{a:[1.5,1.1,-2.4],b:[.8,1.2,-1.4],la:[0,1.5,12],lb:[0,1.5,12],fov:[60,54]},camT:2.4,warm:0,cue:[{t:.2,fn:MVe("notice",n,1.2)}]},
   {line:lines[(Math.random()*lines.length)|0],delay:.5,cam:{a:[.8,1.2,-1.4],b:[.2,1.2,1.2],la:[0,1.5,12],lb:[0,1.7,14],fov:[54,44]},camT:6,warm:0,cue:[{t:2.5,fn:MVe("idle",n,1.1)}]}]}};
 CIN.scenes.whistle={beats:()=>[{min:2,cam:{a:[0,.5,-2.5],b:[0,.7,-1.6],la:[0,1,3],lb:[0,.9,3],fov:[60,56]},camT:2.4,cue:[{t:.3,fn:MVe("summon","Familiar Marsh Wisp",1)}]},
   {line:"In the dust, something small and pale: a whistle of carved bone. Creatures that ignore a shout may answer this.",delay:.6,cam:{a:[0,.7,-1.6],b:[.5,.9,-.6],la:[0,.9,3],lb:[0,.5,1.5],fov:[56,46]},camT:9,warm:.2}]};
 const ALLYL={aldric:["Ser Aldric Thorne falls in at your shoulder. Dented mail, steady hands, and a sword that has been looking for a reason.","Ser Aldric Thorne"],sera:["Sera Vane steps in beside you, moon-pale and unhurried. Whatever she sees ahead, she is not afraid of it.","Sera Vane"]};
 CIN.scenes.ally={beats:()=>{const a=ALLYL[CIN.arg]||ALLYL.aldric;return[{min:1.8,cam:{a:[3,1.5,5],b:[2.2,1.6,4],la:[0,1.6,0],lb:[0,1.6,-.4],fov:[52,48]},camT:2,cue:[{t:.4,fn:()=>{try{if(window.MV)MV.ally(CIN.arg,"join")}catch(e){}}}]},
   {line:a[0],delay:.5,cam:{a:[2.2,1.6,4],b:[-1.6,1.7,4.2],la:[0,1.6,-.4],lb:[0,1.6,-1.4],fov:[48,44]},camT:9,warm:.15}]}};
 /* allies joining: watch for the moment you take one along */
 let prevAl=null,alPoll=0;const _vu2=vmUpdate;
 vmUpdate=function(dt){_vu2(dt);try{if(!hero)return;alPoll-=dt;if(alPoll>0)return;alPoll=.5;const s=hero.cmp||{};
   if(prevAl===null){prevAl={aldric:!!s.aldric,sera:!!s.sera};return}
   ["aldric","sera"].forEach(id=>{if(s[id]&&!prevAl[id]&&!CIN.on&&!(typeof occOpen!=="undefined"&&occOpen)&&!(typeof C!=="undefined"&&C)){prevAl[id]=true;CIN.play("ally",null,{once:"ally_"+id,arg:id})}else if(!s[id])prevAl[id]=false})}catch(e){}};
 /* wrap fights: the real ending after the Unmoved One, and a short scare before each dungeon boss */
 try{const _sc=startCombat;startCombat=function(f,tier,after){
   if(f&&f[0]==="The Unmoved One"&&typeof after==="function"){const a2=after;after=function(won){if(won){try{CIN.play("ending",()=>a2(won))}catch(e){a2(won)}}else a2(won)}}
   try{if(f&&typeof DG!=="undefined"&&DG&&DG.th&&f[0]===DG.th.boss&&CIN.enabled&&!CIN.on){const self=this;CIN.play("boss",()=>_sc.call(self,f,tier,after),{once:"boss_"+f[0],arg:f[0]});return}}catch(e){}
   return _sc.call(this,f,tier,after)}}catch(e){}
})();

/* ===== THE STALKER: from level 6, some nights a tall pale-headed figure walks the road behind you. It cannot be killed. It only moves when you are not looking.
   Walk and it gains; sprint (Shift) and you pull away. It stops at lamplight (the village), at dawn, or when you enter a dungeon or take a boat.
   If it reaches you it takes a third of your health and a good part of your mind, but never kills you, then it is gone for the night.
   Uses: silence and bell toll (wrong sky), a heartbeat that speeds up as it closes, its own low voice, and an introduction scene the first time. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,SK=window.STK={on:1,act:null,rolled:{},night:-1,nt:0,log:"",bpmT:0,beat:0};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.stk."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.stk."+k,v)}catch(e){}};
 SK.on=LSg("on","1")==="1"?1:0;SK.setOn=v=>{SK.on=v?1:0;LSs("on",SK.on?"1":"0");if(!SK.on)despawn(true)};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),R=(a,b)=>a+Math.random()*(b-a);
 const ground=(x,z)=>{try{return Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 const okTile=(x,z)=>{try{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);return tx>1&&ty>1&&tx<W-2&&ty<H-2&&reach[ty*W+tx]&&!tileSolid(tx,ty)&&hfn(x,z)>-.2}catch(e){return false}};
 const outdoors=()=>typeof world!=="undefined"&&world&&world.visible&&!DG&&hero;
 const boat=()=>!!(window.SEA&&SEA.B&&SEA.B.on);
 const village=()=>{try{return POIS.find(p=>p.id==="village")}catch(e){return null}};
 SK.minLevel=6;
 SK.chance=()=>clamp(.25+.05*((hero.level||1)-6),.25,.8);
 SK.speed=()=>clamp(5+.12*((hero.level||1)-6),5,6.4);   /* walk is 4.2, sprint 7 */

 /* ---------- the figure ---------- */
 SK.mkFig=function(){return mkFig()};SK.voice=()=>voice();SK.sfxAt=(ev,pos,g)=>{try{if(voice()&&window.MV&&MV.on)MV.event(ev,"The Stalker",pos,{gap:300,gain:g||1})}catch(e){}};SK.thump=g=>thump(g);SK.quiet=s=>quiet(s);SK.toll=(n,f)=>toll(n,f);
 function mkFig(){const g=new T.Group(),dk=new T.MeshBasicMaterial({color:0x07070b}),pl=new T.MeshBasicMaterial({color:0xd8d8e0});const p={};
  const legs=[-1,1].map(s=>{const l=new T.Group();l.position.set(s*.16,1.7,0);g.add(l);const m=new T.Mesh(new T.CylinderGeometry(.045,.035,1.7,5),dk);m.position.y=-.85;l.add(m);return l});
  const torso=new T.Mesh(new T.CylinderGeometry(.16,.22,1.3,6),dk);torso.position.y=2.35;g.add(torso);
  const sh=new T.Mesh(new T.BoxGeometry(.7,.12,.2),dk);sh.position.y=3.0;g.add(sh);
  const arms=[-1,1].map(s=>{const a=new T.Group();a.position.set(s*.36,2.98,0);g.add(a);const m=new T.Mesh(new T.CylinderGeometry(.03,.025,1.9,5),dk);m.position.y=-.95;a.add(m);
   const h=new T.Mesh(new T.SphereGeometry(.06,6,5),pl);h.scale.set(1,2.4,.7);h.position.y=-1.95;a.add(h);return a});
  const neck=new T.Mesh(new T.CylinderGeometry(.04,.05,.3,5),dk);neck.position.y=3.15;g.add(neck);
  const hd=new T.Mesh(new T.SphereGeometry(.15,10,8),pl);hd.scale.set(.85,1.35,.85);hd.position.y=3.42;g.add(hd);
  g.userData.stalker=1;p.legs=legs;p.arms=arms;p.hd=hd;return{g,p}}

 /* ---------- sounds ---------- */
 let AX=null,hbG=null;
 function ax(){if(AX)return AX;try{const AC=window.AudioContext||window.webkitAudioContext;AX=new AC();hbG=AX.createGain();hbG.gain.value=1;hbG.connect(AX.destination)}catch(e){}return AX}
 function thump(g){const X=ax();if(!X||X.state!=="running"){try{X&&X.resume()}catch(e){}return}
  const t=X.currentTime+.01;[[0,58,.9],[.17,50,.6]].forEach(a=>{const o=X.createOscillator(),e=X.createGain();o.type="sine";o.frequency.setValueAtTime(a[1],t+a[0]);o.frequency.exponentialRampToValueAtTime(30,t+a[0]+.16);
   e.gain.setValueAtTime(0,t+a[0]);e.gain.linearRampToValueAtTime(g*a[2],t+a[0]+.01);e.gain.exponentialRampToValueAtTime(.001,t+a[0]+.2);o.connect(e);e.connect(hbG);o.start(t+a[0]);o.stop(t+a[0]+.25)})}
 let vOK=0;
 function voice(){if(vOK)return true;try{if(!window.MV||!MV._S||!MV._EV)return false;const {vox,nband,tone}=MV._S,Rr=MV._R,EV=MV._EV,FA=MV._FAMS;
   const wail=(X,d,t)=>{vox(X,d,t,{f0:96,f1:62,dur:2.8,vow:["o","u"],q:5,vib:[3,.05],am:[7,.55],drive:2,air:.6,gain:.4,att:.7,rel:1.3,sub:.4});return vox(X,d,t+.05,{f0:101,f1:66,dur:2.6,vow:["u","o"],wave:"triangle",q:6,vib:[3.4,.05],air:.3,gain:.18,att:.8,rel:1.2})};
   const creak=(X,d,t)=>{nband(X,d,t,{f:260,f2:120,dur:1.4,q:2,gain:.2,att:.3,rel:.6,am:[9,.8]});return tone(X,d,t,{f:46,f2:34,dur:1.2,gain:.25})};
   const E=(o)=>{const r={};for(const k in o){const a=o[k];r[k]=p=>{a.forEach((f,i)=>f(p[0],p[1],p[2]+.15*i,p[3]));return[1]}}return r};
   EV.stalker=E({notice:[wail],idle:[creak],attack:[wail,Rr.boom],hurt:[creak],death:[wail]});FA.unshift(["stalker",/^The Stalker$/,2.2]);vOK=1;return true}catch(e){return false}}
 const sfx=(ev,g)=>{try{if(SK.act&&voice()&&window.MV&&MV.on)MV.event(ev,"The Stalker",SK.act.g.position,{gap:300,gain:g||1})}catch(e){}};
 const toll=(n,far)=>{try{if(window.WSKY&&WSKY.toll)WSKY.toll(n||1,far!==false,0)}catch(e){}};
 const quiet=s=>{try{if(window.WSKY&&WSKY.silence)WSKY.silence(s)}catch(e){}};

 /* ---------- spawn and despawn ---------- */
 function spawn(first){if(SK.act||!hero||!outdoors())return false;
  for(let k=0;k<14;k++){const dist=R(48,60);
   const bx=-Math.sin(yaw),bz=-Math.cos(yaw),ang=R(-.9,.9),cx=-(bx*Math.cos(ang)-bz*Math.sin(ang)),cz=-(bx*Math.sin(ang)+bz*Math.cos(ang)),wx=P.x+cx*dist,wz=P.z+cz*dist;
   if(!okTile(wx,wz))continue;
   const f=mkFig();f.g.position.set(wx,ground(wx,wz),wz);scene.add(f.g);
   SK.act={g:f.g,p:f.p,x:wx,z:wz,seen:0,unseen:0,t:0,ph:Math.random()*9,fade:1,dying:0,caught:0,wasSeen:false,voiceT:performance.now()+6000,hold:0};
   const n=hero.stk=hero.stk||{n:0,sur:0};n.n++;n.sur=n.sur||0;
   /* the turning: at level 12 with three nights survived, it comes to wait, not to hunt */
   if((hero.level||1)>=12&&n.sur>=3&&!tamed()){SK.act.wait=1;SK.act.hold=0;quiet(3.5);setTimeout(()=>toll(2,true),3800);setTimeout(()=>sfx("idle",1),5200);try{toast("✦ It is standing in the road. It is not coming closer. (Walk to it. Press E.)")}catch(e){}try{say("Tonight it does not follow. It stands where you can see it, very still, and waits. You have outrun it three times. Perhaps that was the whole of the test.")}catch(e){}return true}
   if(first){const fx=-Math.sin(yaw),fz=-Math.cos(yaw);/* the intro scene: put it straight behind, in view of the back camera */
    const d0=34;const gx=P.x-fx*d0,gz=P.z-fz*d0;SK.act.x=gx;SK.act.z=gz;f.g.position.set(gx,ground(gx,gz),gz);
    SK.act.hold=1;
    const ok=window.CIN&&CIN.play("stalker",()=>{if(SK.act)SK.act.hold=0;try{toast("✦ Something is following you. Keep moving: sprint (Shift), reach lamplight, or wait for dawn.")}catch(e){}},{once:"stalker1"});
    if(!ok){SK.act.hold=0;quiet(3.5);setTimeout(()=>toll(1),3800)}}
   else{quiet(3.5);setTimeout(()=>toll(1),3800);try{toast("✦ Something is following you. Keep moving: sprint (Shift), reach lamplight, or wait for dawn.")}catch(e){}}
   if(!first)setTimeout(()=>sfx("notice",1.1),4200);return true}
  return false}
 const tamed=()=>{try{return !!((hero.fam&&hero.fam.own.some(r=>r.sp==="stalker"))||(hero.stk&&hero.stk.gone))}catch(e){return false}};SK.tamed=tamed;
 function despawn(now){const a=SK.act;if(!a)return;if(now){scene.remove(a.g);SK.act=null;return}a.dying=1}
 SK.spawn=spawn;SK.despawn=despawn;SK.force=()=>{SK.rolled={};return spawn(!(hero.cin&&hero.cin.stalker1))};

 /* ---------- being seen ---------- */
 const fwd=new T.Vector3();
 function inView(a){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=a.x-P.x,dz=a.z-P.z,d=Math.hypot(dx,dz)||1;return (fx*dx+fz*dz)/d>Math.cos(.62)&&d<95}

 /* ---------- every frame ---------- */
 let rollT=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady||typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.1);
   const lvlOK=(hero.level||1)>=SK.minLevel,night=typeof todDay==="number"&&todDay<.25;
   /* roll once per night */
   if(SK.on&&lvlOK&&!tamed()&&!SK.act&&night&&outdoors()&&!(typeof C!=="undefined"&&C)&&!boat()&&!(window.CIN&&CIN.on)){
    rollT+=dt;if(rollT>18){rollT=0;const ph=Math.floor((typeof clock==="number"?clock:0)/(typeof DAYLEN==="number"?DAYLEN:1)+.1);
     if(!SK.rolled[ph]){SK.rolled[ph]=1;const v=village(),nearV=v&&Math.hypot(v.x*TW+1-P.x,v.y*TW+1-P.z)<30;if(!nearV&&Math.random()<SK.chance())spawn(!(hero.cin&&hero.cin.stalker1))}}}
   else if(!night)rollT=0;
   const a=SK.act;if(!a){return}
   a.t+=dt;
   /* ends */
   const v=village(),nearV=v&&Math.hypot(v.x*TW+1-P.x,v.y*TW+1-P.z)<20;
   if(!a.dying&&(!SK.on||todDay>.42||nearV||!outdoors()||boat()))a.dying=1;
   if(a.dying){a.fade-=dt*.5;a.g.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=Math.max(0,a.fade)}});if(a.fade<=0){if(!a.caught&&!a.wait&&!a.bound){try{hero.stk.sur=(hero.stk.sur||0)+1;if(hero.stk.sur===3&&(hero.level||1)<12)say("Three nights outrun. It will not forget that. Nor, perhaps, forgive it.")}catch(e){}}if(!a.caught&&todDay>.42)toll(1,true);scene.remove(a.g);SK.act=null}}
   const busy=a.hold||(typeof C!=="undefined"&&C)||(typeof occOpen!=="undefined"&&occOpen)||(window.CIN&&CIN.on);
   const dx=P.x-a.x,dz=P.z-a.z,d=Math.hypot(dx,dz)||1;a.d=d;
   const seen=inView(a);
   if(!busy&&!a.dying&&!a.wait){
    if(seen){if(!a.wasSeen&&a.unseen>3){/* you looked back: it is nearer than it was */const j=Math.min(6,Math.max(0,d-9));a.x+=dx/d*j;a.z+=dz/d*j;try{if(hero&&window.SAN&&SAN.hit)SAN.hit(.6)}catch(e){}}a.unseen=0;a.seen+=dt;
     try{if(hero&&typeof hero.san==="number"&&d<40)hero.san=clamp(hero.san-dt*(.25+.5*(1-d/40)),0,100)}catch(e){}}
    else{a.unseen+=dt;a.seen=0;const sp=SK.speed();a.x+=dx/d*sp*dt;a.z+=dz/d*sp*dt;if(d>75){a.x=P.x-dx/d*55;a.z=P.z-dz/d*55}}
    a.wasSeen=seen;
    if(d<2.3&&!a.caught){catchHero(a)}}
   a.g.position.set(a.x,ground(a.x,a.z),a.z);a.g.rotation.y=Math.atan2(dx,dz);
   const moving=!busy&&!seen&&!a.dying,w=a.t*(moving?5.5:.8)+a.ph;
   a.p.legs[0].rotation.x=Math.sin(w)*(moving?.55:.03);a.p.legs[1].rotation.x=-Math.sin(w)*(moving?.55:.03);
   a.p.arms[0].rotation.x=-Math.sin(w)*(moving?.12:.02);a.p.arms[1].rotation.x=Math.sin(w)*(moving?.12:.02);a.p.hd.rotation.z=Math.sin(a.t*.7)*.12;
   /* the heartbeat */
   if(!a.dying&&!(window.CIN&&CIN.on)){const prox=a.wait?.12:clamp(1-(d-3)/55,0,1);if(prox>.04){SK.bpmT-=dt;if(SK.bpmT<=0){const bpm=52+105*prox;SK.bpmT=60/bpm;thump(.05+.55*Math.pow(prox,1.4))}}}
   const now=performance.now();if(now>a.voiceT&&!a.dying&&!busy){a.voiceT=now+R(11000,19000);sfx("idle",1)}
  }catch(e){SK.log=String(e&&e.stack||e).slice(0,300)}};
 function catchHero(a){a.caught=1;a.dying=1;
  try{const dmg=Math.ceil(maxHP()*.33);hero.hp=Math.max(1,hero.hp-dmg);if(window.SAN&&SAN.hit)SAN.hit(25);hud()}catch(e){}
  try{if(typeof flash==="function")flash("rgba(10,10,20,.85)")}catch(e){}
  sfx("attack",1.3);quiet(2.5);setTimeout(()=>toll(1,false),2700);
  try{say("It does not strike. It simply walks through you, and takes what it wants: warmth, breath, a piece of your mind. Then it is gone. You are alive, and you are shaking.")}catch(e){}}

 /* ---------- the introduction scene ---------- */
 if(window.CIN){CIN.scenes.stalker={beats:()=>[
   {min:3.2,cam:{a:[1.2,1.5,2.5],b:[.8,1.6,1.8],la:[0,2.4,-36],lb:[0,2.6,-36],fov:[56,52]},camT:3.4,warm:0,cue:[{t:.1,fn:()=>quiet(3.5)},{t:3.3,fn:()=>toll(1,true)}]},
   {line:"Something is standing in the road behind you. It was not there when you last looked.",delay:.7,cam:{a:[.8,1.6,1.8],b:[.2,1.7,.8],la:[0,2.6,-36],lb:[0,3.3,-34],fov:[52,38]},camT:8,warm:0,cue:[{t:1,fn:()=>sfx("notice",1.2)}]},
   {line:"It is very tall. It is not moving. You know, without being told, that it only moves when you do not look.",delay:.5,cam:{a:[.2,1.7,.8],b:[.1,1.75,.2],la:[0,3.3,-34],lb:[0,3.4,-33],fov:[38,32]},camT:8,warm:0}]}}


 /* ---------- E: when it waits, you may go to it ---------- */
 const prevN=window.HW&&HW.near,prevL=window.HW&&HW.label,prevU=window.HW&&HW.use;
 const nearWait=()=>{const a=SK.act;if(!a||!a.wait||a.dying||!outdoors()||C||D||packOpen||occOpen)return null;return a.d<4?a:null};
 if(window.HW){HW.near=()=>{try{if(nearWait())return true}catch(e){}return prevN()};
  HW.label=()=>{try{if(nearWait())return"Face the Stalker"}catch(e){}return prevL()};
  HW.use=()=>{try{const a=nearWait();if(a)return offer(a)}catch(e){}return prevU()}}
 function offer(a){const b=occPanel("The Stalker","#c8c8d8");
  b.appendChild(el("p","It is close enough to touch. It smells of cold stone and old rain. It does not move, and you understand that it is waiting for you to decide what it is.","sub"));
  b.appendChild(el("p","Bound, it will walk behind you and do to your enemies what it once did to you. It costs one familiar slot (a Fighter's or Paladin's only one). It only moves when you are not looking. Your mind will wear a little, keeping it. Villagers will not like it.","sub"));
  const free=window.FAM?FAM.slots()-(hero.fam?hero.fam.own.length:0):0;
  const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
  if(free>0)m.appendChild(btn("Hold out your hand",()=>{occClose();bindIt(a)},"go"));else m.appendChild(btn("No free familiar slot (open one first)",()=>{},"alt",true));
  m.appendChild(btn("Step back",()=>occClose(),"alt"))}
 function bindIt(a){a.bound=1;const pos={x:a.x,z:a.z};
  const done=()=>{try{scene.remove(a.g)}catch(e){}SK.act=null;try{if(window.FAM&&FAM.bindStalker)FAM.bindStalker(pos)}catch(e){}};
  let fired=0;const once=()=>{if(fired)return;fired=1;done()};
  if(window.CIN){CIN.play("stalker2",once,{once:"stalker2"});return}once()}
 if(window.CIN){CIN.scenes.stalker2={beats:()=>[
   {min:2.5,cam:{a:[1.4,1.6,1.6],b:[.9,1.7,1.1],la:[0,3.3,-3],lb:[0,3.3,-3],fov:[52,46]},camT:2.6,cue:[{t:.1,fn:()=>quiet(4)},{t:3.8,fn:()=>toll(1,false)}]},
   {line:"You hold out your hand. It does not take it. It kneels, slowly, the way a tower would kneel, until the pale head is level with your own.",delay:.6,cam:{a:[.9,1.7,1.1],b:[.4,1.5,.6],la:[0,3.3,-3],lb:[0,1.9,-2.6],fov:[46,36]},camT:9},
   {line:"It has hunted you three nights and never once caught you. That was never the point. It was choosing.",delay:.5,cam:{a:[.4,1.5,.6],b:[-.8,1.6,.2],la:[0,1.9,-2.6],lb:[0,1.9,-2.4],fov:[36,34]},camT:8,cue:[{t:2,fn:()=>SK.sfxAt("idle",null,1)}]}]}}
 /* ---------- settings row (perf.js) ---------- */
})();

/* ===== TEMPLE LESSONS: the first time you enter a temple (E), the narrator teaches what the place means before the menu opens.
   An animated panel built from the temple's own symbol and colour shows each idea as it is spoken. Enter or a click moves on, Esc skips the lesson.
   Once per temple per character; "Hear the teaching again" is added to each temple menu. Settings: Temple lessons on/off. ===== */
(function(){
 if(typeof openSite==="undefined"||typeof SITES==="undefined")return;
 const LS=window.LSN={on:1};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.lessons."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.lessons."+k,v)}catch(e){}};
 LS.on=LSg("on","1")==="1"?1:0;LS.setOn=v=>{LS.on=v?1:0;LSs("on",LS.on?"1":"0")};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 /* motif: what moves around the symbol.  n: how many bodies in orbit (where it matters) */
 const L={
  dt_saturn:{m:"snow",t:["Saturn was the outermost of the seven wandering stars, so the old astronomers gave it the longest road: time, limits, and age. Its metal is lead, heavy and dull and patient.","The alchemists began the Great Work in the black stage, nigredo, with lead, because every refinement starts by facing what is heavy in you.","The hourglass of stone teaches that time is not the enemy. It is the material every craft is made from.","Here the lesson is endurance. Armour that comes from patience, not speed."]},
  dt_jupiter:{m:"rain",t:["Jupiter, the Thunderer, ruled law, generosity and the oak that draws the lightning. Its metal is tin, bright and soft, easy to shape and easy to share.","The old teaching is that authority is a kind of weather: it should fall on everyone, and it should clear the air.","Four columns that hold up nothing but the sky say that the highest law needs no roof.","Here the lesson is fair rule. Strength given freely returns in kind."]},
  dt_mars:{m:"ember",t:["Mars, the red wanderer, ruled iron, war and the sharpening of things. The Romans kept a ring of spears for him, and fire to temper them.","The alchemists said iron is the metal of will: it cuts, but it also keeps a thing upright.","The empty anvil teaches that the forging is already done. What remains is to use the blade wisely.","Here the lesson is courage with discipline. Iron in the arm, and a steady eye."]},
  dt_sun:{m:"rays",t:["The Sun was counted among the seven planets, the heart of the sky. Its metal is gold, the metal that does not tarnish, and its day is the first of the week.","In the Great Work the final stage is rubedo, the red and golden dawn, when what was lead has been made luminous.","The disc that burns without fire says that true light is not consumed by giving itself away.","Here the lesson is clarity. See what is there, and do not look away."]},
  dt_venus:{m:"petals",t:["Venus, the evening and morning star, ruled harmony: the pleasing of unequal things. Her metal is copper, once mined on Cyprus, her island.","The alchemists said beauty is not decoration. It is the proof that a mixture has settled into balance.","The arches of living rose, with thorns sharper than they look, teach that love is a discipline as well as a gift.","Here the lesson is harmony. Take only what the garden offers, and the garden will offer more."]},
  dt_mercury:{m:"orbit",n:2,t:["Mercury, quickest of the seven, ruled speech, trade and the road between two places. His metal is quicksilver, the only metal that flows like water.","He carried the caduceus, two serpents climbing a staff in opposite directions: opposites that become a ladder when they are held together.","Every crossing is a small initiation. You leave one thing and are not yet the other.","Here the lesson is agility of mind. Be quick, and be honest about the way you came."]},
  dt_moon:{m:"stars",t:["The Moon is the nearest of the seven, and the first rung of the heavens. Its metal is silver, and its day is Monday. It rules tides, dreams, and the things that are only true by night.","The old teaching is that the Moon shows only a part of what it holds, and that this is a kind of mercy.","The small moon in the pool, even at noon, says that reflection is a way of seeing what the light has hidden.","Here the lesson is patience with changing things. Wax, wane, and come back full."]},
  dt_garden:{m:"petals",t:["The Hanging Gardens were a wonder of the old world, terraces of impossible green raised by patient labour above a dry land.","The herbalists taught that every plant answers to a planet, and that a good garden is a map of the sky laid in the soil.","Henbane beside rose, wormwood beside jasmine: poison and perfume grow from the same ground, and the gardener's art is knowing which is which.","Here the lesson is care. Tend a thing and it grows back."]},
  dt_mirror:{m:"stars",mirror:1,t:["A mirror in the old magic is a door that shows without opening. Scryers gazed into polished stone, still water and silvered glass to find what was hidden.","The teaching is that a mirror shows what is, and also what is concealed, but only to one who looks without wanting it to say a particular thing.","Your reflection, a step behind and slightly more interested, is the oldest figure in the tradition: the self you could be, watching the self you are.","Here the lesson is honest sight. Look, and be ready for what looks back."]},
  dt_bell:{m:"ripple",t:["Bells were once rung to mark hours, to drive off storms, and to call the dead to their names. A bell is a voice that does not need a mouth.","The old teaching is that sound outlasts the one who made it. A drowned bell is a sentence the water has never finished saying.","The tower that goes down further than it rises says that every height has an equal depth beneath it.","Here the lesson is consequence. What you ring, answers."]},
  archon:{m:"orbit",n:7,t:["The Gnostics taught that the world was made by a blind craftsman, Yaldabaoth, who believed himself the only god, and that seven Archons keep the gates of the heavens.","The soul, climbing home, must pass each gate with the right word, as a traveller shows a seal to a guard.","The rings on the floor are those gates, and the green light between them is the watching of the keepers.","The lesson is that knowledge, not force, opens the way. Know the word, and the gate is only a door."]},
  athanor:{m:"ember",t:["The athanor is the alchemist's furnace, a slow oven that never goes out. The motto is V.I.T.R.I.O.L.: visit the interior of the earth, and by rectifying, you will find the hidden stone.","The Great Work has four stages: nigredo, the black; albedo, the white; citrinitas, the yellow; rubedo, the red.","They are also stages of a life: dissolving what you were, washing it clean, waking to understanding, and finally becoming whole.","Here the lesson is patience with fire. Brew with the right metal under the right hour."]},
  cathedral:{m:"dust",t:["A cathedral is built as a prayer in stone: a cross-shaped body, a nave that draws the eye upward, and windows that turn plain sun into colour.","The old builders taught that light is the closest thing the senses have to the divine, and that darkness below, the crypt, is where the foundation is laid.","Candles that burn with no one to light them say that attention outlasts the people who paid it.","Here the lesson is reverence. Go down carefully, and come back up carrying the light."]},
  coven:{m:"ember",t:["A coven is a circle of thirteen, or fewer, who keep the old arts: herb, charm and moon. The stones, the bonfire and the line of salt are a boundary, not a barrier.","Witchcraft was the knowledge of the village healer before it was a fear. Plants were medicine first and spells second.","The stag skull on the altar is the horned god of the wood, who dies each winter and returns each spring.","Here the lesson is exchange. Herbs for favours, favours for herbs, and a respect for the salt."]},
  hermes:{m:"tri",t:["Hermes Trismegistus, the Thrice-Great, is the legendary author of the hermetic books, a meeting of Greek thought and Egyptian wisdom.","His seven principles are cut into the floor: mind, correspondence, vibration, polarity, rhythm, cause and effect, and gender.","The best known says as above, so below: what is true of the heavens is true, in a smaller way, of you.","Here the lesson is that the universe is a single mind, and that you are a thought within it."]},
  iching:{m:"yao",t:["The I Ching, the Book of Changes, is older than most empires. It is a method for reading a moment by two kinds of line: unbroken for yang, broken for yin.","Three lines make a trigram: Heaven, Lake, Fire, Thunder, Wind, Water, Mountain, Earth. Two trigrams make a hexagram, and there are sixty-four, one for each way a situation can turn.","The coins are not magic. They are a way of asking the mind to be honest about what it already half-knows.","Here the lesson is change. Nothing stays what it is, and that is the only reliable thing."]},
  pantheon:{m:"orbit",n:12,t:["A pantheon is the whole family of gods of a people, gathered in one house. Here they are from different traditions, kept, not worshipped.","The old scholars noticed that the same figures recur under different names: a sky father, a mother of the earth, a trickster, a lord of the dead.","The thirteenth niche, left empty, is the lesson. The most accurate image of the divine is the one that has no image.","Here the lesson is humility. Honour every god, and mistake none of them for the whole."]},
  pyramid:{m:"dust",t:["The pyramid is a mountain made by hand: a point where earth meets sky, built to carry a king up the sky.","Thoth, ibis-headed, was the scribe of the gods and the keeper of language. The Emerald Tablet, a short and famous text, is said to be his: that which is below is like that which is above.","Gold and basalt, light and weight: the Egyptians believed the soul was weighed against a feather, and that the heart could not be hidden.","Here the lesson is truth. Write it down, and let it be weighed."]},
  runes:{m:"snow",t:["The runes are the old alphabet of the north, and also a set of meanings. Each letter is a word, a force, and a small prayer.","Odin hung nine nights on the windswept tree, wounded by his own spear, until the runes rose up to him. Wisdom, in that story, is paid for with suffering and attention.","Three are cast for the three Norns: what was, what is, and what must be.","Here the lesson is that fate has a grammar. Learn to read it, and you may choose how to answer."]},
  seals:{m:"orbit",n:7,t:["Seven stones, seven planets, seven metals, seven days. The old magicians believed the week itself was a spell cast by the sky.","Each stone carries a magic square, a grid of numbers whose rows, columns and diagonals all sum to the same total, and a line traced through its numbers in order. That line is the planet's seal.","The idea is that order underlies things, and that a pattern, drawn with attention, is a kind of key.","Here the lesson is harmony of the whole. Bring all seven together and the circle begins to sing."]},
  ziggurat:{m:"steps",t:["A ziggurat is a stepped mountain from the old cities of Mesopotamia, seven stages for the seven wandering stars, each painted its own colour.","The Picatrix, a medieval handbook of astral magic, taught that each herb, stone and metal is a thread from one planet, and that gathering under the right sky doubles the harvest.","The climb is the point. Priests walked up, stage by stage, shedding the day's concerns at each level.","Here the lesson is correspondence. Match the thing to its star, and the world gives more."]}};
 /* the lessons are not shown for the Great Circle's later flows, sea ruins or halls */
 const seen=()=>{hero.lessons=hero.lessons||{};return hero.lessons};
 /* ---------- the animated panel ---------- */
 let ov=null,cv,cx,cap,ttl,hint,raf=0,cur=null;
 function build(){if(ov)return;ov=document.createElement("div");ov.id="lessonov";ov.style.cssText="position:fixed;inset:0;z-index:99980;display:none;background:#05050a;opacity:0;transition:opacity 1s ease";
  cv=document.createElement("canvas");cv.style.cssText="position:absolute;inset:0;width:100%;height:100%";ov.appendChild(cv);cx=cv.getContext("2d");
  ttl=document.createElement("div");ttl.style.cssText="position:absolute;left:0;right:0;top:5vh;text-align:center;font:600 clamp(1.1rem,3.4vw,2rem)/1.2 Georgia,'Times New Roman',serif;letter-spacing:.2em;color:#fff;text-shadow:0 0 18px currentColor,0 2px 4px #000;padding-left:.2em";ov.appendChild(ttl);
  cap=document.createElement("div");cap.style.cssText="position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);width:min(86vw,820px);text-align:center;font:italic clamp(1rem,2.2vw,1.3rem)/1.55 Georgia,'Times New Roman',serif;color:#f0e8d8;text-shadow:0 0 8px #000,0 1px 3px #000;opacity:0;transition:opacity .9s ease;padding:10px 16px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.55) 40%,rgba(0,0,0,.55) 60%,rgba(0,0,0,0));border-radius:6px";ov.appendChild(cap);
  hint=document.createElement("div");hint.style.cssText="position:absolute;right:18px;bottom:2vh;font:.8rem system-ui,sans-serif;color:#fff;opacity:.55";hint.textContent="Enter or click: next   Esc: skip the lesson";ov.appendChild(hint);
  ov.style.pointerEvents="auto";ov.addEventListener("pointerdown",e=>{if(cur){e.preventDefault();LS.next()}});document.body.appendChild(ov);
  addEventListener("keydown",e=>{if(!cur)return;if(e.code==="Escape"||e.code==="KeyS"){e.preventDefault();e.stopPropagation();LS.skip()}else if(e.code==="Enter"||e.code==="Space"||e.code==="ArrowRight"){e.preventDefault();e.stopPropagation();LS.next()}},true)}
 const hex=(c,a)=>{c=String(c||"#ffd878").replace("#","");if(c.length===3)c=c.split("").map(x=>x+x).join("");const n=parseInt(c,16);return"rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")"};
 /* particles per motif */
 function mkP(m,w,h){const a=[];const n=m==="stars"?140:m==="rays"||m==="tri"||m==="yao"?0:90;for(let i=0;i<n;i++)a.push({x:Math.random()*w,y:Math.random()*h,v:.3+Math.random(),s:.6+Math.random()*2.2,p:Math.random()*6.28});return a}
 function frame(t){if(!cur)return;raf=requestAnimationFrame(frame);const S=cur,w=cv.width=innerWidth,h=cv.height=innerHeight,col=S.col,tt=(performance.now()-S.t0)/1000,m=S.m;
  cx.globalCompositeOperation="source-over";const g=cx.createRadialGradient(w/2,h*.46,0,w/2,h*.46,Math.max(w,h)*.7);g.addColorStop(0,hex(col,.28));g.addColorStop(.5,hex(col,.07));g.addColorStop(1,"rgba(3,3,8,1)");cx.fillStyle="#05050a";cx.fillRect(0,0,w,h);cx.fillStyle=g;cx.fillRect(0,0,w,h);
  const R=Math.min(w,h*.78)*.34,cxp=w/2,cyp=h*.46,pulse=1+Math.sin(tt*1.2)*.025,line=S.i;
  cx.globalCompositeOperation="lighter";
  /* motif behind the symbol */
  if(m==="ember"||m==="petals"||m==="dust"||m==="snow"||m==="rain"||m==="stars"||m==="ripple"){
   S.pt.forEach(p=>{let x=p.x,y=p.y;
    if(m==="ember"){y=h-((p.y+tt*60*p.v)%(h+20));x+=Math.sin(tt*p.v+p.p)*18}
    else if(m==="petals"){y=(p.y+tt*28*p.v)%h;x+=Math.sin(tt*.8+p.p)*40}
    else if(m==="dust"){y=(p.y-tt*10*p.v+h*10)%h;x+=Math.sin(tt*.4+p.p)*25}
    else if(m==="snow"){y=(p.y+tt*22*p.v)%h;x+=Math.sin(tt*.6+p.p)*20}
    else if(m==="rain"){y=(p.y+tt*320*p.v)%h;x+=0}
    else if(m==="stars"){const tw=.4+.6*Math.abs(Math.sin(tt*p.v+p.p));cx.fillStyle=hex("#ffffff",tw*.8);cx.fillRect(x,y,p.s,p.s);return}
    else if(m==="ripple"){const k=((tt*.3*p.v+p.p)%3)/3;cx.strokeStyle=hex(col,(1-k)*.25);cx.lineWidth=1.5;cx.beginPath();cx.ellipse(x,h*.78+(p.y%90)*.15,k*140,k*30,0,0,6.283);cx.stroke();return}
    cx.fillStyle=hex(m==="rain"?"#bcd0ff":col,m==="rain"?.45:.55);if(m==="rain")cx.fillRect(x,y,1.2,p.s*7);else{cx.beginPath();cx.arc(x,y,p.s,0,6.283);cx.fill()}})}
  if(m==="rays"){for(let i=0;i<28;i++){const a=i/28*6.283+tt*.12,L2=R*(1.25+.25*Math.sin(tt*1.5+i));cx.strokeStyle=hex(col,.16);cx.lineWidth=2+(i%3);cx.beginPath();cx.moveTo(cxp+Math.cos(a)*R*1.05,cyp+Math.sin(a)*R*1.05);cx.lineTo(cxp+Math.cos(a)*L2*1.3,cyp+Math.sin(a)*L2*1.3);cx.stroke()}}
  /* expanding rings, the pulse of the place */
  for(let k=0;k<4;k++){const u=((tt*.18+k/4)%1);cx.strokeStyle=hex(col,(1-u)*.35);cx.lineWidth=2;cx.beginPath();cx.arc(cxp,cyp,R*(.9+u*1.1),0,6.283);cx.stroke()}
  if(m==="steps"){for(let i=0;i<7;i++){const k=i<=line*1.7?1:.25,wd=R*(2.2-i*.26);cx.fillStyle=hex(col,.12*k);cx.strokeStyle=hex(col,.5*k);cx.lineWidth=2;const y=cyp+R*1.0-i*R*.28;cx.beginPath();cx.rect(cxp-wd/2,y,wd,R*.26);cx.fill();cx.stroke()}}
  if(m==="tri"){const a0=tt*.25;cx.strokeStyle=hex(col,.5);cx.lineWidth=2;for(let k=0;k<2;k++){cx.beginPath();for(let i=0;i<3;i++){const a=a0*(k?-1:1)+i*2.094+(k?Math.PI:0)-1.57;const x=cxp+Math.cos(a)*R*1.15,y=cyp+Math.sin(a)*R*1.15;i?cx.lineTo(x,y):cx.moveTo(x,y)}cx.closePath();cx.stroke()}}
  if(m==="yao"){const lines=6,shown=Math.min(6,Math.floor(tt*.9));for(let i=0;i<shown;i++){const y=cyp+R*1.35-i*R*.18,yin=S.hx[i];cx.fillStyle=hex(col,.8);if(yin){cx.fillRect(cxp-R*.5,y,R*.4,R*.07);cx.fillRect(cxp+R*.1,y,R*.4,R*.07)}else cx.fillRect(cxp-R*.5,y,R,R*.07)}}
  /* the temple's own symbol, breathing and turning slowly */
  if(S.sym){const sz=R*2*pulse;cx.save();cx.translate(cxp,cyp);cx.rotate(Math.sin(tt*.2)*.12+(m==="orbit"||m==="steps"?0:tt*.03));cx.globalAlpha=.9;cx.shadowColor=col;cx.shadowBlur=24+Math.sin(tt*2)*8;cx.drawImage(S.sym,-sz/2,-sz/2,sz,sz);cx.restore();
   if(S.mirror){cx.save();cx.translate(cxp,cyp+R*2.05);cx.scale(1,-.35);cx.globalAlpha=.3;cx.drawImage(S.sym,-R,-R,R*2,R*2);cx.restore()}}
  /* bodies in orbit */
  if(m==="orbit"){const n=S.n||7;for(let i=0;i<n;i++){const a=tt*(.25+(n>7?.04:.1))+i/n*6.283,rr=R*1.18+(m==="orbit"&&n===2?Math.sin(tt*.7+i*3)*R*.1:0),x=cxp+Math.cos(a)*rr,y=cyp+Math.sin(a)*rr*.62;
    cx.fillStyle=hex(col,.95);cx.beginPath();cx.arc(x,y,5+(i===line%n?5:0),0,6.283);cx.fill();cx.strokeStyle=hex(col,.2);cx.beginPath();cx.ellipse(cxp,cyp,rr,rr*.62,0,0,6.283);cx.stroke()}}
  /* line-by-line emphasis: a bright sweep each time a new idea begins */
  const sw=clamp(1-(performance.now()-S.lineT)/1400,0,1);if(sw>0){cx.fillStyle=hex(col,sw*.16);cx.fillRect(0,0,w,h)}
  cx.globalCompositeOperation="source-over";
  /* vignette */
  const v=cx.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.65)");cx.fillStyle=v;cx.fillRect(0,0,w,h);
  /* advance when the line is done */
  if(S.said&&!S.ending){const el=performance.now()-S.lineT,voiceBusy=window.OV&&OV.busy&&OV.busy();if(el>S.min&&!(voiceBusy&&el<S.min+16000))LS.next()}}
 const lineMin=t=>clamp(t.length*.065+2.2,4,18);
 function sayLine(t){try{if(window.OV&&typeof voiceOn!=="undefined"&&voiceOn)OV.say(t,"dm")}catch(e){}}
 function showLine(){const S=cur;if(!S)return;const t=S.lines[S.i];if(t==null){finish();return}
  cap.style.opacity="0";setTimeout(()=>{if(cur===S){cap.textContent=t;cap.style.opacity="1"}},350);S.lineT=performance.now();S.said=0;S.min=lineMin(t)*1000+400;
  setTimeout(()=>{if(cur===S&&S.lines[S.i]===t&&!S.said){S.said=1;sayLine(t)}},700)}
 LS.next=function(){const S=cur;if(!S||S.ending)return;try{OV&&OV.stop&&OV.stop()}catch(e){}S.i++;showLine()};
 LS.skip=function(){if(!cur||cur.ending)return;try{OV&&OV.stop&&OV.stop()}catch(e){}finish()};
 function finish(){const S=cur;if(!S||S.ending)return;S.ending=1;cap.style.opacity="0";ov.style.opacity="0";
  setTimeout(()=>{cancelAnimationFrame(raf);ov.style.display="none";cur=null;try{if(window.MUS&&MUS.duck)MUS.duck(0)}catch(e){}try{occOpen=false}catch(e){}if(S.after)try{S.after()}catch(e){console.warn("lesson after",e)}},900)}
 LS.play=function(p,after){const id=p.id,d=L[id],Sx=SITES[id];if(!d||!Sx||cur){if(after)after();return false}
  build();let sym=null;try{if(typeof Sx.cv==="function")sym=Sx.cv()}catch(e){}
  cur={id,col:Sx.col||"#ffd878",m:d.m,n:d.n,lines:d.t,i:0,after,t0:performance.now(),lineT:performance.now(),said:0,min:5000,pt:mkP(d.m,innerWidth,innerHeight),sym:sym&&sym.width?sym:null,mirror:d.mirror,hx:[0,1,0,0,1,1].map(()=>Math.random()<.5?1:0)};
  try{occOpen=true}catch(e){}
  ttl.textContent=String(p.name||"").toUpperCase();ttl.style.color=cur.col;ov.style.display="block";void ov.offsetWidth;ov.style.opacity="1";
  try{if(window.MUS&&MUS.duck)MUS.duck(1)}catch(e){}
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);showLine();return true};
 /* ---------- hook: first entry ---------- */
 const _os=openSite;
 openSite=function(p){try{
   if(LS.on&&hero&&p&&L[p.id]&&!seen()[p.id]&&!cur&&!(window.CIN&&CIN.on)){seen()[p.id]=1;try{occClose&&0}catch(e){}
    if(LS.play(p,()=>{_os.call(this,p);addAgain(p)}))return}}catch(e){console.warn("lesson",e)}
  const r=_os.apply(this,arguments);try{addAgain(p)}catch(e){}return r};
 function addAgain(p){if(!p||!L[p.id])return;const b=document.getElementById("occbox");if(!b||b.querySelector(".lsnagain"))return;const m=document.createElement("div");m.className="menu lsnagain";m.style.gridTemplateColumns="1fr";
  const k=btn("Hear the teaching of this place again",()=>{occClose();LS.play(p,()=>{_os.call(window,p);addAgain(p)})},"alt");m.appendChild(k);b.appendChild(m)}
})();

/* ===== OMENS IN THE DARK: two small, cheap horrors for the open world.
   WATCHERS: at night (and when your Mind is low, even by day) pairs of eyes open in the deep forest. They blink. Look straight at one, or walk toward it,
   and it is gone with a rustle. At low Mind some are too high off the ground, and some are stacked.
   EFFIGIES: twig-and-straw poppets hung on posts, skull cairns and crow gallows appear along the wild places. The poppets slowly turn to face you when you are not looking.
   Everything is a handful of sprites and low-poly shapes, a small live cap, and one switch in Settings. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,OM=window.OMN={on:1,eyes:[],props:[],log:"",maxEyes:8};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.omens."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.omens."+k,v)}catch(e){}};
 OM.on=LSg("on","1")==="1"?1:0;OM.setOn=v=>{OM.on=v?1:0;LSs("on",OM.on?"1":"0");if(!OM.on)clearAll()};
 const R=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[(Math.random()*a.length)|0];
 const ground=(x,z)=>{try{return Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 const outdoors=()=>typeof world!=="undefined"&&world&&world.visible&&!DG&&hero;
 const boat=()=>!!(window.SEA&&SEA.B&&SEA.B.on);
 const village=()=>{try{return POIS.find(p=>p.id==="village")}catch(e){return null}};
 const nearVil=(x,z,r)=>{const v=village();return v&&Math.hypot(v.x*TW+1-x,v.y*TW+1-z)<r};
 const inViewAng=(x,z)=>{const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz)||1;return Math.acos(clamp((fx*dx+fz*dz)/d,-1,1))};
 const okTile=(x,z)=>{try{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);return tx>1&&ty>1&&tx<W-2&&ty<H-2&&reach[ty*W+tx]&&!tileSolid(tx,ty)&&hfn(x,z)>-.1}catch(e){return false}};
 const dense=(x,z)=>{try{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);if(window.CANOPY&&CANOPY.cov&&CANOPY.cov[ty*W+tx]>.15)return true;const b=biome[ty][tx];return b==="forest"||b==="swamp"}catch(e){return false}};
 const sanity=()=>(hero&&typeof hero.san==="number")?hero.san:100;
 const dark=()=>typeof todDay==="number"&&todDay<.3;
 /* ---------- shared bits ---------- */
 let GL=null;function glowTex(){if(GL)return GL;const c=document.createElement("canvas");c.width=c.height=32;const x=c.getContext("2d"),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.25,"rgba(255,255,255,.7)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,32,32);return GL=new T.CanvasTexture(c)}
 const eyeMats={};function eyeMat(col){return eyeMats[col]||(eyeMats[col]=new T.SpriteMaterial({map:glowTex(),color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,fog:false}))}
 let AX=null;
 function rustle(x,z,g){try{if(!AX){const AC=window.AudioContext||window.webkitAudioContext;AX=new AC()}if(AX.state==="suspended")AX.resume();if(AX.state!=="running")return;
  const n=AX.sampleRate*.35|0,b=AX.createBuffer(1,n,AX.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  const s=AX.createBufferSource();s.buffer=b;const f=AX.createBiquadFilter();f.type="bandpass";f.frequency.value=R(900,2200);f.Q.value=.8;const gn=AX.createGain();const dist=Math.hypot(x-P.x,z-P.z);gn.gain.value=(g||.12)/(1+dist*.04);
  const pan=AX.createStereoPanner?AX.createStereoPanner():null;if(pan){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=x-P.x,dz=z-P.z,dd=Math.hypot(dx,dz)||1;pan.pan.value=clamp((dx*(-fz)+dz*fx)/dd,-1,1)*.9}
  s.connect(f);f.connect(gn);pan?(gn.connect(pan),pan.connect(AX.destination)):gn.connect(AX.destination);s.start()}catch(e){}}
 /* ================= WATCHERS ================= */
 const COLS=[0xffb030,0xff3020,0xb8ff90,0xffe8c0,0xff6a20];
 let eCd=0;
 let dl=null,dlT=-99,dlX=0,dlZ=0;
 function denseList(){if(dl&&tAcc-dlT<8&&Math.hypot(P.x-dlX,P.z-dlZ)<20)return dl;dl=[];dlT=tAcc;dlX=P.x;dlZ=P.z;const tx0=Math.floor(P.x/TW),ty0=Math.floor(P.z/TW),rr=Math.ceil(60/TW);
  for(let ty=ty0-rr;ty<=ty0+rr;ty++)for(let tx=tx0-rr;tx<=tx0+rr;tx++){if(tx<2||ty<2||tx>=W-2||ty>=H-2)continue;if(dense(tx*TW+1,ty*TW+1)){const x=tx*TW+1,z=ty*TW+1,d=Math.hypot(x-P.x,z-P.z);if(d>26&&d<58)dl.push([x,z])}}
  if(dl.length<6){/* open country: eyes in the far dark, past the lamplight */for(let k=0;k<40;k++){const a=R(0,6.283),d=R(36,60),x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d;try{const b=biome[Math.floor(z/TW)][Math.floor(x/TW)];if(b!=="water"&&b!=="ocean")dl.push([x,z])}catch(e){}}}return dl}
 function spawnEye(){const L2=denseList();if(!L2.length)return false;
  for(let k=0;k<18;k++){const t0=pick(L2),x=t0[0]+R(-TW*.45,TW*.45),z=t0[1]+R(-TW*.45,TW*.45),dist=Math.hypot(x-P.x,z-P.z);
   if(!dense(x,z)||ground(x,z)<-.05||nearVil(x,z,34))continue;if(inViewAng(x,z)<.5)continue;
   const san=sanity(),low=san<50,r=Math.random(),kind=low&&r<.16?"stack":low&&r<.42?"tall":"low";
   const col=pick(COLS),mat=eyeMat(col).clone(),gap=kind==="tall"?R(.4,.6):R(.16,.34),g=ground(x,z);
   const ys=kind==="stack"?[g+1.0,g+1.6,g+2.2]:kind==="tall"?[g+R(3,4.4)]:[g+R(.5,1.7)];
   const sp=[];ys.forEach(y=>{[-1,1].forEach(s=>{const o=new T.Sprite(mat);o.scale.set(kind==="tall"?.95:.7,kind==="tall"?.55:.4,1);o.position.set(x,y,z);o.userData.dx=s*gap/2;o.userData.dy=y;scene.add(o);sp.push(o)})});
   OM.eyes.push({x,z,sp,kind,col,t:0,gaze:0,nb:R(2,6),blink:0,out:0,life:R(20,60),wob:R(0,6)});return true}
  return false}
 function eyeUpdate(e,dt,t){e.t+=dt;e.nb-=dt;
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz)||1,ang=Math.acos(clamp((fx*dx+fz*dz)/d,-1,1));
  /* right angle to the viewer: the pair sits perpendicular to the line of sight */
  const px=-dz/d,pz=dx/d;
  if(ang<.1&&d<70)e.gaze+=dt;else e.gaze=Math.max(0,e.gaze-dt*.5);
  if(!e.out&&(e.gaze>1.3||d<11||e.t>e.life)){e.out=1;e.outT=0;if(e.gaze>1.3||d<11)rustle(e.x,e.z,.14)}
  if(e.nb<=0){e.blink=.16;e.nb=R(3,9)}
  let o=Math.min(1,e.t/1.2)*(.55+.2*Math.sin(t*2+e.wob));
  if(e.blink>0){e.blink-=dt;o=0}
  if(e.out){e.outT+=dt;o*=Math.max(0,1-e.outT/.12);if(e.outT>.14)return false}
  /* low Mind: unseen ones creep a little closer */
  if(sanity()<40&&ang>.9&&d>16){e.x-=dx/d*dt*.5;e.z-=dz/d*dt*.5}
  e.sp.forEach(s=>{s.material.opacity=o;s.position.x=e.x+px*s.userData.dx;s.position.z=e.z+pz*s.userData.dx});
  return true}
 function killEye(e){e.sp.forEach(s=>scene.remove(s));try{e.sp[0].material.dispose()}catch(x){}}
 /* ================= EFFIGIES ================= */
 const GEO={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,6),sph:new T.SphereGeometry(1,8,6),cone:new T.ConeGeometry(1,1,6)};
 const MAT={wood:new T.MeshLambertMaterial({color:0x3a2a1c}),straw:new T.MeshLambertMaterial({color:0x8a7444}),cloth:new T.MeshLambertMaterial({color:0x5a4c3c}),bone:new T.MeshLambertMaterial({color:0xcfc8b0}),stone:new T.MeshLambertMaterial({color:0x4a4a50}),black:new T.MeshLambertMaterial({color:0x0a0a0c}),rope:new T.MeshLambertMaterial({color:0x6a5a3a}),red:new T.MeshLambertMaterial({color:0x6a1a14})};
 const mk=(g,geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(GEO[geo],MAT[mat]);m.position.set(x,y,z);m.scale.set(sx,sy==null?sx:sy,sz==null?sx:sz);g.add(m);return m};
 function poppet(g,x,y,h){const p=new T.Group();p.position.set(x,y,0);g.add(p);
  mk(p,"cyl","rope",0,.05,0,.012,.35,.012);const body=new T.Group();body.position.y=-.1;p.add(body);
  mk(body,"cone","cloth",0,-.18,0,.11,.38,.11);mk(body,"sph","straw",0,.06,0,.075,.085,.075);
  [-1,1].forEach(s=>{mk(body,"cyl","wood",s*.11,-.08,0,.012,.22,.012).rotation.z=s*.9;mk(body,"sph","black",s*.03,.07,.062,.014)});
  const gl=[-1,1].map(s=>{const e=new T.Sprite(eyeMat(0xff4020));e.scale.set(.09,.06,1);e.position.set(s*.03,.07,.07);body.add(e);return e});
  return{body,gl}}
 function mkProp(kind){const g=new T.Group(),o={g,kind,pop:[],t:0,ph:R(0,6),birds:[]};
  if(kind==="post"){mk(g,"cyl","wood",0,1.5,0,.07,3,.07);mk(g,"box","wood",0,2.85,0,1.7,.07,.07);mk(g,"box","wood",0,.15,0,.7,.14,.6);
   const n=2+(Math.random()*2|0);for(let i=0;i<n;i++){const x=-.7+i*(1.4/(n-1||1));o.pop.push(poppet(g,x,2.8-R(0,.25),0))}}
  else if(kind==="cairn"){let y=0;[.55,.42,.32,.22].forEach((r,i)=>{mk(g,"sph","stone",R(-.06,.06),y+r*.55,R(-.06,.06),r,r*.65,r);y+=r*.95});
   [[.3,.1],[-.25,.25],[.05,-.3]].forEach(a=>{const s=mk(g,"sph","bone",a[0],.2,a[1],.14,.12,.13);[-1,1].forEach(q=>mk(g,"sph","black",a[0]+q*.05,.23,a[1]+.1,.03));mk(g,"box","bone",a[0],.08,a[1]+.05,.09,.06,.08)});
   const c=mk(g,"cyl","straw",0,y+.1,0,.05,.18,.05);const f=new T.Sprite(eyeMat(0xffa030).clone());f.scale.set(.5,.5,1);f.position.set(0,y+.3,0);f.userData.flame=1;g.add(f);o.flame=f}
  else{mk(g,"cyl","wood",-1.1,1.4,0,.07,2.8,.07);mk(g,"cyl","wood",1.1,1.4,0,.07,2.8,.07);mk(g,"box","wood",0,2.75,0,2.4,.09,.09);
   mk(g,"cyl","rope",.2,2.2,0,.015,1.1,.015);mk(g,"cyl","rope",.2,1.65,0,.12,.03,.12);
   for(let i=0;i<3;i++){const b=new T.Group();b.position.set(-.7+i*.55,2.85,0);b.userData.home=b.position.clone();g.add(b);mk(b,"sph","black",0,.1,0,.1,.09,.15);mk(b,"sph","black",0,.18,.12,.06);mk(b,"cone","black",0,.1,-.2,.04,.2,.04).rotation.x=-1.7;
    const w=[-1,1].map(s=>{const wg=new T.Group();wg.position.set(s*.08,.12,0);b.add(wg);mk(wg,"box","black",s*.12,0,0,.22,.01,.12);return wg});o.birds.push({b,w,fly:0,v:0})}}
  return o}
 let pCd=0;
 function spawnProp(){
  for(let k=0;k<16;k++){const a=R(0,6.283),dist=R(48,105),x=P.x+Math.cos(a)*dist,z=P.z+Math.sin(a)*dist;
   if(!okTile(x,z)||nearVil(x,z,48))continue;if(inViewAng(x,z)<.9&&dist<90)continue;
   if(OM.props.some(p=>Math.hypot(p.g.position.x-x,p.g.position.z-z)<20))continue;
   const kind=pick(["post","post","cairn","gallows"]),o=mkProp(kind);o.g.position.set(x,ground(x,z),z);o.g.rotation.y=Math.atan2(P.x-x,P.z-z)+R(-.5,.5);scene.add(o.g);OM.props.push(o);return true}
  return false}
 function propUpdate(o,dt,t){const g=o.g,dx=P.x-g.position.x,dz=P.z-g.position.z,d=Math.hypot(dx,dz);
  if(d>150)return false;
  const unseen=inViewAng(g.position.x,g.position.z)>.9;
  if(o.kind==="post"){o.pop.forEach((p,i)=>{p.body.rotation.z=Math.sin(t*.9+o.ph+i)*.07;p.body.rotation.x=Math.sin(t*.7+i*2)*.05;
    const night=dark();p.gl.forEach(e=>e.material.opacity=night?.35+.2*Math.sin(t*3+i):0)});
   if(unseen&&d<60){const want=Math.atan2(dx,dz),cur=g.rotation.y;let a=want-cur;while(a>Math.PI)a-=6.2832;while(a<-Math.PI)a+=6.2832;g.rotation.y+=clamp(a,-1,1)*dt*.12}}
  else if(o.kind==="cairn"){if(o.flame){o.flame.material.opacity=dark()||sanity()<60?.4+.25*Math.sin(t*9+o.ph)*Math.sin(t*5):.0;o.flame.scale.setScalar(.45+.1*Math.sin(t*11+o.ph))}}
  else{o.birds.forEach((q,i)=>{if(!q.fly&&d<13){q.fly=1;q.v=R(3,5);try{if(window.MV&&MV._EV&&MV._EV.fam_raven)MV.event("notice","Familiar Ash Raven",g.position,{gap:200,gain:.9})}catch(e){}}
    if(q.fly){q.v+=dt*3;q.b.position.y+=q.v*dt;q.b.position.x+=(i-1)*dt*1.4;q.b.position.z-=dt*2;q.w.forEach((w,k)=>w.rotation.z=(k?1:-1)*Math.sin(t*26+i)*.9);if(q.b.position.y>30)q.b.visible=false}
    else q.b.rotation.y=Math.sin(t*.5+i+o.ph)*.4})}
  return true}
 function killProp(o){scene.remove(o.g)}
 function clearAll(){OM.eyes.forEach(killEye);OM.eyes.length=0;OM.props.forEach(killProp);OM.props.length=0}
 /* ---------- loop ---------- */
 let tAcc=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!OM.on||!hero||typeof glReady==="undefined"||!glReady||typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.1);tAcc+=dt;
   const ok=outdoors()&&!boat()&&!(typeof C!=="undefined"&&C)&&!(window.CIN&&CIN.on)&&!(window.STK&&STK.act&&!STK.act.dying&&STK.act.d<40);
   if(!outdoors()){if(OM.eyes.length||OM.props.length)clearAll();return}
   /* watchers */
   const san=sanity(),want=ok?(dark()?Math.min(OM.maxEyes,2+Math.floor((100-san)/14)):(san<35?Math.min(2,Math.floor((40-san)/12)):0)):0;
   for(let i=OM.eyes.length-1;i>=0;i--){if(!eyeUpdate(OM.eyes[i],dt,tAcc)){killEye(OM.eyes[i]);OM.eyes.splice(i,1)}}
   eCd-=dt;if(OM.eyes.length<want&&eCd<=0){eCd=R(2.5,7);spawnEye()}
   if(!want&&OM.eyes.length)OM.eyes.forEach(e=>{e.life=0});
   /* effigies */
   for(let i=OM.props.length-1;i>=0;i--){if(!propUpdate(OM.props[i],dt,tAcc)){killProp(OM.props[i]);OM.props.splice(i,1)}}
   pCd-=dt;if(ok&&OM.props.length<10&&pCd<=0){pCd=R(4,12);spawnProp()}
  }catch(e){OM.log=String(e&&e.stack||e).slice(0,300)}};
})();

/* ===== THE CRAFT: wands, resins and incense.
   WILD SPOTS: in the open country you can find seven kinds of wood (each wants something particular: a straight hazel branch, a young spruce branch that faces east,
   willow cut at night, rowan in daylight, elder only with leave asked, blackthorn that draws blood, yew from the graveyards) and seven resins weeping from trees.
   WANDS: Magicians, Clerics and Paladins bind a wand from a wood and a core (a gem, or three herbs of the wood's planet). Consecrate it in its planetary hour for more power.
   INCENSE: a resin and two herbs of one planet make incense. Burn it for a few minutes for that planet's boon, stronger in its own hour.
   Key Y or the Craft button. One switch in Settings. A handful of low-poly shapes and sprites, cheap. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined"||typeof ITEMS==="undefined")return;
 const T=THREE,CR=window.CRAFT={on:1,spots:{},log:"",act:null};
 const LSg=(k,d)=>{try{const v=localStorage.getItem("occultica.craft."+k);return v===null?d:v}catch(e){return d}},LSs=(k,v)=>{try{localStorage.setItem("occultica.craft."+k,v)}catch(e){}};
 CR.on=LSg("on","1")==="1"?1:0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const ground=(x,z)=>{try{return Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 const outdoors=()=>typeof world!=="undefined"&&world&&world.visible&&!DG&&hero;
 const boat=()=>!!(window.SEA&&SEA.B&&SEA.B.on);
 const village=()=>{try{return POIS.find(p=>p.id==="village")}catch(e){return null}};
 const PLC={};try{PLN.forEach(p=>PLC[p.n]=p)}catch(e){}
 const hourPl=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const CASTERS=["Magician","Cleric","Paladin"];
 const tell=m=>{try{if(typeof toast==="function")toast(m);else say(m)}catch(e){}};
 const sayl=m=>{try{say(m)}catch(e){}};
 const have=n=>(hero&&hero.inv&&hero.inv[n])|0;
 const take=(n,q)=>{if(have(n)<q)return false;hero.inv[n]-=q;if(hero.inv[n]<=0)delete hero.inv[n];return true};
 const planetHerbs=pl=>PLC[pl]?PLC[pl].h:[];
 const herbCount=pl=>planetHerbs(pl).reduce((t,h)=>t+have(h),0);
 const takeHerbs=(pl,n)=>{for(const h of planetHerbs(pl)){while(n>0&&have(h)){take(h,1);n--}}return n===0};
 const alchOf=pl=>{try{const s=ITEMS["Seal of "+pl];return s&&s.alch?s.alch:""}catch(e){return""}};

 /* ---------- the data ---------- */
 const WOODS=[
  {id:"hazel",n:"Hazel branch",pl:"Mercury",bm:["forest","hills"],col:0x9a7a3a,leaf:0x8ab04a,wand:{sp:1,mp:3},
   how:"A hazel branch must be straight and unforked, and cut by day.",
   rule:s=>!s.straight?"This hazel forks. A wand wants a straight branch. Look for another.":(!isDay()?"Hazel is cut by daylight. Come back when the sun is up.":null),
   tag:s=>s.straight?"straight":"forked"},
  {id:"willow",n:"Willow switch",pl:"Moon",bm:["swamp","forest"],col:0xb8b090,leaf:0x9ab88a,wand:{sp:1,mp:4,hp:2},
   how:"Willow is cut at night, by the water, in the Moon's hours.",
   rule:s=>isDay()?"Willow gives itself up only to the dark. Wait for night.":null,tag:s=>"by the water"},
  {id:"spruce",n:"Spruce branch",pl:"Jupiter",bm:["tundra","mountain"],col:0x5a4a2a,leaf:0x2e5a3a,wand:{sp:1,hp:4,ac:1,mp:1},
   how:"Only a young spruce whose branch points east will do.",
   rule:s=>s.dir!==1?"This branch points "+DIRN[s.dir]+". A wand wants one that faces east. Look for another.":null,tag:s=>"points "+DIRN[s.dir]},
  {id:"rowan",n:"Rowan twig",pl:"Sun",bm:["mountain","hills"],col:0x8a5a3a,leaf:0xc84a3a,wand:{sp:1,hp:3,ac:2,h:1},
   how:"Rowan, red-berried, is cut in full daylight.",
   rule:s=>!isDay()?"Rowan must be taken in the light. Wait for day.":null,tag:s=>"red-berried"},
  {id:"elder",n:"Elder twig",pl:"Venus",bm:["swamp","forest"],col:0x6a6a4a,leaf:0xd8d8c0,wand:{sp:2,mp:2,hp:2},
   how:"Ask the Elder Mother's leave first: leave one herb of Venus at her roots.",
   rule:s=>herbCount("Venus")<1?"The Elder Mother asks for a gift. Bring a Rose, Myrtle or Yarrow.":null,tag:s=>"wants a gift",
   cost:s=>{takeHerbs("Venus",1);return"You leave a sprig at the roots and ask her leave. The air softens."}},
  {id:"blackthorn",n:"Blackthorn spine",pl:"Mars",bm:["desert","mountain","hills"],col:0x2a2a2a,leaf:0x3a3a3a,wand:{sp:1,h:2,b:2},
   how:"Blackthorn takes a little blood from whoever cuts it.",
   rule:s=>hero.hp<=6?"You are too hurt to pay the thorn its due.":null,tag:s=>"thorned",
   cost:s=>{hero.hp=Math.max(1,hero.hp-3);return"The thorn takes its three drops of blood, and lets go."}},
  {id:"yew",n:"Yew twig",pl:"Saturn",bm:["*"],col:0x2a3a2a,leaf:0x1a3a2a,wand:{sp:2,b:2,mp:2,ac:1},
   how:"Yew grows only where the dead are kept. Cut it by night. It costs a little of your mind.",
   rule:s=>isDay()?"Yew is cut after dark, among the graves.":null,tag:s=>"among the graves",
   cost:s=>{try{SAN.hit(5)}catch(e){}return"The tree is very old and very cold. Something in your head goes quiet."}}];
 const DIRN=["north","east","south","west"];
 const RESINS=[
  {n:"Myrrh",pl:"Saturn",bm:["desert","tundra"],col:0x7a3a1a,boon:"Mind-ward"},
  {n:"Cedar resin",pl:"Jupiter",bm:["mountain","forest"],col:0xc89a3a,boon:"Fortune"},
  {n:"Dragon's blood",pl:"Mars",bm:["desert","hills"],col:0xb01818,boon:"Fury"},
  {n:"Frankincense",pl:"Sun",bm:["desert","mountain"],col:0xf0d890,boon:"Blessing"},
  {n:"Benzoin",pl:"Venus",bm:["forest","swamp"],col:0xe8a860,boon:"Solace"},
  {n:"Storax",pl:"Mercury",bm:["hills","forest"],col:0xd8a040,boon:"Clarity"},
  {n:"Camphor",pl:"Moon",bm:["tundra","swamp","mountain"],col:0xe8f0f0,boon:"Dream-sight"}];
 const BOON={
  Saturn:"Wards the Mind: sanity drains half as fast, and no watchers will gather.",
  Jupiter:"Fortune: you earn 20% more experience.",
  Mars:"Fury: +2 to hit in every fight.",
  Sun:"Blessing: you heal as you walk, and every fight starts blessed.",
  Venus:"Solace: you heal slowly and your mind mends.",
  Mercury:"Clarity: your mana returns quickly.",
  Moon:"Dream-sight: your mind mends and your mana returns slowly."};
 const isDay=()=>typeof todDay==="number"?todDay>.45:true;

 /* ---------- register the items ---------- */
 function regItems(){
  WOODS.forEach(w=>{const a=alchOf(w.pl);ITEMS[w.n]={t:"k",alch:a,desc:"Wood of "+w.pl+". "+w.how+" Bind it into a wand in the Craft panel (Y). "+(a?"["+a+"]":"")};try{PCK.ITEMP[w.n]=w.pl}catch(e){}});
  RESINS.forEach(r=>{const a=alchOf(r.pl);ITEMS[r.n]={t:"k",alch:a,desc:"Resin of "+r.pl+". Blend with two herbs of "+r.pl+" to make incense (Y). "+(a?"["+a+"]":"")};try{PCK.ITEMP[r.n]=r.pl}catch(e){}});
  PLN.forEach(p=>{const r=RESINS.find(q=>q.pl===p.n),nm="Incense of "+p.n,a=alchOf(p.n);ITEMS[nm]={t:"k",alch:a,desc:"Burn it in the Craft panel (Y). "+BOON[p.n]+" Twice as strong in the hour of "+p.n+". "+(a?"["+a+"]":"")};try{PCK.ITEMP[nm]=p.n}catch(e){}})}
 regItems();
 /* resins are also sold: the Herbalist keeps all seven, the Occultist the dearer ones */
 try{const PR={"Myrrh":30,"Cedar resin":22,"Dragon's blood":35,"Frankincense":40,"Benzoin":24,"Storax":26,"Camphor":22};
  if(typeof STOCK!=="undefined"){STOCK.Herbalist=STOCK.Herbalist||[];RESINS.forEach(r=>{if(!STOCK.Herbalist.some(e=>e[0]===r.n))STOCK.Herbalist.push([r.n,PR[r.n]||25])});
   if(STOCK.Occultist)["Frankincense","Myrrh","Dragon's blood"].forEach(n=>{if(!STOCK.Occultist.some(e=>e[0]===n))STOCK.Occultist.push([n,Math.round(PR[n]*1.25)])})}}catch(e){}
 function regWands(){if(!hero||!hero.craft||!hero.craft.defs)return;for(const nm in hero.craft.defs){const d=hero.craft.defs[nm];if(!ITEMS[nm]){ITEMS[nm]=Object.assign({t:"w",d:[1,4],f:1,m:1},d.st,{alch:alchOf(d.pl),desc:d.desc});try{PCK.ITEMP[nm]=d.pl}catch(e){}}}}
 function st(){if(!hero)return null;if(!hero.craft)hero.craft={gone:{},defs:{},act:null};if(!hero.craft.gone)hero.craft.gone={};if(!hero.craft.defs)hero.craft.defs={};return hero.craft}

 /* ---------- the wild spots ---------- */
 const hash=(x,y)=>{let n=(x*374761393+y*668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0};
 const RATE=130;
 let nearPOI=null;
 function poiNear(tx,ty){try{for(const p of POIS){if((p.k==="d"||p.k==="t")&&Math.hypot(p.x-tx,p.y-ty)<9)return true}}catch(e){}return false}
 function spotAt(tx,ty){
  const h=hash(tx,ty);if(h%RATE!==0)return null;
  const h2=(h>>>7),bm=biome[ty]&&biome[ty][tx];if(!bm)return null;
  const woods=WOODS.filter(w=>w.bm.includes(bm)||(w.bm[0]==="*"&&poiNear(tx,ty))),res=RESINS.filter(r=>r.bm.includes(bm));
  const all=[];woods.forEach(w=>all.push(["w",w]));res.forEach(r=>all.push(["r",r]));
  if(!all.length)return null;
  const pk=all[h2%all.length];return{key:tx+","+ty,tx,ty,k:pk[0],d:pk[1],straight:(h2>>>3)%100<55,dir:(h2>>>9)%4,ph:(h2%628)/100}}
 let GLt=null;function glow(){if(GLt)return GLt;const c=document.createElement("canvas");c.width=c.height=32;const x=c.getContext("2d"),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.4,"rgba(255,255,255,.35)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,32,32);return GLt=new T.CanvasTexture(c)}
 const M=(c,e)=>new T.MeshLambertMaterial({color:c,emissive:e||0});
 function build(s){
  const g=new T.Group(),x=s.tx*TW+1,z=s.ty*TW+1,y=ground(x,z);g.position.set(x,y,z);
  const col=s.d.col,pl=PLC[s.d.pl];
  if(s.k==="w"){
   const lean=s.d.id==="spruce"?.8:.35,dirA=s.d.id==="spruce"?[Math.PI/2,0,-Math.PI/2,Math.PI][s.dir]:s.ph;
   const mk=(len,r,ax,az,ox,oy,oz)=>{const m=new T.Mesh(new T.CylinderGeometry(r*.7,r,len,5),M(s.d.col));m.position.set(ox,oy+len/2*Math.cos(ax),oz);m.rotation.set(0,0,0);m.rotation.z=ax;m.rotation.y=az;return m};
   const br=new T.Group();br.rotation.y=dirA;
   const m1=new T.Mesh(new T.CylinderGeometry(.025,.04,1.5,5),M(s.d.col));m1.position.set(Math.sin(lean)*.75,Math.cos(lean)*.75,0);m1.rotation.z=-lean;br.add(m1);
   if(s.d.id==="hazel"&&!s.straight){const m2=new T.Mesh(new T.CylinderGeometry(.02,.03,.8,5),M(s.d.col));m2.position.set(Math.sin(lean)*.8+.25,1.15,0);m2.rotation.z=.9;br.add(m2)}
   for(let i=0;i<6;i++){const l=new T.Mesh(new T.ConeGeometry(.12,.3,4),M(s.d.leaf));const t=.35+i*.1;l.position.set(Math.sin(lean)*1.5*t+(i%2?.1:-.1),Math.cos(lean)*1.5*t,(i%3-1)*.08);l.rotation.z=(i%2?1:-1)*.8;br.add(l)}
   if(s.d.id==="rowan"||s.d.id==="elder"){for(let i=0;i<5;i++){const b=new T.Mesh(new T.SphereGeometry(.05,5,4),M(s.d.leaf,s.d.id==="rowan"?0x802010:0));b.position.set(Math.sin(lean)*1.5*(.6+i*.07),Math.cos(lean)*1.5*(.6+i*.07)+.05,(i-2)*.05);br.add(b)}}
   g.add(br);const stub=new T.Mesh(new T.CylinderGeometry(.12,.17,.45,6),M(0x3a2a1a));stub.position.y=.2;g.add(stub);
  }else{
   const tr=new T.Mesh(new T.CylinderGeometry(.14,.2,1,6),M(0x2e2018));tr.position.y=.5;g.add(tr);
   for(let i=0;i<3;i++){const b=new T.Mesh(new T.SphereGeometry(.1+.03*i,6,5),M(col,col));b.position.set(.14,.35+i*.22,(i-1)*.08);b.scale.set(1,1.5,.8);g.add(b)}}
  const sp=new T.Sprite(new T.SpriteMaterial({map:glow(),color:pl?new T.Color(pl.c):0xffffff,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.28,fog:false}));sp.scale.set(1.8,1.8,1);sp.position.y=.8;g.add(sp);g.userData.sp=sp;
  scene.add(g);return g}
 const live={};
 function sync(){
  const s0=st();if(!s0)return;const r=Math.ceil(46/TW),tx0=Math.floor(P.x/TW),ty0=Math.floor(P.z/TW),want={},v=village();
  for(let ty=ty0-r;ty<=ty0+r;ty++)for(let tx=tx0-r;tx<=tx0+r;tx++){
   if(tx<3||ty<3||tx>=W-3||ty>=H-3)continue;const sp=spotAt(tx,ty);if(!sp)continue;
   if(Math.hypot(tx*TW+1-P.x,ty*TW+1-P.z)>46)continue;
   if(v&&Math.hypot(v.x-tx,v.y-ty)<7)continue;
   const gone=s0.gone[sp.key];if(gone&&Date.now()-gone<20*60*1000)continue;
   try{if(!reach[ty*W+tx]||hfn(tx*TW+1,ty*TW+1)<-.1)continue}catch(e){continue}
   want[sp.key]=sp}
  for(const k in live)if(!want[k]){scene.remove(live[k].g);delete live[k]}
  for(const k in want)if(!live[k])live[k]={s:want[k],g:build(want[k])};
  CR.spots=live}
 function clearAll(){for(const k in live){scene.remove(live[k].g);delete live[k]}}
 function nearSpot(){if(!CR.on||!outdoors()||boat()||(typeof C!=="undefined"&&C)||D||packOpen||occOpen)return null;
  let b=null,bd=2.3;for(const k in live){const o=live[k],d=Math.hypot(o.s.tx*TW+1-P.x,o.s.ty*TW+1-P.z);if(d<bd){bd=d;b=o.s}}return b}
 function gather(s){const s0=st();
  if(s.k==="w"){const w=s.d,why=w.rule(s);if(why){sayl(why);return}
   const extra=w.cost?w.cost(s):"";giveItem(w.n,1);s0.gone[s.key]=Date.now();sayl((extra?extra+" ":"")+"You cut a "+w.n.toLowerCase()+". "+w.pl+"'s wood. Bind it into a wand in the Craft panel (Y).");}
  else{const r=s.d,q=1+((hash(s.tx,s.ty)>>>5)%2);giveItem(r.n,q);s0.gone[s.key]=Date.now();sayl("You scrape "+q+" tear"+(q>1?"s":"")+" of "+r.n.toLowerCase()+" from the bark. It smells of "+r.pl+".")}
  const k=s.key;if(live[k]){scene.remove(live[k].g);delete live[k]}try{hud()}catch(e){}}
 const prevN=window.HW&&HW.near,prevL=window.HW&&HW.label,prevU=window.HW&&HW.use;
 if(window.HW){HW.near=()=>{try{if(nearSpot())return true}catch(e){}return prevN()};
  HW.label=()=>{try{const s=nearSpot();if(s)return s.k==="w"?"Cut the "+s.d.n.toLowerCase().replace(/ .*/,"")+" ("+s.d.tag(s)+")":"Gather "+s.d.n.toLowerCase()}catch(e){}return prevL()};
  HW.use=()=>{try{const s=nearSpot();if(s)return gather(s)}catch(e){}return prevU()}}

 /* ---------- wands ---------- */
 const GEMS=["Ruby","Sapphire","Emerald","Moonstone"];
 function canWand(){return CASTERS.includes(hero.cls)}
 function makeWand(w,core){
  const s0=st();if(!canWand()){sayl("Only the Magician, Cleric and Paladin orders know the rite of the wand.");return false}
  if(!have(w.n)){return false}
  if(core==="herbs"){if(herbCount(w.pl)<3){sayl("You need three herbs of "+w.pl+" to bind the core.");return false}}
  else if(!have(core)){return false}
  if(core==="herbs")takeHerbs(w.pl,3);else take(core,1);take(w.n,1);
  const stt=Object.assign({},w.wand);let nm=w.n.split(" ")[0]+" wand",ds="A wand of "+w.n.split(" ")[0].toLowerCase()+", wood of "+w.pl+". ";
  if(core!=="herbs"){const gp={Ruby:"Mars",Sapphire:"Jupiter",Emerald:"Venus",Moonstone:"Moon"}[core];nm+=" of "+core.toLowerCase();ds+="Set with "+core.toLowerCase()+". ";if(gp===w.pl){stt.sp=(stt.sp||0)+1;stt.mp=(stt.mp||0)+1;ds+="Wood and stone agree. "}else stt.mp=(stt.mp||0)+1}else ds+="Bound with herbs. ";
  if(hourPl()===w.pl){stt.sp=(stt.sp||0)+1;nm+=" (consecrated)";ds+="Consecrated in the hour of "+w.pl+". "}
  if(CASTERS.includes("Cleric")&&hero.cls==="Cleric")stt.hp=(stt.hp||0)+1;
  if(hero.cls==="Paladin")stt.h=(stt.h||0)+1;
  if(hero.cls==="Magician")stt.mp=(stt.mp||0)+1;
  const bits=Object.entries(stt).map(([k,v])=>"+"+v+" "+({sp:"spell power",mp:"mana",hp:"HP",ac:"AC",h:"to hit",b:"damage"}[k]||k)).join(", ");ds+=bits+".";
  s0.defs[nm]={pl:w.pl,st:stt,desc:ds};regWands();giveItem(nm,1);hero.eq.w=hero.eq.w;sayl("You bind the "+nm+". "+bits+". Equip it from your pack.");try{hud()}catch(e){}return true}

 /* ---------- incense ---------- */
 function blend(pl){const r=RESINS.find(q=>q.pl===pl);if(!r)return false;if(!have(r.n)||herbCount(pl)<2){sayl("You need "+r.n.toLowerCase()+" and two herbs of "+pl+".");return false}
  take(r.n,1);takeHerbs(pl,2);giveItem("Incense of "+pl,2);sayl("You grind the resin and the herbs together and roll two sticks of incense of "+pl+".");return true}
 function burn(pl){if(!outdoors()||(typeof C!=="undefined"&&C)){sayl("Burn incense outdoors, in quiet.");return false}
  if(!take("Incense of "+pl,1))return false;const m=hourPl()===pl?2:1,s0=st();
  s0.act={pl,left:240*(m>1?1.5:1),m};CR.act=s0.act;
  smokeAt(P.x-Math.sin(yaw)*.8,P.z-Math.cos(yaw)*.8,PLC[pl]?PLC[pl].c:"#ffffff");
  sayl("You light the incense of "+pl+". "+(m>1?"It is "+pl+"'s own hour, and the smoke climbs straight and strong. ":"")+BOON[pl]);return true}
 /* a small column of smoke where it was lit */
 let smokes=[];
 function smokeAt(x,z,col){const g=ground(x,z),pts=[];for(let i=0;i<7;i++){const s=new T.Sprite(new T.SpriteMaterial({map:glow(),color:new T.Color(col).lerp(new T.Color(0xcccccc),.5),transparent:true,depthWrite:false,opacity:0,fog:false}));s.scale.set(.5,.5,1);s.position.set(x,g+.1,z);scene.add(s);pts.push({s,t:i*.6,x,z,g})}smokes.push({pts,life:0,max:240})}
 function smokeTick(dt){smokes=smokes.filter(S=>{S.life+=dt;const end=!CR.act||S.life>S.max;S.pts.forEach(p=>{p.t+=dt;const u=(p.t%4.2)/4.2;p.s.position.set(p.x+Math.sin(p.t*.9+p.t)*.18*u*3,p.g+.1+u*2.6,p.z+Math.cos(p.t*.7)*.14*u*3);const sc=.4+u*1.3;p.s.scale.set(sc,sc,1);p.s.material.opacity=end?Math.max(0,p.s.material.opacity-dt):Math.sin(u*Math.PI)*.35});
  if(end&&S.pts[0].s.material.opacity<=0){S.pts.forEach(p=>scene.remove(p.s));return false}return true})}
 const _xp=window.addXp;
 if(typeof addXp==="function"){const _ax=addXp;addXp=function(n){try{let jm=(CR.act&&CR.act.pl==="Jupiter"?CR.act.m:0)+(CR.cand&&CR.cand.pl==="Jupiter"?CR.cand.m:0);if(jm>0&&n>0)n=Math.round(n*(1+.2*jm))}catch(e){}return _ax.apply(this,arguments.length>1?[n].concat([].slice.call(arguments,1)):[n])}}
 let hudEl=null;
 function pill(){if(hudEl)return hudEl;hudEl=document.createElement("div");hudEl.style.cssText="position:fixed;left:10px;bottom:64px;z-index:9;padding:4px 10px;border:1px solid #6a4a9a;border-radius:14px;background:rgba(14,8,26,.72);color:#e6d8ff;font:12px Cinzel,Georgia,serif;display:none;pointer-events:none";document.body.appendChild(hudEl);return hudEl}
 function applyTick(dt,a,key){if(!a||!hero){return}
  a.left-=dt;const m=a.m,mx=maxHP(),mm=maxMP();
  const heal=r=>{if(hero.hp<mx)hero.hp=Math.min(mx,hero.hp+mx*r*dt)},mana=r=>{if(typeof hero.mana==="number"&&hero.mana<mm)hero.mana=Math.min(mm,hero.mana+mm*r*dt)},mind=r=>{try{SAN.heal(r*dt)}catch(e){}};
  const busy=(typeof C!=="undefined"&&C);
  switch(a.pl){
   case"Sun":if(!busy)heal(.004*m);break;
   case"Venus":if(!busy)heal(.002*m);mind(.05*m);break;
   case"Mercury":mana(.012*m);break;
   case"Moon":mana(.004*m);mind(.06*m);break;
   case"Saturn":try{if(window.OMN&&OMN.eyes.length){OMN.eyes.forEach(e=>{e.life=0})}}catch(e){}break}
  if(busy&&C&&!C["_cr"+key]){C["_cr"+key]=1;if(a.pl==="Mars")C.fh=(C.fh||0)+Math.max(1,Math.round(2*m));if(a.pl==="Sun")C.bless=Math.max(C.bless||0,Math.max(2,Math.round(3*m)))}
  if(a.left<=0){CR[key]=null;st()[key]=null;tell(key==="act"?"The incense of "+a.pl+" burns down to ash.":"The candle of "+a.pl+" gutters and goes out.");if(key==="cand")killFlame()}}


 /* ---------- candles ---------- */
 const CCOL={Saturn:"Black",Jupiter:"Blue",Mars:"Red",Sun:"Gold",Venus:"Green",Mercury:"Orange",Moon:"White"};
 PLN.forEach(p=>{const nm="Candle of "+p.n,a=alchOf(p.n);ITEMS[nm]={t:"k",alch:a,desc:(CCOL[p.n]||"")+" candle of "+p.n+". Light it in the Craft panel (Y): half the boon of the incense, and it stacks with the same planet's incense. "+(a?"["+a+"]":"")};try{PCK.ITEMP[nm]=p.n}catch(e){}});
 ITEMS["Salt"]={t:"k",desc:"A pouch of coarse white salt. Used with chalk to draw a circle (Y)."};ITEMS["Chalk"]={t:"k",desc:"A stick of white chalk. Used with salt to draw a circle (Y)."};
 ITEMS["Black mirror"]={t:"k",alch:alchOf("Saturn"),desc:"Polished black glass in a lead frame. Gaze in it from the Craft panel (Y). It shows what hides nearby, and it costs a little of your Mind. ["+alchOf("Saturn")+"]"};try{PCK.ITEMP["Black mirror"]="Saturn"}catch(e){}
 try{if(typeof STOCK!=="undefined"){STOCK.Herbalist=STOCK.Herbalist||[];PLN.forEach(p=>{const n="Candle of "+p.n;if(!STOCK.Herbalist.some(e=>e[0]===n))STOCK.Herbalist.push([n,8])});["Salt","Chalk"].forEach(n=>{if(!STOCK.Herbalist.some(e=>e[0]===n))STOCK.Herbalist.push([n,3]);if(STOCK.Merchant&&!STOCK.Merchant.some(e=>e[0]===n))STOCK.Merchant.push([n,4])})}}catch(e){}
 let flame=null;
 function killFlame(){if(flame){scene.remove(flame.g);flame=null}}
 function lightCandle(pl){if(!outdoors()||(typeof C!=="undefined"&&C)){sayl("Light a candle outdoors, in quiet.");return false}
  if(!take("Candle of "+pl,1))return false;const m=(hourPl()===pl?1:.5),s0=st();s0.cand={pl,left:(hourPl()===pl?270:180),m};CR.cand=s0.cand;
  killFlame();const g=new T.Group(),x=P.x-Math.sin(yaw)*.9,z=P.z-Math.cos(yaw)*.9,y=ground(x,z);g.position.set(x,y,z);
  const col=PLC[pl]?PLC[pl].c:"#ffffff";
  const wax=new T.Mesh(new T.CylinderGeometry(.045,.05,.3,8),new T.MeshLambertMaterial({color:new T.Color(col).lerp(new T.Color(0xeeeeee),.45),emissive:new T.Color(col).multiplyScalar(.25)}));wax.position.y=.15;g.add(wax);
  const fl=new T.Sprite(new T.SpriteMaterial({map:glow(),color:0xffc060,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.9,fog:false}));fl.scale.set(.22,.34,1);fl.position.y=.37;g.add(fl);
  const ha=new T.Sprite(new T.SpriteMaterial({map:glow(),color:new T.Color(col),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.35,fog:false}));ha.scale.set(1.6,1.6,1);ha.position.y=.4;g.add(ha);
  scene.add(g);flame={g,fl,ha,t:0};
  sayl("You set a "+(CCOL[pl]||"").toLowerCase()+" candle of "+pl+" on the ground and light it. "+(m>=1?"It is its own hour, and the flame stands tall and still. ":"")+BOON[pl]+" (half strength)");return true}
 function flameTick(dt){if(!flame)return;if(!CR.cand){killFlame();return}flame.t+=dt;const f=.85+.15*Math.sin(flame.t*13)+.08*Math.sin(flame.t*29);flame.fl.scale.set(.2*f,.34*f,1);flame.ha.material.opacity=.3+.1*Math.sin(flame.t*9)}
 /* ---------- the chalk circle ---------- */
 let circles=[],cTex=null;
 function ringTex(){if(cTex)return cTex;const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");x.translate(128,128);x.strokeStyle="rgba(240,236,224,.95)";x.fillStyle="rgba(240,236,224,.95)";x.lineWidth=5;x.beginPath();x.arc(0,0,118,0,6.283);x.stroke();x.lineWidth=2.5;x.beginPath();x.arc(0,0,104,0,6.283);x.stroke();
  x.lineWidth=2.5;x.beginPath();for(let i=0;i<7;i++){const a=(i*3/7)*6.283-1.5708;const px=Math.cos(a)*100,py=Math.sin(a)*100;i?x.lineTo(px,py):x.moveTo(px,py)}x.closePath();x.stroke();
  x.font="18px serif";x.textAlign="center";x.textBaseline="middle";PLN.forEach((p,i)=>{const a=i/7*6.283-1.5708;x.fillText(p.g,Math.cos(a)*111,Math.sin(a)*111)});
  try{const w=window.SEAL&&SEAL.tint("#f0ece0");if(w){const gh=112,gw=gh/(window.SEAL_IMG&&SEAL_IMG.ar||1.59);x.globalAlpha=.6;x.drawImage(w,-gw/2,-gh/2,gw,gh);x.globalAlpha=1}}catch(e){}for(let i=0;i<140;i++){const a=Math.random()*6.283,r=60+Math.random()*58;x.globalAlpha=.25;x.fillRect(Math.cos(a)*r,Math.sin(a)*r,2,2)}x.globalAlpha=1;return cTex=new T.CanvasTexture(c)}
 function drawCircle(){
  if(!outdoors()||(typeof C!=="undefined"&&C)||boat()){sayl("Draw the circle outdoors, on solid ground.");return false}
  if(!have("Salt")||!have("Chalk")){sayl("You need salt and chalk. The Herbalist and the Merchant sell both.");return false}
  take("Salt",1);take("Chalk",1);const x=P.x,z=P.z,y=ground(x,z)+.14;
  const m=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshBasicMaterial({map:ringTex(),transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);
  circles.push({x,z,m,life:600,t:0,r:2.4});if(circles.length>3){const o=circles.shift();scene.remove(o.m)}
  sayl("You pour the salt, walk the chalk around yourself and close the ring. Nothing that wanders will cross it, and for ten minutes it keeps the cold out of your mind.");return true}
 function inCircle(){for(const c of circles)if(Math.hypot(P.x-c.x,P.z-c.z)<c.r)return c;return null}
 function circleTick(dt){circles=circles.filter(c=>{c.t+=dt;c.life-=dt;const e=c.life<=0;c.m.material.opacity=e?Math.max(0,c.m.material.opacity-dt*.5):Math.min(.9,c.t*.8)*Math.min(1,c.life/15);if(e&&c.m.material.opacity<=0){scene.remove(c.m);return false}return true});
  if(inCircle()&&hero&&!(typeof C!=="undefined"&&C)){try{SAN.heal(.05*dt*10)}catch(e){}try{if(window.OMN&&OMN.eyes.length)OMN.eyes.forEach(e=>{e.life=0})}catch(e){}}}
 if(typeof startCombat==="function"){const _sc2=startCombat;startCombat=function(f,tier,after){try{if(CR.on&&!DG&&inCircle()&&!(f&&/Unmoved|Stalker|Tetramorph|Seraph|Drowned King/.test(f[0]||""))){tell("The wandering "+(f&&f[0]?f[0].toLowerCase():"thing")+" circles the chalk and cannot cross it.");return}}catch(e){}return _sc2.apply(this,arguments)}}
 function circlePanel(b,list){b.appendChild(el("p","Salt and chalk. Draw a ring around yourself and wandering monsters cannot cross it for ten minutes. Inside it your Mind mends and watchers fade. It does not hold against bosses or things that hunt you by name. You need one of each. You carry: salt "+have("Salt")+", chalk "+have("Chalk")+".","sub"));const m=list();
  m.appendChild(btn("Draw the circle here",()=>{if(drawCircle())occClose()},"go",!(have("Salt")&&have("Chalk"))));
  if(inCircle())m.appendChild(el("p","You are standing inside a circle.","sub"))}
 /* ---------- the black mirror ---------- */
 let mirCd=0;
 function mirrorPanel(b,list){const m=list();
  b.appendChild(el("p","A black glass in a lead frame. It shows what hides nearby: a hidden place outdoors, or what waits at the bottom of a dungeon. Each gaze costs 6 Mind, and the lower your Mind, the less the glass can be trusted. "+(have("Black mirror")?"":"You have no mirror yet. Cast one: a gem, a tear of myrrh and two sprigs of henbane, in the hour of Saturn if you can."),"sub"));
  if(!have("Black mirror"))m.appendChild(btn("Cast a black mirror (1 gem + Myrrh + 2 Henbane)",()=>{const g=GEMS.find(x=>have(x));if(!g||!have("Myrrh")||have("Henbane")<2){sayl("You need a gem, a tear of myrrh and two sprigs of henbane.");return}take(g,1);take("Myrrh",1);take("Henbane",2);giveItem("Black mirror",1);sayl("The glass cools black as a pupil. You do not like how it looks back.");panel("mirror")},"alt",!(GEMS.some(x=>have(x))&&have("Myrrh")&&have("Henbane")>=2)));
  else m.appendChild(btn("Gaze into the mirror",()=>{if(gaze())occClose()},"go"))}
 const DIRS=["east","south-east","south","south-west","west","north-west","north","north-east"];
 function bearing(dx,dz){const a=Math.atan2(dz,dx),i=((Math.round(a/(Math.PI/4))%8)+8)%8;return DIRS[i]}
 function overlay(txt,col){const o=document.createElement("div");o.style.cssText="position:fixed;inset:0;z-index:99970;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 0,rgba(8,6,14,.55) 22%,rgba(0,0,0,.96) 62%);opacity:0;transition:opacity 1.2s;pointer-events:none;color:"+(col||"#d8d0f0")+";font:italic 20px Georgia,serif;text-align:center;padding:0 12%";o.textContent=txt;document.body.appendChild(o);requestAnimationFrame(()=>o.style.opacity="1");setTimeout(()=>{o.style.opacity="0"},5200);setTimeout(()=>o.remove(),6600)}
 function gaze(){if(Date.now()<mirCd){sayl("The glass is clouded. Give it a few minutes.");return false}
  if((typeof C!=="undefined"&&C)){return false}mirCd=Date.now()+150000;try{SAN.hit(6)}catch(e){}
  const low=(typeof hero.san==="number"?hero.san:100)<40,lie=low&&Math.random()<.45;let msg="";
  if(lie){const L=["In the glass you are standing behind yourself. It lifts a hand. You did not.","The glass shows a long road, and a very tall shape standing on it, facing the other way. It begins to turn.","Your own face looks up out of the dark and mouths a number. Then it smiles with more teeth than you have."];msg=L[(Math.random()*L.length)|0];try{SAN.hit(6)}catch(e){}try{flash("rgba(10,10,20,.8)")}catch(e){}}
  else if(typeof DG!=="undefined"&&DG){msg=(DG.th&&DG.th.boss)?"Deep below, in the glass, something waits in the last room: "+DG.th.boss+". It knows you are looking.":"The glass shows only stone, and a slow dripping that is not water."}
  else{let best=null,bd=1e9;try{for(const q of POIS){if(q.k==="v"||(typeof found!=="undefined"&&found[q.id]))continue;const dx=q.x*TW+1-P.x,dz=q.y*TW+1-P.z,d=Math.hypot(dx,dz);if(d<bd){bd=d;best={q,dx,dz}}}}catch(e){}
   if(best){const km=bd<60?"close, within a few hundred paces":bd<140?"a good walk off":"far, beyond the next ridge";msg="In the glass: "+(best.q.hidden?"a place that does not want to be found":"a place you have not yet seen")+", to the "+bearing(best.dx,best.dz)+". "+km+"."}else msg="The glass is quiet. There is nothing left near you that it can show."}
  overlay(msg,lie?"#e0a0a0":"#d8d0f0");sayl(msg);return true}
 /* ---------- the panel ---------- */
 function panel(tab){
  if(!hero||(typeof C!=="undefined"&&C)||D||packOpen)return;if(occOpen)occClose();
  const b=occPanel("The Craft","#c8a0ff");
  const top=()=>{const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr 1fr";b.appendChild(m);
   [["wands","Wands"],["incense","Blend incense"],["burn","Burn incense & candles"],["circle","Chalk circle"],["mirror","Black mirror"],["notes","Field notes"]].forEach(([k,t])=>m.appendChild(btn(t,()=>panel(k),k===tab?"go":"alt")))};
  top();
  const list=()=>{const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);return m};
  if(!tab||tab==="home"){
   b.appendChild(el("p","Wood, resin and smoke. Walk the wild places and watch for faint coloured glimmers on the ground: each is a branch to cut or a tree weeping resin. Press E beside one. Each wood and resin belongs to a planet, and the planets keep their hours.","sub"));
   const wn=WOODS.filter(w=>have(w.n)).map(w=>w.n+" ×"+have(w.n)),rn=RESINS.filter(r=>have(r.n)).map(r=>r.n+" ×"+have(r.n)),inn=PLN.filter(p=>have("Incense of "+p.n)).map(p=>"Incense of "+p.n+" ×"+have("Incense of "+p.n));
   b.appendChild(el("p","Woods: "+(wn.join(", ")||"none")+".","sub"));b.appendChild(el("p","Resins: "+(rn.join(", ")||"none")+".","sub"));b.appendChild(el("p","Incense: "+(inn.join(", ")||"none")+".","sub"));
   if(CR.act)b.appendChild(el("p","Burning now: incense of "+CR.act.pl+", "+Math.ceil(CR.act.left)+" s left.","sub"));
   const c=el("div",null,"menu");c.style.gridTemplateColumns="1fr";b.appendChild(c);c.appendChild(btn("Close",()=>occClose(),"alt"));return}
  if(tab==="wands"){
   b.appendChild(el("p",canWand()?"Choose a wood you carry, then a core. Wood and gem of one planet agree and give more. Craft it in the planet's own hour to consecrate it.":"The wand-rite belongs to Magicians, Clerics and Paladins. You may still gather and trade the wood.","sub"));
   const m=list();let any=0;
   WOODS.forEach(w=>{if(!have(w.n))return;any=1;m.appendChild(el("p",w.n+" ("+w.pl+")"+(hourPl()===w.pl?" — it is this planet's hour now":""),"sub"));
    m.appendChild(btn("Bind with three herbs of "+w.pl,()=>{if(makeWand(w,"herbs"))panel("wands")},"alt",!canWand()||herbCount(w.pl)<3));
    GEMS.forEach(g=>{if(have(g))m.appendChild(btn("Set a "+g.toLowerCase(),()=>{if(makeWand(w,g))panel("wands")},"alt",!canWand()))})});
   if(!any)m.appendChild(el("p","You carry no wood yet. Look for glimmers in the forest, hills, swamp, tundra and mountains.","sub"));return}
  if(tab==="incense"){
   b.appendChild(el("p","One resin and two herbs of the same planet make two sticks of incense.","sub"));const m=list();
   PLN.forEach(p=>{const r=RESINS.find(q=>q.pl===p.n);m.appendChild(btn(p.g+" "+p.n+": "+r.n+" ("+have(r.n)+") + "+planetHerbs(p.n).join("/")+" ("+herbCount(p.n)+")",()=>{if(blend(p.n))panel("incense")},"alt",!(have(r.n)&&herbCount(p.n)>=2)))});return}
  if(tab==="burn"){
   b.appendChild(el("p",CR.act?"Burning: incense of "+CR.act.pl+", "+Math.ceil(CR.act.left)+" s left. Lighting another replaces it.":"Light a stick and its boon lasts a few minutes. In its own planetary hour it is twice as strong.","sub"));const m=list();let any=0;
   PLN.forEach(p=>{const n=have("Incense of "+p.n);if(!n)return;any=1;m.appendChild(btn(p.g+" Incense of "+p.n+" ×"+n+(hourPl()===p.n?"  (its hour!)":"")+"  "+BOON[p.n],()=>{if(burn(p.n))occClose()},"go"))});
   PLN.forEach(p=>{const n=have("Candle of "+p.n);if(!n)return;any=1;m.appendChild(btn("🕯 Candle of "+p.n+" ×"+n+(hourPl()===p.n?"  (its hour!)":"")+"  half the boon, doubled if you also burn its incense",()=>{if(lightCandle(p.n))occClose()},"alt"))});
   if(!any)m.appendChild(el("p","You have no incense or candles. The Herbalist sells candles and resins.","sub"));return}
  if(tab==="circle"){circlePanel(b,list);return}
  if(tab==="mirror"){mirrorPanel(b,list);return}
  if(tab==="notes"){
   WOODS.forEach(w=>b.appendChild(el("p",w.n+" · "+w.pl+" · "+(w.bm[0]==="*"?"near graves and ruins":w.bm.join(", "))+". "+w.how,"sub")));
   RESINS.forEach(r=>b.appendChild(el("p",r.n+" · "+r.pl+" · "+r.bm.join(", ")+". "+BOON[r.pl],"sub")));
   b.appendChild(el("p","Candles: one per planet, in its colour. Half the boon alone; light the candle and burn the same planet's incense together and they stack. Chalk circle: salt and chalk keep wandering monsters out for ten minutes and mend the Mind. Black mirror: gaze to see what hides nearby. It costs Mind, and the glass sometimes lies.","sub"));return}}
 CR.panel=panel;
 function mkBtn(){const e=document.createElement("button");e.id="craftbtn";e.type="button";e.textContent="⚗ Craft (Y)";e.style.cssText="position:fixed;right:10px;top:186px;z-index:9;padding:6px 10px;border:1px solid #6a4a9a;border-radius:6px;background:rgba(14,8,26,.78);color:#e6d8ff;font:13px Cinzel,Georgia,serif;cursor:pointer;display:none";e.onclick=()=>{if(occOpen)occClose();else panel("home")};document.body.appendChild(e);return e}
 let bt=null;
 addEventListener("keydown",e=>{if(!hero||!CR.on||e.repeat||e.ctrlKey||e.altKey||/TEXTAREA|INPUT|SELECT/.test((e.target&&e.target.tagName)||""))return;if(e.key==="y"||e.key==="Y"){if(occOpen)return;panel("home")}});
 CR.setOn=v=>{CR.on=v?1:0;LSs("on",CR.on?"1":"0");if(!CR.on)clearAll()};
 /* ---------- the tick ---------- */
 let acc=0,syncT=0;const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero||typeof glReady==="undefined"||!glReady||typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.1);
   const s0=st();if(!hero._crW){hero._crW=1;regWands();if(s0.act&&s0.act.left>0)CR.act=s0.act;if(s0.cand&&s0.cand.left>0)CR.cand=s0.cand}
   if(!bt)bt=mkBtn();bt.style.display=(CR.on&&outdoors()&&!occOpen)?"block":"none";
   if(CR.act)applyTick(dt,CR.act,"act");if(CR.cand)applyTick(dt,CR.cand,"cand");
   try{SAN.rate=((CR.act&&CR.act.pl==="Saturn")||(CR.cand&&CR.cand.pl==="Saturn"))?.5:1}catch(e){}
   if(CR.act||CR.cand){const p=pill();p.style.display="block";p.textContent=(CR.act?"☁ Incense of "+CR.act.pl+" · "+Math.max(0,Math.ceil(CR.act.left))+"s":"")+(CR.act&&CR.cand?"   ":"")+(CR.cand?"🕯 Candle of "+CR.cand.pl+" · "+Math.max(0,Math.ceil(CR.cand.left))+"s":"")}else if(hudEl)hudEl.style.display="none";
   smokeTick(dt);flameTick(dt);circleTick(dt);
   if(!CR.on||!outdoors()||boat()){if(Object.keys(live).length)clearAll();return}
   acc+=dt;syncT-=dt;if(syncT<=0){syncT=1.2;sync()}
   for(const k in live){const o=live[k];o.g.userData.sp.material.opacity=.2+.12*Math.sin(acc*1.6+o.s.ph)}
  }catch(e){CR.log=String(e&&e.stack||e).slice(0,300)}};
})();

window.SEAL_IMG={"base": "data:image/png;base64,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", "Mars": "data:image/png;base64,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", "Moon": "data:image/png;base64,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", "Sun": "data:image/png;base64,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", "Jupiter": "data:image/png;base64,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", "Saturn": "data:image/png;base64,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", "Venus": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAF+CAYAAAC8mJeOAAAF7UlEQVR42u3cyYodVQCA4T+DQ2KIMTFxQFEEx4WgKOjOhejGpQ/gRhDciRtfwHdQfAJxIQgqiLgQUYMbcUCcUGPmqFE0UTO0iz4hTXvbTCadSr4PLk1ON/TlVP6qU3Wra8Xc3FzANK00BSBgQMCAgEHAgIABAQMCBgEDAgYEDAIGBAwIGBAwCBgQMCBgQMAgYEDAgIBBwICAAQEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgYEDAIGBAwICAQcCAgAEBAwIGAQMCBgQMCBgEDAgYEDAIGBAwIGBAwCBgQMCAgAEBg4ABAQMCBgEDAgYEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgIABAYOAAQEDAgYBAwIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQGDgAEBAwIGBAwCBgQMCBgEDAgYEDAgYBAwIGBAwICAQcCAgAEBg4ABAQMCBgQMAgYEDAgYBAwIGBAwIGAQMCBgQMCAgEHAgIABAYOAAQEDAgYEDAIGBAwIGBAwCJipu6P6ZdHrI9MyDatNwUVvVbVh0dhh0+IIzDQcMAUCZrr+mDF2yLQImOnabwoEDAgYEDCnYp8pEDDTddQUCBgQMGfZlTPGfjYtAmYarp4xtt60CJhpuHPG2BrTImCm4bEZY7eblmlYMTc3ZxYuXo9Wr8/YkR+t7q4+M0UCvtitqjY2/5dfV1crxvje6q/q1+rIudzm1W3VE9Uz1aVL/Nwn1ePVlzahgC82G6q3q+urLSc4VTnS/FXfvdWe5u9D3t/sPyi4olq7aGzvCd7LVQt2Huurm5p95XmWw9Wb1VvV+9Wn1UGbV8AX/Lx2Yd4Mcaj6tvqu2lntrrZXO8bYD9Xv42fXVtdUN1Q3VpvHSmRjtWl8f+HV7oNjR7ZjHPU/HS93hQl4Wfw+jpicmX0j7P0Lxv5u/skhO0fw26sfq23V9wt2IgLmtO0ey+cz2QEsdRS/ovpznEPvrHaN5feBjt+EsXF83TyW9FvGkfBMdyoHqp9GRC06gh4LZ8s4fbh8Geb9aPV19Vr1fBf4TSkCPns+b/ZnrIt9X71cvTeWjvuq30YgS22cS8a586ku01eOiB+unq7uOckd0avVG9XW8e+T+b2rq7uq+6oHx9c7q8vO4TZ4q3pEwJyOrdX9//H936rnqhdbnmdQXTqOUkv9B99VPTt2Lv/XEzpWV7dUt45z4+uav2nk2Lnwmmpdx6/cr2r+4tu1nfyFt4VeqJ4SMKfjneqhJZZ4r4w4ti3ze7y7+niJ5fu91Vfn0Xyuq24e4W/q+IP4NowVyeL3/17zV86dA3NaHmj+89aFH/vsqT4cF13OF7/273ufX6qetAnPfx4re/Z8MF7nu29mnAt7LvREuBea3TPGdpoWATMNs2L1WFkBMxE7TIGAubCW0EdMyzS4iMUX1buLxn4wLdPgYySwhAYEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgIABAYOAAQEDAgYEDAIGBAwIGAQMCBgQMCBgEDAgYEDAgIBBwICAAQGDgAEBAwIGBAwCBgQMCBgEDAgYEDAgYBAwIGBAwICAQcCAgAEBg4ABAQMCBgQMAgYEDAgYEDAIGBAwIGAQMCBgQMCAgEHAgIABAQMCBgEDAgYEDAIGBAwIGBAwCBgQMCBgEDAgYEDAgIBBwICAAQEDAgYBAwIGBAwCBgQMCBgQMAgYEDAgYEDAIGBAwICAQcCAgAEBAwIGAQMCBgQMCBgEDAgYEDAIGBAwIGBAwCBgQMCAgEHAgIABAQMCBgEDAgYEDAgYBAwIGBAwCBgQMCBgQMAgYEDAgIABAYOAAQEDAgYBAwIGBAwIGAQMCBgQMAjYFICAAQEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgYEDAIGBAwICAAQGDgAEBAwIGAQMCBgQMCBgEDAgYEDAgYBAwIGBAwCBgQMCAgAEBg4ABAQMCBgEDAgYEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgIABAYOAAQEDAgYEDAIGBAwIGAQMTMc/0gKzewoh+tMAAAAASUVORK5CYII=", "Mercury": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAF+CAYAAAC8mJeOAAAEtklEQVR42u3dO4sVdwCH4XezKipI8AMI6exFi5DCxs4iYGmjvZ1VEGwsvBRphXwBQbCwsNBUEbw1YiEiChFF8C6uQSUx6ljsFhYiikedwecpVxiG35935+xYnLlhGAKm6QcTgIABAQMCBgEDAgYEDAgYBAwIGBAwCBgQMCBgQMAgYEDAgIABAYOAAQEDAgYBAwIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQGDgAEBAwIGAQNTtcwEo7Cp+vUzr/Gq+rM6Xw0m/T7MDYOzHoET1dYZXetWdWzpmueql+YVMF/wDKpD1a5q9Yyv/Wwp4r+qs9XF6rnJBczsrav2V9v7cu8m/q+uV1erm9WD6nG1sPRv77pZXXYsAubTbK7+qNZ/4/sYqpNLv1TOOBYB8/FWV4erHSO5n7PVvhZfkjEi/htpnF5UO6s9I7mfX6pT1aVqWzXviDyB+TgHqt9Gdk/XqoPVkbzlFjAftKq6Uq0Y4b3dqn6vjldvHJWAAX8Dg4ABAQMCBgQMAgYEDAgYBAwIGBAwIGAQMCBgQMCAgEHAgIABAYOAAQEDAgYE/BWtNAECnqY1LX7tCAh4gna3+F2/IOAJ2lDdMwMCnqan1X0zIOBp+q+6awYEPE0PqwUzIOBpul29NgMCnqa/TYCAp+uGCfjafMH37Mz7CI0n8HSJFwEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgYEDAIGBAwICAAQGDgAEBAwIGAQMCBgQMCBgEDAgYEDAgYBAwIGBAwCBgQMCAgAEBg4ABAQMCBgEDAgYEDAgYBAwIGBAwIGAQMCBgvv35r61WmGKa5oZhsML37XT1c/WielI9qhaqC9Ve83gCM25Hq+XVj9VP1cZqS3XHNAJm/K5/4MmMgBm5u+/52ZvqhmkEzDQ9q/41g4CZpkcmmAZvoZmv1rznI/Q/phEw4CM0IGAQMCBgQMAgYEDAgIABAYOAAQEDAgYEDAIGBAwIGAQMCBgQMCBgEDAgYEDAgIBBwICAAQGDgAEBAwIGBAwCBgQMCBgEbAIQMCBgQMAgYEDAgIABAYOAAQEDAgYBAwIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQGDgAEBAwIGBAwCBgQMCBgEDAgYEDAgYBAwIGBAwCBgQMCAgAEBg4ABAQMCBgQMAgYEDAgYBAwIGBAwIGAQMCBgQMCAgEHAgIABAYOAAQEDAgYEDAIGBAwIGBAwCBgQMCBgEDAgYEDAgIBBwICAAQGDgAEBAwIGBAwCBgQMCBgQMAgYEDAgYBAwIGBAwICAQcCAgAEBAwIGAQMCBgQMAgYEDAgYEDAIGBAwIGBAwCBgQMCAgEHAgIABAQMCBgEDAgYEDAIGBAwIGBAwCBgQMCBgQMAgYEDAgIBBwICAAQEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgYEDAIGBAwICAQcCAgAEBAwIGAQMCBgQMCBgEDAgYEDAIGBAwIGBAwCBgQMCAgAEBg4ABAQMCBgEDAgYEDAgYBAwIGBAwIGAQMCBgQMAgYEDAgIABAYOAAQEDAgYBAwIGBAwIGAQMCBgQMCBgEDAgYEDAIGBAwICAAQGDgAEBAzP2FhWSdF7KKlE6AAAAAElFTkSuQmCC", "gold": "data:image/png;base64,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", "ar": 1.592503438789546};

/* ===== The Seal of the Seven Planets: the game's emblem. Pieces light as shards are won; whole at the Great Work. ===== */
(function(){
 const IM=window.SEAL_IMG||{};if(!IM.base)return;
 const COL={Saturn:"#a9a9c8",Jupiter:"#5a90e0",Mars:"#e0483c",Sun:"#f6cd50",Venus:"#5abe78",Mercury:"#ee9646",Moon:"#bed8f0"};
 const ORDER=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];
 const img={},tinted={};
 function tint(k,col){const i=img[k];if(!i||!i.width)return null;const key=k+col;if(tinted[key])return tinted[key];const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const x=c.getContext("2d");x.drawImage(i,0,0);x.globalCompositeOperation="source-in";x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return tinted[key]=c}
 Object.keys(IM).forEach(k=>{if(k==="ar")return;const i=new Image();i.onload=()=>{try{SEAL.refresh()}catch(e){}};i.src=IM[k];img[k]=i});
 const meters=[];
 function shards(o){if(o&&o.all){const s={};ORDER.forEach(n=>s[n]=1);return s}try{const q=(typeof hero!=="undefined"&&hero&&hero.q)||null;return(q&&q.shards)||{}}catch(e){return{}}}
 function paint(cv,o){const x=cv.getContext("2d"),W=cv.width,H=cv.height;x.clearRect(0,0,W,H);const s=shards(o);let n=0;
  const b=tint("base","#5b4a30");if(b){x.globalAlpha=.55;x.drawImage(b,0,0,W,H);x.globalAlpha=1}
  ORDER.forEach(k=>{if(!s[k])return;n++;const t=tint(k,COL[k]);if(!t)return;x.save();x.shadowColor=COL[k];x.shadowBlur=Math.round(W/12);x.drawImage(t,0,0,W,H);x.restore();x.drawImage(t,0,0,W,H)});
  if(n>=7){const g=tint("base","#ffe6a0");if(g){x.globalAlpha=.35;x.drawImage(g,0,0,W,H);x.globalAlpha=1}}
  return n}
 const SEAL={ORDER,COL,refresh(){meters.forEach(m=>paint(m.cv,m.o))},
  tint:(col)=>tint("base",col),
  gold(w){const i=new Image();i.src=IM.gold||IM.base;i.alt="The Seal of the Seven Planets";i.style.cssText="width:"+(w||120)+"px;height:auto;display:block;filter:drop-shadow(0 0 10px rgba(240,200,110,.5))";return i},
  meter(w,o){o=o||{};w=w||140;const d=document.createElement("div");d.style.cssText="display:flex;flex-direction:column;align-items:center;gap:4px;margin:8px auto";
   const cv=document.createElement("canvas");cv.width=Math.round(w*1.5);cv.height=Math.round(w*1.5*(IM.ar||1.59));cv.style.cssText="width:"+w+"px;height:"+Math.round(w*(IM.ar||1.59))+"px";
   const n=paint(cv,o);meters.push({cv,o});if(meters.length>12)meters.shift();
   if(n>=7)cv.style.animation="sealpulse 3.2s ease-in-out infinite";
   const cap=document.createElement("small");cap.style.cssText="opacity:.75;letter-spacing:.08em";cap.textContent=n>=7?"The Seal is whole":"The Seal of the Seven Planets: "+n+" of 7 lit";
   d.appendChild(cv);d.appendChild(cap);return d},
  count(){const s=shards();return ORDER.filter(k=>s[k]).length}};
 window.SEAL=SEAL;
 const st=document.createElement("style");st.textContent="@keyframes sealpulse{0%,100%{opacity:.82}50%{opacity:1}}";document.head.appendChild(st);
})();

/* ===== Loading screens: one while the file opens (shown from plain HTML, so it appears at once), one while the world is built. ===== */
(function(){
 const MSG=["Unsealing the grimoires…","Charting the planetary hours…","Waking the old things beneath the hills…","Lighting the lanterns…","Counting the stars…","Binding the shards of sound…"];
 let bi=0,bt=null;
 function cycle(el){if(!el)return;bt=setInterval(()=>{bi=(bi+1)%MSG.length;el.textContent=MSG[bi]},1800)}
 function hide(el,ms){if(!el)return;el.style.opacity="0";setTimeout(()=>{try{el.remove()}catch(e){}},ms||700)}
 /* 1. opening screen (the markup is in the HTML head) */
 const boot=document.getElementById("bootscr");
 if(boot){const t=document.getElementById("bootmsg");cycle(t);
  const done=()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{clearInterval(bt);hide(boot,800)},350)))};
  if(document.readyState==="complete")done();else addEventListener("load",done,{once:true});
  setTimeout(()=>{clearInterval(bt);hide(boot,800)},30000)}
 /* 2. entering the world */
 let ov=null,wt=null,frames=0,t0=0,busy=false,dis=[];
 {const st=document.createElement("style");st.textContent="@keyframes lbar2{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}";document.head.appendChild(st)}
 function show(txt){
  if(ov)return;ov=document.createElement("div");ov.id="worldscr";
  ov.style.cssText="position:fixed;inset:0;z-index:99998;background:radial-gradient(ellipse at center,#1a1410 0%,#0a0806 75%);color:#e9ddbf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:'Cinzel','IM Fell English',Georgia,serif;opacity:1;transition:opacity .7s";
  ov.innerHTML='<div class="lsig" style="animation:lpulse 2.2s ease-in-out infinite;height:120px;display:flex;align-items:center;justify-content:center">'+(window.SEAL_IMG&&SEAL_IMG.gold?'<img alt="" style="height:120px;width:auto" src="'+SEAL_IMG.gold+'">':'☉ ☽ ☿ ♀ ♂ ♃ ♄')+'</div><div style="font-size:22px;letter-spacing:.12em">'+(txt||"Entering the world")+'</div><div id="wmsg" style="opacity:.7;font-style:italic;font-size:15px">'+MSG[0]+'</div><div style="opacity:.5;font-size:13px;max-width:80vw;text-align:center">Building the world — this can take 10–20 seconds the first time. Please don\'t click again.</div><div style="width:min(260px,60vw);height:3px;background:#2a2118;border-radius:2px;overflow:hidden"><div style="width:35%;height:100%;background:#c9a24c;animation:lbar2 1.6s linear infinite"></div></div>';
  document.body.appendChild(ov);bi=0;cycle(ov.querySelector("#wmsg"));frames=0;t0=performance.now();
  clearTimeout(wt);wt=setTimeout(close,25000)}
 function close(){if(!ov)return;clearInterval(bt);clearTimeout(wt);const o=ov;ov=null;busy=false;dis.forEach(b=>{try{b.disabled=false}catch(e){}});dis=[];hide(o,800)}
 if(typeof loadHero==="function"){const _lh=loadHero;loadHero=function(){if(busy)return;busy=true;show("Entering the world");const self=this,args=arguments;dis=[];try{document.querySelectorAll("button").forEach(b=>{if(!b.disabled&&!b.closest("#worldscr")){b.disabled=true;dis.push(b)}})}catch(e){}
   /* let the loading screen paint before the heavy work freezes the page */
   requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{try{_lh.apply(self,args)}catch(e){close();busy=false;console.error(e)}},80)))}}
 if(typeof vmUpdate==="function"){const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);if(ov){try{if(typeof world!=="undefined"&&world&&world.visible&&typeof renderer!=="undefined"&&renderer)frames++;if(frames>=4&&performance.now()-t0>900)close()}catch(e){close()}}}}
})();

/* ===== perf: graphics profile (auto-detected), per-effect options, draw-call merging and distance culling ===== */
(function(){
 if(typeof THREE==="undefined"||typeof setQuality==="undefined")return;
 const T=THREE;
 const LSg=k=>{try{return localStorage.getItem(k)}catch(e){return null}},LSs=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
 /* ---------------- profiles ---------------- */
 const PROF=[
  {shadows:0,veg:1,vr:26,treeSh:0,shafts:0,ao:0,res:.85,post:0,blights:0},
  {shadows:0,veg:1,vr:40,treeSh:0,shafts:0,ao:0,res:1,post:1,blights:1},
  {shadows:1,veg:1,vr:56,treeSh:0,shafts:0,ao:0,res:1,post:1,blights:1},
  {shadows:1,veg:1,vr:85,treeSh:1,shafts:1,ao:1,res:1,post:1,blights:1}];
 const NAMES=["Low","Medium","High","Ultra"];
 const G=window.GFX={q:2,auto:true,ovr:{},gpu:"",detected:2,fps:false};
 try{const s=JSON.parse(LSg("occultica.gfx")||"null");if(s){G.auto=s.auto!==false;G.ovr=s.ovr||{};if(!G.auto&&typeof s.q==="number")G.q=s.q}}catch(e){}
 const save=()=>LSs("occultica.gfx",JSON.stringify({auto:G.auto,q:G.q,ovr:G.ovr}));
 /* ---------------- detect the graphics card ---------------- */
 function gpuName(){try{const gl=renderer.getContext(),ex=gl.getExtension("WEBGL_debug_renderer_info");return ex?String(gl.getParameter(ex.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER))}catch(e){return""}}
 function classify(n){const s=n.toLowerCase();
  if(!s||/swiftshader|llvmpipe|software|basic render|microsoft/.test(s))return 0;
  let m;
  if((m=s.match(/rtx\s*(\d{2})(\d{2})/))){const g=+m[1];return g>=30?3:2}                     /* RTX 20xx -> High, 30/40/50 -> Ultra */
  if(/rtx\s*(a|titan)|titan|quadro rtx/.test(s))return 3;
  if((m=s.match(/gtx\s*(\d{3,4})/))){const n2=+m[1];return n2>=1660||n2>=1070&&n2<2000?2:1}   /* 1070+ and 16xx -> High, others Medium */
  if(/geforce\s*(mx|gt\s)/.test(s))return 0;
  if((m=s.match(/rx\s*(\d{3,4})/))){const n2=+m[1];return n2>=6600?3:n2>=5500?2:1}
  if(/radeon\s*(pro\s*)?(vii|vega\s*(56|64)|r9)/.test(s))return 2;
  if(/radeon\(tm\)\s*graphics|radeon graphics|vega\s*\d\b|radeon\s*(r[2-7]|hd)/.test(s))return 0;  /* integrated AMD */
  if(/arc\s*a[5-9]\d\d|arc\s*b/.test(s))return 3;
  if(/iris\s*xe|iris\(r\)\s*xe|iris plus/.test(s))return 1;
  if(/intel/.test(s))return 0;                                                                   /* UHD / HD */
  if(/apple\s*m\d/.test(s))return /pro|max|ultra/.test(s)?3:2;
  if(/nvidia|geforce/.test(s))return 1;
  return 1}
 /* ---------------- applying the settings ---------------- */
 const val=k=>(k in G.ovr)?G.ovr[k]:PROF[G.q][k];
 let appliedShadows=null,appliedPost=null;
 function apply(){try{
  const sv=val("shadows");
  if(typeof sunL!=="undefined"&&sunL){sunL.castShadow=!!sv;renderer.shadowMap.enabled=!!sv;if(appliedShadows!==!!sv){appliedShadows=!!sv;try{world.traverse(o=>{if(o.material)o.material.needsUpdate=true})}catch(e){}}}
  if(window.GVEG){GVEG.on=!!val("veg");GVEG.r3=val("vr");GVEG.shadows=!!(val("treeSh")&&sv);GVEG.dirty=true}
  if(window.POST2){POST2.shafts=val("shafts")?1:0;POST2.ao=val("ao")?1:0}
  if(window.CFX)CFX.off=!val("blights");
  if(typeof setPost==="function"&&typeof POST!=="undefined"&&POST.ok){const po=!!val("post");if(appliedPost!==po){appliedPost=po;setPost(po)}}
  /* render scale on top of the level's own pixel ratio */
  const q=G.q,base=Math.min(devicePixelRatio||1,q>=3?2.5:q===2?2:q===1?1.25:1),pr=Math.max(.5,base*val("res"));
  if(Math.abs(renderer.getPixelRatio()-pr)>.01){renderer.setPixelRatio(pr);try{resize()}catch(e){}}
  const b=document.getElementById("gfx");if(b)b.textContent="Graphics: "+NAMES[G.q]+(G.auto?" (auto)":"");
  save()}catch(e){console.warn("gfx",e)}}
 /* every quality change (our own, the old button, or the automatic frame-rate guard) lands here */
 const _sq=setQuality;
 setQuality=function(q){_sq.apply(this,arguments);G.q=Math.max(0,Math.min(3,q|0));apply()};
 G.setLevel=function(q){if(q==="auto"){G.auto=true;G.ovr={};setQuality(G.detected)}else{G.auto=false;G.ovr={};setQuality(q)}refreshUI()};
 G.set=function(k,v){G.ovr[k]=v;apply();refreshUI()};
 /* first frame with a hero: pick the profile */
 let started=false;
 function boot(){if(started||typeof hero==="undefined"||!hero||typeof renderer==="undefined"||!renderer||!glReady)return;started=true;
  G.gpu=gpuName();G.detected=classify(G.gpu);
  const saved=LSg("occultica.gfx");
  if(!saved||G.auto){G.auto=true;const first=!saved;setQuality(G.detected);if(first)try{toast("Graphics set to "+NAMES[G.detected]+" for "+(G.gpu.replace(/ANGLE \(|\)|Direct3D.*$/g,"").slice(0,48)||"your computer")+". Change it under Graphics options.")}catch(e){}}
  else setQuality(G.q)}
 /* ---------------- options screen ---------------- */
 const css=document.createElement("style");css.textContent="#gfxp .row2{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:5px 0}#gfxp .row2 span{opacity:.9}#gfxp .gpu{opacity:.65;font-size:.85em;margin:8px 0}";document.head.appendChild(css);
 const ov=document.createElement("div");ov.className="ov";ov.id="gfxp";ov.hidden=true;ov.innerHTML='<div class="box" id="gfxbox"></div>';
 (document.getElementById("game")||document.body).appendChild(ov);
 const VR=[[26,"Near"],[40,"Medium"],[56,"Far"],[85,"Very far"],[120,"Maximum"]],RES=[[.6,"60%"],[.75,"75%"],[.9,"90%"],[1,"100%"],[1.25,"125%"]];
 const onoff=v=>v?"On":"Off";
 function row(box,label,txt,fn){const r=document.createElement("div");r.className="row2";const s=document.createElement("span");s.textContent=label;const b=document.createElement("button");b.className="alt";b.type="button";b.textContent=txt;b.onclick=fn;r.appendChild(s);r.appendChild(b);box.appendChild(r)}
 function nextIn(arr,v){let i=arr.findIndex(a=>Math.abs(a[0]-v)<.001);if(i<0)i=0;return arr[(i+1)%arr.length][0]}
 function labIn(arr,v){const a=arr.find(a=>Math.abs(a[0]-v)<.001);return a?a[1]:String(v)}
 function refreshUI(){const box=document.getElementById("gfxbox");if(!box||ov.hidden)return;box.innerHTML="";
  const h=document.createElement("h2");h.textContent="Graphics options";box.appendChild(h);
  const gp=document.createElement("div");gp.className="gpu";gp.textContent="Detected: "+(G.gpu||"unknown")+"  (suggested level: "+NAMES[G.detected]+")";box.appendChild(gp);
  row(box,"Graphics level",(G.auto?"Auto: ":"")+NAMES[G.q],()=>{const order=["auto",0,1,2,3];const cur=G.auto?"auto":G.q;G.setLevel(order[(order.indexOf(cur)+1)%5])});
  if(window.MOOD)row(box,"Look",MOOD.isOn()?"Dark occult":"Original bright",()=>{MOOD.set(!MOOD.isOn());refreshUI()});
  if(window.WX)row(box,"Weather",WX.on?"On":"Off",()=>{WX.setOn(!WX.on);refreshUI()});
  if(window.PROPS)row(box,"Occult props",PROPS.on?"On":"Off",()=>{PROPS.setOn(!PROPS.on);refreshUI()});
  if(window.GORE)row(box,"Blood and debris",GORE.on?"On":"Off",()=>{GORE.setOn(!GORE.on);refreshUI()});
  if(window.HW)row(box,"Living hours",HW.on?"On":"Off",()=>{HW.setOn(!HW.on);refreshUI()});
  if(window.MESH)row(box,"Creature detail",MESH.on?"On (new monsters)":"Off",()=>{MESH.setOn(!MESH.on);refreshUI()});
  if(window.GRADE)row(box,"Look: region colour, edge focus, sun and rainbows",GRADE.on?"On":"Off",()=>{GRADE.on=GRADE.on?0:1;try{POST.mComp.uniforms.dofk.value=0;GRADE.on||POST.mComp.uniforms.gtint.value.set(1,1,1)}catch(e){}refreshUI()});
  if(window.GRADE)row(box,"Photo mode (F9)","Press",()=>{GRADE.setPhoto(true)});
  if(window.GCOV)row(box,"Grass, flowers and pebbles",GCOV.on?"On":"Off",()=>{GCOV.on=GCOV.on?0:1;try{GCOV.rebuild()}catch(e){}refreshUI()});
  if(window.MONX)row(box,"Monster veins, wounds, death effects",MONX.on?"On":"Off",()=>{MONX.on=MONX.on?0:1;refreshUI()});
  if(window.AUDIO2)row(box,"Creature sounds and heartbeat",AUDIO2.on?"On":"Off",()=>{AUDIO2.on=AUDIO2.on?0:1;refreshUI()});
  if(window.LIFE)row(box,"Fireflies and pollen",LIFE.on?"On":"Off",()=>{LIFE.on=LIFE.on?0:1;try{if(!LIFE.on)scene.traverse(o=>{if(o.isPoints&&o.userData.ys)o.visible=false})}catch(e){}refreshUI()});
  if(window.OMN){row(box,"Omens in the dark (watching eyes, effigies)",OMN.on?"On":"Off",()=>{OMN.setOn(!OMN.on);refreshUI()})}
  if(window.CRAFT){row(box,"The Craft (wild wood, wands, incense)",CRAFT.on?"On":"Off",()=>{CRAFT.setOn(!CRAFT.on);refreshUI()})}
  if(window.LSN){row(box,"Temple lessons (spoken, first visit)",LSN.on?"On":"Off",()=>{LSN.setOn(!LSN.on);refreshUI()})}
  if(window.STK){row(box,"The Stalker (night pursuer, level 6+)",STK.on?"On":"Off",()=>{STK.setOn(!STK.on);refreshUI()})}
  if(window.CIN){row(box,"Cinematic scenes",CIN.enabled?"On":"Off",()=>{CIN.setOn(!CIN.enabled);refreshUI()});row(box,"Preview: the ending cinematic","Play",()=>{try{document.getElementById("gfxp").hidden=true}catch(e){}CIN.play("ending",null,{force:true})})}
  if(window.FAM){row(box,"Familiars",FAM.on?"On":"Off",()=>{FAM.setOn(!FAM.on);refreshUI()})}
 if(window.MV){row(box,"Monster voices",MV.on?"On":"Off",()=>{MV.setOn(!MV.on);refreshUI()});row(box,"Spoken monster lines",MV.lines?"On":"Off",()=>{MV.setLines(!MV.lines);refreshUI()})}
  if(window.INN){row(box,"Inner thoughts (spoken, rare)",INN.on?"On":"Off",()=>{INN.setOn(!INN.on);refreshUI()});row(box,"Inner voice",INN.voice==="m"?"Male":INN.voice==="f"?"Female":"Text only",()=>{INN.cycle();refreshUI()})}
  if(window.WSKY)row(box,"Wrong sky (second sun, red moon, bells)",WSKY.on?"On":"Off",()=>{WSKY.setOn(!WSKY.on);refreshUI()});
  if(window.SAN)row(box,"Sanity (visions, warping, whispers)",SAN.on?"On":"Off",()=>{SAN.setOn(!SAN.on);refreshUI()});
  if(window.SCARE)row(box,"Dread (looming, mist, dusk)",SCARE.on?"On":"Off",()=>{SCARE.setOn(!SCARE.on);refreshUI()});
  row(box,"Resolution",labIn(RES,val("res")),()=>G.set("res",nextIn(RES,val("res"))));
  row(box,"3D trees, rocks and grass",onoff(val("veg")),()=>G.set("veg",val("veg")?0:1));
  row(box,"How far 3D trees show",labIn(VR,val("vr")),()=>G.set("vr",nextIn(VR,val("vr"))));
  row(box,"Shadows",onoff(val("shadows")),()=>G.set("shadows",val("shadows")?0:1));
  row(box,"Tree and rock shadows",onoff(val("treeSh")),()=>G.set("treeSh",val("treeSh")?0:1));
  row(box,"Sun shafts",onoff(val("shafts")),()=>G.set("shafts",val("shafts")?0:1));
  row(box,"Dungeon corner shading",onoff(val("ao")),()=>G.set("ao",val("ao")?0:1));
  row(box,"Glow and color effects",onoff(val("post")),()=>G.set("post",val("post")?0:1));
  row(box,"Battle lights",onoff(val("blights")),()=>G.set("blights",val("blights")?0:1));
  row(box,"Show frame rate (F3)",onoff(!!(window.CFX&&CFX.pfOn)),()=>{try{CFX.togglePerf();refreshUI()}catch(e){}});
  const r=document.createElement("div");r.className="row";r.style.marginTop="12px";
  const a=document.createElement("button");a.className="alt";a.type="button";a.textContent="Reset to automatic";a.onclick=()=>G.setLevel("auto");
  const c=document.createElement("button");c.className="go";c.type="button";c.textContent="Close";c.onclick=()=>{ov.hidden=true};
  r.appendChild(a);r.appendChild(c);box.appendChild(r)}
 G.open=()=>{ov.hidden=false;refreshUI()};
 const gb=document.getElementById("gfx");
 if(gb&&gb.parentNode){const ob=document.createElement("button");ob.className="alt";ob.type="button";ob.id="gfxopt";ob.textContent="Graphics options";ob.onclick=G.open;gb.parentNode.insertBefore(ob,gb.nextSibling)}
 addEventListener("keydown",e=>{if(e.code==="F2"){e.preventDefault();ov.hidden?G.open():(ov.hidden=true)}});
 /* ---------------- draw-call savers ---------------- */
 const PF=window.PERF={merged:new WeakSet(),cull:[],hid:[],lastN:-1,t:0,calls:0};
 function hasUD(o){for(const k in o.userData)return true;return false}
 const _m=new T.Matrix4(),_inv=new T.Matrix4(),_nm=new T.Matrix3(),_v=new T.Vector3();
 const _bm=new Map();
 function bakeMat(m){/* colour-only materials share one vertex-coloured material */
  if(!(m.isMeshLambertMaterial||m.isMeshStandardMaterial||m.isMeshPhongMaterial)||m.map||m.transparent||m.vertexColors||m.onBeforeCompile!==T.Material.prototype.onBeforeCompile||m.alphaTest||m.normalMap||m.bumpMap||m.envMap||m.side!==T.FrontSide)return null;
  const k=m.type+"|"+(m.roughness||0).toFixed(2)+"|"+(m.metalness||0).toFixed(2)+"|"+m.fog+"|"+(m.flatShading?1:0)+"|"+(m.emissive?m.emissive.getHex():0)+"|"+(m.emissiveIntensity||0);
  let b=_bm.get(k);if(!b){const c=m.clone();c.color.setRGB(1,1,1);c.vertexColors=true;b=c;_bm.set(k,b)}return b}
 function mergeGroup(g){
  const prot=new Set();for(const k in g.userData){const v=g.userData[k];if(v&&typeof v==="object"){prot.add(v);if(v.isObject3D)v.traverse(o=>prot.add(o))}}
  g.updateMatrixWorld(true);_inv.copy(g.matrixWorld).invert();
  const buckets=new Map();
  (function walk(n){for(const c of n.children){if(!c.visible||prot.has(c))continue;
    if(c.isMesh&&!c.isInstancedMesh&&!c.isSkinnedMesh){
     const m=c.material,ge=c.geometry;
     if(!Array.isArray(m)&&ge&&ge.attributes.position&&!hasUD(c)&&!c.morphTargetInfluences&&c.onBeforeRender===T.Object3D.prototype.onBeforeRender){
      const bk=bakeMat(m),mm=bk||m;
      const key=mm.uuid+"|"+(c.castShadow?1:0)+(c.receiveShadow?1:0)+"|"+c.renderOrder+"|"+(ge.attributes.normal?"n":"")+(ge.attributes.uv?"u":"")+(bk?"B":ge.attributes.color?"c":"");
      let b=buckets.get(key);if(!b){b={m:mm,bake:!!bk,list:[],cs:c.castShadow,rs:c.receiveShadow,ro:c.renderOrder};buckets.set(key,b)}b.list.push(c);
      continue}
     }
    if(c.isMesh||c.isLight||c.isSprite||c.isPoints||c.isLine)continue;
    if(c.children.length&&!hasUD(c))walk(c)}})(g);
  let made=0;
  buckets.forEach(b=>{if(b.list.length<2)return;
   const pos=[],nor=[],uv=[],col=[];let hasN=!!b.list[0].geometry.attributes.normal,hasU=!!b.list[0].geometry.attributes.uv,hasC=b.bake||!!b.list[0].geometry.attributes.color;
   for(const c of b.list){c.updateMatrixWorld(true);_m.multiplyMatrices(_inv,c.matrixWorld);_nm.getNormalMatrix(_m);
    let ge=c.geometry;if(ge.index)ge=ge.toNonIndexed();const p=ge.attributes.position,n=ge.attributes.normal,u=ge.attributes.uv,k=ge.attributes.color;
    for(let i=0;i<p.count;i++){_v.fromBufferAttribute(p,i).applyMatrix4(_m);pos.push(_v.x,_v.y,_v.z);
     if(hasN){_v.fromBufferAttribute(n,i).applyMatrix3(_nm).normalize();nor.push(_v.x,_v.y,_v.z)}
     if(hasU)uv.push(u.getX(i),u.getY(i));if(hasC){if(b.bake){const q=c.material.color;col.push(q.r,q.g,q.b)}else col.push(k.getX(i),k.getY(i),k.getZ(i))}}}
   const mg=new T.BufferGeometry();mg.setAttribute("position",new T.Float32BufferAttribute(pos,3));if(hasN)mg.setAttribute("normal",new T.Float32BufferAttribute(nor,3));if(hasU)mg.setAttribute("uv",new T.Float32BufferAttribute(uv,2));if(hasC)mg.setAttribute("color",new T.Float32BufferAttribute(col,3));
   mg.computeBoundingSphere();const mesh=new T.Mesh(mg,b.m);mesh.castShadow=b.cs;mesh.receiveShadow=b.rs;mesh.renderOrder=b.ro;g.add(mesh);
   for(const c of b.list)if(c.parent)c.parent.remove(c);
   const bs=mg.boundingSphere;_v.copy(bs.center).applyMatrix4(g.matrixWorld);PF.cull.push({m:mesh,x:_v.x,z:_v.z,r:bs.radius*Math.max(g.scale.x,g.scale.y,g.scale.z)+2});made++});
  return made}
PF.mergeGroup=mergeGroup;
 function groupsToMerge(){const out=[];if(window.NOMERGE)return out;const add=o=>{for(const k in o){const g=o[k];if(g&&g.isGroup&&!PF.merged.has(g))out.push(g)}};
  try{add(poiMeshes)}catch(e){}try{add(pickMeshes)}catch(e){}return out}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   boot();if(!started||typeof world==="undefined"||!world.visible||typeof camera==="undefined")return;
   PF.t+=dt;if(PF.t<.3)return;PF.t=0;
   /* one-off: merge the static pieces of villages, shrines and plants into a few meshes each */
   if(world.children.length!==PF.lastN){PF.lastN=world.children.length;let n=0;for(const g of groupsToMerge()){PF.merged.add(g);try{n+=mergeGroup(g)}catch(e){console.warn("merge",e)}}}
   /* distance culling: nothing past the fog is visible anyway */
   const cp=camera.position,far=(typeof worldFog!=="undefined"&&worldFog)?worldFog.far*1.05+4:130;
   for(const e of PF.cull){const dx=e.x-cp.x,dz=e.z-cp.z,v=Math.sqrt(dx*dx+dz*dz)-e.r<far;if(e.m.visible!==v)e.m.visible=v}
   /* NPCs, plants and cut-out sprites: hide the far ones (only ones we hid ourselves are ever shown again) */
   const lists=[];try{lists.push(npcMeshes)}catch(e){}try{lists.push(pickMeshes)}catch(e){}
   for(const L of lists)for(const k in L){const g=L[k];if(!g)continue;const dx=g.position.x-cp.x,dz=g.position.z-cp.z,d=Math.sqrt(dx*dx+dz*dz);
    if(d>far+8){if(g.visible){g.visible=false;g.userData.__ph=1}}else if(g.userData.__ph){g.visible=true;g.userData.__ph=0}}
   for(const c of world.children){if(!c.isSprite)continue;const dx=c.position.x-cp.x,dz=c.position.z-cp.z,d=Math.sqrt(dx*dx+dz*dz);
    if(d>far+8){if(c.visible){c.visible=false;c.userData.__ph=1}}else if(c.userData.__ph){c.visible=true;c.userData.__ph=0}}
  }catch(e){if(!window.__pfe){window.__pfe=1;console.warn("perf",e)}}};
})();

/* ===== gamepad: generic USB/wireless controller support + Easy Assist ===== */
(function(){
 if(typeof navigator==="undefined"||!navigator.getGamepads)return;
 const G=window.PAD={on:false,id:"",std:false,assist:true,menu:false,last:0};
 try{const v=localStorage.getItem("occultica.assist");if(v!==null)G.assist=v==="1"}catch(e){}
 const say_=t=>{try{note(t)}catch(e){try{say(t)}catch(x){}}};
 const DEAD=.18,body=()=>document.body;
 /* synthetic keys so every existing handler (fight, spells, interact, menu) just works */
 const KD={" ":"Space","Shift":"ShiftLeft","Tab":"Tab","Escape":"Escape"};
 function key(k,down){const code=KD[k]||(k.length===1?(/\d/.test(k)?"Digit"+k:"Key"+k.toUpperCase()):k);
  try{body().dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key:k,code,bubbles:true,cancelable:true}))}catch(e){}}
 const tap=k=>{key(k,true);setTimeout(()=>key(k,false),60)};
 /* ---- styles for the menu focus ring ---- */
 const st=document.createElement("style");
 st.textContent=".padf{outline:3px solid #ffd27a !important;outline-offset:2px;box-shadow:0 0 14px #ffb347 !important;position:relative}#padhint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99999;background:rgba(10,8,5,.82);color:#e9ddbf;border:1px solid #6b5636;padding:6px 14px;border-radius:6px;font:13px Georgia,serif;pointer-events:none;opacity:0;transition:opacity .4s}#padhint.on{opacity:1}";
 document.head.appendChild(st);
 const hint=document.createElement("div");hint.id="padhint";document.body.appendChild(hint);let hT=0;
 function showHint(t,ms){hint.textContent=t;hint.classList.add("on");clearTimeout(hT);hT=setTimeout(()=>hint.classList.remove("on"),ms||4200)}
 /* ---- Easy Assist toggle (key K, or the button in the row) ---- */
 function setAssist(v,quiet){G.assist=!!v;try{localStorage.setItem("occultica.assist",G.assist?"1":"0")}catch(e){}
  if(G.btn)G.btn.textContent="Easy Assist: "+(G.assist?"On":"Off");if(!quiet)showHint("Easy Assist "+(G.assist?"on: auto target lock, aim help, a little less damage taken":"off"),3200)}
 const sb=document.getElementById("snd");
 if(sb&&sb.parentNode){const b=document.createElement("button");b.className="alt";b.id="assistb";b.addEventListener("click",()=>setAssist(!G.assist));sb.parentNode.insertBefore(b,sb.nextSibling);G.btn=b;setAssist(G.assist,true)}
 addEventListener("keydown",e=>{if(e.code==="KeyK"&&!e.repeat&&!e.ctrlKey&&!/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||""))setAssist(!G.assist)});
 /* ---- which screen are we on? ---- */
 const vis=el=>{if(!el||el.hidden)return false;const r=el.getClientRects();if(!r.length)return false;const cs=getComputedStyle(el);return cs.display!=="none"&&cs.visibility!=="hidden"&&r[0].width>2&&r[0].height>2};
 function scope(){
  const live_=typeof C!=="undefined"&&C&&C.rt&&!C.over;
  for(const id of ["dlg","occ","pack","dng","cbt"]){if(id==="cbt"&&live_)continue;const el=document.getElementById(id);if(vis(el))return el}
  for(const el of document.querySelectorAll(".ov")){if(el.id==="medfx"||el.id==="cbt"&&live_)continue;if(vis(el)&&el.querySelector("button,[onclick]"))return el}
  const s=document.getElementById("start");if(vis(s)&&!(typeof hero!=="undefined"&&hero&&vis(document.getElementById("game"))))return s;
  return null}
 function cands(sc){
  const out=[],all=sc.querySelectorAll("*");const set=new Set();
  for(const el of all){const t=el.tagName;
   let ok=t==="BUTTON"||t==="SELECT"||t==="A"||t==="SUMMARY"||(t==="INPUT"&&el.type!=="hidden")||t==="TEXTAREA"||el.hasAttribute("onclick")||el.getAttribute("role")==="button";
   if(!ok){try{ok=getComputedStyle(el).cursor==="pointer"}catch(e){}}
   if(ok&&!el.disabled&&vis(el))set.add(el)}
  for(const el of set){let p=el.parentElement,dup=false;while(p&&p!==sc){if(set.has(p)){dup=true;break}p=p.parentElement}if(!dup)out.push(el)}
  return out}
 let foc=null;
 const ctr=el=>{const r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};
 let focKey="";
 function setFoc(el){if(foc&&foc.classList)foc.classList.remove("padf");foc=el;focKey=el?el.tagName+"|"+(el.id||"")+"|"+(el.textContent||"").trim().slice(0,40):"";if(el){el.classList.add("padf");try{el.scrollIntoView({block:"nearest",inline:"nearest"})}catch(e){}}}
 function nav(dx,dy){
  const sc=scope();if(!sc)return;const cs=cands(sc);if(!cs.length)return;
  if(foc&&!cs.includes(foc)){const m=cs.find(e=>e.tagName+"|"+(e.id||"")+"|"+(e.textContent||"").trim().slice(0,40)===focKey);if(m)setFoc(m)}
  if(!foc||!cs.includes(foc)){const sorted=cs.slice().sort((a,b)=>{const A=ctr(a),B=ctr(b);return(A[1]-B[1])||(A[0]-B[0])});
   const go=sorted.find(e=>e.classList&&e.classList.contains("go")&&!e.disabled);setFoc(go||sorted[0]);return}
  const [cx,cy]=ctr(foc);let best=null,bs=1e9;
  for(const el of cs){if(el===foc)continue;const [x,y]=ctr(el),ax=(x-cx)*dx+(y-cy)*dy,pp=Math.abs((x-cx)*dy)+Math.abs((y-cy)*dx);if(ax<3)continue;const s=ax+pp*2.2;if(s<bs){bs=s;best=el}}
  if(best)setFoc(best);else if(dy){const sb=sc.querySelector(".box")||sc;sb.scrollTop+=dy*90}}
 function press(){
  const sc=scope();if(!sc){return}
  const cs=cands(sc);
  if(foc&&!cs.includes(foc)){const m=cs.find(e=>e.tagName+"|"+(e.id||"")+"|"+(e.textContent||"").trim().slice(0,40)===focKey);if(m)setFoc(m)}
  if(!foc||!cs.includes(foc)){if(cs.length){nav(0,1)}else tap(" ");return}
  if(foc.tagName==="SELECT"){const s=foc;s.selectedIndex=(s.selectedIndex+1)%s.options.length;s.dispatchEvent(new Event("change",{bubbles:true}));return}
  if(foc.tagName==="INPUT"||foc.tagName==="TEXTAREA"){foc.focus();showHint("Use the keyboard to type, then press B",2500);return}
  foc.click()}
 function back(){
  if(typeof occOpen!=="undefined"&&occOpen&&typeof occClose==="function"){occClose();return}
  const sc=scope();if(!sc)return;
  for(const el of cands(sc)){if(/^\W*(close|back|leave|done|cancel|exit|farewell|goodbye|never ?mind|walk away|continue|ok|okay|later)\b/i.test((el.textContent||"").trim())){el.click();return}}
  tap("Escape")}
 /* ---- polling ---- */
 let prevB=[],prevHat=-9,navT=0,lastT=performance.now(),held={},lastLook=0,joyUsed=false;
 const bd=(g,i)=>{const b=g.buttons[i];return!!b&&(b.pressed||b.value>.55)};
 function setHold(k,v){if(!!held[k]!==v){held[k]=v;key(k,v)}}
 function hatDir(g){/* generic pads often report the D-pad as one axis */
  const a=g.axes[9];if(a===undefined||a>1.1)return null;const t=[-1,-.714,-.428,-.142,.142,.428,.714,1];let k=0,d=9;t.forEach((v,i)=>{const x=Math.abs(a-v);if(x<d){d=x;k=i}});
  return[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]][k]}
 function pad(){const l=navigator.getGamepads();for(const g of l)if(g&&g.connected)return g;return null}
 function tick(now){
  requestAnimationFrame(tick);G.n=(G.n||0)+1;const dt=Math.min(.08,(now-lastT)/1000);lastT=now;
  const g=pad();
  if(!g){if(G.on){G.on=false;setHold("F",false);if(joyUsed){joy.x=joy.y=0;joyUsed=false};showHint("Controller disconnected",2500)}return}
  if(!G.on){G.on=true;G.id=g.id;G.std=g.mapping==="standard";
   showHint("Controller ready: "+g.id.replace(/\(.*$/,"").trim().slice(0,40)+". Left stick move, right stick look, A act, X/RT attack, B block, LT aim, Start menu. K = Easy Assist.",9000)}
  const std=G.std;
  const ax=(i)=>{const v=g.axes[i]||0;return Math.abs(v)<DEAD?0:(v-Math.sign(v)*DEAD)/(1-DEAD)};
  let rxI=2,ryI=3;if(!std&&g.axes.length>=6&&Math.abs((g.axes[2]||0)+1)<.01&&Math.abs((g.axes[5]||0)+1)<.01){rxI=3;ryI=4}
  let lx=ax(0),ly=ax(1);const rx=ax(rxI),ry=ax(ryI);
  const B=i=>bd(g,i);
  let dpU=B(12),dpD=B(13),dpL=B(14),dpR=B(15);
  if(!std){const h=hatDir(g);if(h){dpL=dpL||h[0]<0;dpR=dpR||h[0]>0;dpU=dpU||h[1]<0;dpD=dpD||h[1]>0}}
  const sc=scope();G.menu=!!sc;
  const btn=[B(0),B(1),B(2),B(3),B(4),B(5),B(6),B(7),B(8),B(9),B(10),B(11)];
  const edge=i=>btn[i]&&!prevB[i];
  if(sc){
   /* MENU MODE: stick or D-pad moves the highlight, A presses, B closes */
   setHold("F",false);setHold("Shift",false);if(joyUsed){joy.x=joy.y=0;joyUsed=false}
   const mx=(dpR?1:0)-(dpL?1:0)||(Math.abs(lx)>.6?Math.sign(lx):0),my=(dpD?1:0)-(dpU?1:0)||(Math.abs(ly)>.6?Math.sign(ly):0);
   if((mx||my)&&now-navT>(navT===0||now-navT>600?0:210)){navT=now;if(Math.abs(mx)>=Math.abs(my)&&mx)nav(mx,0);else nav(0,my||0)}
   if(!mx&&!my)navT=0;
   if(Math.abs(ry)>.3){const bx=sc.querySelector(".box")||sc;bx.scrollTop+=ry*16}
   if(edge(0))press();else if(edge(1))back();else if(edge(2)&&scope())press();
   if(edge(3)&&typeof occOpen!=="undefined"&&occOpen&&typeof occClose==="function")occClose();
  }else{
   if(foc){setFoc(null)}
   /* GAMEPLAY MODE */
   const m=Math.hypot(lx,ly);if(m>1){lx/=m;ly/=m}
   if(m>0){joy.x=lx;joy.y=ly;joyUsed=true}else if(joyUsed){joy.x=joy.y=0;joyUsed=false}
   const locked=(typeof C!=="undefined"&&C&&!C.rt)||(typeof D!=="undefined"&&D)||(typeof packOpen!=="undefined"&&packOpen)||(typeof occOpen!=="undefined"&&occOpen);
   if((rx||ry)&&!locked){lastLook=now;const aimK=(window.TP&&TP.aim)?1-.55*TP.aim:1,sp=2.7*aimK;yaw-=rx*Math.abs(rx)*sp*dt*1.15;pitch=Math.max(-1.1,Math.min(1.1,pitch-ry*Math.abs(ry)*sp*.75*dt*1.15))}
   setHold("Shift",!!btn[10]);
   const att=btn[2]||btn[7];setHold("f",att);
   if(typeof TP!=="undefined")TP.aimOn=btn[6]?1:((TP.aimOn&&!G._aim)?TP.aimOn:0),G._aim=!!btn[6];
   setHold("q",btn[1]);
   if(edge(0))tap(" ");
   if(edge(3)){if(typeof C!=="undefined"&&C&&C.rt&&!C.over&&window.TP){TP.lock=TP.lock?0:1;showHint(TP.lock?"Target lock on":"Target lock off",1500)}else tap("e")}
   if(edge(4))tap("h");if(edge(5))tap("r");if(edge(8))tap("g");if(edge(11))tap("v");
   if(edge(9))tap("Tab");
   const dp=[dpL,dpU,dpR,dpD];dp.forEach((v,i)=>{if(v&&!prevHat_[i])tap(String(i+1))});prevHat_=dp;
  }
  prevB=btn;
  assist(now,dt);
 }
 let prevHat_=[0,0,0,0];
 /* ---- Easy Assist: gentle help during real-time fights ---- */
 let wasLive=false,pHP=null,mouseT=0;
 document.addEventListener("mousemove",()=>{mouseT=performance.now()},{passive:true});
 function assist(now,dt){
  const live_=typeof C!=="undefined"&&C&&C.rt&&!C.over&&typeof hero!=="undefined"&&hero;
  if(!live_){wasLive=false;pHP=null;return}
  if(!G.assist){pHP=hero.hp;return}
  if(!wasLive){wasLive=true;if(window.TP)TP.lock=1}      /* lock onto the foe when a fight begins */
  /* a quarter of every hit is forgiven (never turns a death into a survival glitch) */
  if(pHP!==null&&hero.hp<pHP&&hero.hp>0){const d=pHP-hero.hp,r=Math.floor(d*.25);if(r>0){hero.hp=Math.min(typeof maxHP==="function"?maxHP():hero.hp+r,hero.hp+r);try{refreshBar()}catch(e){}}}
  pHP=hero.hp;G.pHP=pHP;
  /* aim help: when you are not steering, ease the view toward the foe */
  try{if(window.TP&&TP.aimOn)return;if(now-lastLook<350||now-mouseT<350)return;if(typeof fx3==="undefined"||!fx3.g||typeof camera==="undefined")return;
   const fc=fx3.ctr(),cp=camera.position,dx=fc.x-cp.x,dz=fc.z-cp.z;if(Math.hypot(dx,dz)<.5)return;
   let d=Math.atan2(-dx,-dz)-yaw;d=Math.atan2(Math.sin(d),Math.cos(d));
   if(Math.abs(d)<1.25)yaw+=d*(1-Math.exp(-2.4*dt))}catch(e){}}
 addEventListener("gamepadconnected",()=>{});
 requestAnimationFrame(tick);
})();


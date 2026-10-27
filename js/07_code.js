/* ===== Solid buildings and enterable interiors (village houses) ===== */
(function(){
 const HOFF=[[-5,-3],[5,-4],[-6,3],[6,3],[0,-7]];
 const ROLE=[
  {key:"inn",title:"The Common Room",job:"Innkeeper",door:"Enter the inn"},
  {key:"shop",title:"The Trading Post",job:"Merchant",door:"Enter the shop"},
  {key:"farm",title:"The Farmhouse",job:"Farmer",door:"Enter the farmhouse"},
  {key:"seer",title:"The Fortune-teller's Parlor",job:"Fortune-teller",door:"Enter the parlor"},
  {key:"hearth",title:"A Quiet Cottage",job:null,door:"Enter the cottage"}];
 const POIROLE={
  hut:{key:"hut",title:"The Mirewitch's Hut",door:"Enter the hut",R:1.9,syn:{name:"Morrigan Mirewood",job:"Herbalist",seed:11}},
  fort:{key:"tower",title:"The Watchtower",door:"Enter the watchtower",R:2.3,climb:true,syn:{name:"Sergeant Voss",job:"Old soldier",seed:5}},
  ice:{key:"icetemple",title:"The Frozen Temple",door:"Enter the temple",R:2.0,chamber:"ice",lore:"Ice-glazed pillars ring a silent altar. Seven cold lanterns circle the floor, and the air tastes of silver."},
  obelisk:{key:"obelisk",title:"The Sunscar Obelisk",door:"Enter the obelisk",R:1.4,chamber:"obelisk",lore:"A narrow door in the black stone leads down into a heat-ticking chamber. The walls are carved with seven columns of planetary glyphs."},
  ruin:{key:"ruins",title:"The Highcairn Ruins",door:"Enter the vault",R:2.6,chamber:"ruin",lore:"Under the toppled arches, a rusted portcullis bars a vault. Four great metal discs lie stacked beside it."},
  shrine:{key:"shrine",title:"The Whisper Shrine",door:"Enter the shrine",R:1.8,syn:{name:"Brother Anselm",job:"Priest",seed:3}}};
 const IMG=window.HOME_IMG||{};
 let homes=null;
 function build(){
  if(homes)return homes;
  const v=typeof POIS!=="undefined"&&POIS.find(p=>p.id==="village");if(!v)return homes=[];
  const bx=v.x*TW+1,bz=v.y*TW+1;
  homes=HOFF.map((o,i)=>({i,x:bx+o[0],z:bz+o[1],R:3.2,role:ROLE[i]}));
  homes.base={x:bx,z:bz};
  // landmark buildings you can also enter: the witch's hut, the watchtower and the shrine
  POIS.forEach(p=>{const pr=POIROLE[p.id];if(pr)homes.push({i:homes.length,x:p.x*TW+1,z:p.y*TW+1,R:pr.R,role:pr,poi:true})});
  // other landmarks are solid too (the well in the village, shrine, tower, hut, obelisk, ruins, temples)
  const RAD={ice:2.0,obelisk:1.0,ruin:2.6};
  homes.solids=[{x:bx,z:bz,R:1.15}];
  POIS.forEach(p=>{const r=RAD[p.id]||((typeof SITES!=="undefined"&&SITES[p.id])?2.2:0);if(r)homes.solids.push({x:p.x*TW+1,z:p.y*TW+1,R:r})});
  return homes}
 // solid buildings: you can never step closer to a building you are already touching
 const _bl=blocked;
 blocked=function(wx,wz,r){
  if(_bl(wx,wz,r))return true;
  if(typeof DG!=="undefined"&&DG)return false;
  const hs=build();
  for(const h of hs){const d=Math.hypot(wx-h.x,wz-h.z);if(d<h.R+r&&d<Math.hypot(P.x-h.x,P.z-h.z))return true}
  for(const h of (hs.solids||[])){const d=Math.hypot(wx-h.x,wz-h.z);if(d<h.R+r&&d<Math.hypot(P.x-h.x,P.z-h.z))return true}
  return false};
 function nearHome(){const hs=build();let b=null,bd=h=>h.R+1.0;
  for(const h of hs){const d=Math.hypot(P.x-h.x,P.z-h.z);if(d<bd(h)&&(!b||d<b.d)){b={h,d}}}return b&&b.h}
 // overlay
 const css=document.createElement("style");
 css.textContent="#homev{position:absolute;inset:0;z-index:8;background:#0a0604;display:none;overflow:hidden}#homev.on{display:block}#homev img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.92)}#homev .ttl{position:absolute;left:0;right:0;top:0;padding:14px 18px 40px;background:linear-gradient(#000c,#0000);color:#f2e6c8;font:700 1.15rem Cinzel,Georgia,serif;letter-spacing:.05em;text-shadow:0 2px 4px #000}#homev .lv{position:absolute;right:12px;top:10px;z-index:2;padding:6px 14px;background:#f6e8c0;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:999px;font:700 .8rem Cinzel,serif;cursor:pointer}#homev .hb{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;width:min(420px,90%);z-index:3}#homev .hb p{margin:0;background:rgba(18,12,8,.88);border:1px solid #c9a24a;border-radius:8px;padding:10px 12px;color:#f2e6c8;font:1rem/1.4 Georgia,serif}#homev .hb button{padding:9px;background:#fff6dc;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:8px;font:700 .85rem Cinzel,serif;cursor:pointer}";
 document.head.appendChild(css);
 const view=document.getElementById("view")||document.querySelector(".cw");
 const ov=document.createElement("div");ov.id="homev";view.appendChild(ov);
 // the game view grabs the pointer on every press (for mouse-look), which swallowed clicks on Leave; keep presses inside the interior to ourselves
 ["pointerdown","pointermove","pointerup"].forEach(ev=>ov.addEventListener(ev,e=>e.stopPropagation()));
 let cur=null;
 function close(){ov.classList.remove("on");ov.innerHTML="";cur=null;try{if(window.OV)OV.stop()}catch(e){}}
 function show(h,hearthUI){
  const r=h.role;cur=h;ov.innerHTML="";
  const im=document.createElement("img");im.alt="";if(IMG[r.key])im.src=IMG[r.key];ov.appendChild(im);
  const t=document.createElement("div");t.className="ttl";t.textContent=r.title;ov.appendChild(t);
  const lv=document.createElement("button");lv.className="lv";lv.type="button";lv.textContent="Leave";lv.onclick=()=>{try{if(D)closeDlg()}catch(e){}close();say("You step back out into the village.")};ov.appendChild(lv);
  if(hearthUI==="tower"){
   const hb=document.createElement("div");hb.className="hb";
   const p=document.createElement("p");p.id="hearthmsg";p.textContent="A cold stone stair winds up through the tower. Arrow slits show slices of the wild. "+r.syn.name+" nods from his post.";hb.appendChild(p);
   const t=document.createElement("button");t.type="button";t.textContent="Speak with "+r.syn.name;t.onclick=()=>{try{talk(synNpc(h))}catch(e){}};hb.appendChild(t);
   const c=document.createElement("button");c.type="button";c.textContent="Climb to the lookout";c.onclick=()=>{try{const R=16;for(let y=Math.max(0,hy-R);y<Math.min(H,hy+R);y++)for(let x=Math.max(0,hx-R);x<Math.min(W,hx+R);x++)if(Math.hypot(x-hx,y-hy)<=R)seen[y*W+x]=1;try{hero.q&&(hero.q.fl.tower=1)}catch(e){}draw();p.textContent="From the top you can see for miles. Rivers, ridgelines and smoke from far camps spread out below you. The map reveals the land around you."}catch(e){}};hb.appendChild(c);
   ov.appendChild(hb)}
  else if(hearthUI==="chamber"){
   const hb=document.createElement("div");hb.className="hb";
   const p=document.createElement("p");p.id="hearthmsg";const done=(()=>{try{return !!(hero.q&&hero.q.pz&&hero.q.pz[r.chamber])}catch(e){return false}})();p.textContent=r.lore+(done?" You have already solved this chamber.":"");hb.appendChild(p);
   const b=document.createElement("button");b.type="button";b.textContent=(done?"Revisit: ":"Attempt the chamber: ")+(window.PZ&&PZ.DEF[r.chamber]?PZ.DEF[r.chamber].title:"puzzle");b.onclick=()=>{try{PZ.run(r.chamber)}catch(e){}};hb.appendChild(b);
   ov.appendChild(hb)}
  else if(hearthUI){
   const hb=document.createElement("div");hb.className="hb";
   const p=document.createElement("p");p.id="hearthmsg";p.textContent="A low fire, a worn chair, a quilt folded over its arm. Nobody is home, but the cottage feels like it is waiting for someone tired.";hb.appendChild(p);
   const b=document.createElement("button");b.type="button";b.textContent="Rest by the hearth";b.onclick=()=>{try{hero.hp=maxHP();hero.mana=maxMP();hud();p.textContent="You rest by the fire. Your strength and your mana return.";}catch(e){}};hb.appendChild(b);
   ov.appendChild(hb)}
  ov.classList.add("on")}
 function synNpc(h){return h.npc||(h.npc=Object.assign({id:"syn_"+h.role.key,x:(h.x-1)/TW,y:(h.z-1)/TW},h.role.syn))}
 function enter(){
  const h=nearHome();if(!h)return;
  const r=h.role;
  if(r.chamber){show(h,"chamber");say("You step inside.");return}
  if(r.syn){if(r.climb){show(h,"tower");say("You step inside.");return}show(h,false);say("You step inside.");talk(synNpc(h));return}
  if(r.job){const n=NPCS.find(n=>n.job===r.job);
   if(n){show(h,false);say("You step inside.");talk(n);return}}
  show(h,true);say("You step inside.")}
 // closing the dialog while inside a house also leaves the house (the Leave button handles the rest)
 try{const _cd=closeDlg;closeDlg=function(){_cd.apply(this,arguments);if(cur)close()}}catch(e){}
 try{const _mv=move;move=function(dt){if(ov.classList.contains("on"))return;_mv(dt)}}catch(e){}
 window.HM={near:()=>!!nearHome()&&!ov.classList.contains("on"),label:()=>{const h=nearHome();return h?h.role.door:""},enter,close,homes:()=>build(),open:ov};
})();

/* ===== Occultica world sound: footsteps, wind and climate, village life, building interiors, dungeons, battle ===== */
(function(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const LSK="occultica.sfx.on";let enabled=true;try{enabled=localStorage.getItem(LSK)!=="0"}catch(e){}
 let X=null,M,comp,revIn,outBus,outLP,nb,bb,an,duckG;
 const R=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
 const safe=f=>function(){try{return f.apply(this,arguments)}catch(e){if(window.console)console.warn("[sound]",e&&e.message)}};
 function impulse(sec,dec){const n=(X.sampleRate*sec)|0,b=X.createBuffer(2,n,X.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,dec)}return b}
 function init(){
  if(X)return;X=new AC();
  M=X.createGain();M.gain.value=0;duckG=X.createGain();duckG.gain.value=1;
  comp=X.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=5;
  M.connect(comp);comp.connect(X.destination);an=X.createAnalyser();an.fftSize=1024;comp.connect(an);
  const cv=X.createConvolver();cv.buffer=impulse(2.2,2.8);revIn=X.createGain();revIn.gain.value=1;revIn.connect(cv);cv.connect(M);
  nb=X.createBuffer(1,X.sampleRate*3,X.sampleRate);let d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  bb=X.createBuffer(1,X.sampleRate*4,X.sampleRate);d=bb.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}
  outLP=X.createBiquadFilter();outLP.type="lowpass";outLP.frequency.value=20000;outBus=X.createGain();outBus.gain.value=1;
  outBus.connect(outLP);outLP.connect(duckG);duckG.connect(M);
  layers();window.ENV.analyser=an}
 // ---------- building blocks ----------
 function env(g,t,a,d,v){v=Math.max(v,.0003);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
 let RV=.08; // reverb send for the current place
 function out(node,dest,pan,rv){let n=node;if(pan&&X.createStereoPanner){const p=X.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));n.connect(p);n=p}
  n.connect(dest||M);const r=rv===undefined?RV:rv;if(r>0){const s=X.createGain();s.gain.value=r;n.connect(s);s.connect(revIn)}}
 function tn(f1,f2,d,type,v,w,o){o=o||{};const t=X.currentTime+(w||0),os=X.createOscillator(),g=X.createGain(),a=o.a||Math.min(.02,d*.2);os.type=type||"sine";
  os.frequency.setValueAtTime(f1,t);if(f2&&f2!==f1)os.frequency.exponentialRampToValueAtTime(f2,t+d);
  if(o.det)os.detune.value=o.det;env(g,t,a,d,v);let n=os;if(o.lp){const f=X.createBiquadFilter();f.type="lowpass";f.frequency.value=o.lp;os.connect(f);n=f}
  n.connect(g);out(g,o.dest,o.pan,o.rv);os.start(t);os.stop(t+a+d+.05)}
 function nz(d,type,f,q,v,w,o){o=o||{};const t=X.currentTime+(w||0),s=X.createBufferSource();s.buffer=o.brown?bb:nb;
  const fl=X.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(o.f2)fl.frequency.exponentialRampToValueAtTime(o.f2,t+d);fl.Q.value=q||1;
  const g=X.createGain(),a=o.a||Math.min(.01,d*.2);env(g,t,a,d,v);s.connect(fl);fl.connect(g);out(g,o.dest,o.pan,o.rv);s.start(t,Math.random()*1.5,d+a+.05)}
 function loop(buf,type,f,q,v,dest){const s=X.createBufferSource();s.buffer=buf;s.loop=true;const fl=X.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const g=X.createGain();g.gain.value=v;s.connect(fl);fl.connect(g);g.connect(dest||outBus);s.start(0,Math.random()*2);return{g,f:fl}}
 // ---------- continuous layers ----------
 let wind,windLow,whistle,room,cave,hush,drone1,drone2,droneG;
 function layers(){
  wind=loop(nb,"bandpass",500,.7,0);windLow=loop(bb,"lowpass",260,.5,0);whistle=loop(nb,"bandpass",900,9,0);hush=loop(nb,"highpass",5000,.5,0);
  room=loop(bb,"lowpass",140,.5,0,duckG);cave=loop(bb,"lowpass",90,.5,0,duckG);
  droneG=X.createGain();droneG.gain.value=0;droneG.connect(duckG);
  drone1=X.createOscillator();drone1.type="sine";drone1.frequency.value=110;drone2=X.createOscillator();drone2.type="sine";drone2.frequency.value=164.8;drone2.detune.value=7;
  drone1.connect(droneG);drone2.connect(droneG);drone1.start();drone2.start()}
 const WIND={forest:[.035,500,0,0],hills:[.07,650,0,0],tundra:[.15,1000,.02,.012],mountain:[.13,800,.016,0],desert:[.085,420,0,.01],swamp:[.03,330,0,0]};
 function tgt(p,v,tc){p.setTargetAtTime(v,X.currentTime,tc||.8)}
 // ---------- one-shot sounds ----------
 const S={};
 // footsteps
 let lr=0;
 S.step=function(surf,run){lr^=1;const pan=lr?.18:-.18,v=run?1.3:1,j=R(.85,1.15);
  switch(surf){
   case"snow":for(let i=0;i<3;i++)nz(.025,"highpass",R(2200,3200),.7,.045*v,i*.022,{pan});nz(.1,"lowpass",300,.7,.05*v,0,{pan});break;
   case"rock":nz(.04,"bandpass",2000*j,2,.09*v,0,{pan});tn(150*j,70,.07,"sine",.1*v,0,{pan});break;
   case"sand":nz(.16,"lowpass",1700*j,.6,.05*v,0,{pan,a:.04});nz(.08,"highpass",4000,.5,.012*v,.02,{pan});break;
   case"mud":tn(150*j,70,.13,"sine",.09*v,0,{pan});nz(.14,"lowpass",520*j,1.2,.07*v,0,{pan,a:.03});break;
   case"stone":nz(.05,"bandpass",1500*j,1.5,.1*v,0,{pan,rv:.45});tn(95*j,50,.09,"sine",.12*v,0,{pan,rv:.3});break;
   default:nz(.1,"bandpass",850*j,.8,.07*v,0,{pan});tn(100*j,60,.06,"sine",.06*v,0,{pan});nz(.05,"highpass",5000,.5,.02*v,.01,{pan})}};
 // creatures and weather
 S.bird=function(){const n=1+((Math.random()*4)|0),b=R(2200,4200),p=R(-.8,.8);for(let i=0;i<n;i++)tn(b*R(.95,1.1),b*R(1.2,1.7),.11,"sine",.04,i*R(.12,.2),{pan:p,dest:outBus})};
 S.lark=function(){const p=R(-.7,.7);for(let i=0;i<9;i++)tn(R(3000,4400),R(3000,4400),.05,"sine",.03,i*.06,{pan:p,dest:outBus})};
 S.cricket=function(){const p=R(-.9,.9),b=R(4200,5200),k=4+((Math.random()*5)|0);for(let i=0;i<k;i++)tn(b,b,.025,"sine",.022,i*.045,{pan:p,dest:outBus,rv:.03})};
 S.owl=function(){const p=R(-.8,.8);tn(430,380,.35,"sine",.06,0,{pan:p,dest:outBus,rv:.3});tn(430,330,.55,"sine",.06,.5,{pan:p,dest:outBus,rv:.3})};
 S.wolf=function(f){f=f||1;const p=R(-.8,.8),t=X.currentTime,o=X.createOscillator(),g=X.createGain(),v=X.createOscillator(),vg=X.createGain();o.type="sine";
  o.frequency.setValueAtTime(260*f,t);o.frequency.linearRampToValueAtTime(520*f,t+1.1);o.frequency.linearRampToValueAtTime(380*f,t+2.6);v.frequency.value=5.5;vg.gain.value=9;v.connect(vg);vg.connect(o.frequency);
  env(g,t,.5,2.6,.05);o.connect(g);out(g,outBus,p,.45);o.start(t);v.start(t);o.stop(t+3.2);v.stop(t+3.2)};
 S.eagle=function(){const p=R(-.6,.6);tn(2600,1700,.5,"triangle",.045,0,{pan:p,dest:outBus,rv:.4});tn(2900,1900,.45,"triangle",.04,.6,{pan:p,dest:outBus,rv:.4});nz(.4,"bandpass",3000,3,.015,0,{pan:p,dest:outBus})};
 S.rockfall=function(){const p=R(-.8,.8),n=8+((Math.random()*10)|0);for(let i=0;i<n;i++)nz(.05,"bandpass",R(300,1800),1.5,R(.02,.07),i*R(.05,.14),{pan:p,dest:outBus,rv:.35})};
 S.crack=function(){nz(.12,"bandpass",2400,3,.07,0,{pan:R(-.6,.6),dest:outBus,rv:.4});tn(900,300,.15,"triangle",.03,0,{dest:outBus})};
 S.frog=function(){const p=R(-.8,.8),f=R(110,170);for(let i=0;i<2;i++)tn(f,f*.7,.09,"square",.04,i*.14,{pan:p,dest:outBus,lp:600})};
 S.bubble=function(){const p=R(-.6,.6),f=R(220,420);tn(f,f*2.2,.09,"sine",.035,0,{pan:p,dest:outBus});if(Math.random()<.5)tn(f*1.2,f*2.6,.08,"sine",.025,.11,{pan:p,dest:outBus})};
 S.buzz=function(){const p=R(-.8,.8),t=X.currentTime;tn(R(380,520),R(380,520),.7,"sawtooth",.012,0,{pan:p,dest:outBus,lp:900,a:.2})};
 S.leaves=function(){nz(R(.5,1.2),"highpass",3200,.6,.014,0,{pan:R(-.7,.7),dest:outBus,a:.3})};
 S.gust=function(){nz(R(1.5,3),"bandpass",600,.8,.05,0,{dest:outBus,a:.8,f2:R(900,1500)})};
 // village
 S.hammer=function(){const p=R(-.6,.6);tn(2400,2300,.35,"triangle",.05,0,{pan:p,rv:.2});tn(3300,3200,.25,"sine",.03,0,{pan:p,rv:.2});nz(.02,"highpass",3000,.6,.05,0,{pan:p});
  if(Math.random()<.6){tn(2300,2200,.3,"triangle",.04,.32,{pan:p,rv:.2});tn(3300,3200,.2,"sine",.025,.32,{pan:p,rv:.2})}};
 S.cluck=function(){const p=R(-.8,.8),n=2+((Math.random()*3)|0);for(let i=0;i<n;i++)tn(R(520,700),R(300,380),.07,"square",.055,i*.11,{pan:p,lp:1400})};
 S.murmur=function(){const p=R(-.7,.7);nz(R(.8,1.6),"bandpass",R(330,520),2.5,.07,0,{pan:p,a:.35,f2:R(380,620)});tn(R(110,150),R(120,190),R(.5,1),"sawtooth",.025,0,{pan:p,lp:500,a:.25})};
 S.bell=function(){const f=R(520,640);[1,2.76,5.4].forEach((m,i)=>tn(f*m,f*m,2.6/(i+1),"sine",.045/(i+1),0,{rv:.4}))};
 // interiors
 S.crackle=function(){const n=1+((Math.random()*4)|0);for(let i=0;i<n;i++)nz(R(.008,.03),"highpass",R(1800,5000),.8,R(.04,.13),i*R(.02,.09),{pan:R(-.3,.3),rv:.15})};
 S.pop=function(){nz(.05,"bandpass",R(900,1600),2,.1,0,{rv:.15});tn(R(300,500),R(120,180),.06,"sine",.05,0)};
 S.clink=function(){const f=R(2800,4200),p=R(-.6,.6);tn(f,f,.4,"sine",.04,0,{pan:p,rv:.3});tn(f*1.5,f*1.5,.3,"sine",.02,0,{pan:p,rv:.3})};
 S.coin=function(){const f=R(3400,4600);tn(f,f,.2,"triangle",.04,0,{rv:.2});tn(f*1.25,f*1.25,.35,"triangle",.04,.07,{rv:.2})};
 S.creak=function(dir,v){v=v||1;tn(dir>0?150:230,dir>0?230:140,.55,"sawtooth",.05*v,0,{lp:650,rv:.25,a:.1});nz(.5,"bandpass",420,6,.03*v,0,{rv:.2,f2:dir>0?700:320,a:.12})};
 S.thud=function(){tn(95,42,.28,"sine",.22,0,{rv:.3});nz(.18,"lowpass",350,.8,.1,0)};
 S.latch=function(){nz(.02,"highpass",3200,.6,.07,0);tn(1800,1500,.05,"square",.02,.01)};
 S.tick=function(){nz(.012,"bandpass",2600,6,.05,0,{rv:.1});};
 S.lute=function(){const sc=[220,247,277,330,370,440,494,554],n=pick(sc),p=R(-.5,.5);tn(n,n,1.1,"triangle",.045,0,{pan:p,rv:.3,lp:2400});tn(n*2,n*2,.6,"sine",.012,0,{pan:p,rv:.3});
  if(Math.random()<.6){const m=pick(sc);tn(m,m,1,"triangle",.04,R(.25,.5),{pan:p,rv:.3,lp:2400})}};
 S.chime=function(){const f=pick([660,784,880,988,1175]);[1,2.01,3.02].forEach((m,i)=>tn(f*m,f*m,3.4/(i+1),"sine",.035/(i+1),0,{rv:.55}))};
 S.cauldron=function(){const f=R(160,320),p=R(-.4,.4);tn(f,f*2.4,.1,"sine",.05,0,{pan:p,rv:.3});if(Math.random()<.5)tn(f*1.3,f*3,.08,"sine",.035,.12,{pan:p,rv:.3})};
 S.whisper=function(){nz(R(1.2,2.4),"bandpass",R(2200,3200),3,.02,0,{pan:R(-.9,.9),a:.7,rv:.5})};
 S.drip=function(){const f=R(900,1500),p=R(-.8,.8);tn(f,f*.55,.09,"sine",.06,0,{pan:p,rv:.7});tn(f*1.5,f*.8,.08,"sine",.025,.09,{pan:p,rv:.7})};
 S.chain=function(){const p=R(-.8,.8);for(let i=0;i<6;i++)nz(.03,"bandpass",R(2500,4500),5,R(.015,.04),i*R(.04,.1),{pan:p,rv:.6})};
 S.rumble=function(){nz(R(2,3.5),"lowpass",R(90,160),.7,.2,0,{brown:true,rv:.6,a:.8})};
 S.groan=function(){const p=R(-.8,.8);tn(R(90,130),R(60,80),R(1.4,2.2),"sawtooth",.03,0,{pan:p,lp:300,rv:.7,a:.5});tn(R(135,180),R(90,120),1.6,"sawtooth",.012,.1,{pan:p,lp:300,rv:.7,a:.5})};
 // battle
 const FOE={undead:/Skeleton|Zombie|Wraith|Mummy|Ghost|Lich|Ghoul|Wight|Shade|Revenant|Undead|King/i,big:/Giant|Ogre|Troll|Hydra|Demon|Drake|Dragon|Golem|Beholder|Balor|Colossus|Titan/i,beast:/Wolf|Bear|Rat|Spider|Boar|Lion|Yeti|Cat|Dog|Snake|Lizard|Croc|Bat|Hound|Wasp|Scorpion|Worm|Panther|Tiger|Bog|Swamp/i,magic:/Imp|Fire|Flame|Elemental|Mage|Wizard|Magic|Spirit|Witch|Salamander|Sprite|Fae|Wisp|Sorcer|Cultist|Priest/i};
 function foeKind(){const n=(typeof C!=="undefined"&&C&&C.e&&C.e.name)||"";for(const k in FOE)if(FOE[k].test(n))return k;return"man"}
 S.drum=function(w,v){v=v||1;tn(95,38,.55,"sine",.34*v,w||0,{rv:.35});nz(.3,"lowpass",260,.7,.16*v,w||0,{rv:.3})};
 S.stinger=function(){S.drum(0,1);S.drum(.34,.85);S.drum(.68,1.1);tn(98,92,1.6,"sawtooth",.045,.05,{lp:500,a:.7,rv:.4});tn(104,98,1.6,"sawtooth",.04,.05,{lp:500,a:.7,rv:.4});nz(.5,"bandpass",800,1,.05,.68,{f2:200,rv:.4,a:.1})};
 S.swing=function(){const w=((typeof hero!=="undefined"&&hero&&hero.eq&&hero.eq.w)||"").toLowerCase();const heavy=/mace|hammer|club|axe|flail/.test(w),light=/dagger|knife|dart/.test(w);
  nz(light?.14:.24,"bandpass",light?900:heavy?300:500,1.1,.13,0,{f2:light?3400:heavy?1100:2200,a:.06,rv:.12});if(/bow|sling/.test(w))tn(220,110,.12,"triangle",.1,0)};
 S.hit=function(n,crit){n=n||5;const v=Math.min(1.5,.7+n/16),w=((typeof hero!=="undefined"&&hero&&hero.eq&&hero.eq.w)||"").toLowerCase();
  tn(170,48,.22,"sine",.3*v,0,{rv:.2});nz(.12,"bandpass",1700,.9,.17*v,0,{rv:.15});
  if(/sword|blade|dagger|knife|axe|sabre|rapier|scimitar|star/.test(w)){tn(1900,1900,.35,"sine",.04,0,{rv:.3});tn(2850,2850,.25,"sine",.025,0,{rv:.3});nz(.05,"highpass",4000,.7,.09,0)}
  else if(/mace|hammer|club|staff|flail/.test(w)){tn(70,35,.35,"sine",.3,0,{rv:.3});nz(.2,"lowpass",500,.8,.15,0)}
  if(crit||n>=10){tn(60,28,.7,"sine",.4,0,{rv:.5});nz(.5,"bandpass",600,.7,.14,0,{f2:120,rv:.5});tn(110,95,.9,"sawtooth",.03,.05,{lp:400,rv:.5})}};
 S.growl=function(){const k=foeKind();
  if(k==="big"){tn(55,125,.35,"sawtooth",.1,0,{lp:520,rv:.4,a:.1});tn(125,48,.7,"sawtooth",.1,.3,{lp:520,rv:.4});tn(58,128,.35,"sawtooth",.07,0,{lp:520,det:30,rv:.4,a:.1});nz(.8,"lowpass",900,.8,.08,0,{rv:.4,a:.15})}
  else if(k==="beast"){tn(80,100,.55,"sawtooth",.09,0,{lp:380,rv:.2,a:.1});tn(84,98,.55,"sawtooth",.07,0,{lp:380,det:40,rv:.2,a:.1});nz(.5,"bandpass",600,2,.06,0,{rv:.2,a:.1});if(Math.random()<.5)nz(.25,"bandpass",2500,2,.04,.5)}
  else if(k==="undead"){nz(.8,"bandpass",800,5,.07,0,{f2:380,rv:.45,a:.15});tn(125,85,.8,"sawtooth",.04,0,{lp:300,rv:.5,a:.2})}
  else if(k==="magic"){tn(500,900,.45,"sine",.05,0,{rv:.5,a:.15});tn(900,520,.5,"sine",.05,.4,{rv:.5});nz(.7,"bandpass",3200,3,.04,0,{rv:.5,a:.25})}
  else{tn(130,180,.14,"sawtooth",.08,0,{lp:900,rv:.15});tn(180,105,.28,"sawtooth",.08,.12,{lp:900,rv:.15});nz(.2,"bandpass",1200,2,.05,.02)}};
 S.hurt=function(d){d=d||4;const v=Math.min(1.6,.7+d/10);tn(120,40,.22,"sine",.3*v,0,{rv:.15});nz(.14,"lowpass",700,.8,.2*v,0);nz(.08,"bandpass",2200,1,.08*v,0);
  if(d>=8){tn(70,32,.6,"sine",.35,0,{rv:.3});tn(4100,4100,1.1,"sine",.012,.05,{rv:0,a:.3})}
  tn(190,120,.2,"sawtooth",.04,.06,{lp:700}) };
 S.heart=function(){tn(62,40,.16,"sine",.3,0,{rv:.05});tn(54,36,.18,"sine",.22,.19,{rv:.05})};
 S.die=function(){const k=foeKind();tn(120,35,.8,"sine",.3,0,{rv:.45});nz(.7,"lowpass",900,.8,.18,0,{f2:120,rv:.4,a:.02});
  if(k==="undead"){for(let i=0;i<9;i++)nz(.04,"bandpass",R(900,2500),2,R(.03,.07),.2+i*R(.04,.1),{rv:.3})}
  else if(k==="magic"){tn(900,120,1.2,"sine",.06,0,{rv:.6});nz(.9,"highpass",3000,.6,.05,0,{rv:.6})}
  else tn(160,60,.9,"sawtooth",.07,.05,{lp:500,rv:.4,a:.1});S.thud()};
 S.spell=function(){const nm=(typeof curSpell==="string"&&curSpell)||"";
  if(/Fire|Flame|Burn|Meteor|Scorch/i.test(nm)){nz(.9,"bandpass",500,.8,.2,0,{f2:2200,a:.25,rv:.3});tn(70,40,.8,"sine",.25,.25,{rv:.4});for(let i=0;i<6;i++)nz(.02,"highpass",3000,.7,.08,.3+i*.07)}
  else if(/Frost|Ice|Cold|Chill/i.test(nm)){for(let i=0;i<7;i++){const f=R(2800,5200);tn(f,f*.9,.35,"sine",.04,i*.05,{pan:R(-.6,.6),rv:.4})}nz(.5,"highpass",4500,.6,.07,0,{rv:.3})}
  else if(/Light|Shock|Thunder|Bolt|Lightning|Zap/i.test(nm)){nz(.12,"highpass",1500,.5,.3,0,{rv:.3});tn(2600,150,.25,"sawtooth",.1,0,{rv:.3});tn(60,30,.8,"sine",.3,.08,{rv:.5})}
  else if(/Bless|Holy|Turn|Heal|Cure|Light of|Sanct/i.test(nm)){[523,659,784].forEach((f,i)=>tn(f,f,1.1,"sine",.06,i*.09,{rv:.5,a:.2}))}
  else{tn(380,1500,.5,"sine",.09,0,{rv:.4,a:.2});tn(392,1580,.5,"sine",.06,.03,{rv:.4,a:.2,det:12});for(let i=0;i<5;i++)tn(R(2400,5000),R(2400,5000),.1,"sine",.03,.2+i*.06,{pan:R(-.7,.7),rv:.4})}};
 S.heal=function(){[523,659,784,1047].forEach((f,i)=>tn(f,f,.9,"triangle",.07,i*.1,{rv:.45}))};
 S.win=function(){[[392,.0],[523,.18],[659,.36],[784,.58]].forEach(a=>{tn(a[0],a[0],a[0]===784?1.4:.5,"sawtooth",.05,a[1],{lp:1300,rv:.4,a:.04});tn(a[0]/2,a[0]/2,.9,"sine",.06,a[1])});S.drum(0,.7)};
 S.defeat=function(){tn(110,40,2.4,"sawtooth",.08,0,{lp:300,rv:.6,a:.3});S.bell();tn(73,36,2.5,"sine",.3,.2,{rv:.5});nz(1.8,"lowpass",250,.7,.15,0,{f2:80,rv:.5,a:.4})};
 S.discover=function(){[660,990,1320].forEach((f,i)=>tn(f,f,.9,"triangle",.05,i*.12,{rv:.5}));S.chime()};
 S.pickup=function(){tn(880,1320,.18,"triangle",.07,0,{rv:.2});tn(1320,1760,.28,"triangle",.06,.09,{rv:.2})};
 S.chest=function(){S.creak(1,1.6);setTimeout(safe(()=>{S.thud();for(let i=0;i<6;i++)S.coinAt(i*.07)}),520)};
 S.coinAt=function(w){const f=R(3000,4800);tn(f,f,.22,"triangle",.045,w,{rv:.25});tn(f*1.26,f*1.26,.3,"triangle",.035,w+.04,{rv:.25})};
 S.dungeonIn=function(){S.creak(1,1.8);setTimeout(safe(()=>{S.thud();S.rumble()}),450)};
 S.dungeonOut=function(){S.creak(-1,1.4);setTimeout(safe(S.thud),420)};
 S.resonance=function(){[392,587,784,1175].forEach((f,i)=>tn(f,f*1.01,1.3,"sine",.05,i*.07,{rv:.55,a:.12}));nz(.9,"highpass",5000,.5,.04,0,{rv:.5,a:.3});tn(98,98,1.2,"sine",.08,0,{rv:.4,a:.3})};
 S.dice=function(){for(let i=0;i<7;i++)nz(.03,"bandpass",R(1500,3200),3,R(.05,.11),i*(.05+i*.012),{pan:R(-.4,.4),rv:.2});nz(.05,"bandpass",1200,2,.13,.52);tn(110,70,.08,"sine",.12,.52)};
 // ---------- state & scheduler ----------
 const st={inside:false,room:-1,dg:false,biome:"forest",day:true,fight:false,village:false};
 const nxt={};let ducked=1;
 function due(k,a,b){const t=performance.now();if(!(k in nxt))nxt[k]=t+R(a,b);if(t>=nxt[k]){nxt[k]=t+R(a,b);return true}return false}
 function roomKey(){try{return HM.homes()[st.room].role.key}catch(e){return"hearth"}}
 function ovOn(){const o=document.getElementById("homev");return!!(o&&o.classList.contains("on"))}
 function nearestRoom(){try{const hs=HM.homes();let bi=-1,bd=99;hs.forEach((h,i)=>{const d=Math.hypot(P.x-h.x,P.z-h.z);if(d<bd){bd=d;bi=i}});return bi}catch(e){return-1}}
 function readState(){
  const was=st.inside;st.inside=ovOn();
  st.dg=(typeof DG!=="undefined"&&!!DG);
  try{st.biome=biome[hy][hx]||"forest"}catch(e){}
  st.day=(typeof todDay==="number"?todDay:1)>.45;
  st.fight=(typeof C!=="undefined"&&!!C&&!C.over&&(!C.rt||!!C.near));
  st.village=false;try{const b=HM.homes().base;st.village=!st.inside&&!st.dg&&Math.hypot(P.x-b.x,P.z-b.z)<17}catch(e){}
  if(st.inside&&!was){st.room=nearestRoom();doorSound(1)}else if(!st.inside&&was){doorSound(-1)}
  return st}
 function doorSound(dir){RV=.3;S.latch();setTimeout(safe(()=>{S.creak(dir,1.2);setTimeout(safe(S.thud),dir>0?420:380);
   if(dir>0&&roomKey()==="shop")setTimeout(safe(S.bell),380)}),60)}
 function tick(){
  if(!X||X.state!=="running"||!enabled)return;
  const s=readState(),W=WIND[s.biome]||WIND.forest,tc=.9,n=Math.sin(performance.now()/6300)*.5+Math.sin(performance.now()/2700)*.3+1;
  const outdoors=!s.inside&&!s.dg;
  RV=s.dg?.5:s.inside?.3:.08;
  tgt(outBus.gain,s.dg?0:s.inside?.13:1,.5);tgt(outLP.frequency,s.inside?520:20000,.5);
  const windVol=W[0]*(s.day?1:1.25)*n;
  tgt(wind.g.gain,windVol,tc);tgt(wind.f.frequency,W[1]*(.85+.3*Math.sin(performance.now()/4100)),tc);
  tgt(windLow.g.gain,windVol*1.6,tc);tgt(whistle.g.gain,W[2]*(.6+.6*n),tc);tgt(hush.g.gain,W[3],tc);
  tgt(room.g.gain,s.inside?.5:0,.6);tgt(cave.g.gain,s.dg?.9:0,.8);
  tgt(droneG.gain,(s.inside&&(roomKey()==="seer"||roomKey()==="shrine"))?.05:s.dg?.025:0,1.2);
  const bed=ducked;tgt(duckG.gain,bed,.25);
  // outdoor climate
  if(outdoors){
   if(s.biome==="forest"){if(s.day){if(due("bird",1500,5000))S.bird();if(due("leaf",4000,9000))S.leaves()}else{if(due("cri",450,1400))S.cricket();if(due("owl",14000,32000))S.owl()}}
   else if(s.biome==="hills"){if(s.day){if(due("lark",3500,9000))S.lark();if(due("bird",3000,8000))S.bird()}else if(due("cri",900,2400))S.cricket();if(due("gust",9000,20000))S.gust()}
   else if(s.biome==="tundra"){if(due("crk",16000,34000))S.crack();if(!s.day&&due("wolf",24000,50000))S.wolf();if(due("gust",7000,15000))S.gust()}
   else if(s.biome==="mountain"){if(s.day&&due("eag",12000,26000))S.eagle();if(due("rock",18000,40000))S.rockfall();if(!s.day&&due("wolf",30000,60000))S.wolf(.9);if(due("gust",8000,16000))S.gust()}
   else if(s.biome==="desert"){if(due("gust",6000,14000))S.gust();if(!s.day&&due("wolf",26000,55000))S.wolf(1.3);if(s.day&&due("buzz",9000,20000))S.buzz();if(!s.day&&due("cri",1500,3500))S.cricket()}
   else if(s.biome==="swamp"){if(due("frog",s.day?2500:900,s.day?7000:3000))S.frog();if(due("bub",1800,5500))S.bubble();if(due("buzz",4000,11000))S.buzz();if(!s.day&&due("cri",900,2400))S.cricket()}
   if(s.village){if(s.day&&due("ham",3500,7500))S.hammer();if(due("mur",2500,6500))S.murmur();if(due("cluck",7000,16000))S.cluck();if(due("vbell",60000,120000))S.bell()}
  }
  // interiors
  if(s.inside){
   const r=roomKey();
   if(r==="inn"||r==="hearth"||r==="farm"||r==="shop"){if(due("crk",r==="hearth"?150:350,r==="hearth"?650:1300))S.crackle();if(due("pop",3500,9000))S.pop()}
   if(r==="inn"){if(due("mur",900,2200))S.murmur();if(due("clk",3500,9000))S.clink();if(due("lute",2200,5200))S.lute()}
   if(r==="shop"){if(due("tk",1000,1001))S.tick();if(due("coin",6000,14000))S.coin();if(due("cr",9000,20000))S.creak(Math.random()<.5?1:-1,.6)}
   if(r==="farm"){if(due("cluck",3500,9000))S.cluck();if(due("cr",8000,18000))S.creak(1,.5)}
   if(r==="seer"){if(due("chm",3500,8000))S.chime();if(due("wsp",5000,11000))S.whisper()}
   if(r==="hearth"){if(due("tk",1000,1001))S.tick();if(due("cr",12000,26000))S.creak(1,.5)}
   if(r==="hut"){if(due("crk",250,900))S.crackle();if(due("cau",500,1600))S.cauldron();if(due("wsp",7000,15000))S.whisper();if(due("cr",9000,20000))S.creak(1,.5)}
   if(r==="tower"){if(due("gust",3500,8000))S.gust();if(due("cr",6000,14000))S.creak(Math.random()<.5?1:-1,.8);if(due("tk",4000,9000))S.clink()}
   if(r==="shrine"){if(due("chm",3000,7000))S.chime();if(due("wsp",4500,10000))S.whisper();if(due("drip",5000,12000))S.drip()}
  }
  // dungeon
  if(s.dg){if(due("drip",1200,4800))S.drip();if(due("chn",14000,32000))S.chain();if(due("rmb",22000,50000))S.rumble();if(due("grn",24000,55000))S.groan()}
  // heartbeat when you're hurt in a fight
  if(s.fight){try{if(hero.hp/maxHP()<.3&&due("hb",780,800))S.heart()}catch(e){}}
 }
 // ---------- hooks into the game ----------
 function surface(){if(st.dg)return"stone";return{tundra:"snow",mountain:"rock",desert:"sand",swamp:"mud"}[st.biome]||"grass"}
 function hook(){
  try{const _mv=move;move=function(dt){const x0=P.x,z0=P.z,b0=bob;_mv.apply(this,arguments);
    if(X&&enabled&&X.state==="running"&&bob>b0&&(Math.abs(P.x-x0)+Math.abs(P.z-z0))>1e-4&&Math.floor(bob/Math.PI)!==Math.floor(b0/Math.PI)){RV=st.dg?.5:.08;safe(S.step)(surface(),typeof keys!=="undefined"&&keys.Shift)}}}catch(e){}
  const ok=()=>X&&enabled&&X.state==="running";
  try{const o=fx3.swing;fx3.swing=function(){if(ok())safe(S.swing)();return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.hit;fx3.hit=function(n){if(ok())safe(S.hit)(n,n>=10);return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.strike;fx3.strike=function(){if(ok())safe(S.growl)();return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.hurt;fx3.hurt=function(d){if(ok())setTimeout(safe(()=>S.hurt(d)),240);return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.die;fx3.die=function(){if(ok())safe(S.die)();return o.apply(this,arguments)}}catch(e){}
  try{const o=fx3.spawn;fx3.spawn=function(){if(ok())safe(S.stinger)();return o.apply(this,arguments)}}catch(e){}
  try{sfx=function(k){try{fx3.sf(k)}catch(e){}if(!ok())return;if(k==="miss")nz(.18,"bandpass",600,1,.07,0,{f2:1500,a:.05});else if(k==="spell")safe(S.spell)();else if(k==="heal")safe(S.heal)();else if(k==="win")safe(S.win)()}}catch(e){}
  try{tryAudio=function(ch){if(ok()&&ch)safe(S.discover)()}}catch(e){}
  try{const o=defeat;defeat=function(){if(ok())safe(S.defeat)();return o.apply(this,arguments)}}catch(e){}
  try{const o=lootChest;lootChest=function(){if(ok())safe(S.chest)();return o.apply(this,arguments)}}catch(e){}
  try{const o=pickupAt;pickupAt=function(){if(ok())safe(S.pickup)();return o.apply(this,arguments)}}catch(e){}
  try{const o=enterDg;enterDg=function(){if(ok())safe(S.dungeonIn)();return o.apply(this,arguments)}}catch(e){}
  try{const o=closeDg;closeDg=function(){if(ok()&&st.dg)safe(S.dungeonOut)();return o.apply(this,arguments)}}catch(e){}
  try{setAmbience=function(){}}catch(e){}
  if(window.MUS&&MUS.duck){const o=MUS.duck;MUS.duck=function(v){ducked=v?.55:1;return o.apply(this,arguments)}}
 }
 // ---------- on / off ----------
 function apply(){const b=document.getElementById("snd");if(b)b.textContent="Sound: "+(enabled?"on":"off");if(X)M.gain.setTargetAtTime(enabled?.9:0,X.currentTime,.3)}
 function start(){if(!X)init();if(X.state==="suspended")X.resume();apply()}
 hook();
 const b=document.getElementById("snd");
 if(b){b.onclick=function(){enabled=!enabled;try{localStorage.setItem(LSK,enabled?"1":"0")}catch(e){}if(enabled)start();apply()}}
 function first(){if(enabled)start();else apply()}
 ["pointerdown","keydown","touchstart"].forEach(ev=>addEventListener(ev,first,{capture:true}));
 addEventListener("pointerdown",()=>{if(X&&X.state==="suspended"&&enabled)X.resume()},true);
 document.addEventListener("visibilitychange",()=>{if(!X)return;if(document.hidden)X.suspend();else if(enabled)X.resume()});
 setInterval(safe(tick),220);
 if(b)b.textContent="Sound: "+(enabled?"on":"off");
 window.ENV={S,st,start,state:()=>X&&X.state,enabled:()=>enabled,peak(){if(!an)return 0;const d=new Float32Array(an.fftSize);an.getFloatTimeDomainData(d);let m=0;for(const v of d)m=Math.max(m,Math.abs(v));return m}};
})();

/* ===== Battle theatre: the DM narrates every roll, plus an on-screen d20 and critical-hit banners ===== */
(function(){
 const LSK="occultica.bn";let on=true;try{on=localStorage.getItem(LSK)!=="0"}catch(e){}
 const P=a=>a[Math.floor(Math.random()*a.length)];
 const safe=f=>function(){try{return f.apply(this,arguments)}catch(e){if(window.console)console.warn("[battle]",e&&e.message)}};
 const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);const bw=b=>{const n=parseInt(b,10);return n>0?", plus "+n:n<0?", minus "+Math.abs(n):""};
 const foeName=()=>{try{return C&&C.e?C.e.name:"foe"}catch(e){return"foe"}};
 const the=n=>/^(the|a|an)\s/i.test(n)?n:"the "+n;
 const dmOn=()=>{try{return localStorage.getItem("occultica.dmvoice")!=="0"}catch(e){return true}};
 // ---------- narration queue ----------
 let q=[];
 function push(text,pri){if(!text)return;if(q.length>=3){const i=q.findIndex(x=>!x.pri);if(i>=0)q.splice(i,1);else q.shift()}q.push({text,pri:!!pri})}
 setInterval(safe(()=>{if(!on||!dmOn()||!window.OV||!window.speechSynthesis){q.length=0;return}
  if(!q.length||OV.busy())return;OV.say(q.shift().text,"dm")}),140);
 // ---------- on-screen d20 ----------
 const css=document.createElement("style");
 css.textContent="#d20box{position:absolute;left:19%;top:15%;transform:translateX(-50%);z-index:8;pointer-events:none;text-align:center;font-family:Cinzel,Georgia,serif;animation:d20in .25s ease-out}"+
 "#d20box .h{width:92px;height:92px;margin:0 auto;display:grid;place-items:center;clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);background:radial-gradient(circle at 35% 30%,#fff6dc,#c9a24a 70%,#7a5a1c);color:#1c1a3a;font:900 2.3rem Cinzel,Georgia,serif;filter:drop-shadow(0 4px 8px #000a)}"+
 "#d20box.roll .h{animation:d20spin .62s linear}#d20box.foe .h{background:radial-gradient(circle at 35% 30%,#ffd9d2,#c0452f 70%,#661e12);color:#fff}"+
 "#d20box.miss .h{background:radial-gradient(circle at 35% 30%,#e8e8ee,#8a8f98 70%,#444852)}#d20box.crit .h{background:radial-gradient(circle at 35% 30%,#fff,#ffd34a 60%,#e07a10);animation:d20crit .5s ease-out;filter:drop-shadow(0 0 18px #ffcf5a)}"+
 "#d20box.fumble .h{background:radial-gradient(circle at 35% 30%,#caa,#6a1e1e 70%,#2a0808);color:#ffb0a0}"+
 "#d20box .t{margin-top:6px;color:#f6e8c0;font:700 .85rem Cinzel,Georgia,serif;text-shadow:0 2px 4px #000,0 0 8px #000}#d20box .r{margin-top:2px;font:900 1.4rem Cinzel,Georgia,serif;letter-spacing:.12em;text-shadow:0 2px 4px #000,0 0 10px #000;color:#ffd86a}"+
 "#d20box.miss .r{color:#b9bfc9}#d20box.foe .r{color:#ff9a86}#d20box.fumble .r{color:#ff8a7a}"+
 "#bnban{position:absolute;left:0;right:0;top:42%;z-index:8;pointer-events:none;text-align:center;font:900 clamp(2rem,7vw,3.6rem) Cinzel,Georgia,serif;letter-spacing:.1em;color:#ffd86a;text-shadow:0 3px 0 #7a3a10,0 0 24px #ff9a20,0 4px 12px #000;animation:ban 1.5s ease-out forwards}#bnban.bad{color:#ff7a62;text-shadow:0 3px 0 #4a0e08,0 0 24px #d02010,0 4px 12px #000}#bnban.dull{color:#b9bfc9;text-shadow:0 3px 0 #222,0 4px 12px #000}"+
 "@keyframes d20in{from{opacity:0;transform:translateX(-50%) scale(.6)}to{opacity:1;transform:translateX(-50%) scale(1)}}@keyframes d20spin{from{transform:rotate(0) scale(1.15)}to{transform:rotate(720deg) scale(1)}}@keyframes d20crit{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1.1)}}"+
 "@keyframes ban{0%{opacity:0;transform:scale(2.2)}14%{opacity:1;transform:scale(1)}78%{opacity:1}100%{opacity:0;transform:scale(.96) translateY(-14px)}}"+
 "#cbt .box{max-height:54vh!important}#bnbtn{margin-top:4px;align-self:flex-end;font:700 .7rem Cinzel,serif;background:#fff6dc;color:#1c1a3a;border:1.5px solid #1c1a3a;border-radius:999px;padding:3px 10px;cursor:pointer}";
 document.head.appendChild(css);
 const view=()=>document.getElementById("view");
 let dieT=null,cyc=null;
 function die(o){const v=view();if(!v)return;
  clearTimeout(dieT);clearInterval(cyc);const old=document.getElementById("d20box");if(old)old.remove();
  const b=document.createElement("div");b.id="d20box";b.className="roll "+(o.foe?"foe ":"");
  const h=document.createElement("div");h.className="h";h.textContent=String(Math.ceil(Math.random()*20));
  const t=document.createElement("div");t.className="t";t.textContent="";const r=document.createElement("div");r.className="r";r.textContent="";
  b.appendChild(h);b.appendChild(t);b.appendChild(r);v.appendChild(b);
  try{if(window.ENV&&ENV.S&&ENV.enabled())ENV.S.dice()}catch(e){}
  cyc=setInterval(()=>{h.textContent=String(Math.ceil(Math.random()*20))},55);
  setTimeout(()=>{clearInterval(cyc);h.textContent=String(o.d);b.classList.remove("roll");
   b.classList.add(o.res==="crit"?"crit":o.res==="fumble"?"fumble":o.hit?"hit":"miss");
   t.textContent=(o.who||"")+" "+o.d+(o.bonus?(o.bonus>0?" + ":" − ")+Math.abs(o.bonus):"")+" = "+o.tot+(o.ac!=null?"  vs  "+(o.vs||"AC")+" "+o.ac:"");
   r.textContent=o.res==="crit"?(o.words?"BRILLIANT!":"CRITICAL!"):o.res==="fumble"?"FUMBLE!":o.hit?(o.words?"SUCCESS":"HIT"):(o.words?"FAILED":"MISS");
   if(o.res==="crit"&&!o.foe){try{flash("rgba(255,215,110,.45)");shakeT=.5}catch(e){}banner(o.words?"BRILLIANT!":"CRITICAL HIT!")}
   else if(o.res==="crit"&&o.foe){banner("BRUTAL BLOW!","bad")}
   else if(o.res==="fumble"){banner("FUMBLE!",o.foe?"":"dull")}
  },620);
  dieT=setTimeout(()=>{b.style.transition="opacity .5s";b.style.opacity="0";setTimeout(()=>b.remove(),520)},2300)}
 let banT=null;
 function banner(txt,cls){const v=view();if(!v)return;const o=document.getElementById("bnban");if(o)o.remove();clearTimeout(banT);
  const d=document.createElement("div");d.id="bnban";d.className=cls||"";d.textContent=txt;v.appendChild(d);banT=setTimeout(()=>d.remove(),1600)}
 // ---------- parsing the combat log ----------
 let hpWarned=false;
 function heroHurtNote(){try{const f=hero.hp/maxHP();if(f<=.3&&!hpWarned){hpWarned=true;return" You are badly wounded."}if(f>.5)hpWarned=false}catch(e){}return""}
 function foeNote(dmg){try{const e=C.e,rem=e.hp-dmg;if(rem>0&&rem/e.max<=.3)return" "+P(["The "+e.name+" is reeling, nearly finished.","It staggers. One more good blow may do it.","It is badly hurt and knows it."])}catch(e){}return""}
 function parse(t){
  let m;const fn=foeName(),F=the(fn),Fc=F.replace(/^the/,"The");
  // your weapon attack
  if(m=/^You swing(?: your (.+?))?: d20 (\d+)([+-]\d+) = (-?\d+) vs AC (\d+)\.\s*(.*)$/.exec(t)){
   const w=m[1]||"weapon",d=+m[2],bn=+m[3],tot=+m[4],ac=+m[5],rest=m[6];
   const fumble=/Critical miss/.test(rest),crit=/CRITICAL HIT/.test(rest),hit=!/Miss|Critical miss/.test(rest),dm=(/(\d+) damage/.exec(rest)||[])[1];
   die({who:"You",d,bonus:bn,tot,ac,hit,res:crit?"crit":fumble?"fumble":hit?"hit":"miss"});
   let s=P(["You swing your "+w+" at "+F+".","You bring your "+w+" around in a hard arc.","Steel and nerve, you strike at "+F+"."])+" The die shows "+d+bw(bn)+", for "+tot+", against armor class "+ac+". ";
   if(crit)s+=P(["A natural twenty! A critical hit! ","Twenty! The gods themselves guide your hand! "])+(dm?dm+" damage!":"")+foeNote(+dm||0);
   else if(fumble)s+=P(["A natural one! Your swing goes terribly wrong.","A one! You overreach and the blow is wasted."]);
   else if(hit)s+=P(["That beats it. A solid hit! ","You connect! ","It finds the gap in its guard. "])+(dm?dm+" damage.":"")+foeNote(+dm||0);
   else s+=P(["Not enough. The blow glances away.","A miss. "+Fc+" slips aside.","The strike falls short."]);
   return[s,crit]}
  // foe attack
  if(m=/^(.+?) attacks: d20 (\d+)([+-]\d+) = (-?\d+)(?: vs your AC (\d+))?\.\s*(.*)$/.exec(t)){
   const d=+m[2],bn=+m[3],tot=+m[4],rest=m[6];let ac=m[5]!=null?+m[5]:null;if(ac==null){try{ac=calcAC()+C.ward}catch(e){}}
   const fumble=d===1&&/Miss/.test(rest),crit=/CRITICAL/.test(rest),hit=!/Miss/.test(rest),dm=(/(\d+) damage/.exec(rest)||[])[1];
   die({who:m[1],foe:true,d,bonus:bn,tot,ac,hit,res:crit?"crit":fumble?"fumble":hit?"hit":"miss"});
   let s=P([Fc+" lunges at you!",Fc+" presses the attack.",Fc+" strikes!"])+" It rolls "+d+bw(bn)+", for "+tot+(ac!=null?", against your armor class of "+ac:"")+". ";
   if(crit)s+="A savage critical hit! You take "+dm+" damage!"+heroHurtNote();
   else if(fumble)s+="A fumble! It stumbles past you.";
   else if(hit)s+=P(["It hits! ","It lands the blow. ","That one gets through. "])+"You take "+dm+" damage."+heroHurtNote();
   else s+=P(["It misses!","You turn the blow aside.","The strike whistles past your ear."]);
   return[s,crit]}
  // spells with an attack roll (and volley shots)
  if(m=/^(.+?): d20 (\d+)([+-]\d+) = (-?\d+)(?: vs AC (\d+))?\.\s*(.*)$/.exec(t)){
   const nm=m[1],d=+m[2],bn=+m[3],tot=+m[4],rest=m[6];let ac=m[5]!=null?+m[5]:null;if(ac==null){try{ac=C.e.ac}catch(e){}}
   const miss=/miss/i.test(rest),crit=/CRITICAL/.test(rest),dm=(/(\d+)/.exec(rest)||[])[1];
   die({who:/^Shot/.test(nm)?nm+":":"You",d,bonus:bn,tot,ac,hit:!miss,res:crit?"crit":d===1?"fumble":miss?"miss":"hit"});
   const shot=/^Shot/.test(nm);
   let s=(shot?nm+". ":"You cast "+nm+". ")+"The die shows "+d+bw(bn)+", for "+tot+(ac!=null?", against armor class "+ac:"")+". ";
   s+=miss?P(["The magic goes wide.","It misses."]):crit?"A critical! "+(dm?dm+" damage!":""):P(["It strikes true! ","The power finds its mark. "])+(dm?dm+" damage.":"");
   return[s,crit]}
  if(m=/^(.+?) hits for (\d+) damage\.$/.exec(t))return[P(["You cast "+m[1]+". It strikes "+F+" for "+m[2]+" damage.",m[1]+" hits home. "+m[2]+" damage."])+foeNote(+m[2])];
  if(m=/^(.+?): you recover (\d+) HP\.$/.exec(t))return["You use "+m[1]+" and recover "+m[2]+" hit points."];
  if(m=/^(.+?): holy light sears the (.+?) for (\d+)\.$/.exec(t))return[m[1]+"! Holy light sears the "+m[2]+" for "+m[3]+" damage."];
  if(m=/^A (.+?) appears in (.+?)!$/.exec(t))return[P([(/^The /.test(m[1])?m[1]:"A "+m[1])+" bars your path in "+m[2]+"! Roll for initiative.","From the dark of "+m[2]+", "+(/^The /.test(m[1])?m[1]:"a "+m[1])+" comes for you. Roll for initiative!"]),true];
  if(m=/^Initiative: you (\d+), foe (\d+)\.$/.exec(t)){const a=+m[1],b=+m[2];return["You roll "+a+". The foe rolls "+b+". "+(a>=b?"You seize the first move.":"It strikes first!")]}
  if(m=/^(.+?) is defeated!$/.exec(t))return[P([cap(the(m[1]))+" collapses. Victory is yours!","With a final cry, "+the(m[1])+" falls. The fight is won!"]),true];
  if(/^You fall\.\.\./.test(t))return["Darkness takes you. The fight is lost, but your story is not over. "+t.replace(/^You fall\.\.\. and wake/,"You wake"),true];
  if(m=/^Loot: (.+)\.$/.exec(t))return["You search the fallen and find: "+m[1]+"."];
  if(/held and cannot act/.test(t))return[t];
  return[t]}
 // ---------- hook the combat log ----------
 function hook(){
  const _cl=clog;
  clog=function(t){_cl.apply(this,arguments);if(window.BN&&BN.skip){BN.skip=0;return}if(!window.OV&&!view())return;try{const r=parse(String(t));if(r&&r[0])push(r[0],r[1])}catch(e){if(window.console)console.warn("[battle]",e&&e.message)}};
  try{const _ec=endCombat;endCombat=function(){const won=C&&C.won;const r=_ec.apply(this,arguments);if(!won){q=q.filter(x=>x.pri)}return r}}catch(e){}
  try{const _sc=startCombat;startCombat=function(){q.length=0;hpWarned=false;return _sc.apply(this,arguments)}}catch(e){}
 }
 hook();
 // ---------- narrator switch in the battle panel ----------
 function addBtn(){const box=document.querySelector("#cbt .box");if(!box||document.getElementById("bnbtn"))return;
  const b=document.createElement("button");b.id="bnbtn";b.type="button";b.textContent="Narrator: "+(on?"on":"off");
  b.onclick=()=>{on=!on;try{localStorage.setItem(LSK,on?"1":"0")}catch(e){}b.textContent="Narrator: "+(on?"on":"off");if(!on){q.length=0;try{OV.stop()}catch(e){}}};
  box.appendChild(b)}
 addBtn();
 window.BN={push,parse,die,banner,queue:()=>q};
})();

/* ===== Planetary clock: day and hour rulers, alchemical correspondences for every item, and amplified effects ===== */
(function(){
 let HOURLEN=(()=>{try{const v=+localStorage.getItem("occultica.hourlen");return v>=60000&&v<=600000?v:120000}catch(e){return 120000}})();let OFF=0;
 const EL={Sun:"fire",Mars:"fire",Moon:"water",Venus:"water",Mercury:"air",Jupiter:"air",Saturn:"earth"};
 const ELS={fire:"▲",water:"▽",air:"△",earth:"▼"};
 const plObj=n=>PLN.find(p=>p.n===n);
 const ITEMP={
  "Dagger":"Mars","Hunting knife":"Moon","Longsword":"Mars","Warhammer":"Saturn","Mace":"Jupiter","Quarterstaff":"Mercury","Shortbow":"Moon","Ember wand":"Sun","Flamebrand":"Mars","Frostfang":"Saturn","Sunblade of Dawn":"Sun","Sword of the Square":"Saturn","Plumb-Line Sword":"Saturn","Compass Sword":"Jupiter","Sword of the Blazing Star":"Venus",
  "Leather armor":"Venus","Scale vest":"Mercury","Chain shirt":"Mars","Dwarven mail":"Saturn","Mithral plate":"Moon","Shield":"Jupiter","Tower shield":"Saturn",
  "Holy symbol":"Jupiter","Talisman of Warding":"Saturn","Eagle Eye Charm":"Sun","Bloodstone Amulet":"Mars","Raven Totem":"Moon","Philosopher's Stone":"Sun","Lamp of the Thrice-Great":"Mercury","Stag-Skull Charm":"Moon","Leaden Ring":"Saturn","Philosopher's Salt":"Moon","Yarrow Stalks":"Venus","Tiwaz Spearhead":"Mars","Sigil of the Seven":"Jupiter",
  "Healing herb":"Sun","Healing potion":"Jupiter","Mana potion":"Moon","Smoke vial":"Mercury",
  "Iron key":"Mars","Silver key":"Moon","Lockpicks":"Mercury","Spellbook":"Mercury",
  "Ruby":"Mars","Sapphire":"Jupiter","Emerald":"Venus","Moonstone":"Moon"};
 const SPELLP={
  "Magic Missile":"Mercury","Fire Bolt":"Mars","Sleep":"Moon","Arcane Shield":"Saturn","Cure Wounds":"Sun","Smite":"Jupiter","Bless":"Jupiter","Turn Undead":"Sun","Lay on Hands":"Venus","Divine Smite":"Sun","Power Strike":"Mars","Second Wind":"Sun","Shield Wall":"Saturn","Backstab":"Mercury","Smoke Step":"Mercury","Poison Blade":"Saturn","Arrow Volley":"Moon","Entangle":"Venus","Healing Spores":"Venus",
  "As Above, So Below":"Mercury","Solomonic Circle":"Jupiter","Draw Down the Moon":"Moon","Quintessence":"Sun","Binding Sigil":"Saturn","Angelic Word":"Sun","Summon Goetic Spirit":"Mars","Holy Guardian Angel":"Jupiter","Call of the Aethyrs":"Mercury","Rune of Tiwaz":"Mars",
  "Vow of the Order":"Sun","Shield of the Order":"Saturn","Mercy of the Order":"Venus","Blazing Star":"Venus","Knight's Charge":"Mars","Templar's Smite":"Jupiter","Pathfinder's Mark":"Mercury","Perfect Fifth":"Venus","Octave Chime":"Jupiter","Pythagorean Chord":"Mercury","Harmony of the Spheres":"Sun","Veil of Visions":"Moon","Choir Song":"Venus"};
 const BOOKP={"Corpus Hermeticum":"Mercury","Key of Solomon":"Jupiter","Picatrix":"Moon","Emerald Tablet":"Sun","Grimorium Verum":"Saturn","Sepher Raziel":"Sun","Lesser Key of Solomon":"Mars","Book of Abramelin":"Jupiter","Enochian Tablets":"Mercury","Havamal Rune-Song":"Mars"};
 const FALL={};
 function planetOfItem(n){
  if(ITEMP[n])return ITEMP[n];if(BOOKP[n])return BOOKP[n];
  let m=/^(?:Seal|Elixir) of (\w+)/.exec(n);if(m&&plObj(m[1]))return m[1];
  const it=ITEMS[n];if(it&&it.pl)return it.pl;
  if(it){const d={w:"Mars",a:"Saturn",s:"Jupiter",c:"Sun",u:"Moon",k:"Mercury",g:"Venus",b:"Mercury",h:"Sun"}[it.t]||"Sun";FALL[n]=d;return d}
  return"Sun"}
 function planetOfSpell(n){if(SPELLP[n])return SPELLP[n];FALL["spell:"+n]="Mercury";return"Mercury"}
 // ---- the clock (real time, so it is the same everywhere and keeps running between sessions) ----
 const force={};
 function now(){const t=Date.now()+OFF,h=Math.floor(t/HOURLEN);
  let hour=PLN[h%7],day=PLN[(24*Math.floor(h/24))%7];
  if(force.hour)hour=plObj(force.hour);if(force.day)day=plObj(force.day);
  return{h,hour,day,left:HOURLEN-(t%HOURLEN),slot:h%24}}
 function sched(n){const t=now();return Array.from({length:n},(_,i)=>({pl:PLN[(t.h+i)%7],inMs:i===0?0:t.left+(i-1)*HOURLEN}))}
 // ---- how strongly something resonates right now ----
 function mult(pl){const r=mult0(pl);if(r.m>1&&PCK.bonus){const b=PCK.bonus();if(b){r.m=Math.round((r.m+b)*100)/100}}return r}
 function mult0(pl){const c=now(),hr=c.hour.n===pl,dy=c.day.n===pl;
  if(hr&&dy)return{m:3,name:"Grand Conjunction",pl,kind:"both"};
  if(hr)return{m:2,name:"Hour of "+pl,pl,kind:"hour"};
  if(dy)return{m:1.5,name:"Day of "+pl,pl,kind:"day"};
  const el=EL[pl];if(el&&(EL[c.hour.n]===el||EL[c.day.n]===el))return{m:1.25,name:"Elemental kinship ("+ELS[el]+" "+el+")",pl,kind:"kin"};
  return window.OMEN&&OMEN.attuned(pl)?{m:1.25,name:"Omen of "+pl,pl,kind:"kin"}:{m:1,name:"",pl,kind:"none"}}
 function describe(pl){const p=plObj(pl);return p.g+" "+pl+" · "+p.m+" · "+EL[pl]+" "+ELS[EL[pl]]}
 // ---- amplification context ----
 const AMP={cur:null};
 function announce(mm,label){
  if(!mm||mm.m<=1)return;const p=plObj(mm.pl),x="x"+(mm.m%1?mm.m.toFixed(2).replace(/0$/,""):mm.m);
  const txt=mm.name+"! Your "+label+" resonates with "+mm.pl+" ("+p.m+", "+EL[mm.pl]+"). Its power is "+x+".";
  try{if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}
  if(typeof C!=="undefined"&&C&&!C.over){
   try{BN.skip=1}catch(e){}clog("✦ "+txt);
   try{BN.push("The "+(mm.kind==="hour"?"hour":mm.kind==="day"?"day":mm.kind==="both"?"heavens align. Hour and day":"stars")+" of "+mm.pl+" answers. Your "+label+" resonates, and its power is multiplied "+(mm.m===2?"twofold":mm.m===3?"threefold":"by "+mm.m)+"!",true)}catch(e){}
   try{BN.banner(p.g+" "+(mm.kind==="both"?"CONJUNCTION":"RESONANCE")+" "+x)}catch(e){}
   try{flash("rgba(255,215,120,.3)")}catch(e){}}
  else{try{say("✦ "+txt)}catch(e){}}}
 function ctx(pl,fn,label){const prev=AMP.cur,mm=mult(pl);if(typeof C!=="undefined"&&C&&mm.m>1){if(mm.m>2.5)mm.m=2.5;C.ampN=(C.ampN||0)+1;if(C.ampN>3){mm.m=Math.round((1+(mm.m-1)/2)*100)/100;mm.name+=" (the heavens tire)"}}AMP.cur=mm.m>1?Object.assign({label},mm):null;
  try{return fn()}finally{AMP.cur=prev;if(mm.m>1)announce(mm,label)}}
 const cm=()=>AMP.cur?AMP.cur.m:1;
 try{
  const _wa=weaponAttack;weaponAttack=function(o){if(AMP.cur||!(hero.eq&&hero.eq.w))return _wa.apply(this,arguments);const w=hero.eq.w,self=this,args=arguments;return ctx(planetOfItem(w),()=>_wa.apply(self,args),w)};
  const _cs=castSpell;castSpell=function(nm,field){const self=this,args=arguments;if(AMP.cur)return _cs.apply(self,args);return ctx(planetOfSpell(nm),()=>_cs.apply(self,args),nm)};
  const _ui=useItem;useItem=function(nm,field){const self=this,args=arguments;if(AMP.cur||!ITEMS[nm])return _ui.apply(self,args);
   return ctx(planetOfItem(nm),()=>{const r=_ui.apply(self,args);const m=AMP.cur?AMP.cur.m:1,it=ITEMS[nm];if(r!==false&&m>1&&it&&it.mana){const b=hero.mana;hero.mana=Math.min(maxMP(),hero.mana+Math.round(it.mana*(m-1)));}return r},nm)};
  const _fd=foeDamage;foeDamage=function(n){if(AMP.cur&&AMP.cur.m>1&&typeof n==="number"){const n2=Math.round(n*AMP.cur.m);try{BN.skip=1;clog("   ✦ "+n+" damage becomes "+n2)}catch(e){}n=n2}return _fd.call(this,n)};
  const _hh=healHero;healHero=function(n){if(AMP.cur&&AMP.cur.m>1&&typeof n==="number")n=Math.round(n*AMP.cur.m);return _hh.call(this,n)};
  const _rb=readBook;readBook=function(name){const first=!OCCP().read[name];const r=_rb.apply(this,arguments);try{const mm=mult(planetOfItem(name));if(first&&mm.m>1){const out=[],x=Math.round(150*(mm.m-1));addXp(x,out);say("✦ "+mm.name+": the grimoire opens to you. +"+x+" bonus experience from its resonance. "+out.join(" "));try{if(window.ENV&&ENV.enabled())ENV.S.resonance()}catch(e){}hud()}}catch(e){}return r};
  const _gh=gatherHerb;gatherHerb=function(p){const before=Object.assign({},hero.inv);const r=_gh.apply(this,arguments);try{for(const n in hero.inv){const it=ITEMS[n];if(!it||it.t!=="h")continue;const g=(hero.inv[n]||0)-(before[n]||0);if(g>0){const mm=mult(it.pl);if(mm.kind==="hour"||mm.kind==="both"){giveItem(n,g);say("✦ "+mm.name+": the "+n+" is at its peak. You gather "+g+" more.");try{if(window.ENV&&ENV.enabled())ENV.S.resonance()}catch(e){}}}}}catch(e){}return r};
  todayPl=function(){return now().day};
 }catch(e){if(window.console)console.warn("[planets]",e&&e.message)}
 // ---- who resonates right now ----
 function resonant(){const out=[];if(typeof hero==="undefined"||!hero)return out;const seen={};
  const add=(kind,name,pl)=>{const mm=mult(pl);if(mm.m>1&&!seen[name]){seen[name]=1;out.push({kind,name,pl,m:mm.m,why:mm.name})}};
  Object.keys(hero.inv||{}).forEach(n=>{if(!(hero.inv[n]>0)||!ITEMS[n])return;const t=ITEMS[n].t;if(t==="h")add("herb",n,planetOfItem(n));else if(t==="b")add("grimoire",n,planetOfItem(n));else if(t==="u")add("potion",n,planetOfItem(n));else if(["c","w","a","s"].includes(t))add("artifact",n,planetOfItem(n))});
  ["w","a","s","c"].forEach(s=>{const n=hero.eq&&hero.eq[s];if(n)add("artifact",n,planetOfItem(n))});
  try{known().forEach(n=>add("spell",n,planetOfSpell(n)))}catch(e){}
  out.sort((a,b)=>b.m-a.m);return out}
 // ---- every item carries its alchemical correspondence in its description ----
 try{Object.keys(ITEMS).forEach(n=>{const it=ITEMS[n],pl=planetOfItem(n);it.alch=describe(pl);if(!/·/.test(it.desc||""))it.desc=(it.desc?it.desc+" ":"")+"["+describe(pl)+"]"});
  Object.keys(SPELLS).forEach(n=>{const s=SPELLS[n],pl=planetOfSpell(n);s.alch=describe(pl);if(s.d&&!/·/.test(s.d))s.d=s.d.replace(/\.?$/,".")+" ["+plObj(pl).g+" "+pl+" "+ELS[EL[pl]]+"]"})}catch(e){}
 function setHourLen(ms){HOURLEN=ms;try{localStorage.setItem("occultica.hourlen",String(ms))}catch(e){}}
 function setOff(o){OFF=+o||0}
 function skipTo(n){const hit=sched(8).find(s=>s.pl.n===n);if(!hit||hit.inMs===0)return 0;const add=hit.inMs+400;OFF+=add;return add}
 window.PCK={get HOURLEN(){return HOURLEN},get OFF(){return OFF},setHourLen,setOff,skipTo,EL,ELS,plObj,planetOfItem,planetOfSpell,now,sched,mult,describe,ctx,cm,announce,resonant,force,AMP,FALL,ITEMP,SPELLP};
})();

/* ===== Battle tactics: ability-check maneuvers, artifact powers and suggestions drawn from your gear, spells and the foe ===== */
(function(){
 const P=a=>a[Math.floor(Math.random()*a.length)];
 const bw=b=>b>0?", plus "+b:b<0?", minus "+Math.abs(b):"";
 const the=n=>/^(the|a|an)\s/i.test(n)?n:"the "+n;
 const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
 const say2=t=>{try{BN.push(t)}catch(e){}};
 const wName=()=>(hero.eq&&hero.eq.w)||"";
 const wKind=()=>{const w=wName().toLowerCase();return/bow|sling/.test(w)?"bow":/dagger|knife|wand|rapier/.test(w)?"fin":/mace|hammer|club|staff|flail/.test(w)?"blunt":/./.test(w)?"blade":"fist"};
 const stat=n=>{try{return AT()[n]}catch(e){return 10}};
 const FOEBIG=/Giant|Ogre|Troll|Hydra|Demon|Drake|Dragon|Golem|Beholder|Yeti/i;
 function used(id){C.used=C.used||{};return !!C.used[id]}
 function mark(id){C.used=C.used||{};C.used[id]=1}
 // ---- ability check with narration ----
 function check(name,statName,dc,tx){
  const d=rnd(20),b=mod(stat(statName))+prof()+(window.TLN?TLN.checks():0),tot=d+b,ok=d===20||(d!==1&&tot>=dc),big=d===20||tot-dc>=5,nat1=d===1;
  const F=the(C.e.name),Fc=cap(F);
  const deg=d===20?"nat20":nat1?"nat1":ok?(big?"big":"ok"):"fail";
  try{BN.die({who:"You",d,bonus:b,tot,ac:dc,vs:"DC",hit:ok,words:1,res:d===20?"crit":nat1?"fumble":ok?"hit":"miss"})}catch(e){}
  try{BN.skip=1}catch(e){}
  clog(name+" ("+statName+"): d20 "+d+sg(b)+" = "+tot+" vs DC "+dc+". "+(ok?"Success.":"Failure."));
  const SN={STR:"Strength",DEX:"Dexterity",CHA:"Charisma",INT:"Intelligence",WIS:"Wisdom"}[statName]||statName;const lead="You attempt "+name+". "+SN+" check: the die shows "+d+bw(b)+", for "+tot+", against difficulty "+dc+". ";
  const out=(tx[deg]||tx[ok?"ok":"fail"]||"").replace(/\{F\}/g,F).replace(/\{Fc\}/g,Fc);
  say2(lead+out);return{d,b,tot,ok,big,nat1,nat20:d===20,deg}}
 const base=()=>10+(C.tier||0);
 // ---- tactics ----
 const TACT=[
  {id:"power",name:"Power Attack",sub:"-3 to hit, +4 damage",when:()=>wKind()!=="bow"&&wKind()!=="fist",
   run(){say2(P(["You plant your feet and commit everything to one heavy blow.","You wind up, all weight and fury behind your "+(wName()||"fists")+"."]));C.fh=(C.fh||0)-3;C.fd=(C.fd||0)+4;try{weaponAttack()}finally{C.fh+=3;C.fd-=4}}},
  {id:"aim",get name(){return wKind()==="bow"?"Aimed Shot":"Precise Strike"},sub:"+4 to hit, -2 damage",when:()=>wKind()==="bow"||wKind()==="fin"||(hero.cls==="Rogue"),
   run(){say2(P(["You steady your breath and look for the gap in its guard.","You slow everything down and pick your spot."]));C.fh=(C.fh||0)+4;C.fd=(C.fd||0)-2;try{weaponAttack()}finally{C.fh-=4;C.fd+=2}}},
  {id:"brace",name:"Brace",sub:"+3 AC until its next attack",when:()=>true,
   run(){C.ward+=3;C.brace=(C.brace||0)+3;const sh=hero.eq&&hero.eq.s;try{BN.skip=1}catch(e){}clog("You brace: +3 AC until the foe's next attack.");
    say2(sh?"You drop behind your "+sh.toLowerCase()+" and brace. Armor class rises by three until its next attack.":"You turn your shoulder, guard high, and brace. Armor class rises by three until its next attack.");try{sfx("miss")}catch(e){}}},
  {id:"feint",name:"Feint",sub:"DEX check: next attack +4 to hit",when:()=>stat("DEX")>=13||wKind()==="fin"||hero.cls==="Rogue",
   run(){const r=check("Feint","DEX",base()+(C.e.sp==="multi"?2:0),{
    nat20:"A perfect feint! {F} lunges at nothing and is wide open. Your next strike gets plus four to hit, and extra bite.",
    big:"Beautiful. {Fc} bites on the false strike and drops its guard. Your next strike gets plus four to hit.",
    ok:"{Fc} flinches at the false strike. You have an opening. Plus four to hit on your next attack.",
    fail:"{Fc} is not fooled. It watches your blade, not your eyes. Nothing gained.",
    nat1:"You overbalance mid-feint and leave yourself open. Your armor class drops by two this round."});
    if(r.ok){C.fhOnce=(C.fhOnce||0)+4;if(r.nat20)C.fdOnce=(C.fdOnce||0)+2}else if(r.nat1){C.ward-=2;C.brace=(C.brace||0)-2}}},
  {id:"trip",name:"Trip",sub:"STR check: foe loses a turn",when:()=>stat("STR")>=13||["Fighter","Paladin"].includes(hero.cls),
   run(){const big=FOEBIG.test(C.e.name),r=check("Trip","STR",base()+1+(big?4:0),{
    nat20:"You hook its leg and heave! {Fc} crashes down hard, stunned for two turns!",
    big:"You sweep its footing clean away. {Fc} sprawls and loses its next turn.",
    ok:"You catch its ankle. {Fc} stumbles and loses its next turn.",
    fail:big?"You shove with all your might, but {F} is simply too big to topple.":"You swing low, but {F} hops the sweep.",
    nat1:"You trip over your own feet. {Fc} gets a clear opening: your armor class drops by two this round."});
    if(r.ok){C.e.skip=r.nat20?2:1;foeDamage(roll(1,4))}else if(r.nat1){C.ward-=2;C.brace=(C.brace||0)-2}}},
  {id:"cry",name:"Battle Cry",sub:"CHA check: weaken the foe",when:()=>!C.e.undead&&(stat("CHA")>=12||["Paladin","Fighter"].includes(hero.cls))&&!used("cry"),
   run(){mark("cry");const wounded=C.e.hp/C.e.max<=.35,r=check("Battle Cry","CHA",base()+2,{
    nat20:"Your roar rolls across the ground like thunder. {Fc} loses all its nerve!",
    big:"Your shout rattles {F} to the bones. Its attacks weaken.",
    ok:"{Fc} hesitates. Its attacks weaken for the rest of the fight.",
    fail:"Your shout dies in the air. {Fc} only grins.",
    nat1:"Your voice cracks on the call. {Fc} laughs at you."});
    if(r.ok){C.e.atk=Math.max(0,C.e.atk-2);if(wounded&&r.big){const e=C.e;clog(e.name+" breaks and flees!");say2("The "+e.name+" breaks and runs into the dark. You win the day.");const x=[];addXp(Math.floor(e.xp/2),x);x.forEach(clog);C.over=true;C.won=1;fx3.clear();rc()}}}},
  {id:"study",name:"Study the Foe",sub:"WIS or INT check: find a weak point",when:()=>(Math.max(stat("WIS"),stat("INT"))>=12||["Magician","Cleric","Ranger"].includes(hero.cls))&&!used("study"),
   run(){mark("study");const st=stat("INT")>=stat("WIS")?"INT":"WIS",r=check("Study the Foe",st,base(),{
    nat20:"You read it like an open book. You see exactly where it is weak. Your next strike gets plus three to hit and plus three damage.",
    big:"You spot the flaw in its stance. Your next strike gets plus three to hit and plus three damage.",
    ok:"You spot a weak point. Your next strike gets plus three to hit.",
    fail:"You watch and wait, but {F} gives away nothing.",
    nat1:"You stare too long. {Fc} uses the moment to wind up, and your armor class drops by two."});
    if(r.ok){C.fhOnce=(C.fhOnce||0)+3;if(r.big)C.fdOnce=(C.fdOnce||0)+3}else if(r.nat1){C.ward-=2;C.brace=(C.brace||0)-2}}}
 ];
 // artifact and charm powers: once per fight
 const ART=[
  {id:"flame",item:"Flamebrand",name:"Ignite Flamebrand",sub:"once: +2d4 fire on a hit",run(){say2("The runes on your Flamebrand flare white-hot.");mark("flame");weaponAttack({extra:[2,4]})}},
  {id:"frost",item:"Frostfang",name:"Rime Strike",sub:"once: +1d6 cold, foe attacks weaken",run(){say2("Frost crawls along Frostfang's edge as you swing.");mark("frost");weaponAttack({extra:[1,6]});C.e.atk=Math.max(0,C.e.atk-1)}},
  {id:"dawn",item:"Sunblade of Dawn",name:"Dawn's Radiance",sub:"once: +2d6 radiant on a hit",run(){say2("The Sunblade blazes like the first light of morning.");mark("dawn");weaponAttack({extra:[2,6]})}},
  {id:"eagle",item:"Eagle Eye Charm",name:"Eagle's Focus",sub:"once: next attack +4 to hit",run(){mark("eagle");const k=Math.round(4*(window.PCK?PCK.cm():1));C.fhOnce=(C.fhOnce||0)+k;try{BN.skip=1}catch(e){}clog("The Eagle Eye Charm warms. Your next attack gets +"+k+" to hit.");say2("The Eagle Eye charm warms against your chest. The world sharpens. Your next attack gets plus "+k+" to hit.")}},
  {id:"ward",item:"Talisman of Warding",name:"Ward Flash",sub:"once: +3 AC for the rest of the fight",run(){mark("ward");const k=Math.round(3*(window.PCK?PCK.cm():1));C.ward+=k;try{BN.skip=1}catch(e){}clog("The Talisman of Warding flashes: +"+k+" AC for this fight.");say2("The Talisman of Warding flashes silver. A shimmering ward settles over you. Armor class rises by "+k+" for the rest of the fight.");try{sfx("spell")}catch(e){}}},
  {id:"raven",item:"Raven Totem",name:"Raven's Gift",sub:"once: restore 3 mana or stamina",run(){mark("raven");const b=hero.mana;hero.mana=Math.min(maxMP(),hero.mana+Math.round(3*(window.PCK?PCK.cm():1)));try{BN.skip=1}catch(e){}clog("The Raven Totem whispers: +"+(hero.mana-b)+" "+RES[hero.cls].toLowerCase()+".");say2("A raven's cry sounds in your head, and strength flows back into you.");try{sfx("heal")}catch(e){}}},
  {id:"blood",item:"Bloodstone Amulet",name:"Blood Surge",sub:"once: heal 1d8+2",run(){mark("blood");const n=roll(1,8)+2;const g=healHero(n);try{BN.skip=1}catch(e){}clog("The Bloodstone Amulet pulses: you recover "+g+" HP.");say2("The Bloodstone Amulet pulses against your heart. You recover "+g+" hit points.");try{sfx("heal")}catch(e){}}}
 ];
 const artsOn=()=>ART.filter(a=>hero.eq&&(hero.eq.w===a.item||hero.eq.c===a.item||hero.eq.a===a.item||hero.eq.s===a.item));
 // ---- suggestions: what looks smart right now, and why ----
 function suggest(){
  const e=C.e,hpF=hero.hp/maxHP(),out=[],ks=known().filter(n=>hero.mana>=SPELLS[n].mp),has=n=>ks.includes(n),inv=n=>(hero.inv[n]||0)>0,w=wName();
  const add=(score,label,why,run)=>out.push({score,label,why,run});
  const T=id=>TACT.find(t=>t.id===id),tOK=id=>{const t=T(id);return t&&t.when()};
  const atk=()=>heroAct(()=>weaponAttack());
  if(hpF<.35){
   ["Cure Wounds","Lay on Hands","Second Wind","Healing Spores"].filter(has).forEach(n=>add(100,n+" ("+SPELLS[n].mp+")","you are down to "+hero.hp+" HP",()=>heroAct(()=>castSpell(n))));
   if(inv("Healing potion"))add(98,"Drink a Healing potion","you are down to "+hero.hp+" HP",()=>heroAct(()=>useItem("Healing potion")));
   else if(inv("Healing herb"))add(96,"Chew a Healing herb","you are down to "+hero.hp+" HP",()=>heroAct(()=>useItem("Healing herb")));
   if(hpF<.25&&inv("Smoke vial"))add(90,"Throw the Smoke vial","one more blow could finish you",()=>heroAct(()=>useItem("Smoke vial")))}
  if(hero.mana<=1&&inv("Mana potion"))add(58,"Drink a Mana potion","you are nearly out of "+RES[hero.cls].toLowerCase(),()=>heroAct(()=>useItem("Mana potion")));
  if(e.undead){if(has("Turn Undead"))add(95,"Turn Undead ("+SPELLS["Turn Undead"].mp+")","holy light sears the "+e.name.toLowerCase(),()=>heroAct(()=>castSpell("Turn Undead")));
   if(/Sunblade|Blazing Star/.test(w))add(88,"Attack","your "+w+" burns the undead",atk)}
  if((C.fhOnce||0)>0)add(84,"Attack","your setup gives +"+C.fhOnce+" to hit",atk);
  if(e.skip>0){const f=["Backstab","Divine Smite","Power Strike","Poison Blade"].find(has);add(85,f?f+" ("+SPELLS[f].mp+")":"Attack","it is held and cannot act",f?()=>heroAct(()=>castSpell(f)):atk)}
  if(e.hp/e.max<=.35&&tOK("cry")&&!used("cry"))add(76,"Battle Cry","it is nearly broken; a shout may send it running",()=>heroAct(T("cry").run));
  if(e.ac>=15){["Magic Missile","Smite"].filter(has).forEach(n=>add(80,n+" ("+SPELLS[n].mp+")","its armor is tough (AC "+e.ac+") and this needs no roll",()=>heroAct(()=>castSpell(n))))}
  if(!e.skip&&e.hp>=20){if(has("Sleep")&&!e.undead)add(72,"Sleep ("+SPELLS["Sleep"].mp+")","buy time against a "+e.name.toLowerCase(),()=>heroAct(()=>castSpell("Sleep")));
   if(has("Entangle"))add(72,"Entangle ("+SPELLS["Entangle"].mp+")","pin the "+e.name.toLowerCase()+" in place",()=>heroAct(()=>castSpell("Entangle")))}
  artsOn().forEach(a=>{if(used(a.id))return;
   const sc=a.id==="blood"?(hpF<.5?78:0):a.id==="ward"?(hpF<.6?62:0):a.id==="raven"?(hero.mana<=2?66:0):a.id==="eagle"?64:(a.id==="dawn"&&e.undead?90:a.id==="frost"&&/Fire|Flame|Salamander|Imp|Demon/i.test(e.name)?86:74);
   if(sc)add(sc,a.name,"your "+a.item+" has a power ready",()=>heroAct(()=>{if(window.PCK)PCK.ctx(PCK.planetOfItem(a.item),()=>a.run(),a.item);else a.run()}))});
  if(!C.fhOnce&&tOK("feint")&&hero.cls==="Rogue")add(66,"Feint","open the guard, then Backstab",()=>heroAct(T("feint").run));
  if(tOK("trip")&&!e.skip&&e.sp!=="multi"&&!FOEBIG.test(e.name))add(64,"Trip","knock it off its feet and take a free round",()=>heroAct(T("trip").run));
  if(tOK("study")&&!used("study")&&e.hp/e.max>.7)add(60,"Study the Foe","find a weak point before you commit",()=>heroAct(T("study").run));
  if(hpF<.6&&e.dn*e.ds>=8&&tOK("brace"))add(50,"Brace","it hits hard (up to "+(e.dn*e.ds+e.db)+"); +3 AC",()=>heroAct(T("brace").run));
  const dm=ks.filter(n=>SPELLS[n].u==="dmg"||SPELLS[n].u==="atk"||SPELLS[n].u==="atkw")[0];
  if(dm)add(55,dm+" ("+SPELLS[dm].mp+")",SPELLS[dm].d.replace(/\.$/,"").toLowerCase(),()=>heroAct(()=>castSpell(dm)));
  add(40,"Attack",e.ac<=12?"its armor is light (AC "+e.ac+")":"steady and reliable",atk);
  out.sort((a,b)=>b.score-a.score);const seen={},res=[];for(const o of out){if(seen[o.label])continue;seen[o.label]=1;res.push(o);if(res.length===2)break}return res}
 // ---- menu ----
 function gold(b){b.style.borderColor="#c9a24a";b.style.fontWeight="700";b.style.gridColumn="1/-1";return b}
 const _rc=rc;
 rc=function(){
  const mm=C&&C.menu;_rc.apply(this,arguments);
  if(!C||C.over)return;const m=document.getElementById("cmenu");if(!m)return;const dis=C.busy;
  if(mm==="tac"){
   m.innerHTML="";
   TACT.filter(t=>t.when()).forEach(t=>{const b=btn(t.name+" - "+t.sub,()=>heroAct(()=>{t.run()}),"alt",dis);m.appendChild(b)});
   artsOn().forEach(a=>{const u=used(a.id);m.appendChild(btn(a.name+" - "+(u?"used this fight":a.sub),()=>heroAct(()=>{if(window.PCK)PCK.ctx(PCK.planetOfItem(a.item),()=>a.run(),a.item);else a.run()}),"alt",dis||u))});
   m.appendChild(btn("Back",()=>{C.menu=null;rc()}));return}
  if(!mm){
   const flee=[...m.children].find(b=>/^Flee/.test(b.textContent));
   const tb=btn("Tactics",()=>{C.menu="tac";rc()},"alt",dis);if(flee)m.insertBefore(tb,flee);else m.appendChild(tb);
   if(!dis){const sg2=suggest();const first=m.firstChild;sg2.forEach(s=>{const b=gold(btn("★ "+s.label+" — "+s.why,s.run,"alt",false));m.insertBefore(b,first)})}}
 };
 // once-only setup bonuses are spent on your next weapon attack; bracing ends after the foe's next attack
 try{const _wa=weaponAttack;weaponAttack=function(){const fo=(C&&C.fhOnce)||0,fd=(C&&C.fdOnce)||0;if(C){C.fh=(C.fh||0)+fo;C.fd=(C.fd||0)+fd;C.fhOnce=0;C.fdOnce=0}try{return _wa.apply(this,arguments)}finally{if(C){C.fh-=fo;C.fd-=fd}}}}catch(e){}
 try{const _ft=foeTurn;foeTurn=function(){const r=_ft.apply(this,arguments);if(C&&C.brace){C.ward-=C.brace;C.brace=0}return r}}catch(e){}
 window.TAC={TACT,ART,suggest,check,used,mark};
})();

/* ===== Battle depth: enemy wind-ups you can answer, boss and elite phases, and herbs with planetary effects ===== */
(function(){
 const P=a=>a[Math.floor(Math.random()*a.length)];
 const the=n=>/^(the|a|an)\s/i.test(n)?n:"the "+n;
 const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
 const say2=(t,pri)=>{try{BN.push(t,pri)}catch(e){}};
 const log=t=>{try{BN.skip=1}catch(e){}clog(t)};
 const snd=n=>{try{if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S[n]()}catch(e){}};
 const FK={undead:/Skeleton|Zombie|Wraith|Mummy|Ghost|Lich|Ghoul|Wight|Shade|King/i,big:/Giant|Ogre|Troll|Hydra|Demon|Drake|Dragon|Golem|Beholder|Yeti/i,beast:/Wolf|Bear|Rat|Spider|Boar|Lion|Cat|Dog|Snake|Lizard|Croc|Bat|Hound|Wasp|Scorpion|Worm|Bog/i,magic:/Imp|Fire|Flame|Elemental|Mage|Magic|Wizard|Spirit|Witch|Salamander|Nymph|Sorcer|Cultist|Priest/i};
 const kind=()=>{const n=C.e.name;for(const k in FK)if(FK[k].test(n))return k;return"man"};
 const WIND={big:["rears back for a crushing blow","Crushing Blow"],beast:["coils low, muscles bunching to pounce","Pounce"],undead:["draws a rattling breath as dark power gathers","Soul Strike"],magic:["gathers crackling power between its hands","Spell Surge"],man:["raises its weapon high for an overhead strike","Overhead Strike"]};
 // ---------- wind-ups ----------
 const _ft=foeTurn;
 foeTurn=function(){
  if(!C||C.over)return _ft.apply(this,arguments);
  const e=C.e;
  if(C.wind){const w=C.wind;C.wind=null;C.windCool=1;
   if(e.skip>0)return _ft.apply(this,arguments);
   if(w.dodged){fx3.strike();snd("swing");log(e.name+"'s "+w.name+" misses completely!");
    say2(P([cap(the(e.name))+" brings its "+w.name.toLowerCase()+" down on empty air. You slipped it.","You are simply not there. The "+w.name.toLowerCase()+" cuts the air where you stood."])+(Math.random()<.5?" It stumbles, off balance!":""),true);
    if(Math.random()<.5)e.skip=1;C.busy=false;hud();rc();return}
   const o={atk:e.atk,dn:e.dn,db:e.db};e.atk+=3;e.dn*=2;
   say2(cap(the(e.name))+" unleashes its "+w.name+"!",true);snd("stinger");
   try{return _ft.apply(this,arguments)}finally{e.atk=o.atk;e.dn=o.dn;e.db=o.db}}
  const can=e.skip<=0&&!C.lost&&!C.windCool&&hero.hp>0;
  if(can&&Math.random()<(C.windP||.26)){const k=kind(),w=WIND[k]||WIND.man;
   C.wind={name:w[1],dodged:false};
   log(e.name+" "+w[0]+"!  Answer it: dodge, brace or break it.");
   say2(cap(the(e.name))+" "+w[0]+"! A "+w[1]+" is coming. Dodge, brace, or strike first to break it.",true);
   try{BN.banner("WIND-UP!","bad")}catch(x){}snd("drum");try{flash("rgba(255,60,30,.25)")}catch(x){}
   C.busy=false;hud();rc();return}
  C.windCool=0;
  return _ft.apply(this,arguments)};
 // ---------- boss and elite phases ----------
 const _sc=startCombat;
 startCombat=function(){const r=_sc.apply(this,arguments);try{const e=C.e;C.boss=!!(typeof DG!=="undefined"&&DG&&DG.th&&DG.th.boss===e.name);C.elite=!C.boss&&e.max>=45;C.phase=1;C.windP=C.boss?.38:.26;
   if(C.boss){log("A great foe. "+e.name+" will change as the fight turns.");say2("This is no common foe. "+cap(the(e.name))+" will change as the battle turns.",true)}}catch(x){}return r};
 function phase(){
  if(!C||C.over)return;const e=C.e,f=e.hp/e.max;
  if(!(C.boss||C.elite)||e.hp<=0)return;
  if(C.phase===1&&f<=(C.boss?.66:.5)){C.phase=2;e.atk+=2;e.db+=2;C.windP=Math.max(C.windP,.4);
   log(e.name+" is "+(C.boss?"ENRAGED":"bloodied and furious")+"! +2 to hit, +2 damage.");
   say2((C.boss?cap(the(e.name))+" roars. Something has snapped. It is enraged! Plus two to hit, plus two damage.":cap(the(e.name))+" is bloodied, and it is furious. It hits harder now."),true);
   try{BN.banner(C.boss?"ENRAGED!":"BLOODIED!","bad");flash("rgba(255,50,20,.35)");shakeT=.6}catch(x){}snd("stinger");try{if(fx3.g)fx3.g.scale.multiplyScalar(1.1)}catch(x){}}
  if(C.boss&&C.phase<=2&&f<=.33){C.phase=3;const k=kind();let msg;
   if(k==="undead"){e.sp="drain";msg="drinks the life from its victims: its attacks now drain you."}
   else if(k==="magic"){const h=Math.ceil(e.max*.15);e.hp=Math.min(e.max,e.hp+h);e.ac+=1;msg="calls on a last reserve of power. It heals "+h+" and its guard hardens (+1 AC)."}
   else{e.sp="multi";msg="goes wild. It now attacks twice every turn!"}
   C.windP=.5;log("FINAL PHASE: "+e.name+" "+msg);say2(cap(the(e.name))+" is nearly broken, and far more dangerous for it. It "+msg,true);
   try{BN.banner("FINAL PHASE!","bad");flash("rgba(255,50,20,.4)");shakeT=.7}catch(x){}snd("stinger");snd("rumble")}}
 const _fd=foeDamage;foeDamage=function(){const r=_fd.apply(this,arguments);try{phase()}catch(e){}return r};
 // ---------- planetary herbs ----------
 const HERB={
  Saturn:{n:"Wither",d:"foe attacks weaken (-2), 1d6 damage",fn(m,F){const e=C.e;e.atk=Math.max(0,e.atk-2*m);foeDamage(roll(m,6));return "Saturn's cold seeps into "+F+". Its strength withers and its attacks weaken."}},
  Jupiter:{n:"Fortune",d:"heal 1d8+2, next attack +2 to hit",fn(m){const g=healHero(roll(m,8)+2*m);C.fhOnce=(C.fhOnce||0)+2*m;return "Jupiter's blessing warms you. You recover "+g+" hit points, and your next strike is luckier."}},
  Mars:{n:"Fury",d:"+3 damage for the fight",fn(m){C.fd=(C.fd||0)+3*m;return "Mars's fire floods your arms. Your blows hit harder for the rest of the fight."}},
  Sun:{n:"Radiance",d:"heal 2d4; undead take 2d6",fn(m,F){const g=healHero(roll(2*m,4));let s="Sunlight blooms in your chest. You recover "+g+" hit points.";if(C.e.undead){foeDamage(roll(2*m,6));s+=" "+cap(F)+" shrieks in the light."}return s}},
  Venus:{n:"Charm",d:"foe loses a turn (not undead); heal 1d4",fn(m,F){const g=healHero(roll(m,4));if(C.e.undead)return "The dead feel no love. You recover only "+g+" hit points.";C.e.skip=Math.max(C.e.skip,m);return "Venus's sweetness fills the air. "+cap(F)+" lingers, charmed. You recover "+g+" hit points."}},
  Mercury:{n:"Quicksilver",d:"+3 AC for the fight",fn(m){C.ward+=3*m;return "Mercury quickens your feet. You move like mercury, and your armor class rises by "+3*m+"."}},
  Moon:{n:"Dreamveil",d:"restore 4 mana or stamina, foe -1 attack",fn(m){const b=hero.mana;hero.mana=Math.min(maxMP(),hero.mana+4*m);C.e.atk=Math.max(0,C.e.atk-m);return "The moon's calm settles over you. You regain "+(hero.mana-b)+" "+RES[hero.cls].toLowerCase()+", and the foe's aim wavers."}}};
 const herbs=()=>Object.keys(hero.inv||{}).filter(n=>hero.inv[n]>0&&ITEMS[n]&&ITEMS[n].t==="h"&&HERB[ITEMS[n].pl]);
 function useHerb(nm){const pl=ITEMS[nm].pl,h=HERB[pl];hero.inv[nm]--;if(hero.inv[nm]<=0)delete hero.inv[nm];
  const mm=window.PCK?PCK.mult(pl):{m:1,name:""};const today=mm.m>1,m=Math.max(1,Math.round(mm.m)),F=the(C.e.name),t=h.fn(m,F);try{PCK.announce(mm,nm)}catch(x){}
  log(nm+": "+h.n+(today?" (amplified, "+mm.name+")":"")+".");
  say2("You crush "+nm+" between your fingers. "+t);snd("heal");try{sfx("heal")}catch(x){}}
 try{["Wormwood","Saffron","Rose","Hyssop","Henbane","Fennel","Mugwort"].forEach(n=>{if(!STOCK.Herbalist.some(x=>x[0]===n))STOCK.Herbalist.push([n,10])})}catch(e){}
 const _vic=victory;victory=function(){const r=_vic.apply(this,arguments);try{if(Math.random()<.3){const pl=pickOne(PLN),nm=pickOne(pl.h);giveItem(nm);clog("You also gather a sprig of "+nm+" ("+pl.n+" herb).")}}catch(e){}return r};
 // ---------- menus ----------
 const _rc=rc;
 rc=function(){
  _rc.apply(this,arguments);
  if(!C||C.over)return;const m=document.getElementById("cmenu");if(!m)return;const mm=C.menu,dis=C.busy;
  const eh=document.getElementById("ehp");if(eh&&C.phase>1&&!/\[/.test(eh.textContent))eh.textContent+="  ["+(C.phase>2?"FINAL PHASE":"Enraged")+"]";
  const warn=b=>{b.style.borderColor="#e0553a";b.style.fontWeight="700";b.style.gridColumn="1/-1";return b};
  if(!mm&&C.wind&&!dis){
   const w=C.wind,tier=C.tier||0,first=m.firstChild,list=[];
   list.push(warn(btn("⚠ Dodge — DEX check vs DC "+(12+tier)+": slip it completely",()=>heroAct(()=>{
    const r=TAC.check("Dodge","DEX",12+tier,{nat20:"You read it perfectly and are already moving. The blow will find nothing.",big:"You see the strike coming and shift your weight. You will slip it.",ok:"You read its shoulders and judge the timing. You should slip it.",fail:"You misjudge the timing. The blow will land.",nat1:"You step the wrong way, straight into its path. Your armor class drops by two."});
    if(r.ok)w.dodged=true;else if(r.nat1){C.ward-=2;C.brace=(C.brace||0)-2}}),"alt")));
   list.push(warn(btn("⚠ Brace for impact — +5 AC against this blow",()=>heroAct(()=>{C.ward+=5;C.brace=(C.brace||0)+5;log("You set your feet and brace: +5 AC until its next attack.");say2("You set your feet, guard high, and brace for the "+w.name.toLowerCase()+". Armor class rises by five until it lands.");try{sfx("miss")}catch(x){}}),"alt")));
   list.push(warn(btn("⚠ Interrupt — hit it first to break the "+w.name,()=>heroAct(()=>{const hp0=C.e.hp;say2("You surge forward to break it before it lands.");weaponAttack();
    if(C&&!C.over&&C.wind===w&&C.e.hp<hp0){C.wind=null;C.windCool=1;C.e.skip=Math.max(C.e.skip,1);log("Interrupted! The "+w.name+" collapses and the foe staggers.");say2("Your blow lands, and the "+w.name+" collapses unfinished! "+cap(the(C.e.name))+" staggers and loses its turn.",true);try{BN.banner("INTERRUPTED!")}catch(x){}}
    else if(C&&!C.over&&C.wind===w){say2("You miss your chance, and the "+w.name+" is still coming.")}}),"alt")));
   const p=document.createElement("p");p.style.cssText="grid-column:1/-1;margin:0;color:#ff9a86;font-weight:700";p.textContent="⚠ "+C.e.name+" is winding up a "+w.name+". Choose your answer.";
   list.reverse().forEach(b=>m.insertBefore(b,first));m.insertBefore(p,m.firstChild)}
  else if(mm==="tac"){
   const back=[...m.children].reverse().find(b=>/^Back/.test(b.textContent));
   herbs().forEach(n=>{const pl=ITEMS[n].pl,h=HERB[pl],b=btn(n+" x"+hero.inv[n]+" ("+pl+") — "+h.n+": "+h.d,()=>heroAct(()=>{useHerb(n)}),"alt",dis);m.insertBefore(b,back)})}
  else if(!mm&&!dis){
   const hs=herbs();if(!hs.length)return;const hpF=hero.hp/maxHP(),e=C.e;let pick=null,why="";
   for(const n of hs){const pl=ITEMS[n].pl;
    if(hpF<.5&&(pl==="Sun"||pl==="Jupiter"||pl==="Venus")){pick=n;why="you are at "+hero.hp+" HP";break}
    if(e.undead&&pl==="Sun"){pick=n;why="sunlight scorches the undead";break}
    if(e.hp/e.max>.6&&pl==="Mars"&&!(C.fd>=3)){pick=n;why="Mars makes every blow count";break}}
   if(pick){const pl=ITEMS[pick].pl,b=btn("★ "+pick+" ("+pl+") — "+why,()=>heroAct(()=>{useHerb(pick)}),"alt");b.style.borderColor="#c9a24a";b.style.fontWeight="700";b.style.gridColumn="1/-1";const at=[...m.children].find(x=>/^Attack/.test(x.textContent));m.insertBefore(b,at||m.firstChild)}}
 };
 window.C2={HERB,herbs,useHerb,phase};
})();

// ===== planetary clock UI: pill, popover, hour-change alerts, battle-menu resonance marks =====
(function(){
 if(!window.PCK)return;
 const css=document.createElement("style");css.textContent=`
#pclock{position:absolute;left:10px;bottom:8px;z-index:4;background:rgba(20,16,12,.78);border:1px solid #8a7440;color:#f2e2b0;padding:3px 11px;border-radius:14px;font-size:.78rem;cursor:pointer;white-space:nowrap;font-family:inherit;line-height:1.3}
@media(pointer:coarse){#pclock{left:auto;right:10px}#pclockp{left:auto;right:10px}}
#pclock.hot{border-color:#ffd878;box-shadow:0 0 10px 2px rgba(255,210,110,.55);animation:pcg 2.2s ease-in-out infinite}
@keyframes pcg{50%{box-shadow:0 0 16px 5px rgba(255,210,110,.8)}}
#pclockp{position:absolute;left:10px;bottom:36px;z-index:6;width:min(92%,380px);max-height:70%;overflow:auto;background:rgba(18,14,10,.95);border:1px solid #8a7440;border-radius:8px;padding:10px 12px;color:#eadcb8;font-size:.82rem}
#pclockp h4{margin:0 0 4px;font-size:.95rem;color:#ffd878}
#pclockp .r{display:flex;justify-content:space-between;gap:8px;padding:1px 0}
#pclockp .hl{color:#ffd878}
#pclockp small{color:#a99a74;display:block;margin-top:6px}
.pcl{background:rgba(120,90,20,.35);border:1px solid #c9a24a;color:#ffe9a8;border-radius:5px;padding:4px 8px;margin:2px 0 6px;font-size:.8rem;text-align:left}
#cmenu button.pres{box-shadow:0 0 9px 1px rgba(255,210,110,.65);border-color:#ffd878!important}
#cmenu button.pres b{color:#ffd878}
`;document.head.appendChild(css);
 const view=document.getElementById("view");
 const pill=document.createElement("button");pill.id="pclock";pill.type="button";
 const pop=document.createElement("div");pop.id="pclockp";pop.hidden=true;
 ["pointerdown","pointermove","pointerup","click"].forEach(ev=>{pill.addEventListener(ev,e=>e.stopPropagation());pop.addEventListener(ev,e=>e.stopPropagation())});
 if(view){view.parentNode.appendChild(pill);view.parentNode.appendChild(pop)}
 const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
 const xs=m=>"x"+(m%1?String(m):m);
 function render(){
  const c=PCK.now(),h=c.hour,d=c.day,res=PCK.resonant();
  pill.textContent=h.g+" "+h.n+" hour · "+d.g+" "+d.n+" day · "+fmt(c.left)+(res.length?"  ✦"+res.length:"");
  pill.classList.toggle("hot",res.some(r=>r.m>=2));
  if(!pop.hidden){
   const sc=PCK.sched(8);
   let t="<h4>Planetary clock</h4>";
   t+="<div class='r'><span>Day ruler</span><span class='hl'>"+d.g+" "+d.n+" · "+d.m+" · "+PCK.EL[d.n]+" "+PCK.ELS[PCK.EL[d.n]]+"</span></div>";
   t+="<div class='r'><span>Hour ruler</span><span class='hl'>"+h.g+" "+h.n+" · "+h.m+" · "+PCK.EL[h.n]+" "+PCK.ELS[PCK.EL[h.n]]+"</span></div>";
   t+="<div class='r'><span>Next hour in</span><span>"+fmt(c.left)+"</span></div>";
   t+="<h4 style='margin-top:8px'>Resonant on hand</h4>";
   t+=res.length?res.map(r=>"<div class='r'><span>"+r.name+" <small style='display:inline'>("+r.kind+")</small></span><span class='hl'>"+PCK.plObj(r.pl).g+" "+xs(r.m)+"</span></div>").join(""):"<div class='r'><span>Nothing you carry matches this moment.</span></div>";
   t+="<h4 style='margin-top:8px'>Coming hours</h4>"+sc.slice(1).map(s=>"<div class='r'><span>"+s.pl.g+" "+s.pl.n+" ("+PCK.EL[s.pl.n]+" "+PCK.ELS[PCK.EL[s.pl.n]]+")</span><span>in "+fmt(s.inMs)+" <button data-w='"+s.pl.n+"' style='font-size:.72rem;padding:1px 6px'>Wait · 10 gp</button></span></div>").join("");
   t+="<small>Power by correspondence: matching hour ×2 · matching day ×1.5 · both ×3 (×2.5 in battle) · same element ×1.25. In battle, after three amplified actions the heavens tire and the bonus halves. Applies to weapons, spells, herbs, potions, artifacts and healing. Grimoires gain bonus lore when read in their hour; herbs gathered in their hour yield extra.</small>";
   pop.innerHTML=t;pop.querySelectorAll('button[data-w]').forEach(b=>{b.onclick=e=>{e.stopPropagation();waitFor(b.dataset.w)}})}}
 function waitFor(n){if(!hero||(typeof C!=="undefined"&&C)||(typeof D!=="undefined"&&D))return;if(hero.gold<10){say("Burning the incense to pass the hours costs 10 gp.");return}hero.gold-=10;const a=PCK.skipTo(n);hero.clockOff=PCK.OFF;try{hud()}catch(e){}say("You burn incense and meditate until the hour of "+n+" begins.");try{flash("rgba(255,225,140,.35)")}catch(e){}tick();render()}
 PCK.waitFor=waitFor;
 pill.onclick=()=>{pop.hidden=!pop.hidden;render()};
 // ---- hour change / resonance alerts ----
 let lastKey="",lastSig="";
 function sig(){return PCK.resonant().filter(r=>r.m>=2).map(r=>r.name).join(",")}
 function listTxt(res,n){const top=res.slice(0,n).map(r=>r.name+" "+xs(r.m));return top.join(", ")+(res.length>n?" and "+(res.length-n)+" more":"")}
 function tick(){
  try{if(hero&&hero.clockOff!=null&&PCK.OFF!==hero.clockOff)PCK.setOff(hero.clockOff)}catch(e){}
  render();
  const c=PCK.now(),key=c.hour.n+"|"+c.day.n+"|"+c.h;
  if(key===lastKey)return;const first=lastKey==="";lastKey=key;
  const res=PCK.resonant();
  if(first){lastSig=sig();return}
  let msg="The hour of "+c.hour.n+" begins ("+c.hour.g+").";
  const strong=res.filter(r=>r.m>=2);
  if(strong.length)msg+=" ✦ Resonant now: "+listTxt(strong,4)+".";
  try{
   if(typeof C!=="undefined"&&C&&!C.over){
    try{BN.skip=1}catch(e){}clog("✦ "+msg);
    if(strong.length){try{BN.push("The hour turns to "+c.hour.n+". "+strong.slice(0,3).map(r=>r.name).join(", ")+" now resonate with the heavens. Use them while it lasts!",2)}catch(e){}try{BN.banner(c.hour.g+" HOUR OF "+c.hour.n.toUpperCase())}catch(e){}}
    rc()
   }else if(strong.length||document.visibilityState==="visible"){say(msg)}
  }catch(e){}
  if(strong.length){try{if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}}
  lastSig=sig();
 }
 setInterval(tick,1000);setTimeout(tick,300);
 PCK.tick=tick;
 // ---- announce at the start of a fight ----
 try{const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);
  setTimeout(()=>{try{if(typeof C==="undefined"||!C||C.over)return;const res=PCK.resonant().filter(x=>x.m>=2);
   const c=PCK.now();
   if(res.length){const t=c.hour.g+" "+c.hour.n+" hour: "+listTxt(res,4)+" — use them now for amplified power.";try{BN.skip=1}catch(e){}clog("✦ "+t);try{BN.push("The "+c.hour.n+" hour burns overhead. "+res.slice(0,3).map(x=>x.name).join(", ")+(res.length>1?" are":" is")+" in tune with the heavens. Use "+(res.length>1?"them":"it")+" now!",2)}catch(e){}try{BN.banner(c.hour.g+" "+c.hour.n.toUpperCase()+" HOUR")}catch(e){}rc()}}catch(e){}},1100);
  return r};}catch(e){}
 // ---- battle menu: mark resonant buttons, add info line ----
 function nameMap(){
  const m={};const w=hero.eq&&hero.eq.w;
  if(w){["Attack","Power Attack","Precise Strike","Aimed Strike","Feint","Trip"].forEach(n=>m[n]=w)}
  try{(TAC.ART||[]).forEach(a=>{m[a.name]=a.item})}catch(e){}
  return m}
 function mark(){
  const menu=document.getElementById("cmenu");if(!menu||typeof C==="undefined"||!C||C.over)return;
  const nm=nameMap();const spellNames=Object.keys(SPELLS),itemNames=Object.keys(ITEMS);
  Array.from(menu.querySelectorAll("button")).forEach(b=>{
   if(b.dataset.pm)return;b.dataset.pm=1;
   let t=b.textContent.replace(/^★\s*/,"").replace(/^✦\s*/,"");
   let pl=null,label="";
   const stop=t.search(/ \(| x\d| — | - /);const head=stop>0?t.slice(0,stop):t;
   if(nm[head]){pl=PCK.planetOfItem(nm[head]);label=nm[head]}
   else if(SPELLS[head]){pl=PCK.planetOfSpell(head);label=head}
   else if(ITEMS[head]){pl=PCK.planetOfItem(head);label=head}
   else{for(const n of itemNames){if(t.indexOf(n)===0||t.indexOf(n+" ")>=0&&t.indexOf(n)<12){pl=PCK.planetOfItem(n);label=n;break}}}
   if(!pl)return;
   const mm=PCK.mult(pl);if(mm.m<=1)return;
   b.classList.add("pres");b.insertAdjacentHTML("beforeend"," <b>✦"+xs(mm.m)+" "+PCK.plObj(pl).g+"</b>");
  });
  if(!menu.querySelector(".pcl")){
   const c=PCK.now(),res=PCK.resonant().filter(r=>r.m>1);
   const d=document.createElement("div");d.className="pcl";
   d.textContent=c.hour.g+" Hour of "+c.hour.n+" · "+c.day.g+" day of "+c.day.n+" · next hour in "+fmt(c.left)+(res.length?" — resonant: "+listTxt(res,3):"");
   menu.insertBefore(d,menu.firstChild)}
 }
 try{const _rc=rc;rc=function(){const r=_rc.apply(this,arguments);try{mark()}catch(e){if(window.console)console.warn("[pui]",e.message)}return r}}catch(e){}
})();

// ===== Quest log + the three-act story: "The Stuttering Hour" =====
(function(){
 const SHARD={crypt:"Saturn",mine:"Mars",lair:"Jupiter",sunk:"Venus",tomb:"Mercury",cave:"Moon"};
 const BOSSN={crypt:"the Hollow King",mine:"Foreman Gorrum",lair:"the Barrow Giant",sunk:"the Sanctum Hydra",tomb:"the Dune King",cave:"the Wyrmfrost Drake"};
 const PLNAME=n=>(PLN.find(p=>p.n===n)||{});
 // shard items
 PLN.forEach(p=>{const nm="Shard of "+p.n;ITEMS[nm]={t:"k",desc:"A fragment of the "+p.n+" sphere, still ringing faintly. "+(window.PCK?"["+PCK.describe(p.n)+"]":"")};if(window.PCK){PCK.ITEMP[nm]=p.n;ITEMS[nm].alch=PCK.describe(p.n)}});
 const Q=()=>{if(!hero)return null;if(!hero.q)hero.q={act:1,ok:{},fl:{},shards:{},kills:0,sites:{},tp:0,tpSpent:0,seen:{}};if(!hero.q.sites)hero.q.sites={};if(hero.tp==null)hero.tp=0;return hero.q};
 const dgWon=id=>!!(hero.dg&&hero.dg[id]&&hero.dg[id].clr&&hero.dg[id].clr[5]);
 const nSeals=()=>Object.keys(OCCP().seals||{}).length,nRead=()=>Object.keys(OCCP().read||{}).length,nHerbs=()=>Object.keys(OCCP().herbs||{}).length;
 const haveShards=()=>PLN.filter(p=>p.n!=="Sun"&&Q().shards[p.n]).length;
 // objectives: id, act, text, done(), prog(), where, reward, hint
 const OBJ=[
  {id:"a1",act:1,t:"Hear Brother Anselm's warning at the Whisper Shrine",done:()=>Q().fl.anselm,hint:"The little shrine is near the village. Brother Anselm keeps it.",r:{xp:40}},
  {id:"a2",act:1,t:"Climb the Watchtower and ask Sergeant Voss what he has seen",done:()=>Q().fl.tower,hint:"Climb to the lookout from inside the watchtower.",r:{xp:60}},
  {id:"a3",act:1,t:"Gather three kinds of herb so Morrigan can test the old rhythms",done:()=>nHerbs()>=3,prog:()=>Math.min(3,nHerbs())+"/3",hint:"Green patches by the road hold planetary herbs. Pick them in their own hour for more.",r:{xp:60,items:["Healing potion"]}},
  {id:"a4",act:1,t:"Descend into the Crypt and defeat the Hollow King",done:()=>dgWon("crypt"),poi:"crypt",hint:"A hidden crypt entrance lies in the forest.",r:{xp:200,gold:80}},
  {id:"a5",act:1,t:"Return to Brother Anselm with the Shard of Saturn",done:()=>Q().fl.ret1,hint:"Speak to Anselm and ask about the stars.",r:{xp:100}},
  {id:"b1",act:2,t:"Study three planetary seals at the Circle of the Seven Seals",done:()=>nSeals()>=3,prog:()=>Math.min(3,nSeals())+"/3",poi:"seals",hint:"Stand at the stones and choose a Seal to study.",r:{xp:150}},
  {id:"b2",act:2,t:"Read a grimoire and learn its spell",done:()=>nRead()>=1,hint:"Grimoires are found in occult sites. Read them from your Pack.",r:{xp:100}},
  {id:"b3",act:2,t:"Defeat Foreman Gorrum in the Forge of the Deep",done:()=>dgWon("mine"),poi:"mine",hint:"Iron and fire: a mine in the mountains.",r:{xp:250,gold:100}},
  {id:"b4",act:2,t:"Defeat the Sanctum Hydra in the drowned temple",done:()=>dgWon("sunk"),poi:"sunk",hint:"Venus sleeps where the water is still: the swamp.",r:{xp:250,gold:100}},
  {id:"b5",act:2,t:"Defeat the Wyrmfrost Drake in its frozen cave",done:()=>dgWon("cave"),poi:"cave",hint:"The Moon's shard is cold: look in the tundra.",r:{xp:250,gold:100}},
  {id:"b7",act:2,t:"Solve a puzzle chamber (Ziggurat, Seals, Athanor, Rune-Stones, Archon's Gate, Pyramid, Frozen Temple, Obelisk or Ruins)",done:()=>Object.keys(Q().pz||{}).length>=1,hint:"Open an occult site and choose its chamber. Each solved chamber gives a talent point.",r:{xp:150,tp:1}},
  {id:"b8",act:2,t:"Take a fifth shard: the Dune King (Mercury) or the Barrow Giant (Jupiter)",done:()=>dgWon("tomb")||dgWon("lair"),hint:"The Dune King sleeps under the desert. The Barrow Giant keeps a mound in the hills. Either will do for now.",r:{xp:250,gold:100}},
  {id:"b6",act:2,t:"Return to Brother Anselm with five shards",done:()=>Q().fl.ret2,hint:"Speak to Anselm and ask about the stars.",r:{xp:150}},
  {id:"c1",act:3,t:"Defeat the Dune King in the Burial Chamber",done:()=>dgWon("tomb"),poi:"tomb",hint:"Mercury's shard lies under the desert sand.",r:{xp:300,gold:120}},
  {id:"c2",act:3,t:"Defeat the Barrow Giant in its mound",done:()=>dgWon("lair"),poi:"lair",hint:"Jupiter's shard is kept in a giant's mound in the hills.",r:{xp:300,gold:120}},
  {id:"c3",act:3,t:"Forge the Sun shard at the Ouroboros Athanor",done:()=>Q().fl.sunforged,poi:"athanor",hint:"Bring six shards to the great furnace in the desert.",r:{xp:300}},
  {id:"c4",act:3,t:"Begin the Great Work at the Circle of the Seven Seals",done:()=>Q().fl.victory,poi:"seals",hint:"Carry all seven shards to the Circle. Fight the Unmoved One. The Sun's hour favours you.",r:{xp:1000,gold:500}}];
 const SIDE=[
  {id:"s8",t:"The Seven Hours: pass the trial of every Day-Temple",done:()=>!!(window.DAYT&&DAYT.nDone()>=7),prog:()=>Math.min(7,window.DAYT?DAYT.nDone():0)+"/7",hint:"Each temple keeps one planet's hour: Saturn in the tundra, Jupiter and Venus in the green lands, Mars in the peaks, the Sun in the sand, Mercury on the causeway in the bog, the Moon by her pool. Bring two of that planet's herbs in its hour or on its day.",r:{xp:500,tp:2,items:["Heptad Seal"]}},
  {id:"s1",t:"Cull the wild: defeat 6 foes",done:()=>Q().kills>=6,prog:()=>Math.min(6,Q().kills)+"/6",hint:"Anything that attacks you counts.",r:{xp:80,gold:40,tp:1}},
  {id:"s2",t:"Pilgrim: visit 4 occult sites",done:()=>Object.keys(Q().sites).length>=4,prog:()=>Math.min(4,Object.keys(Q().sites).length)+"/4",hint:"Stand at a site and press E to open it.",r:{xp:120,tp:1}},
  {id:"s3",t:"Herbalist: know 6 kinds of herb",done:()=>nHerbs()>=6,prog:()=>Math.min(6,nHerbs())+"/6",hint:"Seven planets, seven herb families.",r:{xp:120,items:["Healing potion"],tp:1}},
  {id:"s5",t:"Adept: solve 4 puzzle chambers",done:()=>Object.keys(Q().pz||{}).length>=4,prog:()=>Math.min(4,Object.keys(Q().pz||{}).length)+"/4",hint:"Chambers: Ziggurat, Seals, Athanor, Rune-Stones, Archon's Gate, Pyramid, plus the Frozen Temple, Sunscar Obelisk and Highcairn Ruins, which you can walk into.",r:{xp:250,tp:2}},
  {id:"s6",t:"Alchemist: consecrate a planetary talisman at the Athanor's altar",done:()=>Object.keys(Q().alt||{}).length>=1,hint:"You need 3 herbs and an elixir of one planet, and the altar must be used in that planet's own hour.",r:{xp:200,tp:1}},
  {id:"s4",t:"Scholar: learn 3 spells from grimoires",done:()=>nRead()>=3,prog:()=>Math.min(3,nRead())+"/3",hint:"Each grimoire teaches one spell.",r:{xp:150,tp:1}}];
 const ACTS={
  1:{t:"Act I: The Stuttering Hour",s:"The hours of the day have begun to slip. Bells ring out of turn and the herbs wilt in their own hour. Brother Anselm says the old order is failing."},
  2:{t:"Act II: The Wandering Stars",s:"Each wandering star has a shard of its sphere hidden in the dark. Something is stealing their motion, and the Unmoved One is waking."},
  3:{t:"Act III: The Great Conjunction",s:"Six shards will not be enough alone. Forge the seventh and carry them to the Circle of the Seven Seals."},
  4:{t:"Epilogue: The Hours Turn Again",s:"The Unmoved One is no more. The hours move once more, and the stars wander as they should."}};
 const objs=()=>OBJ.filter(o=>o.act===Q().act);
 // ---------- notification ----------
 function ding(txt,sub){
  try{say(txt)}catch(e){}try{sfx("win")}catch(e){}
  try{if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}
  try{const j=document.getElementById("jrnbtn");if(j){j.classList.add("new");j.dataset.n=(+j.dataset.n||0)+1}}catch(e){}
  try{if(window.OV&&sub!==false)OV.say(txt,"dm")}catch(e){}}
 function reward(r,label){if(!r)return;const out=[];
  if(r.xp)addXp(r.xp,out);if(r.gold){hero.gold+=r.gold;out.push("+"+r.gold+" gp.")}
  (r.items||[]).forEach(n=>{giveItem(n);out.push("+"+n)});
  if(r.tp){hero.tp=(hero.tp||0)+r.tp;out.push("+"+r.tp+" talent point"+(r.tp>1?"s":""))}
  try{fixStats();hud()}catch(e){}return out.join(" ")}
 function complete(o,side){const q=Q();if(q.ok[o.id])return;q.ok[o.id]=1;const rw=reward(o.r);ding((side?"Side quest complete: ":"Objective complete: ")+o.t+". "+rw,false)}
 // ---------- shards from bosses ----------
 function grantShards(){const q=Q();Object.keys(SHARD).forEach(id=>{const pl=SHARD[id];if(dgWon(id)&&!q.shards[pl]){q.shards[pl]=1;giveItem("Shard of "+pl);
   const msg="With "+BOSSN[id]+" fallen, a shard of "+pl+" rises from the dark and settles in your hand. "+PLNAME(pl).g;
   ding(msg);try{BN.banner(PLNAME(pl).g+" SHARD OF "+pl.toUpperCase())}catch(e){}}})}
 // ---------- main poll ----------
 let t0=0;
 function tick(){
  if(!hero||typeof C==="undefined"||C)return;const q=Q();if(!q)return;
  if(!q.fl.prologue){q.fl.prologue=1;setTimeout(()=>{try{ding("A tale begins. Something is wrong with the hours of Occultica. Press J to open your Journal.")}catch(e){}},1500)}
  grantShards();
  OBJ.filter(o=>o.act<=q.act).forEach(o=>{if(!q.ok[o.id]&&o.done&&o.done())complete(o)});
  SIDE.forEach(o=>{if(!q.ok[o.id]&&o.done())complete(o,true)});
  const jb=document.getElementById("jrnbtn");if(jb)jb.textContent="Journal (J)"+(jb.dataset.n>0?" ●":"");
 }
 setInterval(tick,1000);
 // ---------- kills ----------
 try{const _ec=endCombat;endCombat=function(){const won=C&&C.won;const r=_ec.apply(this,arguments);try{if(won&&hero){Q().kills++;}}catch(e){}return r}}catch(e){}
 try{const _os=openSite;openSite=function(p){try{if(hero)Q().sites[p.id]=1}catch(e){}return _os.apply(this,arguments)}}catch(e){}
 // ---------- compass hints ----------
 function dirTo(id){const p=POIS.find(x=>x.id===id);if(!p)return"";const dx=p.x-hx,dy=p.y-hy,d=Math.round(Math.hypot(dx,dy));if(d<4)return"You are here.";
  const a=Math.atan2(dy,dx)*180/Math.PI,names=["east","south-east","south","south-west","west","north-west","north","north-east"];const n=names[(Math.round(a/45)+8)%8];
  return "About "+d+" paces "+n+(found[id]?"":" (undiscovered)")}
 // ---------- story panels ----------
 function panel(title,paras,btnTxt,after,col){const b=occPanel(title,col||"#ffd878");try{if(window.SEAL&&/Seals|Athanor|Shard of|Turn Again/.test(title))b.appendChild(SEAL.meter(130,{all:/Turn Again/.test(title)}))}catch(e){}paras.forEach(p=>b.appendChild(el("p",p,"say")));
  try{if(window.OV)OV.say(paras.join(" "),"dm")}catch(e){}
  b.appendChild(btn(btnTxt||"Continue",()=>{try{OV.stop()}catch(e){}occClose();if(after)after()},"go"))}
 const STORY={
  intro:["Brother Anselm lifts his eyes from the candle. 'You came. Good. Listen, traveller. The hours of this world are kept by seven wandering stars, and each star governs its own hour, its own herbs, its own metal. Lately the hours stutter. Bells ring wrong. Herbs wilt in their hour. Wounds that should close will not.'",
   "'Sergeant Voss on the Watchtower says the stars themselves have slowed. Morrigan in the hut says the herbs remember the old rhythm. And below the forest, in the crypt, the Hollow King has woken and will not say who woke him. Hear them. Then go down.'"],
  ret1:["You lay the Shard of Saturn on the altar. It rings low and the candles lean toward it.",
   "'Saturn, the slowest of the wanderers, and the first to stop,' Anselm says. 'The Hollow King was only a gaoler. Something older holds the rest. It is the Unmoved One, and it hates every motion. Six more spheres, six more shards. The seals at the Circle will teach you to read them. Go and gather the others.'"],
  ret2:["Five shards now glow on the altar, each tuned to its own hour. Anselm is pale but smiling.",
   "'The Unmoved One is close. It cannot bear the sound of the spheres together. Bring back the last of the shards, then take the Sun's own to the Athanor, where the Great Work is begun. The Sun cannot be taken. It must be made.'"],
  forge:["You set the six shards in the mouth of the furnace. The serpent above the door bites its tail and the whole athanor roars.",
   "Gold, then white, then red. When the heat dies, a seventh shard lies in the ash: the Shard of the Sun, warm as a living hand."],
  fight:["You set the seven shards into the seven standing stones. Each rings in its own pitch, a chord that has not sounded in a hundred years.",
   "The air folds. A figure stands motionless at the centre of the ring, as still as a held breath. The Unmoved One turns, and for the first time in an age, something in the world moves toward it."],
  end:["The Unmoved One cracks like frozen water. For one breath all seven shards sing together, then rise from the stones and wheel overhead.",
   "Bells ring in the village, in the right hour. The herbs lift their heads. The wandering stars wander again, and Occultica remembers its time. Brother Anselm will say you are a hero. For tonight, you only need to sleep."]};
 function talkBeat(d){const q=Q(),a=q.act;
  if(a===1&&!q.fl.anselm){panel("Brother Anselm",STORY.intro,"I will go",()=>{q.fl.anselm=1;tick()});return true}
  if(a===1&&q.ok.a1&&q.ok.a2&&q.ok.a3&&q.ok.a4&&!q.fl.ret1){panel("The Shard of Saturn",STORY.ret1,"Onward",()=>{q.fl.ret1=1;q.act=2;hero.tp=(hero.tp||0)+1;tick();ding("Act II begins: The Wandering Stars. +1 talent point.")});return true}
  if(a===2&&["b1","b2","b3","b4","b5","b7","b8"].every(k=>q.ok[k])&&!q.fl.ret2){panel("Five Shards",STORY.ret2,"Onward",()=>{q.fl.ret2=1;q.act=3;hero.tp=(hero.tp||0)+1;tick();ding("Act III begins: The Great Conjunction. +1 talent point.")});return true}
  return false}
 // ---------- Anselm / Voss / Morrigan dialogue ----------
 const VOSS=["'Thirty years I've watched that sky. The Sun used to stand at noon like a nail. Now it lurches. The stars are running down, I tell you.'","'Climb up, take the lookout. Get a view of the land, then go kill whatever's chewing the hours.'"];
 const MORR=["'The herbs know their hour. Pick wormwood under Mars and it bites like iron. Pick it out of turn and it's just a weed. That is why you must gather in their hour.'","'Bring me proof the old rhythm still holds: three kinds of herb, any three. Then I'll trust you with the rest.'"];
 try{const _rd=renderDlg;renderDlg=function(){_rd.apply(this,arguments);try{
   const n=D&&D.n;if(!n||!hero)return;const q=Q(),m=document.querySelector("#dlgbox .menu");if(!m)return;
   let add=null;
   if(/Anselm/.test(n.name)){const can=(q.act===1&&!q.fl.anselm)||(q.act===1&&q.ok.a1&&q.ok.a2&&q.ok.a3&&q.ok.a4&&!q.fl.ret1)||(q.act===2&&["b1","b2","b3","b4","b5","b7","b8"].every(k=>q.ok[k])&&!q.fl.ret2);
    add=btn((can?"★ ":"")+"Speak of the stars",()=>{if(!talkBeat()){const nxt=objs().filter(o=>!q.ok[o.id]).map(o=>o.t);const txt=q.act>3?"The hours turn as they should. Rest, traveller.":"'Still to do: "+nxt.slice(0,3).join("; ")+".'";dsay(txt)}else{closeDlg()}},can?"go":"alt")}
   else if(/Voss/.test(n.name))add=btn("Ask about the sky",()=>dsay(VOSS[q.fl.tower?1:0]));
   else if(/Morrigan/.test(n.name))add=btn("Ask about the herbs",()=>dsay(MORR[nHerbs()>=3?1:0]));
   if(add)m.insertBefore(add,m.lastChild)}catch(e){if(window.console)console.warn("[quests]",e.message)}}}catch(e){}
 // first meeting opens the story at once
 try{const _tk=talk;talk=function(n){const r=_tk.apply(this,arguments);try{if(hero&&n&&/Anselm/.test(n.name)&&!Q().fl.anselm&&Q().act===1){setTimeout(()=>{if(D&&D.n===n){closeDlg();talkBeat()}},200)}}catch(e){}return r}}catch(e){}
 // ---------- Athanor forge + finale at the Circle ----------
 function addActs(){try{
  const A=SITES.athanor;if(A&&A.acts&&!A._q){A._q=1;A.acts.push({t:()=>Q().fl.sunforged?"The Shard of the Sun is forged":"Forge the Shard of the Sun (needs six shards)",dis:()=>Q().fl.sunforged||haveShards()<6,hide:()=>Q().act<3&&haveShards()<6&&!Q().fl.sunforged,f:p=>{const q=Q();q.fl.sunforged=1;q.shards.Sun=1;giveItem("Shard of Sun");occClose();panel("The Athanor",STORY.forge,"Take it",()=>{tick();ding("The Shard of the Sun is yours: "+PLNAME("Sun").g)},"#ffa040")}})}
  const S=SITES.seals;if(S&&S.acts&&!S._q){S._q=1;S.acts.push({t:()=>Q().fl.victory?"The Great Work is complete":"Begin the Great Work (needs all seven shards)",dis:()=>Q().fl.victory||PLN.some(p=>!Q().shards[p.n]),hide:()=>!Q().fl.sunforged&&!Q().fl.victory,f:p=>{occClose();panel("The Circle of the Seven Seals",STORY.fight,"Face it",()=>window.FINALE?FINALE.start():finale(),"#c0a8ff")}})}
 }catch(e){}}
 addActs();
 function finale(){const q=Q();
  const f=["The Unmoved One",160,16,7,2,8,4,3000,3,"#d8d0ff","",0];
  startCombat(f,3,won=>{if(won){q.fl.victory=1;q.act=4;hero.tp=(hero.tp||0)+3;tick();panel("The Hours Turn Again",STORY.end.slice(0,1).concat(window.COR?[COR.ending()]:STORY.end.slice(1,2),["You have earned the title Hero of Occultica. +3 talent points. Your tale: level "+hero.level+", "+Object.keys(q.pz||{}).length+" puzzle chambers solved, "+Object.keys(hero.tl||{}).length+" talents, "+q.kills+" foes defeated, "+Object.keys(OCCP().herbs||{}).length+" herbs known. The land is still yours to explore."]),"The end, and the beginning",()=>{ding("Epilogue: the hours turn again.")},"#ffd878")}else{say("The Unmoved One stands unharmed. The shards are still yours. Return when you are ready.")}});
  try{C.boss=true;C.windP=1;const sun=PCK&&(PCK.now().hour.n==="Sun"||PCK.now().day.n==="Sun");
   if(sun){C.fhOnce=(C.fhOnce||0)+3;hero.hp=maxHP();try{BN.banner("☉ SUN'S BLESSING")}catch(e){}clog("The Sun's hour burns overhead. You are healed and fortified.")}else clog("Tip: the Sun's hour or day would favour you here.");rc()}catch(e){}}
 // ---------- Journal ----------
 function openJournal(){if(!hero||C||D||DG||occOpen||packOpen)return;const q=Q(),b=occPanel("Journal","#ffd878");
  try{const j=document.getElementById("jrnbtn");if(j){j.classList.remove("new");j.dataset.n=0;j.textContent="Journal (J)"}}catch(e){}
  const A=ACTS[q.act];b.appendChild(el("h3",A.t));b.appendChild(el("p",A.s,"sub"));
  // shards
  const sh=el("p",PLN.map(p=>(q.shards[p.n]?p.g:"·")).join(" ")+"   Shards: "+Object.keys(q.shards).length+"/7","sub");sh.title="Collected planetary shards";b.appendChild(sh);try{if(window.SEAL)b.appendChild(SEAL.meter(150))}catch(e){}
  b.appendChild(el("p","Puzzle chambers solved: "+Object.keys(q.pz||{}).length,"sub"));b.appendChild(el("p","Talent points: "+(hero.tp||0)+(q.tpSpent?" (spent "+q.tpSpent+")":""),"sub"));
  if(q.act<=3){
   b.appendChild(el("h3","Objectives"));
   objs().forEach(o=>{const ok=q.ok[o.id],done=ok||o.done&&o.done(),row=el("p",(done?"✔ ":"◻ ")+o.t+(!done&&o.prog?" ("+o.prog()+")":""),done?"sub":"say");b.appendChild(row);
    if(!done){const hint=[o.hint,o.poi?dirTo(o.poi):""].filter(Boolean).join(" · ");if(hint)b.appendChild(el("small","     "+hint,"sub"))}})}
  else b.appendChild(el("p","The main story is complete. Seek the side quests and the remaining mysteries.","say"));
  b.appendChild(el("h3","Side quests"));
  SIDE.forEach(o=>{const done=q.ok[o.id];b.appendChild(el("p",(done?"✔ ":"◻ ")+o.t+(!done&&o.prog?" ("+o.prog()+")":"")+(o.r.tp&&!done?"  [+1 talent point]":""),done?"sub":"say"))});
  const m=el("div",null,"menu");m.appendChild(btn("Close",occClose,"go"));b.appendChild(m)}
 const row=(document.getElementById("packbtn")||{}).parentNode;if(row){const j=document.createElement("button");j.className="alt";j.id="jrnbtn";j.textContent="Journal (J)";j.onclick=()=>window.QST.openJournal();row.insertBefore(j,row.children[1]||null)}
 const st=document.createElement("style");st.textContent="#jrnbtn.new{box-shadow:0 0 10px 2px rgba(255,210,110,.8);border-color:#ffd878}";document.head.appendChild(st);
 addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key==="j"||e.key==="J"){if(occOpen){occClose()}else window.QST.openJournal()}});
 window.QST={panel,ding,reward,OBJ,SIDE,Q,tick,openJournal,finale,talkBeat,SHARD,dirTo};
})();

// ===== Puzzle chambers: solve alchemical and planetary logic to earn talent points =====
(function(){
 if(!window.QST)return;
 const Q=QST.Q,P=n=>PLN.find(p=>p.n===n);
 const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const solved=()=>{const q=Q();return q.pz||(q.pz={})};
 const hurt=n=>{try{hero.hp=Math.max(1,hero.hp-n);hud()}catch(e){}};
 let beepCtx=null;function beep(f,d){try{beepCtx=beepCtx||new (window.AudioContext||window.webkitAudioContext)();const o=beepCtx.createOscillator(),g=beepCtx.createGain();o.frequency.value=f;o.type="sine";g.gain.value=.12;g.gain.exponentialRampToValueAtTime(.001,beepCtx.currentTime+(d||.3));o.connect(g);g.connect(beepCtx.destination);o.start();o.stop(beepCtx.currentTime+(d||.3))}catch(e){}}
 const FREQ={Saturn:196,Jupiter:262,Mars:330,Sun:392,Venus:440,Mercury:523,Moon:659};
 const gl=n=>P(n).g+" "+n;
 const wrap=(b,cls)=>{const d=el("div",null,"menu");if(cls)d.style.cssText=cls;b.appendChild(d);return d};
 // ---- common finish ----
 function win(id,title,col,site,flavour){
  const first=!solved()[id];let t="";
  if(first){solved()[id]=Date.now();t=QST.reward({xp:150,gold:60,tp:1});try{QST.ding("Puzzle solved: "+title+". +1 talent point.",false)}catch(e){}try{BN.banner("✦ CHAMBER SOLVED")}catch(e){}QST.tick()}
  try{if(PZ.onWin&&PZ.onWin[id])PZ.onWin[id]()}catch(e){}
  const b=occPanel(title,col);b.appendChild(el("p",flavour,"say"));
  b.appendChild(el("p",first?"The chamber opens its treasury. "+t:"You have solved this chamber before. It rests.","msg"));
  const m=wrap(b);m.appendChild(btn("Back",()=>goBack(site),"go"))}
 function lose(id,title,col,site,why,dmg){hurt(dmg||2);const b=occPanel(title,col);b.appendChild(el("p",why+" A jolt of cold tingles through you.","msg"));const m=wrap(b);m.appendChild(btn("Try again",()=>PZ.run(id,site),"go"));m.appendChild(btn("Leave",()=>goBack(site)))}
 const goBack=site=>{if(site&&site.dg){occClose();try{if(DG)renderDg()}catch(e){}}else if(site&&typeof SITES!=="undefined"&&SITES[site.id])openSite(site);else occClose()};
 const DEF={};
 // ---- 1. Chaldean order (Ziggurat) ----
 DEF.ziggurat={title:"The Seven Heavens Stair",col:"#ffb060",kind:"order",
  intro:"Seven steps, seven stars, but the stair has lost its order. Step on the slowest star first, the swiftest last. The sky's own order is the key.",
  hint:"Saturn crawls through the zodiac; the Moon races around it in a month."};
 DEF.seals={title:"The Saturn Square",col:"#c0a8ff",kind:"square",
  intro:"Saturn's stone holds a square of nine numbers, one to nine, each used once. Every row, every column and both diagonals must give the same sum. Some numbers are already carved."};
 DEF.athanor={title:"The Seven Operations",col:"#ffa040",kind:"ops",
  intro:"Seven plates hang on the athanor wall, each describing one operation of the Great Work. Strike them in the order the work is done."};
 DEF.runes={title:"The Singing Stones",col:"#80d0ff",kind:"memory",
  intro:"Each stone sings in its planet's pitch. Listen to the chant, then sing it back. Three chants, each one longer."};
 DEF.archon={title:"The Turning Rings",col:"#d08fff",kind:"dial",
  intro:"The seven rings of the gate turn with the real heavens. Set the dial to the planet asked for, at the moment you ask. The sky does not wait."};
 DEF.pyramid={title:"Thoth's Catechism",col:"#ffd860",kind:"quiz",
  intro:"The scribe's mouth is carved shut, but his tablet asks. Answer four questions of correspondence. Wrong answers sting."};
 const KIND={};
 KIND.order=(id,site)=>{const D=DEF[id],seq=[];let wrong=0;const order=PLN.map(p=>p.n),lay=sh(order);
  const view=()=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));
   b.appendChild(el("p","Your stair: "+(seq.length?seq.map(n=>P(n).g).join(" → "):"empty"),"say"));if(wrong>=2)b.appendChild(el("small",D.hint,"sub"));
   const m=wrap(b);lay.forEach(n=>{const used=seq.includes(n);m.appendChild(btn(gl(n),()=>{if(order[seq.length]===n){seq.push(n);beep(FREQ[n]);if(seq.length===7)win(id,D.title,D.col,site,"The last step glows. The whole ziggurat hums the planetary scale, from Saturn's low note to the Moon's high one, and the flame on the summit leaps up.");else view()}else{wrong++;hurt(1);b.appendChild(el("p","That star does not come next. The stair shudders (-1 HP).","msg"));seq.length=0;setTimeout(view,900)}},"alt",used))});
   m.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.ops=(id,site)=>{const D=DEF[id];const OPS=[["Calcination","Reduce the matter to ash in a fierce fire."],["Dissolution","Soak the ash in water until it dissolves."],["Separation","Strain out the pure from the dross."],["Conjunction","Marry the purified parts again."],["Putrefaction","Let the union rot in darkness and ferment."],["Distillation","Boil it and catch the rising spirit in cooling drops."],["Coagulation","Fix the volatile spirit into a solid stone."]];
  let k=0;const lay=sh(OPS.map((o,i)=>i));
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));
   if(k)b.appendChild(el("p","Done: "+OPS.slice(0,k).map(o=>o[0]).join(" → "),"say"));if(msg)b.appendChild(el("p",msg,"msg"));
   const m=wrap(b,"display:grid;grid-template-columns:1fr");lay.forEach(i=>{const used=i<k;m.appendChild(btn(OPS[i][1],()=>{if(i===k){k++;beep(300+k*60);if(k===7)win(id,D.title,D.col,site,"The seven plates glow in turn and the Ouroboros loosens its grip on its tail. From the furnace comes a warmth you recognise. The Great Work is a pattern you now understand.");else view()}else{hurt(1);k=0;view("That operation cannot come yet. The work collapses and you start again (-1 HP).")}},"alt",used))});
   m.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.square=(id,site)=>{const D=DEF[id];const base=[4,9,2,3,5,7,8,1,6];let g=base.slice();
  const rot=()=>{const o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o[r*3+c]=g[(2-c)*3+r];g=o},fl=()=>{const o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o[r*3+c]=g[r*3+(2-c)];g=o};
  for(let i=Math.floor(Math.random()*4);i>0;i--)rot();if(Math.random()<.5)fl();
  const keep=sh([0,1,2,3,4,5,6,7,8]).slice(0,3),cur=g.map((v,i)=>keep.includes(i)?v:0);let sel=-1;
  const sums=()=>{const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return L.map(l=>l.map(i=>cur[i]))};
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));
   const gridEl=el("div",null,"menu");gridEl.style.cssText="display:grid;grid-template-columns:repeat(3,64px);gap:6px;align-self:center";
   cur.forEach((v,i)=>{const fixed=keep.includes(i),bb=btn(v?String(v):"·",()=>{if(fixed)return;sel=i;view()},fixed?"alt":(sel===i?"go":"alt"),false);bb.style.fontSize="1.4rem";bb.style.height="56px";if(fixed)bb.style.opacity=.7;gridEl.appendChild(bb)});b.appendChild(gridEl);
   const used=new Set(cur.filter(Boolean));const pad=el("div",null,"menu");pad.style.cssText="display:grid;grid-template-columns:repeat(9,1fr);gap:4px";
   for(let n=1;n<=9;n++)pad.appendChild(btn(String(n),()=>{if(sel<0){const e=cur.findIndex((v,i)=>!v&&!keep.includes(i));if(e<0)return;sel=e}cur[sel]=n;beep(200+n*40,.15);sel=-1;view()},"alt",used.has(n)));b.appendChild(pad);
   if(msg)b.appendChild(el("p",msg,"msg"));
   const m=wrap(b);m.appendChild(btn("Check the square",()=>{if(cur.some(v=>!v)){view("Some cells are empty.");return}
     const S=sums().map(l=>l[0]+l[1]+l[2]);if(S.every(s=>s===15)&&new Set(cur).size===9)win(id,D.title,D.col,site,"The nine numbers glow. Fifteen in every line: Saturn's square is whole. The stone hums the lowest note in the ring.");else{hurt(2);view("Not all lines give the same sum ("+S.join(", ")+"). The stone stings (-2 HP).")}}));
   m.appendChild(btn("Clear mine",()=>{cur.forEach((v,i)=>{if(!keep.includes(i))cur[i]=0});sel=-1;view()},"alt"));m.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.memory=(id,site)=>{const D=DEF[id];const names=PLN.map(p=>p.n);let round=0,seq=[],pos=0,playing=false,mist=0;const lens=[4,5,6];
  const mk=()=>{seq=Array.from({length:lens[round]},()=>names[Math.floor(Math.random()*7)]);pos=0};
  const view=(lit,msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));b.appendChild(el("p","Chant "+(round+1)+" of 3"+(playing?" · listen…":" · sing it back: "+pos+"/"+seq.length),"say"));
   const m=wrap(b);names.forEach(n=>{const bb=btn(gl(n),()=>{if(playing)return;if(seq[pos]===n){beep(FREQ[n]);pos++;if(pos===seq.length){round++;if(round===3){win(id,D.title,D.col,site,"The last note hangs in the air, and all seven stones answer in a chord. Frost on the pool cracks into the shape of a heptagram.");return}mk();play()}else view()}else{beep(110,.4);mist++;hurt(1);if(mist>=3){lose(id,D.title,D.col,site,"The chant breaks into noise.",2);return}pos=0;view(null,"Wrong note (-1 HP). Listen again.");setTimeout(play,900)}},"alt",playing);if(lit===n){bb.style.boxShadow="0 0 14px 4px #ffd878";bb.style.background="#5a4a20"}m.appendChild(bb)});if(msg)b.appendChild(el("p",msg,"msg"));
   m.appendChild(btn("Hear it again",()=>play(),"alt",playing));m.appendChild(btn("Leave",()=>{playing=false;goBack(site)}))};
  function play(){playing=true;let i=0;view();const step=()=>{if(!playing||!document.getElementById("occ")||document.getElementById("occ").hidden)return;if(i>=seq.length){playing=false;pos=0;view();return}view(seq[i]);beep(FREQ[seq[i]],.45);i++;setTimeout(()=>{if(!playing)return;view();setTimeout(step,200)},550)};setTimeout(step,500)}
  mk();play()};
 KIND.dial=(id,site)=>{const D=DEF[id];const Qs=[["the ruler of this HOUR",()=>PCK.now().hour.n],["the ruler of the NEXT hour",()=>PCK.sched(2)[1].pl.n],["the ruler of this DAY",()=>PCK.now().day.n]];let i=0;
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));const c=PCK.now();
   b.appendChild(el("p","Ring "+(i+1)+" of 3: set the dial to "+Qs[i][0]+".","say"));b.appendChild(el("small","The heavens are mid-turn. Your clock pill at the bottom of the view shows the hour. "+Math.ceil(c.left/1000)+"s left in this hour.","sub"));
   if(msg)b.appendChild(el("p",msg,"msg"));const m=wrap(b);PLN.forEach(p=>m.appendChild(btn(gl(p.n),()=>{const ans=Qs[i][1]();if(p.n===ans){beep(FREQ[p.n]);i++;if(i===3)win(id,D.title,D.col,site,"The rings align. Seven heavens, each with its keeper, line up under the gate's black arch. Then they begin to turn again, in the right hour.");else view("Ring set.")}else{hurt(2);view("The rings grind against you (-2 HP). Look at the clock again: the answer is not "+p.n+" right now.")}},"alt")));
   m.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.quiz=(id,site)=>{const D=DEF[id];let right=0;const names=PLN.map(p=>p.n);const DAYN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const gen=()=>{const p=P(names[Math.floor(Math.random()*7)]),t=Math.floor(Math.random()*4);
   if(t===0)return{q:"Which planet is ruled by the metal "+p.m+"?",a:p.n};
   if(t===1)return{q:"Which planet rules "+DAYN[p.d]+"?",a:p.n};
   if(t===2)return{q:"The herb "+p.h[Math.floor(Math.random()*p.h.length)]+" belongs to which planet?",a:p.n};
   const el2=PCK.EL[p.n];return{q:"Which of these is a "+el2+" planet? ("+PCK.ELS[el2]+")",a:p.n,fn:n=>PCK.EL[n]===el2}};
  let cur=gen();
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));b.appendChild(el("p","Answered "+right+" of 4. "+cur.q,"say"));
   if(msg)b.appendChild(el("p",msg,"msg"));const m=wrap(b);
   let opts;if(cur.fn){const ok=names.filter(cur.fn),no=names.filter(n=>!cur.fn(n));opts=sh([ok[Math.floor(Math.random()*ok.length)]].concat(sh(no).slice(0,3)))}else opts=sh([cur.a].concat(sh(names.filter(n=>n!==cur.a)).slice(0,3)));
   opts.forEach(n=>m.appendChild(btn(gl(n),()=>{const good=cur.fn?cur.fn(n):n===cur.a;if(good){right++;beep(FREQ[n]);if(right>=4){win(id,D.title,D.col,site,"The scribe's carved mouth opens a crack, and a dry voice says: 'As above, so below.' The tablet slides aside to show a hollow filled with gold dust.");return}cur=gen();view("Correct.")}else{hurt(2);cur=gen();view("Wrong. The tablet bites (-2 HP).")}},"alt")));
   m.appendChild(btn("Leave",()=>goBack(site)))};view()};

 DEF.ice={title:"The Lantern Ring",col:"#9fd8ff",kind:"lanterns",
  intro:"Seven lanterns of cold flame ring the altar. Touching one turns it and the two beside it, lit to dark and dark to lit. Light all seven."};
 DEF.obelisk={title:"The Obelisk's Cipher",col:"#ffb84a",kind:"cipher",
  intro:"The obelisk hides a code of four different planets in order. Name four. The stone answers each guess: ✦ is the right planet in the right place, • is a right planet in the wrong place. You have ten tries."};
 DEF.ruin={title:"The Portcullis Weights",col:"#d8a070",kind:"hanoi",
  intro:"Four metal discs sit stacked on the left post, heaviest below. Move them all to the right post, one at a time, never setting a heavier disc on a lighter one. The portcullis will not lift until it is done."};
 KIND.lanterns=(id,site)=>{const D=DEF[id];const N=7;let st=Array(N).fill(1),moves=0;
  const press=i=>{[(i+N-1)%N,i,(i+1)%N].forEach(j=>st[j]^=1)};
  do{st=Array(N).fill(1);const k=3+Math.floor(Math.random()*4);for(let t=0;t<k;t++)press(Math.floor(Math.random()*N))}while(st.every(v=>v));
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));b.appendChild(el("p","Moves: "+moves+" · Lit: "+st.filter(Boolean).length+"/7","say"));
   const m=wrap(b);PLN.forEach((p,i)=>{const bb=btn((st[i]?"◉ ":"○ ")+p.g+" "+p.n,()=>{press(i);moves++;beep(FREQ[p.n],.2);if(st.every(v=>v)){win(id,D.title,D.col,site,"The seven flames burn white together, then settle into a single steady ring. The altar splits open along a seam of blue ice.");return}view()},"alt");if(st[i]){bb.style.boxShadow="0 0 10px 2px #bfe8ff";bb.style.color="#e8f6ff"}m.appendChild(bb)});
   if(msg)b.appendChild(el("p",msg,"msg"));const m2=wrap(b);m2.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.cipher=(id,site)=>{const D=DEF[id];const names=PLN.map(p=>p.n);const code=sh(names).slice(0,4);let hist=[],cur=[];
  const score=g=>{let ex=0,pr=0;g.forEach((n,i)=>{if(code[i]===n)ex++;else if(code.includes(n))pr++});return[ex,pr]};
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));
   hist.forEach(h=>b.appendChild(el("p",h.g.map(n=>P(n).g).join(" ")+"   ✦"+h.s[0]+"  •"+h.s[1],"sub")));
   b.appendChild(el("p","Try "+(hist.length+1)+" of 10: "+(cur.length?cur.map(n=>P(n).g).join(" "):"choose four planets"),"say"));if(msg)b.appendChild(el("p",msg,"msg"));
   const m=wrap(b);names.forEach(n=>m.appendChild(btn(gl(n),()=>{if(cur.includes(n))return;cur.push(n);beep(FREQ[n],.15);if(cur.length===4){const s=score(cur);hist.push({g:cur.slice(),s});cur=[];if(s[0]===4){win(id,D.title,D.col,site,"The black stone pulses once and a door of sand parts. The code was "+code.map(n=>P(n).g).join(" ")+". Whoever carved it knew the order of the sky.");return}if(hist.length>=10){lose(id,D.title,D.col,site,"The obelisk falls silent. The code was "+code.map(n=>P(n).g).join(" ")+".",3);return}}view()},"alt",cur.includes(n))));
   const m2=wrap(b);m2.appendChild(btn("Clear this guess",()=>{cur=[];view()},"alt"));m2.appendChild(btn("Leave",()=>goBack(site)))};view()};
 KIND.hanoi=(id,site)=>{const D=DEF[id];const disc=["Sun","Mars","Jupiter","Saturn"];let post=[[3,2,1,0],[],[]],hold=-1,moves=0;
  const lbl=d=>P(disc[d]).g+" "+P(disc[d]).m;
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));b.appendChild(el("p","Moves: "+moves+(hold>=0?" · holding post "+(hold+1):""),"say"));
   const m=wrap(b);m.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:6px";
   post.forEach((st,i)=>{const t=st.length?st.slice().reverse().map(lbl).join("\n"):"(empty)";const bb=btn("Post "+(i+1)+"\n"+t,()=>{
     if(hold<0){if(st.length)hold=i;view()}
     else if(hold===i){hold=-1;view()}
     else{const d=post[hold][post[hold].length-1];const top=st.length?st[st.length-1]:99;if(d<top){post[hold].pop();st.push(d);hold=-1;moves++;beep(300+d*80,.15);if(post[2].length===4){win(id,D.title,D.col,site,"With a groan of old iron the portcullis rises. Behind it, a vault of dry air and the weight of the whole sky pressing gently down."+(moves===15?" A perfect fifteen moves.":""));return}view()}else{hold=-1;view("A heavy disc cannot rest on a lighter one.")}}},hold===i?"go":"alt");bb.style.whiteSpace="pre-line";m.appendChild(bb)});
   if(msg)b.appendChild(el("p",msg,"msg"));const m2=wrap(b);m2.appendChild(btn("Start over",()=>{post=[[3,2,1,0],[],[]];hold=-1;moves=0;view()},"alt"));m2.appendChild(btn("Leave",()=>goBack(site)))};view()};

 // ---- dungeon door puzzles ----
 DEF.dg_crypt={title:"The Ossuary Chant",col:"#b8b8d0",kind:"memory",intro:"The skulls in the wall hum when you pass. Each bone sings a planet's pitch. Hear the dirge and sing it back, and the sealed door will remember its own name."};
 DEF.dg_cave={title:"The Rime Door",col:"#9fd8ff",kind:"lanterns",intro:"A door of ice, ringed with seven cold lanterns. Each flame you touch flips itself and the two beside it. Light them all and the rime lets go."};
 DEF.dg_mine={title:"The Dwarven Scales",col:"#d8a070",kind:"scales",intro:"The iron gate is held by a tally of eight dwarf-stamped coins. One is a forgery and weighs a little less than the rest. Use the scales (at most three weighings), then name the false coin."};
 DEF.dg_sunk={title:"The Tidal Stair",col:"#80d0c0",kind:"order",hint:"Saturn crawls; the Moon races.",intro:"A drowned stair of seven steps, each stamped with a planet. The tide only recedes if you climb them from the slowest star to the swiftest."};
 DEF.dg_tomb={title:"The Sealed Slab",col:"#ffd070",kind:"cipher",intro:"The slab is carved with four glyph-slots. A code of four different planets is hidden in them. The sand whispers ✦ for the right planet in the right place and • for a right planet in the wrong place. Ten tries."};
 DEF.dg_lair={title:"The Giant's Counterweights",col:"#c0a080",kind:"hanoi",intro:"The giant's door is lifted by four metal weights. Move them all from the first post to the last, one at a time, never setting a heavy one on a light one."};
 KIND.scales=(id,site)=>{const D=DEF[id];const N=8;let fake=Math.floor(Math.random()*N),pan=Array(N).fill(0),hist=[],mode="weigh";
  const view=(msg)=>{const b=occPanel(D.title,D.col);b.appendChild(el("p",D.intro,"sub"));
   hist.forEach((h,i)=>b.appendChild(el("p","Weighing "+(i+1)+": "+h,"sub")));
   b.appendChild(el("p",mode==="weigh"?"Tap a coin to cycle it: left pan, right pan, off. Weighings used: "+hist.length+"/3":"Tap the coin you believe is the forgery.","say"));if(msg)b.appendChild(el("p",msg,"msg"));
   const m=wrap(b);m.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:6px";
   for(let i=0;i<N;i++){const bb=btn("Coin "+(i+1)+(mode==="weigh"?(pan[i]===1?"  ◀ left":pan[i]===2?"  right ▶":""):""),()=>{if(mode==="weigh"){pan[i]=(pan[i]+1)%3;view()}else{if(i===fake){win(id,D.title,D.col,site,"The false coin rings hollow when you drop it. The mechanism clunks and the way is open.")}else{lose(id,D.title,D.col,site,"That coin was honest. The gate stays shut.",2)}}},pan[i]?"go":"alt");m.appendChild(bb)}
   const m2=wrap(b);if(mode==="weigh"){m2.appendChild(btn("Weigh them",()=>{const L=[],R=[];pan.forEach((v,i)=>{if(v===1)L.push(i);if(v===2)R.push(i)});if(!L.length||L.length!==R.length){view("Put the same number of coins in each pan.");return}
     const wl=(L.includes(fake)?-1:0),wr=(R.includes(fake)?-1:0);const res=wl===wr?"the pans balance":(wl<wr?"the left pan rises":"the right pan rises");hist.push("coins "+L.map(i=>i+1).join(",")+" against "+R.map(i=>i+1).join(",")+": "+res+".");pan=Array(N).fill(0);beep(260,.2);if(hist.length>=3)mode="accuse";view()},"go"));
    m2.appendChild(btn("I know which is false",()=>{mode="accuse";view()},"alt"))}
   m2.appendChild(btn("Leave",()=>goBack(site)))};view()};
 const PZ={DEF,KIND,onWin:{},
  run(id,site){const D=DEF[id];if(!D)return;const p=site||POIS.find(x=>x.id===id);KIND[D.kind](id,p)}};
 ["crypt","cave","mine","sunk","tomb","lair"].forEach(k=>{PZ.onWin["dg_"+k]=()=>{try{if(DG&&DG.p.id===k){DG.s.unl=1;DG.msg="The door yields to your wits."}}catch(e){}}});
 try{const _rd=renderDg;renderDg=function(){const r=_rd.apply(this,arguments);try{if(DG&&DG.s.r===4&&!DG.s.unl&&DEF["dg_"+DG.p.id]){const b=document.getElementById("dngbox"),d=DEF["dg_"+DG.p.id],bb=btn("✦ "+d.title+(solved()["dg_"+DG.p.id]?" (solved before)":" (+1 talent point)"),()=>PZ.run("dg_"+DG.p.id,{dg:1}),"go");b.insertBefore(bb,b.lastChild)}}catch(e){}return r}}catch(e){}
 window.PZ=PZ;
 // ---- attach a chamber to each site ----
 Object.keys(DEF).forEach(id=>{const S=SITES[id];if(!S)return;S.acts=S.acts||[];if(S._pz)return;S._pz=1;
  S.acts.unshift({t:()=>(solved()[id]?"✔ ":"✦ ")+"Chamber: "+DEF[id].title+(solved()[id]?" (solved)":" (+1 talent point)"),f:p=>PZ.run(id,p)})});
})();

// ===== Talent trees: seven planetary branches, spend the points you earn from quests and puzzles =====
(function(){
 if(!window.QST)return;
 const Q=QST.Q,P=n=>PLN.find(p=>p.n===n);
 const TREE=[
  {pl:"Saturn",name:"Stone",tag:"Endurance and defence",t:[
   {id:"S1",n:"Leaden Skin",c:1,d:"+1 armour class."},
   {id:"S2",n:"Patience of Stone",c:2,d:"+12% maximum HP."},
   {id:"S3",n:"Saturnine Wall",c:3,d:"Start every fight with +3 to your armour class."}]},
  {pl:"Jupiter",name:"Fortune",tag:"Luck and leadership",t:[
   {id:"J1",n:"Scholar's Fortune",c:1,d:"+10% experience from everything."},
   {id:"J2",n:"Good Omen",c:2,d:"+1 to hit in every fight."},
   {id:"J3",n:"Jovial Triumph",c:3,d:"Each victory restores 25% of your HP and mana."}]},
  {pl:"Mars",name:"War",tag:"Offence",t:[
   {id:"M1",n:"Iron Arm",c:1,d:"+1 damage on everything you deal."},
   {id:"M2",n:"Battle Fury",c:2,d:"First attack of each fight gets +3 to hit."},
   {id:"M3",n:"Blood Rage",c:3,d:"+50% damage while below 40% HP."}]},
  {pl:"Sun",name:"Light",tag:"Healing and clarity",t:[
   {id:"U1",n:"Solar Balm",c:1,d:"Healing is 25% stronger."},
   {id:"U2",n:"Banishing Light",c:2,d:"Undead take 40% more damage."},
   {id:"U3",n:"Crown of Hours",c:3,d:"All planetary resonance multipliers rise by +0.5."}]},
  {pl:"Venus",name:"Grace",tag:"Charm and herbs",t:[
   {id:"V1",n:"Soft Step",c:1,d:"12% chance each round that a foe hesitates and loses its turn."},
   {id:"V2",n:"Open Hand",c:2,d:"+1 herb every time you gather."},
   {id:"V3",n:"Heart's Ease",c:3,d:"Every spell costs 1 less mana."}]},
  {pl:"Mercury",name:"Wit",tag:"Tricks and checks",t:[
   {id:"H1",n:"Nimble Wits",c:1,d:"+2 to tactics checks."},
   {id:"H2",n:"Light Fingers",c:2,d:"+30% gold from chests."},
   {id:"H3",n:"Hermes' Gift",c:3,d:"+4 more to tactics checks and +1 armour class."}]},
  {pl:"Moon",name:"Dream",tag:"Mana and spellcraft",t:[
   {id:"L1",n:"Moonwell",c:1,d:"+15% maximum mana."},
   {id:"L2",n:"Silver Light",c:2,d:"+2 damage on spells."},
   {id:"L3",n:"Tide of Mana",c:3,d:"Regain 2 mana after every foe turn."}]}];
 const ALL={};TREE.forEach(b=>b.t.forEach((x,i)=>{x.pl=b.pl;x.tier=i;ALL[x.id]=x}));
 const has=id=>!!(hero&&hero.tl&&hero.tl[id]);
 const TL={TREE,ALL,has,inSpell:0,
  stat(k){if(!hero||!hero.tl)return 0;let v=0;
   if(k==="ac"){if(has("S1"))v+=1;if(has("H3"))v+=1}
   if(k==="hp"&&has("S2"))v+=Math.round(((hero.baseHp||0)+(hero.hpGain||0))*.12);
   if(k==="mp"&&has("L1"))v+=Math.max(2,Math.round((MPB[hero.cls]+hero.level*2)*.15));
   return v},
  checks(){return !hero||!hero.tl?0:(has("H1")?2:0)+(has("H3")?4:0)}};
 window.TLN=TL;
 if(window.PCK)PCK.bonus=()=>has("U3")?.5:0;
 const owned=()=>Object.keys((hero&&hero.tl)||{});
 // ---------- effects ----------
 try{
  const _ax=addXp;addXp=function(n,out){if(has("J1")&&typeof n==="number")n=Math.round(n*1.1);return _ax.call(this,n,out)};
  const _fd=foeDamage;foeDamage=function(n){if(hero&&hero.tl&&typeof n==="number"&&C){let m=n+(has("M1")?1:0)+(has("L2")&&TL.inSpell?2:0);
    if(has("M3")&&hero.hp<maxHP()*.4)m=m*1.5;if(has("U2")&&C.e&&C.e.undead)m=m*1.4;m=Math.round(m);if(m>n){try{BN.skip=1}catch(e){}clog("   ✦ talents: "+n+" → "+m+" damage")}n=m}return _fd.call(this,n)};
  const _hh=healHero;healHero=function(n){if(has("U1")&&typeof n==="number")n=Math.round(n*1.25);return _hh.call(this,n)};
  const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{if(C&&hero&&hero.tl){if(has("S3"))C.ward=(C.ward||0)+3;if(has("J2"))C.fh=(C.fh||0)+1;if(has("M2"))C.fhOnce=(C.fhOnce||0)+3;rc()}}catch(e){}return r};
  const _vc=victory;victory=function(){const r=_vc.apply(this,arguments);try{if(has("J3")){healHero(Math.round(maxHP()*.25));hero.mana=Math.min(maxMP(),hero.mana+Math.round(maxMP()*.25));clog("✦ Jovial Triumph restores you.")}}catch(e){}return r};
  const _cs=castSpell;castSpell=function(nm,field){const m0=hero.mana;TL.inSpell=1;let r;try{r=_cs.apply(this,arguments)}finally{TL.inSpell=0}
    try{if(has("V3")&&hero.mana<m0&&SPELLS[nm]&&SPELLS[nm].mp>0)hero.mana=Math.min(maxMP(),hero.mana+1)}catch(e){}return r};
  const _ft=foeTurn;foeTurn=function(){try{if(hero&&hero.tl&&C&&!C.over){if(has("V1")&&C.e.skip<=0&&Math.random()<.12){C.e.skip=1;try{BN.skip=1}catch(e){}clog("✦ Your poise unsettles "+the(C.e.name)+"; it hesitates.")}}}catch(e){}
    const r=_ft.apply(this,arguments);try{if(has("L3")&&C&&!C.over){hero.mana=Math.min(maxMP(),hero.mana+2);rc()}}catch(e){}return r};
  const _lc=lootChest;lootChest=function(){const g0=hero.gold;const r=_lc.apply(this,arguments);try{if(has("H2")){const g=hero.gold-g0,x=Math.round(g*.3);if(x>0)hero.gold+=x}}catch(e){}return r};
  const _gh=gatherHerb;gatherHerb=function(p){const b4=Object.assign({},hero.inv);const r=_gh.apply(this,arguments);try{if(has("V2")){for(const n in hero.inv){const it=ITEMS[n];if(it&&it.t==="h"&&(hero.inv[n]||0)>(b4[n]||0)){giveItem(n,1);break}}}}catch(e){}return r};
 }catch(e){if(window.console)console.warn("[talents]",e&&e.message)}
 // ---------- UI ----------
 const wrap=(b)=>{const d=el("div",null,"menu");b.appendChild(d);return d};
 function spend(id){const q=Q(),x=ALL[id];if(has(id))return;const prev=x.tier>0?TREE.find(b=>b.pl===x.pl).t[x.tier-1].id:null;if(prev&&!has(prev))return;if((hero.tp||0)<x.c)return;
  hero.tp-=x.c;q.tpSpent=(q.tpSpent||0)+x.c;hero.tl=hero.tl||{};hero.tl[id]=1;try{fixStats();hud();sfx("win")}catch(e){}try{QST.ding("Talent learned: "+x.n+". "+x.d,false)}catch(e){}open()}
 function respec(){const q=Q();const cost=50;if(hero.gold<cost||!owned().length)return;hero.gold-=cost;let back=0;owned().forEach(id=>back+=ALL[id].c);hero.tp=(hero.tp||0)+back;q.tpSpent=0;hero.tl={};try{fixStats();hud()}catch(e){}open("Talents reset. "+back+" points returned (-"+cost+" gp).")}
 function open(msg){if(!hero||C||D||DG||packOpen)return;const b=occPanel("Talents","#ffd878");
  b.appendChild(el("p","Talent points: "+(hero.tp||0)+" · earn them from quests and puzzle chambers. Each branch must be bought from the top.","sub"));
  if(msg)b.appendChild(el("p",msg,"msg"));
  const now=window.PCK?PCK.now():null;
  TREE.forEach(br=>{const p=P(br.pl),hot=now&&(now.hour.n===br.pl||now.day.n===br.pl);
   const h=el("p",p.g+" "+br.pl+" · "+br.name+" — "+br.tag+(hot?"   ✦ in season now":""),"say");h.style.color=p.c;b.appendChild(h);
   const m=wrap(b);br.t.forEach((x,i)=>{const o=has(x.id),prev=i>0?br.t[i-1].id:null,locked=prev&&!has(prev),can=!o&&!locked&&(hero.tp||0)>=x.c;
    const bb=btn((o?"✔ ":"")+x.n+" ("+x.c+") — "+x.d,()=>spend(x.id),o?"go":"alt",!can);if(locked)bb.style.opacity=.45;m.appendChild(bb)})});
  const m=wrap(b);m.appendChild(btn("Respec all talents (50 gp)",respec,"alt",hero.gold<50||!owned().length));m.appendChild(btn("Back to Journal",()=>{occClose();QST.openJournal()},"alt"));m.appendChild(btn("Close",occClose,"go"))}
 TL.open=open;
 addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key==="t"||e.key==="T"){if(occOpen)occClose();else open()}});
 // button in journal row
 const row=(document.getElementById("packbtn")||{}).parentNode;if(row){const tb=document.createElement("button");tb.className="alt";tb.id="tlnbtn";tb.textContent="Talents (T)";tb.onclick=open;const j=document.getElementById("jrnbtn");row.insertBefore(tb,j?j.nextSibling:null)}
 setInterval(()=>{try{const tb=document.getElementById("tlnbtn");if(tb&&hero)tb.textContent="Talents (T)"+((hero.tp||0)>0?" ["+hero.tp+"]":"")}catch(e){}},1000);
 // journal: add Talents button
 try{const _oj=QST.openJournal;QST.openJournal=function(){const r=_oj.apply(this,arguments);try{const m=document.querySelector("#occbox .menu:last-child");if(m)m.insertBefore(btn("Talents ("+(hero.tp||0)+" points)",()=>{occClose();open()},"alt"),m.firstChild)}catch(e){}return r}}catch(e){}
})();

// ===== Planetary altar and brewing: the clock decides what you can make =====
(function(){
 if(!window.QST||!window.PCK)return;
 const Q=QST.Q,P=n=>PLN.find(p=>p.n===n);
 const TAL={Saturn:{ac:2,hp:4},Jupiter:{h:1,hp:6},Mars:{h:3},Sun:{hp:8,ac:1},Venus:{mp:4,hp:3},Mercury:{h:2,ac:1},Moon:{mp:6}};
 const txt=o=>Object.keys(o).map(k=>"+"+o[k]+" "+({ac:"AC",hp:"max HP",mp:"max mana",h:"to hit"}[k])).join(", ");
 PLN.forEach(p=>{const nm="Talisman of "+p.n;ITEMS[nm]=Object.assign({t:"c",m:1},TAL[p.n],{desc:"Consecrated in the hour of "+p.n+". "+txt(TAL[p.n])+". ["+PCK.describe(p.n)+"]"});PCK.ITEMP[nm]=p.n;ITEMS[nm].alch=PCK.describe(p.n)});
 const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
 const wait=pl=>{const hit=PCK.sched(8).find(s=>s.pl.n===pl);return hit?fmt(hit.inMs):"—"};
 function consecrate(p,pl){const q=Q();spendHerbs(pl,3);const e="Elixir of "+pl;hero.inv[e]--;if(!hero.inv[e])delete hero.inv[e];giveItem("Talisman of "+pl);q.alt=q.alt||{};q.alt[pl]=1;
  try{sfx("win");if(ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}try{QST.tick()}catch(e){}
  altar(p,"Under the hour of "+pl+", the talisman takes. Talisman of "+pl+" is yours ("+txt(TAL[pl])+"). Equip it from your Pack.")}
 function altar(p,msg){const b=occPanel("The Planetary Altar","#ffb050");const c=PCK.now();
  b.appendChild(el("p","A seven-sided altar of fired clay, one face per wandering star. A talisman is consecrated only in its planet's own hour, from three herbs and an elixir of that planet. The current hour is "+c.hour.g+" "+c.hour.n+" ("+fmt(c.left)+" left).","sub"));
  if(msg)b.appendChild(el("p",msg,"msg"));
  const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
  PLN.forEach(pl=>{const n=pl.n,herbs=herbCount(n),eli=hero.inv["Elixir of "+n]||0,mm=PCK.mult(n),ok=(mm.kind==="hour"||mm.kind==="both"),have=hero.inv["Talisman of "+n];
   const st=have?"you own one":(!ok?"wait for the "+n+" hour (in "+wait(n)+")":(herbs<3?"need 3 "+n+" herbs ("+herbs+")":(eli<1?"need an Elixir of "+n:"ready ✦")));
   m.appendChild(btn(pl.g+" Talisman of "+n+" — "+txt(TAL[n])+" · "+st,()=>consecrate(p,n),ok&&!have&&herbs>=3&&eli>=1?"go":"alt",have||!ok||herbs<3||eli<1));
   if(!ok&&!have&&herbs>=3&&eli>=1)m.appendChild(btn("    ↳ Burn incense and wait for the hour of "+n+" (10 gp)",()=>{if(hero.gold<10)return;hero.gold-=10;PCK.skipTo(n);hero.clockOff=PCK.OFF;altar(p,"Incense smoke curls and the hours slip by. It is now the hour of "+n+".")},"alt",hero.gold<10))});
  const m2=el("div",null,"menu");m2.appendChild(btn("Leave the altar",()=>openSite(p),"go"));b.appendChild(m2)}
 // brewing in the right hour yields more
 try{const _b=brew;brew=function(p,pl){const r=_b.apply(this,arguments);try{const mm=PCK.mult(pl.n);let extra=mm.kind==="both"?2:mm.kind==="hour"?1:(mm.kind==="day"&&Math.random()<.5?1:0);
   if(extra){giveItem("Elixir of "+pl.n,extra);say("✦ "+mm.name+": the brew foams over and you bottle "+extra+" extra Elixir of "+pl.n+".");try{BN.banner(pl.g+" POTENT BREW")}catch(e){}}}catch(e){}return r}}catch(e){}
 const A=SITES.athanor;if(A&&A.acts&&!A._alt){A._alt=1;A.acts.unshift({t:()=>"Planetary altar: consecrate talismans",f:p=>altar(p)});
  A.lore+=" Brewing an elixir in its own planet's hour yields extra bottles."}
 window.ALTAR={TAL,altar,consecrate};
})();

// ===== The Unmoved One: a staged finale that uses the planetary clock =====
(function(){
 if(!window.QST)return;
 const Q=QST.Q;
 const SH=()=>PLN.filter(p=>Q().shards[p.n]).length;
 function start(){
  const lines=PLN.map(p=>p.g+" "+p.n+" rings "+({Saturn:"low and slow",Jupiter:"warm and wide",Mars:"sharp as struck iron",Sun:"golden and full",Venus:"sweet and round",Mercury:"quick and bright",Moon:"silver and soft"}[p.n])+".");
  QST.panel("The Seven Chords",["One by one the shards sing in the stones.",lines.join(" ")],"Listen",()=>{
   QST.panel("The Unmoved One",["The figure does not turn. It speaks without a mouth, and the voice is the sound a clock makes just before it stops.",
    "'Everything that moves is a wound in the quiet. I will close you.' Then, more softly: 'But you carry the hours. Strike me out of tune with the sky and I will not feel it.'",
    "Hint: only actions amplified by the current planetary hour hurt it fully. Match your weapon, spell or herb to the hour on the clock. When its health falls, the hours will begin to slip."],"Fight",()=>{
    QST.finale();
    try{C.fin=1;C.finR=0;C.sung=0;clog((window.DAYT&&DAYT.heptad())?"✦ The Seven Day-Temples stand with you. The hours cannot be turned against you.":"✦ The Unmoved One: strikes not in tune with the hour deal only half damage.");try{BN.banner("◉ THE STILLNESS")}catch(e){}rc()}catch(e){}
   },"#d8d0ff")},"#c0a8ff")}
 try{
  const _fd=foeDamage;foeDamage=function(n){try{if(typeof C!=="undefined"&&C&&C.fin&&!C.sungNow&&typeof n==="number"){const am=PCK.AMP&&PCK.AMP.cur&&PCK.AMP.cur.m>1;if(!am&&!(window.DAYT&&DAYT.heptad())){n=Math.max(1,Math.ceil(n/2));if(!C.warned){C.warned=1;try{BN.skip=1}catch(e){}clog("✦ The Stillness resists a blow that is out of tune with the hour.")}}}}catch(e){}return _fd.call(this,n)};
  const _ft=foeTurn;foeTurn=function(){const r=_ft.apply(this,arguments);try{if(C&&C.fin&&!C.over){C.finR=(C.finR||0)+1;if(C.e.hp<=C.e.max*.6&&C.finR%2===0){PCK.setOff(PCK.OFF+PCK.now().left+300);hero.clockOff=PCK.OFF;const h=PCK.now().hour;try{BN.skip=1}catch(e){}clog("✦ The hours stutter. It is now the hour of "+h.n+" "+h.g+".");try{BN.banner("THE HOUR SHIFTS "+h.g)}catch(e){}try{flash("rgba(200,200,255,.35)")}catch(e){}try{BN.push("The Unmoved One stutters the sky. The hour is now "+h.n+". Change your tune!",2)}catch(e){}rc()}}}catch(e){}return r};
  const _rc=rc;rc=function(){const r=_rc.apply(this,arguments);try{if(C&&C.fin&&!C.over&&!C.sung&&C.e.hp<=C.e.max*.3){const m=document.getElementById("cmenu");if(m)m.insertBefore(btn("✦ Sing the Shards ("+SH()+" shards sing)",()=>heroAct(()=>{C.sung=1;C.sungNow=1;const n=12*Math.max(1,SH());try{BN.skip=1}catch(e){}clog("You raise the shards and the seven chords sound together. "+n+" damage cannot be turned aside.");try{BN.banner("♜ THE CHORD")}catch(e){}try{flash("rgba(255,240,200,.6)")}catch(e){}foeDamage(n);C.sungNow=0;try{healHero(Math.round(maxHP()*.3))}catch(e){}}),"go"),m.firstChild)}}catch(e){}return r};
 }catch(e){if(window.console)console.warn("[finale]",e&&e.message)}
 window.FINALE={start};
})();

// ===== Polish: first-time tips, bestiary and herbarium, difficulty =====
(function(){
 if(!window.QST)return;
 const Q=QST.Q;const touch=window.matchMedia&&matchMedia("(pointer:coarse)").matches;
 // ---------- difficulty ----------
 const DIFFS=["Gentle","Normal","Hard"];
 const diff=()=>(hero&&hero.diff)||"Normal";
 try{
  const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{if(C&&hero){const d=diff();if(d==="Gentle"){C.e.hp=C.e.max=Math.max(1,Math.round(C.e.max*.7));C.e.atk=Math.max(0,C.e.atk-1)}else if(d==="Hard"){C.e.hp=C.e.max=Math.round(C.e.max*1.3);C.e.atk+=1;C.e.xp=Math.round(C.e.xp*1.25)}rc()}}catch(e){}return r};
  const _df=defeat;defeat=function(){const g=hero.gold;const r=_df.apply(this,arguments);try{if(diff()==="Gentle"){hero.gold=g;hud()}else if(diff()==="Hard"){const x=Math.floor(hero.gold/4);hero.gold-=x;hud()}}catch(e){}return r};
 }catch(e){}
 const row=(document.getElementById("packbtn")||{}).parentNode;let db=null;
 if(row){db=document.createElement("button");db.className="alt";db.id="diffbtn";db.textContent="Difficulty: Normal";db.onclick=()=>{if(!hero||C)return;hero.diff=DIFFS[(DIFFS.indexOf(diff())+1)%3];refresh();say("Difficulty set to "+hero.diff+". "+({Gentle:"Foes have 30% less health and hit softer. Defeat costs no gold.",Normal:"The standard challenge.",Hard:"Foes have 30% more health and hit harder, but give 25% more XP. Defeat costs a quarter of your gold."}[hero.diff]))};row.appendChild(db)}
 const refresh=()=>{if(db)db.textContent="Difficulty: "+diff()};
 // ---------- tips ----------
 const css=document.createElement("style");css.textContent="#tipbox{position:absolute;left:50%;top:44px;transform:translateX(-50%);z-index:5;max-width:min(86%,520px);background:rgba(24,18,10,.92);border:1px solid #c9a24a;color:#f2e2b0;padding:8px 12px;border-radius:8px;font-size:.88rem;display:none}#tipbox b{color:#ffd878}#tipbox button{margin-top:6px;padding:3px 10px;font:inherit;cursor:pointer}";document.head.appendChild(css);
 const cw=document.querySelector(".cw")||document.body;const tb=document.createElement("div");tb.id="tipbox";cw.appendChild(tb);
 ["pointerdown","pointermove","pointerup","click"].forEach(ev=>tb.addEventListener(ev,e=>e.stopPropagation()));
 let queue=[],showing=false;
 const on=()=>{try{return localStorage.getItem("occultica.tips")!=="off"}catch(e){return true}};
 function next(){if(showing||!queue.length)return;const t=queue.shift();showing=true;tb.innerHTML="";const p=document.createElement("div");p.innerHTML="<b>Tip:</b> "+t;tb.appendChild(p);const b=document.createElement("button");b.textContent="Got it";b.onclick=()=>{tb.style.display="none";showing=false;setTimeout(next,600)};tb.appendChild(b);const off=document.createElement("button");off.textContent="Turn tips off";off.style.marginLeft="6px";off.onclick=()=>{try{localStorage.setItem("occultica.tips","off")}catch(e){}queue=[];tb.style.display="none";showing=false;updTip()};tb.appendChild(off);tb.style.display="block"}
 function tip(key,text){if(!hero||!on())return;const q=Q();q.tips=q.tips||{};if(q.tips[key])return;q.tips[key]=1;queue.push(text);next()}
 let tbtn=null;if(row){tbtn=document.createElement("button");tbtn.className="alt";tbtn.id="tipbtn";tbtn.onclick=()=>{try{localStorage.setItem("occultica.tips",on()?"off":"on")}catch(e){}updTip()};row.appendChild(tbtn)}
 const updTip=()=>{if(tbtn)tbtn.textContent="Tips: "+(on()?"on":"off")};updTip();
 try{
  const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);setTimeout(()=>{try{if(C&&!C.over)tip("battle","In battle, a <b>★</b> button is a suggestion based on your gear. <b>Tactics</b> holds special moves, and a <b>gold glow ✦</b> means the planetary hour is amplifying it. Answer a wind-up (Dodge, Brace or Interrupt) before the foe strikes.")}catch(e){}},1800);return r};
 }catch(e){}
 setInterval(()=>{try{if(!hero||C||D||occOpen||packOpen)return;
  const q=Q();
  tip("walk",touch?"Drag the <b>stick</b> to walk and drag the view to look. Tap the <b>prompt</b> at the bottom to talk or enter. The buttons below open your Journal, Talents and Map.":"Walk with <b>WASD</b> or the arrow keys, drag to look, <b>E</b> to talk or enter. <b>J</b> opens your Journal and <b>T</b> your Talents.");
  if((hero.tp||0)>0)tip("tp","You have <b>talent points</b>. Open <b>Talents</b> to spend them. Earn more from quests and puzzle chambers.");
  if(window.PCK&&PCK.resonant().some(r=>r.m>=2))tip("res","The gold clock at the bottom shows the <b>planetary hour</b>. Anything you carry that belongs to that planet is stronger right now, especially in battle.");
  if(Object.keys(OCCP().herbs||{}).length>0)tip("herb","Herbs belong to planets. Gather and use them in their own planet's hour for extra yield and stronger effects.");
  if(Object.keys(q.pz||{}).length===0&&Object.keys(q.sites||{}).length>0)tip("site","Occult sites have <b>puzzle chambers</b>. A solved chamber gives a talent point. Wrong answers cost only a little health.");
 }catch(e){}},4000);
 // ---------- bestiary & herbarium ----------
 try{const _vc=victory;victory=function(){try{const q=Q();q.bes=q.bes||{};const e=C.e,b=q.bes[e.name]||(q.bes[e.name]={k:0});b.k++;b.hp=e.max;b.ac=e.ac;b.atk=e.atk;b.dm=e.dn+"d"+e.ds+(e.db?"+"+e.db:"");b.u=!!e.undead}catch(e){}return _vc.apply(this,arguments)}}catch(e){}
 function bestiary(){const q=Q(),b=occPanel("Bestiary","#d08f8f");const keys=Object.keys(q.bes||{});
  b.appendChild(el("p",keys.length?"Foes you have defeated. Undead are hurt by Sun light (Banishing Light talent).":"You have not defeated anything yet.","sub"));
  keys.sort().forEach(k=>{const e=q.bes[k];b.appendChild(el("p",k+(e.u?" (undead)":"")+" · defeated "+e.k+"× · HP "+e.hp+" · AC "+e.ac+" · attack +"+e.atk+" · damage "+e.dm,"say"))});
  const m=el("div",null,"menu");m.appendChild(btn("Back to Journal",()=>{occClose();QST.openJournal()},"alt"));m.appendChild(btn("Close",occClose,"go"));b.appendChild(m)}
 function herbarium(){const o=OCCP(),b=occPanel("Herbarium","#8fd08f");const known=Object.keys(o.herbs||{});b.appendChild(el("p","Herbs you have gathered, their planet and what they do in battle. Use them in their planet's hour for more.","sub"));
  PLN.forEach(p=>{p.h.forEach(h=>{const k=known.includes(h),H=window.C2&&C2.HERB&&C2.HERB[p.n];b.appendChild(el("p",(k?"✔ ":"◻ ")+(k?h:"???")+" — "+p.g+" "+p.n+(k&&H?" · "+H.n:""),k?"say":"sub"))})});
  const m=el("div",null,"menu");m.appendChild(btn("Back to Journal",()=>{occClose();QST.openJournal()},"alt"));m.appendChild(btn("Close",occClose,"go"));b.appendChild(m)}
 try{const _oj=QST.openJournal;QST.openJournal=function(){const r=_oj.apply(this,arguments);try{const m=document.querySelector("#occbox .menu:last-child");if(m){m.insertBefore(btn("Herbarium",herbarium,"alt"),m.firstChild);m.insertBefore(btn("Bestiary",bestiary,"alt"),m.firstChild)}}catch(e){}return r}}catch(e){}
 setInterval(()=>{try{if(hero)refresh()}catch(e){}},1500);
 window.POL={tip,bestiary,herbarium,diff};
})();

// ===== World map, fast travel, and a tidy menu =====
(function(){
 if(typeof POIS==="undefined")return;
 const cw=document.querySelector(".cw")||document.body;
 const css=document.createElement("style");css.textContent=`
#wmap{position:absolute;inset:0;z-index:9;background:#0a0806;display:none;flex-direction:column}
#wmap.on{display:flex}
#wmap .bar{display:flex;gap:8px;align-items:center;padding:6px 10px;background:#140f08;color:#f2e2b0;font:700 .95rem Cinzel,Georgia,serif;flex-wrap:wrap}
#wmap .bar button{padding:4px 10px;cursor:pointer;font:inherit;font-size:.82rem}
#wmap canvas{flex:1;min-height:0;width:100%;object-fit:contain;cursor:pointer;image-rendering:pixelated}
#wmap .info{padding:6px 10px;background:#140f08;color:#eadcb8;font-size:.85rem;min-height:2.6em}
`;document.head.appendChild(css);
 const ov=document.createElement("div");ov.id="wmap";cw.appendChild(ov);
 ["pointerdown","pointermove","pointerup"].forEach(ev=>ov.addEventListener(ev,e=>e.stopPropagation()));
 const bar=document.createElement("div");bar.className="bar";const ttl=document.createElement("span");ttl.textContent="World map";ttl.style.flex="1";bar.appendChild(ttl);
 const bRecall=document.createElement("button");bRecall.textContent="Recall to village";const bClose=document.createElement("button");bClose.textContent="Close (N)";bar.appendChild(bRecall);bar.appendChild(bClose);ov.appendChild(bar);
 const cv=document.createElement("canvas");const S=10;cv.width=W*S;cv.height=H*S;ov.appendChild(cv);const g=cv.getContext("2d");
 const info=document.createElement("div");info.className="info";info.textContent="Click a discovered place to travel there.";ov.appendChild(info);
 let sel=null,open=false;
 const vis=p=>seen[p.y*W+p.x]&&(!p.hidden||found[p.id]);
 const canUse=()=>hero&&!C&&!D&&!DG&&!packOpen&&!occOpen&&!(window.HM&&HM.open&&HM.open.classList.contains("on"));
 const cost=p=>{if(p.id==="village")return 0;return Math.max(5,Math.round(Math.hypot(p.x-hx,p.y-hy)*1.2))};
 function render(){
  g.fillStyle="#0a0806";g.fillRect(0,0,cv.width,cv.height);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(seen[y*W+x]){g.fillStyle=BIOMES[biome[y][x]].c;g.fillRect(x*S,y*S,S,S);const t=map[y][x];if(t==="water"||t==="mire"||t==="ice"){g.fillStyle="rgba(40,90,150,.55)";g.fillRect(x*S,y*S,S,S)}}else{g.fillStyle=((x+y)&1)?"#120d08":"#0e0a06";g.fillRect(x*S,y*S,S,S)}}
  g.font="bold 11px Georgia";g.textAlign="center";
  POIS.forEach(p=>{if(!vis(p))return;const x=p.x*S+S/2,y=p.y*S+S/2;g.fillStyle=PC[p.k]||"#fff";g.strokeStyle=(sel===p)?"#fff":"#000";g.lineWidth=(sel===p)?3:1.5;g.beginPath();g.arc(x,y,7,0,6.283);g.fill();g.stroke();
   if(found[p.id]||p.id==="village"){g.fillStyle="#fff";g.strokeStyle="#000";g.lineWidth=3;g.strokeText(p.name,x,y-11);g.fillText(p.name,x,y-11)}});
  // quest target hint ring
  try{QST.OBJ.concat(QST.SIDE).filter(o=>o.poi&&!QST.Q().ok[o.id]&&QST.Q().act>=(o.act||1)).forEach(o=>{const p=POIS.find(q=>q.id===o.poi);if(p&&vis(p)){g.strokeStyle="#ffd878";g.lineWidth=2;g.beginPath();g.arc(p.x*S+S/2,p.y*S+S/2,11,0,6.283);g.stroke()}})}catch(e){}
  const px=P.x/TW*S,py=P.z/TW*S;g.fillStyle="#ff5a3a";g.strokeStyle="#fff";g.lineWidth=2;g.beginPath();g.arc(px,py,6,0,6.283);g.fill();g.stroke();g.beginPath();g.moveTo(px,py);g.lineTo(px-Math.sin(yaw)*18,py-Math.cos(yaw)*18);g.stroke();
  const r=hero&&hero.recallAt?Math.max(0,hero.recallAt-Date.now()):0;
  bRecall.disabled=!canUse()||r>0;bRecall.textContent=r>0?"Recall in "+Math.ceil(r/1000)+"s":"Recall to village (free)";
 }
 function openMap(){if(!canUse()&&!open)return;open=true;sel=null;ov.classList.add("on");info.textContent="Click a discovered place to travel there. Gold ring = quest target.";render()}
 function closeMap(){open=false;ov.classList.remove("on")}
 cv.onclick=e=>{const r=cv.getBoundingClientRect();const sc=Math.min(r.width/cv.width,r.height/cv.height),ox=(r.width-cv.width*sc)/2,oy=(r.height-cv.height*sc)/2;
  const tx=(e.clientX-r.left-ox)/sc/S,ty=(e.clientY-r.top-oy)/sc/S;let best=null,bd=3.2;
  POIS.forEach(p=>{if(!vis(p))return;const d=Math.hypot(p.x+.5-tx,p.y+.5-ty);if(d<bd){bd=d;best=p}});
  sel=best;if(!best){info.textContent="Click a discovered place to travel there.";render();return}
  const c=cost(best);info.innerHTML="";const t=document.createElement("span");t.textContent=best.name+" · "+Math.round(Math.hypot(best.x-hx,best.y-hy))+" paces · "+(c?c+" gp":"free")+"  ";info.appendChild(t);
  const b=document.createElement("button");b.textContent="Travel";b.disabled=!canUse()||hero.gold<c||!(found[best.id]||best.id==="village");b.onclick=()=>go(best);info.appendChild(b);
  if(!(found[best.id]||best.id==="village")){const s2=document.createElement("small");s2.textContent=" (walk there once to unlock travel)";info.appendChild(s2)}
  render()};
 function stand(p){const base=[[0,3],[3,0],[0,-3],[-3,0],[2,2],[-2,2],[2,-2],[-2,-2],[0,4],[4,0],[0,-4],[-4,0],[0,2],[2,0],[0,-2],[-2,0]];
  for(const o of base){const x=p.x+o[0],y=p.y+o[1];if(x<1||y<1||x>=W-1||y>=H-1)continue;const t=map[y][x];if(t==="water"||t==="mire"||t==="ice"&&p.id!=="ice")continue;hx=x;hy=y;syncP();if(!blocked(P.x,P.z,.45))return true}
  hx=p.x;hy=p.y+3;syncP();return true}
 function fade(fn){const f=document.createElement("div");f.style.cssText="position:absolute;inset:0;background:#000;z-index:12;opacity:0;transition:opacity .35s;pointer-events:none";cw.appendChild(f);requestAnimationFrame(()=>{f.style.opacity=1});setTimeout(()=>{fn();f.style.opacity=0;setTimeout(()=>f.remove(),400)},380)}
 function go(p){if(!canUse())return;const c=cost(p);if(hero.gold<c)return;
  if(p.id==="village"){const r=hero.recallAt?hero.recallAt-Date.now():0;if(r>0)return;hero.recallAt=Date.now()+90000}
  hero.gold-=c;closeMap();fade(()=>{stand(p);try{reveal();hud();draw();save()}catch(e){}say("You arrive at "+p.name+(c?" ("+c+" gp for the guide).":"."));try{tryAudio(true)}catch(e){}})}
 bRecall.onclick=()=>{const v=POIS.find(p=>p.id==="village");if(v)go(v)};
 bClose.onclick=closeMap;
 const mini=document.getElementById("mini");if(mini){mini.style.cursor="pointer";mini.addEventListener("click",()=>open?closeMap():openMap());["pointerdown","pointerup"].forEach(ev=>mini.addEventListener(ev,e=>e.stopPropagation()))}
 addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key==="n"||e.key==="N"){open?closeMap():openMap()}if(e.key==="Escape"&&open)closeMap()});
 setInterval(()=>{if(open)render()},1000);
 try{const _mv=move;move=function(dt){if(open)return;_mv(dt)}}catch(e){}
 // ----- buttons -----
 const row=(document.getElementById("packbtn")||{}).parentNode;
 if(row){
  const mb=document.createElement("button");mb.className="alt";mb.id="mapbtn";mb.textContent="Map (N)";mb.onclick=()=>open?closeMap():openMap();
  const pk=document.getElementById("packbtn");row.insertBefore(mb,pk.nextSibling);
  const menuB=document.createElement("button");menuB.className="alt";menuB.id="menubtn";menuB.textContent="☰ Menu";row.insertBefore(menuB,row.querySelector("span.sub")||null);
  const KEEP=["packbtn","jrnbtn","tlnbtn","mapbtn","menubtn"];
  const hide=()=>{Array.from(row.querySelectorAll("button")).forEach(b=>{if(!KEEP.includes(b.id)){b.dataset.sec=1;b.style.display="none"}})};
  hide();setInterval(hide,2000);
  function menu(){if(!hero||C||D||DG||occOpen)return;const b=occPanel("Menu","#c8a0ff");const m=document.createElement("div");m.className="menu";b.appendChild(m);
   Array.from(row.querySelectorAll("button[data-sec]")).forEach(o=>{const bb=btn(o.textContent,()=>{o.click();setTimeout(()=>{if(occOpen&&document.getElementById("occbox").dataset.menu)menu()},150)},"alt");m.appendChild(bb)});
   b.dataset.menu=1;
   const m2=document.createElement("div");m2.className="menu";b.appendChild(m2);m2.appendChild(btn("Close",occClose,"go"))}
  menuB.onclick=()=>{if(occOpen){occClose();return}menu()};
  addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key==="Tab"){e.preventDefault();if(occOpen)occClose();else menu()}});
  window.UI2={menu};
 }
 window.WMAP={open:openMap,close:closeMap,go,cost,render};
})();

// ===== Feel: a better start, level-up fanfare, pickup floaters, door fades, optional mouse lock =====
(function(){
 const cw=document.querySelector(".cw")||document.body;
 const css=document.createElement("style");css.textContent=`
#homev.on{animation:hvfade .55s ease-out}@keyframes hvfade{from{opacity:0}to{opacity:1}}
#lvbanner{position:absolute;left:0;right:0;top:30%;text-align:center;z-index:10;pointer-events:none;font:700 2.2rem Cinzel,Georgia,serif;color:#ffe9a8;text-shadow:0 0 18px #ffb040,0 0 3px #000;letter-spacing:.12em;animation:lvb 2.6s ease-out forwards}
#lvbanner small{display:block;font-size:.95rem;letter-spacing:.05em;color:#f2e2b0;margin-top:6px}
@keyframes lvb{0%{opacity:0;transform:scale(.7)}15%{opacity:1;transform:scale(1.08)}30%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
.spk{position:absolute;z-index:9;pointer-events:none;color:#ffd878;font-size:1.1rem;text-shadow:0 0 6px #ffb040;animation:spk 1.8s ease-out forwards}
@keyframes spk{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-70px) scale(.6)}}
.pflt{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:9;pointer-events:none;color:#fff6d0;background:rgba(20,16,10,.7);border:1px solid #c9a24a;border-radius:12px;padding:2px 10px;font-size:.85rem;animation:pf 1.8s ease-out forwards}
@keyframes pf{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-48px)}}
`;document.head.appendChild(css);
 // ---------- start position: the village green, looking at the houses ----------
 const village=()=>POIS.find(p=>p.id==="village");
 function spot(){const v=village();if(!v)return;hx=v.x;hy=v.y+3;syncP();yaw=.6;pitch=0;try{reveal();draw()}catch(e){}}
 setInterval(()=>{try{if(hero&&!hero.fs){hero.fs=1;if((hero.steps||0)===0&&hx===SX&&hy===SY)spot()}}catch(e){}},700);
 try{const _df=defeat;defeat=function(){const r=_df.apply(this,arguments);try{spot()}catch(e){}return r}}catch(e){}
 // ---------- level-up fanfare and talent points ----------
 function bigBanner(t,sub){const old=document.getElementById("lvbanner");if(old)old.remove();const b=document.createElement("div");b.id="lvbanner";b.textContent=t;if(sub){const s=document.createElement("small");s.textContent=sub;b.appendChild(s)}cw.appendChild(b);setTimeout(()=>b.remove(),2700);
  for(let i=0;i<16;i++){const s=document.createElement("div");s.className="spk";s.textContent=["✦","✧","·","★"][i%4];s.style.left=(15+Math.random()*70)+"%";s.style.top=(35+Math.random()*40)+"%";s.style.animationDelay=(Math.random()*.6)+"s";cw.appendChild(s);setTimeout(()=>s.remove(),2600)}}
 try{const _ax=addXp;addXp=function(n,out){const L=hero.level;const r=_ax.apply(this,arguments);try{if(hero.level>L){let tp=0;for(let l=L+1;l<=hero.level;l++)if(l%2===1&&l>=3)tp++;if(tp){hero.tp=(hero.tp||0)+tp;out.push("+"+tp+" talent point"+(tp>1?"s":"")+".")}
   setTimeout(()=>{try{bigBanner("LEVEL "+hero.level,tp?"+"+tp+" talent point"+(tp>1?"s":"")+"  ·  press T":"")}catch(e){}try{flash("rgba(255,225,140,.4)")}catch(e){}try{sfx("win");if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}},C?1400:50)}}catch(e){}return r}}catch(e){}
 // ---------- pickup floaters ----------
 try{const _gi=giveItem;giveItem=function(n,q){const r=_gi.apply(this,arguments);try{if(hero&&(typeof C==="undefined"||!C)){const f=document.createElement("div");f.className="pflt";f.textContent="+"+(q||1)+" "+n;f.style.bottom=(20+Math.random()*8)+"%";cw.appendChild(f);setTimeout(()=>f.remove(),1900)}}catch(e){}return r}}catch(e){}
 // ---------- mouse look lock (optional) ----------
 const lockOn=()=>{try{return localStorage.getItem("occultica.lock")==="on"}catch(e){return false}};
 const cv=renderer&&renderer.domElement;
 if(cv){
  cv.addEventListener("click",()=>{if(lockOn()&&!document.pointerLockElement&&!(C&&!C.rt)&&!D&&!occOpen&&!packOpen){try{cv.requestPointerLock()}catch(e){}}});
  document.addEventListener("mousemove",e=>{if(document.pointerLockElement!==cv||(C&&!C.rt)||D||packOpen||occOpen)return;const as=.0026*(window.TP&&TP.aim?1-.62*TP.aim:1);yaw-=e.movementX*as;pitch=Math.max(-1.1,Math.min(1.1,pitch-e.movementY*as))});
  document.addEventListener("pointerlockchange",()=>{if(document.pointerLockElement===cv)say("Mouse look locked. Press Esc to release.")});
 }
 const row=(document.getElementById("packbtn")||{}).parentNode;
 if(row){const b=document.createElement("button");b.className="alt";b.id="lockbtn";b.dataset.sec=1;b.style.display="none";const upd=()=>{b.textContent="Mouse look: "+(lockOn()?"click to lock":"drag")};upd();b.onclick=()=>{try{localStorage.setItem("occultica.lock",lockOn()?"off":"on");if(lockOn()===false&&document.pointerLockElement)document.exitPointerLock()}catch(e){}upd()};row.appendChild(b)}
 if(row&&window.PCK){const hb=document.createElement("button");hb.className="alt";hb.id="hourbtn";hb.dataset.sec=1;hb.style.display="none";const L=[60000,90000,120000,180000,240000];const upd=()=>{hb.textContent="Planetary hour: "+(PCK.HOURLEN/60000).toFixed(PCK.HOURLEN%60000?1:0)+" min"};upd();hb.onclick=()=>{const i=L.indexOf(PCK.HOURLEN);PCK.setHourLen(L[(i+1)%L.length]);upd();say("Each planetary hour now lasts "+PCK.HOURLEN/1000+" seconds.")};row.appendChild(hb)}
 window.FEEL={bigBanner,spot};
})();

// ===== Backup and restore: copy all saves as one code, paste it on another device =====
(function(){
 const row=(document.getElementById("packbtn")||{}).parentNode;if(!row)return;
 const keys=()=>{const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^(hollowmere|occultica)\./.test(k))o[k]=localStorage.getItem(k)}}catch(e){}return o};
 const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));
 const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
 function panel(msg){if(occOpen)occClose();const b=occPanel("Backup and restore","#8fd0ff");
  b.appendChild(el("p","Your saves live only in this browser or app. Copy the backup code and keep it somewhere safe (a note to yourself works). To move to another phone or restore a lost game, paste the code below and press Restore.","sub"));
  if(msg)b.appendChild(el("p",msg,"msg"));
  const code=enc(keys());
  const t1=document.createElement("textarea");t1.readOnly=true;t1.value=code;t1.style.minHeight="64px";b.appendChild(t1);
  const m=el("div",null,"menu");m.appendChild(btn("Copy backup code",()=>{t1.select();let ok=false;try{navigator.clipboard.writeText(code).then(()=>panel("Backup code copied."),()=>{document.execCommand&&document.execCommand("copy");panel("Selected: press and hold, then Copy.")});ok=true}catch(e){}if(!ok){try{document.execCommand("copy")}catch(e){}}},"go"));b.appendChild(m);
  const t2=document.createElement("textarea");t2.placeholder="Paste a backup code here to restore";t2.style.minHeight="64px";b.appendChild(t2);
  const m2=el("div",null,"menu");m2.appendChild(btn("Restore from code",()=>{try{const o=dec(t2.value);let n=0;Object.keys(o).forEach(k=>{if(/^(hollowmere|occultica)\./.test(k)){localStorage.setItem(k,o[k]);n++}});if(!n)throw 0;panel("Restored "+n+" items. Reloading…");setTimeout(()=>location.reload(),900)}catch(e){panel("That code did not read. Copy the whole backup code and try again.")}},"alt"));m2.appendChild(btn("Close",occClose,"go"));b.appendChild(m2)}
 const bb=document.createElement("button");bb.className="alt";bb.id="bkbtn";bb.dataset.sec=1;bb.style.display="none";bb.textContent="Backup and restore";bb.onclick=()=>{if(hero&&!C&&!D)panel()};row.appendChild(bb);
 window.BKP={panel,keys};
})();

/* ===== painted first-person hands (replaces the 3D block hands) ===== */
(function(){
 if(typeof A2==="undefined")return;
 const view=document.getElementById("view");if(!view)return;
 const imgs={};["sword","mace","holy","dagger","staff","bow"].forEach(k=>{if(A2["h_"+k]){const i=new Image();i.src=A2["h_"+k];imgs[k]=i}});
 if(!Object.keys(imgs).length)return;
 const css=document.createElement("style");
 css.textContent="#vmo{position:absolute;left:0;right:0;bottom:0;height:100%;pointer-events:none;z-index:2;display:flex;justify-content:center;align-items:flex-end;overflow:hidden}#vmo img{position:absolute;bottom:-3%;height:84%;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 16%,#000 84%,transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 16%,#000 84%,transparent 100%);width:auto;max-width:none;transform-origin:50% 100%;will-change:transform;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45))}#vmo.off{display:none}";
 document.head.appendChild(css);
 const box=document.createElement("div");box.id="vmo";const im=document.createElement("img");im.alt="";im.draggable=false;box.appendChild(im);view.appendChild(box);
 const GLOW={Flamebrand:"#ff7a20",Frostfang:"#5ab8ff",Sunblade:"#ffd060","Blazing Star":"#fff3a0",Compass:"#7aa0ff"};
 function kindOf(){const w=(hero.eq&&hero.eq.w)||"";
  if(/Dagger|knife/i.test(w))return"dagger";if(/bow/i.test(w))return"bow";if(/staff|wand/i.test(w))return"staff";if(/Mace|hammer/i.test(w))return"mace";
  if(/sword|blade|Flamebrand|Frostfang|Sunblade|Blazing|Compass|Plumb|Square/i.test(w))return"sword";
  return{Fighter:"sword",Paladin:"mace",Cleric:"holy",Rogue:"dagger",Magician:"staff",Ranger:"bow"}[hero.cls]||"sword"}
 let lastKey="",swingT=0,castT=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){
  try{_vu(dt)}catch(e){}
  try{
   if(vmG)vmG.visible=false;
   const w=(hero.eq&&hero.eq.w)||"",k=kindOf(),key=k+"|"+w;
   if(key!==lastKey){lastKey=key;im.src=(imgs[k]||imgs.sword).src;let g="";for(const n in GLOW)if(w.indexOf(n)>=0)g=GLOW[n];im.style.filter="drop-shadow(0 8px 14px rgba(0,0,0,.45))"+(g?" drop-shadow(0 0 18px "+g+")":"")}
   box.classList.toggle("off",!!(D||packOpen));
   const mv=Math.abs(joy.x)+Math.abs(joy.y)+(keys.w||keys.s||keys.a||keys.d||keys.ArrowUp||keys.ArrowDown?1:0);
   const sway=Math.sin(bob*.5)*(mv?10:2)+Math.sin(clock*1.4)*2,swx=Math.cos(bob*.25)*(mv?6:0);
   let tx=swx+(k==="staff"||k==="holy"?0:0),ty=sway,rot=0,sc=1;
   // position: weapon hand sits lower right; staff and bow lean from the right edge
   const base=({sword:2,mace:2,holy:0,dagger:0,staff:2,bow:3})[k]||0;
   if(vmSwing>=0){const p=Math.min(1,vmSwing/.38),s=Math.sin(p*Math.PI);rot=(-26*s)+(p>.5?0:0);tx+=-70*s;ty+=24*s;sc=1+.1*s}
   if(vmCast>0){const kk=Math.sin(Math.min(1,(.6-vmCast)/.6)*Math.PI);ty-=40*kk;sc*=1+.05*kk;rot+=4*kk}
   im.style.left="calc("+(50+base)+"% - "+(im.naturalWidth?0:0)+"px)";
   im.style.transform="translate(-50%,0) translate("+tx.toFixed(1)+"px,"+ty.toFixed(1)+"px) rotate("+rot.toFixed(1)+"deg) scale("+sc.toFixed(3)+")";
   const nightDim=.55+.45*Math.max(0,Math.min(1,todDay+.15));im.style.opacity="1";box.style.filter="brightness("+nightDim.toFixed(2)+")";
  }catch(e){}
 };
})();

/* model data is stored deflated to keep the game file small; __unz inflates it back to base64 at load */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).pako=e()}}(function(){return function r(o,s,f){function l(t,e){if(!s[t]){if(!o[t]){var i="function"==typeof require&&require;if(!e&&i)return i(t,!0);if(d)return d(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var a=s[t]={exports:{}};o[t][0].call(a.exports,function(e){return l(o[t][1][e]||e)},a,a.exports,r,o,s,f)}return s[t].exports}for(var d="function"==typeof require&&require,e=0;e<f.length;e++)l(f[e]);return l}({1:[function(e,t,i){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;i.assign=function(e){for(var t,i,n=Array.prototype.slice.call(arguments,1);n.length;){var a=n.shift();if(a){if("object"!=typeof a)throw new TypeError(a+"must be non-object");for(var r in a)t=a,i=r,Object.prototype.hasOwnProperty.call(t,i)&&(e[r]=a[r])}}return e},i.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var a={arraySet:function(e,t,i,n,a){if(t.subarray&&e.subarray)e.set(t.subarray(i,i+n),a);else for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){var t,i,n,a,r,o;for(t=n=0,i=e.length;t<i;t++)n+=e[t].length;for(o=new Uint8Array(n),t=a=0,i=e.length;t<i;t++)r=e[t],o.set(r,a),a+=r.length;return o}},r={arraySet:function(e,t,i,n,a){for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){return[].concat.apply([],e)}};i.setTyped=function(e){e?(i.Buf8=Uint8Array,i.Buf16=Uint16Array,i.Buf32=Int32Array,i.assign(i,a)):(i.Buf8=Array,i.Buf16=Array,i.Buf32=Array,i.assign(i,r))},i.setTyped(n)},{}],2:[function(e,t,i){"use strict";var f=e("./common"),a=!0,r=!0;try{String.fromCharCode.apply(null,[0])}catch(e){a=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){r=!1}for(var l=new f.Buf8(256),n=0;n<256;n++)l[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function d(e,t){if(t<65534&&(e.subarray&&r||!e.subarray&&a))return String.fromCharCode.apply(null,f.shrinkBuf(e,t));for(var i="",n=0;n<t;n++)i+=String.fromCharCode(e[n]);return i}l[254]=l[254]=1,i.string2buf=function(e){var t,i,n,a,r,o=e.length,s=0;for(a=0;a<o;a++)55296==(64512&(i=e.charCodeAt(a)))&&a+1<o&&56320==(64512&(n=e.charCodeAt(a+1)))&&(i=65536+(i-55296<<10)+(n-56320),a++),s+=i<128?1:i<2048?2:i<65536?3:4;for(t=new f.Buf8(s),a=r=0;r<s;a++)55296==(64512&(i=e.charCodeAt(a)))&&a+1<o&&56320==(64512&(n=e.charCodeAt(a+1)))&&(i=65536+(i-55296<<10)+(n-56320),a++),i<128?t[r++]=i:(i<2048?t[r++]=192|i>>>6:(i<65536?t[r++]=224|i>>>12:(t[r++]=240|i>>>18,t[r++]=128|i>>>12&63),t[r++]=128|i>>>6&63),t[r++]=128|63&i);return t},i.buf2binstring=function(e){return d(e,e.length)},i.binstring2buf=function(e){for(var t=new f.Buf8(e.length),i=0,n=t.length;i<n;i++)t[i]=e.charCodeAt(i);return t},i.buf2string=function(e,t){var i,n,a,r,o=t||e.length,s=new Array(2*o);for(i=n=0;i<o;)if((a=e[i++])<128)s[n++]=a;else if(4<(r=l[a]))s[n++]=65533,i+=r-1;else{for(a&=2===r?31:3===r?15:7;1<r&&i<o;)a=a<<6|63&e[i++],r--;1<r?s[n++]=65533:a<65536?s[n++]=a:(a-=65536,s[n++]=55296|a>>10&1023,s[n++]=56320|1023&a)}return d(s,n)},i.utf8border=function(e,t){var i;for((t=t||e.length)>e.length&&(t=e.length),i=t-1;0<=i&&128==(192&e[i]);)i--;return i<0?t:0===i?t:i+l[e[i]]>t?i:t}},{"./common":1}],3:[function(e,t,i){"use strict";t.exports=function(e,t,i,n){for(var a=65535&e|0,r=e>>>16&65535|0,o=0;0!==i;){for(i-=o=2e3<i?2e3:i;r=r+(a=a+t[n++]|0)|0,--o;);a%=65521,r%=65521}return a|r<<16|0}},{}],4:[function(e,t,i){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],5:[function(e,t,i){"use strict";var s=function(){for(var e,t=[],i=0;i<256;i++){e=i;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t}();t.exports=function(e,t,i,n){var a=s,r=n+i;e^=-1;for(var o=n;o<r;o++)e=e>>>8^a[255&(e^t[o])];return-1^e}},{}],6:[function(e,t,i){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],7:[function(e,t,i){"use strict";t.exports=function(e,t){var i,n,a,r,o,s,f,l,d,c,u,h,b,m,w,k,_,g,v,p,x,y,S,E,Z;i=e.state,n=e.next_in,E=e.input,a=n+(e.avail_in-5),r=e.next_out,Z=e.output,o=r-(t-e.avail_out),s=r+(e.avail_out-257),f=i.dmax,l=i.wsize,d=i.whave,c=i.wnext,u=i.window,h=i.hold,b=i.bits,m=i.lencode,w=i.distcode,k=(1<<i.lenbits)-1,_=(1<<i.distbits)-1;e:do{b<15&&(h+=E[n++]<<b,b+=8,h+=E[n++]<<b,b+=8),g=m[h&k];t:for(;;){if(h>>>=v=g>>>24,b-=v,0===(v=g>>>16&255))Z[r++]=65535&g;else{if(!(16&v)){if(0==(64&v)){g=m[(65535&g)+(h&(1<<v)-1)];continue t}if(32&v){i.mode=12;break e}e.msg="invalid literal/length code",i.mode=30;break e}p=65535&g,(v&=15)&&(b<v&&(h+=E[n++]<<b,b+=8),p+=h&(1<<v)-1,h>>>=v,b-=v),b<15&&(h+=E[n++]<<b,b+=8,h+=E[n++]<<b,b+=8),g=w[h&_];i:for(;;){if(h>>>=v=g>>>24,b-=v,!(16&(v=g>>>16&255))){if(0==(64&v)){g=w[(65535&g)+(h&(1<<v)-1)];continue i}e.msg="invalid distance code",i.mode=30;break e}if(x=65535&g,b<(v&=15)&&(h+=E[n++]<<b,(b+=8)<v&&(h+=E[n++]<<b,b+=8)),f<(x+=h&(1<<v)-1)){e.msg="invalid distance too far back",i.mode=30;break e}if(h>>>=v,b-=v,(v=r-o)<x){if(d<(v=x-v)&&i.sane){e.msg="invalid distance too far back",i.mode=30;break e}if(S=u,(y=0)===c){if(y+=l-v,v<p){for(p-=v;Z[r++]=u[y++],--v;);y=r-x,S=Z}}else if(c<v){if(y+=l+c-v,(v-=c)<p){for(p-=v;Z[r++]=u[y++],--v;);if(y=0,c<p){for(p-=v=c;Z[r++]=u[y++],--v;);y=r-x,S=Z}}}else if(y+=c-v,v<p){for(p-=v;Z[r++]=u[y++],--v;);y=r-x,S=Z}for(;2<p;)Z[r++]=S[y++],Z[r++]=S[y++],Z[r++]=S[y++],p-=3;p&&(Z[r++]=S[y++],1<p&&(Z[r++]=S[y++]))}else{for(y=r-x;Z[r++]=Z[y++],Z[r++]=Z[y++],Z[r++]=Z[y++],2<(p-=3););p&&(Z[r++]=Z[y++],1<p&&(Z[r++]=Z[y++]))}break}}break}}while(n<a&&r<s);n-=p=b>>3,h&=(1<<(b-=p<<3))-1,e.next_in=n,e.next_out=r,e.avail_in=n<a?a-n+5:5-(n-a),e.avail_out=r<s?s-r+257:257-(r-s),i.hold=h,i.bits=b}},{}],8:[function(e,t,i){"use strict";var z=e("../utils/common"),R=e("./adler32"),N=e("./crc32"),O=e("./inffast"),C=e("./inftrees"),I=1,D=2,T=0,U=-2,F=1,n=852,a=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function r(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new z.Buf16(320),this.work=new z.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function o(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=F,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new z.Buf32(n),t.distcode=t.distdyn=new z.Buf32(a),t.sane=1,t.back=-1,T):U}function s(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,o(e)):U}function f(e,t){var i,n;return e&&e.state?(n=e.state,t<0?(i=0,t=-t):(i=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=i,n.wbits=t,s(e))):U}function l(e,t){var i,n;return e?(n=new r,(e.state=n).window=null,(i=f(e,t))!==T&&(e.state=null),i):U}var d,c,u=!0;function H(e){if(u){var t;for(d=new z.Buf32(512),c=new z.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(C(I,e.lens,0,288,d,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;C(D,e.lens,0,32,c,0,e.work,{bits:5}),u=!1}e.lencode=d,e.lenbits=9,e.distcode=c,e.distbits=5}function j(e,t,i,n){var a,r=e.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new z.Buf8(r.wsize)),n>=r.wsize?(z.arraySet(r.window,t,i-r.wsize,r.wsize,0),r.wnext=0,r.whave=r.wsize):(n<(a=r.wsize-r.wnext)&&(a=n),z.arraySet(r.window,t,i-n,a,r.wnext),(n-=a)?(z.arraySet(r.window,t,i-n,n,0),r.wnext=n,r.whave=r.wsize):(r.wnext+=a,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=a))),0}i.inflateReset=s,i.inflateReset2=f,i.inflateResetKeep=o,i.inflateInit=function(e){return l(e,15)},i.inflateInit2=l,i.inflate=function(e,t){var i,n,a,r,o,s,f,l,d,c,u,h,b,m,w,k,_,g,v,p,x,y,S,E,Z=0,B=new z.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(i=e.state).mode&&(i.mode=13),o=e.next_out,a=e.output,f=e.avail_out,r=e.next_in,n=e.input,s=e.avail_in,l=i.hold,d=i.bits,c=s,u=f,y=T;e:for(;;)switch(i.mode){case F:if(0===i.wrap){i.mode=13;break}for(;d<16;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(2&i.wrap&&35615===l){B[i.check=0]=255&l,B[1]=l>>>8&255,i.check=N(i.check,B,2,0),d=l=0,i.mode=2;break}if(i.flags=0,i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&l)<<8)+(l>>8))%31){e.msg="incorrect header check",i.mode=30;break}if(8!=(15&l)){e.msg="unknown compression method",i.mode=30;break}if(d-=4,x=8+(15&(l>>>=4)),0===i.wbits)i.wbits=x;else if(x>i.wbits){e.msg="invalid window size",i.mode=30;break}i.dmax=1<<x,e.adler=i.check=1,i.mode=512&l?10:12,d=l=0;break;case 2:for(;d<16;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(i.flags=l,8!=(255&i.flags)){e.msg="unknown compression method",i.mode=30;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=30;break}i.head&&(i.head.text=l>>8&1),512&i.flags&&(B[0]=255&l,B[1]=l>>>8&255,i.check=N(i.check,B,2,0)),d=l=0,i.mode=3;case 3:for(;d<32;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.head&&(i.head.time=l),512&i.flags&&(B[0]=255&l,B[1]=l>>>8&255,B[2]=l>>>16&255,B[3]=l>>>24&255,i.check=N(i.check,B,4,0)),d=l=0,i.mode=4;case 4:for(;d<16;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.head&&(i.head.xflags=255&l,i.head.os=l>>8),512&i.flags&&(B[0]=255&l,B[1]=l>>>8&255,i.check=N(i.check,B,2,0)),d=l=0,i.mode=5;case 5:if(1024&i.flags){for(;d<16;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.length=l,i.head&&(i.head.extra_len=l),512&i.flags&&(B[0]=255&l,B[1]=l>>>8&255,i.check=N(i.check,B,2,0)),d=l=0}else i.head&&(i.head.extra=null);i.mode=6;case 6:if(1024&i.flags&&(s<(h=i.length)&&(h=s),h&&(i.head&&(x=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Array(i.head.extra_len)),z.arraySet(i.head.extra,n,r,h,x)),512&i.flags&&(i.check=N(i.check,n,h,r)),s-=h,r+=h,i.length-=h),i.length))break e;i.length=0,i.mode=7;case 7:if(2048&i.flags){if(0===s)break e;for(h=0;x=n[r+h++],i.head&&x&&i.length<65536&&(i.head.name+=String.fromCharCode(x)),x&&h<s;);if(512&i.flags&&(i.check=N(i.check,n,h,r)),s-=h,r+=h,x)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=8;case 8:if(4096&i.flags){if(0===s)break e;for(h=0;x=n[r+h++],i.head&&x&&i.length<65536&&(i.head.comment+=String.fromCharCode(x)),x&&h<s;);if(512&i.flags&&(i.check=N(i.check,n,h,r)),s-=h,r+=h,x)break e}else i.head&&(i.head.comment=null);i.mode=9;case 9:if(512&i.flags){for(;d<16;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(l!==(65535&i.check)){e.msg="header crc mismatch",i.mode=30;break}d=l=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=12;break;case 10:for(;d<32;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}e.adler=i.check=L(l),d=l=0,i.mode=11;case 11:if(0===i.havedict)return e.next_out=o,e.avail_out=f,e.next_in=r,e.avail_in=s,i.hold=l,i.bits=d,2;e.adler=i.check=1,i.mode=12;case 12:if(5===t||6===t)break e;case 13:if(i.last){l>>>=7&d,d-=7&d,i.mode=27;break}for(;d<3;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}switch(i.last=1&l,d-=1,3&(l>>>=1)){case 0:i.mode=14;break;case 1:if(H(i),i.mode=20,6!==t)break;l>>>=2,d-=2;break e;case 2:i.mode=17;break;case 3:e.msg="invalid block type",i.mode=30}l>>>=2,d-=2;break;case 14:for(l>>>=7&d,d-=7&d;d<32;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if((65535&l)!=(l>>>16^65535)){e.msg="invalid stored block lengths",i.mode=30;break}if(i.length=65535&l,d=l=0,i.mode=15,6===t)break e;case 15:i.mode=16;case 16:if(h=i.length){if(s<h&&(h=s),f<h&&(h=f),0===h)break e;z.arraySet(a,n,r,h,o),s-=h,r+=h,f-=h,o+=h,i.length-=h;break}i.mode=12;break;case 17:for(;d<14;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(i.nlen=257+(31&l),l>>>=5,d-=5,i.ndist=1+(31&l),l>>>=5,d-=5,i.ncode=4+(15&l),l>>>=4,d-=4,286<i.nlen||30<i.ndist){e.msg="too many length or distance symbols",i.mode=30;break}i.have=0,i.mode=18;case 18:for(;i.have<i.ncode;){for(;d<3;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.lens[A[i.have++]]=7&l,l>>>=3,d-=3}for(;i.have<19;)i.lens[A[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,S={bits:i.lenbits},y=C(0,i.lens,0,19,i.lencode,0,i.work,S),i.lenbits=S.bits,y){e.msg="invalid code lengths set",i.mode=30;break}i.have=0,i.mode=19;case 19:for(;i.have<i.nlen+i.ndist;){for(;k=(Z=i.lencode[l&(1<<i.lenbits)-1])>>>16&255,_=65535&Z,!((w=Z>>>24)<=d);){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(_<16)l>>>=w,d-=w,i.lens[i.have++]=_;else{if(16===_){for(E=w+2;d<E;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(l>>>=w,d-=w,0===i.have){e.msg="invalid bit length repeat",i.mode=30;break}x=i.lens[i.have-1],h=3+(3&l),l>>>=2,d-=2}else if(17===_){for(E=w+3;d<E;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}d-=w,x=0,h=3+(7&(l>>>=w)),l>>>=3,d-=3}else{for(E=w+7;d<E;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}d-=w,x=0,h=11+(127&(l>>>=w)),l>>>=7,d-=7}if(i.have+h>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mode=30;break}for(;h--;)i.lens[i.have++]=x}}if(30===i.mode)break;if(0===i.lens[256]){e.msg="invalid code -- missing end-of-block",i.mode=30;break}if(i.lenbits=9,S={bits:i.lenbits},y=C(I,i.lens,0,i.nlen,i.lencode,0,i.work,S),i.lenbits=S.bits,y){e.msg="invalid literal/lengths set",i.mode=30;break}if(i.distbits=6,i.distcode=i.distdyn,S={bits:i.distbits},y=C(D,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,S),i.distbits=S.bits,y){e.msg="invalid distances set",i.mode=30;break}if(i.mode=20,6===t)break e;case 20:i.mode=21;case 21:if(6<=s&&258<=f){e.next_out=o,e.avail_out=f,e.next_in=r,e.avail_in=s,i.hold=l,i.bits=d,O(e,u),o=e.next_out,a=e.output,f=e.avail_out,r=e.next_in,n=e.input,s=e.avail_in,l=i.hold,d=i.bits,12===i.mode&&(i.back=-1);break}for(i.back=0;k=(Z=i.lencode[l&(1<<i.lenbits)-1])>>>16&255,_=65535&Z,!((w=Z>>>24)<=d);){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(k&&0==(240&k)){for(g=w,v=k,p=_;k=(Z=i.lencode[p+((l&(1<<g+v)-1)>>g)])>>>16&255,_=65535&Z,!(g+(w=Z>>>24)<=d);){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}l>>>=g,d-=g,i.back+=g}if(l>>>=w,d-=w,i.back+=w,i.length=_,0===k){i.mode=26;break}if(32&k){i.back=-1,i.mode=12;break}if(64&k){e.msg="invalid literal/length code",i.mode=30;break}i.extra=15&k,i.mode=22;case 22:if(i.extra){for(E=i.extra;d<E;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.length+=l&(1<<i.extra)-1,l>>>=i.extra,d-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=23;case 23:for(;k=(Z=i.distcode[l&(1<<i.distbits)-1])>>>16&255,_=65535&Z,!((w=Z>>>24)<=d);){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(0==(240&k)){for(g=w,v=k,p=_;k=(Z=i.distcode[p+((l&(1<<g+v)-1)>>g)])>>>16&255,_=65535&Z,!(g+(w=Z>>>24)<=d);){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}l>>>=g,d-=g,i.back+=g}if(l>>>=w,d-=w,i.back+=w,64&k){e.msg="invalid distance code",i.mode=30;break}i.offset=_,i.extra=15&k,i.mode=24;case 24:if(i.extra){for(E=i.extra;d<E;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}i.offset+=l&(1<<i.extra)-1,l>>>=i.extra,d-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=30;break}i.mode=25;case 25:if(0===f)break e;if(h=u-f,i.offset>h){if((h=i.offset-h)>i.whave&&i.sane){e.msg="invalid distance too far back",i.mode=30;break}h>i.wnext?(h-=i.wnext,b=i.wsize-h):b=i.wnext-h,h>i.length&&(h=i.length),m=i.window}else m=a,b=o-i.offset,h=i.length;for(f<h&&(h=f),f-=h,i.length-=h;a[o++]=m[b++],--h;);0===i.length&&(i.mode=21);break;case 26:if(0===f)break e;a[o++]=i.length,f--,i.mode=21;break;case 27:if(i.wrap){for(;d<32;){if(0===s)break e;s--,l|=n[r++]<<d,d+=8}if(u-=f,e.total_out+=u,i.total+=u,u&&(e.adler=i.check=i.flags?N(i.check,a,u,o-u):R(i.check,a,u,o-u)),u=f,(i.flags?l:L(l))!==i.check){e.msg="incorrect data check",i.mode=30;break}d=l=0}i.mode=28;case 28:if(i.wrap&&i.flags){for(;d<32;){if(0===s)break e;s--,l+=n[r++]<<d,d+=8}if(l!==(4294967295&i.total)){e.msg="incorrect length check",i.mode=30;break}d=l=0}i.mode=29;case 29:y=1;break e;case 30:y=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=o,e.avail_out=f,e.next_in=r,e.avail_in=s,i.hold=l,i.bits=d,(i.wsize||u!==e.avail_out&&i.mode<30&&(i.mode<27||4!==t))&&j(e,e.output,e.next_out,u-e.avail_out)?(i.mode=31,-4):(c-=e.avail_in,u-=e.avail_out,e.total_in+=c,e.total_out+=u,i.total+=u,i.wrap&&u&&(e.adler=i.check=i.flags?N(i.check,a,u,e.next_out-u):R(i.check,a,u,e.next_out-u)),e.data_type=i.bits+(i.last?64:0)+(12===i.mode?128:0)+(20===i.mode||15===i.mode?256:0),(0===c&&0===u||4===t)&&y===T&&(y=-5),y)},i.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,T},i.inflateGetHeader=function(e,t){var i;return e&&e.state?0==(2&(i=e.state).wrap)?U:((i.head=t).done=!1,T):U},i.inflateSetDictionary=function(e,t){var i,n=t.length;return e&&e.state?0!==(i=e.state).wrap&&11!==i.mode?U:11===i.mode&&R(1,t,n,0)!==i.check?-3:j(e,t,n,n)?(i.mode=31,-4):(i.havedict=1,T):U},i.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":1,"./adler32":3,"./crc32":5,"./inffast":7,"./inftrees":9}],9:[function(e,t,i){"use strict";var I=e("../utils/common"),D=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],T=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],F=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,i,n,a,r,o,s){var f,l,d,c,u,h,b,m,w,k=s.bits,_=0,g=0,v=0,p=0,x=0,y=0,S=0,E=0,Z=0,B=0,A=null,z=0,R=new I.Buf16(16),N=new I.Buf16(16),O=null,C=0;for(_=0;_<=15;_++)R[_]=0;for(g=0;g<n;g++)R[t[i+g]]++;for(x=k,p=15;1<=p&&0===R[p];p--);if(p<x&&(x=p),0===p)return a[r++]=20971520,a[r++]=20971520,s.bits=1,0;for(v=1;v<p&&0===R[v];v++);for(x<v&&(x=v),_=E=1;_<=15;_++)if(E<<=1,(E-=R[_])<0)return-1;if(0<E&&(0===e||1!==p))return-1;for(N[1]=0,_=1;_<15;_++)N[_+1]=N[_]+R[_];for(g=0;g<n;g++)0!==t[i+g]&&(o[N[t[i+g]]++]=g);if(0===e?(A=O=o,h=19):1===e?(A=D,z-=257,O=T,C-=257,h=256):(A=U,O=F,h=-1),_=v,u=r,S=g=B=0,d=-1,c=(Z=1<<(y=x))-1,1===e&&852<Z||2===e&&592<Z)return 1;for(;;){for(b=_-S,o[g]<h?(m=0,w=o[g]):o[g]>h?(m=O[C+o[g]],w=A[z+o[g]]):(m=96,w=0),f=1<<_-S,v=l=1<<y;a[u+(B>>S)+(l-=f)]=b<<24|m<<16|w|0,0!==l;);for(f=1<<_-1;B&f;)f>>=1;if(0!==f?(B&=f-1,B+=f):B=0,g++,0==--R[_]){if(_===p)break;_=t[i+o[g]]}if(x<_&&(B&c)!==d){for(0===S&&(S=x),u+=v,E=1<<(y=_-S);y+S<p&&!((E-=R[y+S])<=0);)y++,E<<=1;if(Z+=1<<y,1===e&&852<Z||2===e&&592<Z)return 1;a[d=B&c]=x<<24|y<<16|u-r|0}}return 0!==B&&(a[u+B]=_-S<<24|64<<16|0),s.bits=x,0}},{"../utils/common":1}],10:[function(e,t,i){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],11:[function(e,t,i){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],"/lib/inflate.js":[function(e,t,i){"use strict";var c=e("./zlib/inflate"),u=e("./utils/common"),h=e("./utils/strings"),b=e("./zlib/constants"),n=e("./zlib/messages"),a=e("./zlib/zstream"),r=e("./zlib/gzheader"),m=Object.prototype.toString;function o(e){if(!(this instanceof o))return new o(e);this.options=u.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new a,this.strm.avail_out=0;var i=c.inflateInit2(this.strm,t.windowBits);if(i!==b.Z_OK)throw new Error(n[i]);if(this.header=new r,c.inflateGetHeader(this.strm,this.header),t.dictionary&&("string"==typeof t.dictionary?t.dictionary=h.string2buf(t.dictionary):"[object ArrayBuffer]"===m.call(t.dictionary)&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(i=c.inflateSetDictionary(this.strm,t.dictionary))!==b.Z_OK))throw new Error(n[i])}function s(e,t){var i=new o(t);if(i.push(e,!0),i.err)throw i.msg||n[i.err];return i.result}o.prototype.push=function(e,t){var i,n,a,r,o,s=this.strm,f=this.options.chunkSize,l=this.options.dictionary,d=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?b.Z_FINISH:b.Z_NO_FLUSH,"string"==typeof e?s.input=h.binstring2buf(e):"[object ArrayBuffer]"===m.call(e)?s.input=new Uint8Array(e):s.input=e,s.next_in=0,s.avail_in=s.input.length;do{if(0===s.avail_out&&(s.output=new u.Buf8(f),s.next_out=0,s.avail_out=f),(i=c.inflate(s,b.Z_NO_FLUSH))===b.Z_NEED_DICT&&l&&(i=c.inflateSetDictionary(this.strm,l)),i===b.Z_BUF_ERROR&&!0===d&&(i=b.Z_OK,d=!1),i!==b.Z_STREAM_END&&i!==b.Z_OK)return this.onEnd(i),!(this.ended=!0);s.next_out&&(0!==s.avail_out&&i!==b.Z_STREAM_END&&(0!==s.avail_in||n!==b.Z_FINISH&&n!==b.Z_SYNC_FLUSH)||("string"===this.options.to?(a=h.utf8border(s.output,s.next_out),r=s.next_out-a,o=h.buf2string(s.output,a),s.next_out=r,s.avail_out=f-r,r&&u.arraySet(s.output,s.output,a,r,0),this.onData(o)):this.onData(u.shrinkBuf(s.output,s.next_out)))),0===s.avail_in&&0===s.avail_out&&(d=!0)}while((0<s.avail_in||0===s.avail_out)&&i!==b.Z_STREAM_END);return i===b.Z_STREAM_END&&(n=b.Z_FINISH),n===b.Z_FINISH?(i=c.inflateEnd(this.strm),this.onEnd(i),this.ended=!0,i===b.Z_OK):n!==b.Z_SYNC_FLUSH||(this.onEnd(b.Z_OK),!(s.avail_out=0))},o.prototype.onData=function(e){this.chunks.push(e)},o.prototype.onEnd=function(e){e===b.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=u.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},i.Inflate=o,i.inflate=s,i.inflateRaw=function(e,t){return(t=t||{}).raw=!0,s(e,t)},i.ungzip=s},{"./utils/common":1,"./utils/strings":2,"./zlib/constants":4,"./zlib/gzheader":6,"./zlib/inflate":8,"./zlib/messages":10,"./zlib/zstream":11}]},{},[])("/lib/inflate.js")});

window.__unz=function(b64){const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const a=pako.inflate(u);let out="";for(let i=0;i<a.length;i+=16384)out+=String.fromCharCode.apply(null,a.subarray(i,i+16384));return btoa(out)};

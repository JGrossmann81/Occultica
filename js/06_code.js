
/* ===== PP: Quaternius Fantasy Props MegaKit (free licence) — barrels, crates, stalls, chests, cages, candlesticks and more ===== */
window.PP=(function(){
 if(typeof THREE==="undefined"||!window.PP_B64)return null;
 const T=THREE;let D=null,H=null;const TX={},GC={},MC={};
 function init(){if(D)return;const bin=atob(PP_B64),n=bin.length,u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=bin.charCodeAt(i);
  const hl=new DataView(u.buffer).getUint32(0,true);H=JSON.parse(new TextDecoder().decode(u.subarray(4,4+hl)));D=u.buffer.slice(4+hl)}
 const sl=(a,Ty)=>new Ty(D.slice(a[0],a[0]+a[1]));
 function tex(name){if(TX[name])return TX[name];const t=H.tex[name];if(!t)return null;
  if(t._t)return TX[name]=t._t;
  const tx=new T.Texture(),im=new Image();{const c=document.createElement('canvas');c.width=c.height=2;const g=c.getContext('2d');g.fillStyle='#6a5a48';g.fillRect(0,0,2,2);tx.image=c;tx.needsUpdate=true}
  im.onload=()=>{tx.image=im;tx.needsUpdate=true};im.src=URL.createObjectURL(new Blob([D.slice(t.d[0],t.d[0]+t.d[1])],{type:"image/jpeg"}));
  tx.anisotropy=4;tx.flipY=false;tx.wrapS=tx.wrapT=T.RepeatWrapping;t._t=tx;return TX[name]=tx}
 function mat(desc){const key=desc.n+"|"+desc.vc;if(MC[key])return MC[key];
  const tx=tex(desc.n),m=new T.MeshLambertMaterial({map:tx||null,vertexColors:!!desc.vc,side:T.DoubleSide});
  if(!tx)m.color.setHex(0xd8cfae);else{m.emissiveMap=tx;m.emissive.setRGB(.2,.18,.16)}
  try{if(window.SKY2&&SKY2.patch)SKY2.patch(m)}catch(e){}
  return MC[key]=m}
 function geo(name){if(GC[name])return GC[name];init();const pr=H.models[name];if(!pr)return null;
  const P=[],N=[],U=[],C=[],I=[],mats=[];let vb=0,hasC=false;const groups=[];
  pr.forEach(p=>{const q=sl(p.p,Uint16Array),nr=sl(p.nr,Int8Array),uv=sl(p.uv,Uint16Array),col=p.c?sl(p.c,Uint8Array):null,ix=sl(p.i,Uint16Array),st=I.length;
   for(let i=0;i<p.n;i++){P.push(q[i*3]/65535*p.sc[0]+p.mn[0],q[i*3+1]/65535*p.sc[1]+p.mn[1],q[i*3+2]/65535*p.sc[2]+p.mn[2]);N.push(nr[i*3]/127,nr[i*3+1]/127,nr[i*3+2]/127);
    U.push(uv[i*2]/65535*p.us[0]+p.um[0],uv[i*2+1]/65535*p.us[1]+p.um[1]);if(col){hasC=true;C.push(col[i*3]/255,col[i*3+1]/255,col[i*3+2]/255)}else C.push(1,1,1)}
   for(let i=0;i<ix.length;i++)I.push(ix[i]+vb);groups.push([st,I.length-st,mats.length]);mats.push({n:p.mat,vc:!!col});vb+=p.n});
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(P,3));g.setAttribute("normal",new T.Float32BufferAttribute(N,3));g.setAttribute("uv",new T.Float32BufferAttribute(U,2));
  if(hasC)g.setAttribute("color",new T.Float32BufferAttribute(C,3));g.setIndex(I);groups.forEach(q=>g.addGroup(q[0],q[1],q[2]));
  /* vertex colours only on materials that carry them; other groups must still have a colour attribute -> all white by construction */
  g.computeBoundingSphere();return GC[name]={g,m:mats.map(mat)}}
 const _o=new T.Object3D();
 /* items: [{n,x,y,z,ry,s,rx?,rz?}] in the parent's local coordinates. One instanced mesh per model. */
 function place(parent,items,opt){opt=opt||{};const by={};items.forEach(it=>{(by[it.n]=by[it.n]||[]).push(it)});const out=[];
  for(const n in by){const G=geo(n);if(!G)continue;const L=by[n],im=new T.InstancedMesh(G.g,G.m,L.length);
   L.forEach((it,i)=>{_o.position.set(it.x,it.y,it.z);_o.rotation.set(it.rx||0,it.ry||0,it.rz||0);_o.scale.setScalar(it.s||1);_o.updateMatrix();im.setMatrixAt(i,_o.matrix)});
   im.frustumCulled=false;im.castShadow=!!opt.shadow;im.receiveShadow=false;im.userData.pp=n;parent.add(im);out.push(im)}
  return out}
 /* distance-culled set for the open world: refresh(cx,cz,R) keeps only nearby instances */
 function field(parent,items){const by={};items.forEach(it=>{(by[it.n]=by[it.n]||[]).push(it)});const S=[];
  for(const n in by){const G=geo(n);if(!G)continue;const L=by[n],im=new T.InstancedMesh(G.g,G.m,L.length);im.count=0;im.frustumCulled=false;parent.add(im);S.push({L,im})}
  return{S,refresh(cx,cz,R){const R2=R*R;S.forEach(s=>{let k=0;const a=s.im.instanceMatrix.array;for(const it of s.L){const dx=it.x-cx,dz=it.z-cz;if(dx*dx+dz*dz>R2)continue;_o.position.set(it.x,it.y,it.z);_o.rotation.set(it.rx||0,it.ry||0,it.rz||0);_o.scale.setScalar(it.s||1);_o.updateMatrix();_o.matrix.toArray(a,k*16);k++}
    s.im.count=k;s.im.instanceMatrix.needsUpdate=true;s.im.visible=k>0})}}}
 return{geo,place,field,has:n=>{try{init();return !!H.models[n]}catch(e){return false}},names:()=>{init();return Object.keys(H.models)}}
})();

/* ===== painted cut-out sprites for the 3D world (trees, plants, rocks, houses, people) ===== */
window.SPR=(function(){
 const SA=(typeof A2!=="undefined"&&A2.sa)||{},TEXS={},TINT=[];
 const has=n=>!!SA[n];
 const skip=(n,l)=>has(n)?[]:l;
 function tex(n){if(TEXS[n])return TEXS[n];const t=new THREE.Texture(),im=new Image();t.anisotropy=4;im.onload=()=>{t.image=im;t.needsUpdate=true};im.src=A2["s_"+n];TEXS[n]=t;return t}
 const G=new THREE.PlaneGeometry(1,1);G.translate(0,.5,0);
 const SG=new THREE.PlaneGeometry(1,1);SG.rotateX(-Math.PI/2);
 let SHM=null;
 function bbMat(n,keep){const m=new THREE.MeshBasicMaterial({map:tex(n),alphaTest:.5,side:THREE.DoubleSide,fog:true});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace("#include <project_vertex>",
   "vec3 ip=(modelMatrix*vec4(instanceMatrix[3].xyz,1.)).xyz;vec3 tc=cameraPosition-ip;tc.y=0.;tc=normalize(tc+vec3(1e-4,0.,1e-4));vec3 rg=vec3(tc.z,0.,-tc.x);"+
   "vec3 pw=ip+rg*(position.x*instanceMatrix[0].x)+vec3(0.,position.y*instanceMatrix[1].y,0.);vec4 mvPosition=viewMatrix*vec4(pw,1.0);gl_Position=projectionMatrix*mvPosition;"+(keep?"":"if(distance(cameraPosition.xz,ip.xz)<2.0+abs(instanceMatrix[0].x)*.3)gl_Position=vec4(2.,2.,2.,1.);"))};m.customProgramCacheKey=()=>keep?"bbk":"bb";
  TINT.push(m);return m}
 /* crossed-panel trees: real volume you can walk around, with a light wind sway */
 const XQ={oak:1,willow:1,pine:1,snowpine:1,dead:1,cactus:1,bush:1},XT={value:0};
 const XG=(()=>{const pos=[],uv=[],idx=[];[0,1,2].forEach(k=>{const a=k*Math.PI/3,c=Math.cos(a),sn=Math.sin(a),b=pos.length/3;[[-.5,0,0,0],[.5,0,1,0],[.5,1,1,1],[-.5,1,0,1]].forEach(v=>{pos.push(v[0]*c,v[1],v[0]*sn);uv.push(v[2],v[3])});idx.push(b,b+1,b+2,b,b+2,b+3)});
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setAttribute("normal",new THREE.Float32BufferAttribute(pos.map((v,i)=>i%3===1?1:0),3));g.setIndex(idx);return g})();
 function xMat(n,sway){const m=new THREE.MeshBasicMaterial({map:tex(n),alphaTest:.5,side:THREE.DoubleSide,fog:true});
  m.onBeforeCompile=sh=>{sh.uniforms.uT=XT;sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT;").replace("#include <project_vertex>","#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.31+instanceMatrix[3].z*.23;\ntransformed.x+=sin(uT*1.25+ph)*"+(sway||.03)+"*position.y*position.y;transformed.z+=cos(uT*.9+ph*1.3)*"+((sway||.03)*.6)+"*position.y*position.y;\n#endif\n#include <project_vertex>")};
  m.customProgramCacheKey=()=>"xq"+(sway||.03);TINT.push(m);return m}
 function put(parent,n,list,shadow,keep){ // list: [x,y,z,h,flip] in parent's local coords
  if(!list.length||!has(n))return;
  const xq=XQ[n]&&!keep,asp=SA[n],mesh=new THREE.InstancedMesh(xq?XG:G,xq?xMat(n,n==='cactus'?.01:n==='dead'?.015:.03):bbMat(n,keep),list.length),qr=new THREE.Quaternion(),ya=new THREE.Vector3(0,1,0),mm=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();
  list.forEach((d,i)=>{p.set(d[0],d[1],d[2]);s.set((d[4]?-1:1)*d[3]*asp*(d[5]||1),d[3],1);if(xq)qr.setFromAxisAngle(ya,((d[0]*12.9898+d[2]*78.233)%1+1)%1*3.14159);mm.compose(p,xq?qr:q,s);mesh.setMatrixAt(i,mm)});if(xq)mesh.onBeforeRender=()=>{XT.value=performance.now()/1000};
  Object.defineProperty(mesh,"frustumCulled",{get:()=>false,set:()=>{}});parent.add(mesh);
  if(shadow){if(!SHM)SHM=new THREE.MeshBasicMaterial({map:radTex(0,0,0),transparent:true,opacity:.5,depthWrite:false,fog:false});
   const sm=new THREE.InstancedMesh(SG,SHM,list.length);list.forEach((d,i)=>{p.set(d[0],d[1]+.06,d[2]);const w=d[3]*asp*(d[5]||1)*.55*shadow;s.set(w,1,w*.7);mm.compose(p,q,s);sm.setMatrixAt(i,mm)});Object.defineProperty(sm,"frustumCulled",{get:()=>false,set:()=>{}});sm.renderOrder=-1;parent.add(sm)}
  if(!keep&&window.G3D&&G3D.has(n)&&!window.NO3D)try{G3D.control(parent,n,list,mesh,SA)}catch(e){console.warn('g3d',e)}
  return mesh}
 const rnd=(x,z)=>{const v=Math.sin(x*12.9898+z*78.233)*43758.5453;return v-Math.floor(v)};
 const bAt=(x,z)=>{const r=biome[Math.floor(z/TW)];return r&&r[Math.floor(x/TW)]};
 function foliage(L){const lst={},add=(n,x,y,z,h,wf)=>{(lst[n]=lst[n]||[]).push([x,y,z,h,rnd(x,z)>.5,wf])};
  if(has("oak"))L.trunk.forEach(t=>{const b=bAt(t.x,t.z);if(b==="swamp"&&has("willow"))add("willow",t.x,t.y+.1,t.z,4.6*t.sx);else add("oak",t.x,t.y+.1,t.z,4.9*t.sx)});
  if(has("pine"))L.ptr.forEach(t=>{const b=bAt(t.x,t.z);add((b==="tundra"||b==="mountain")&&has("snowpine")?"snowpine":"pine",t.x,t.y+.1,t.z,5.0*t.sx)});
  if(has("dead"))L.dead.forEach(t=>add("dead",t.x,t.y+.1,t.z,3.4*t.sx));
  if(has("cactus"))L.cac.forEach(t=>add("cactus",t.x,t.y+.1,t.z,2.7*t.sx));
  if(has("bush"))L.bush.forEach(t=>add("bush",t.x,t.y-.1,t.z,2.3*t.sx));
  L.rock.forEach(t=>{const b=bAt(t.x,t.z),n=(b==="desert"&&has("rock"))?"rock":"boulder";if(has(n))add(n,t.x,t.y-.1,t.z,2.2*t.sx+.4)});
  if(has("reeds"))L.reed.forEach(t=>add("reeds",t.x,t.y+.1,t.z,.85*t.sy));
  if(has("tuft"))L.tuft.forEach(t=>{if(rnd(t.x*3.1,t.z)>.4)add("tuft",t.x,t.y,t.z,.9*t.sy+.2)});
  if(has("ice"))L.ice.forEach(t=>{if(rnd(t.x*1.7,t.z)<.22)add("ice",t.x+(rnd(t.x,t.z*3)-.5)*1.4,t.y+.1,t.z+(rnd(t.z,t.x*3)-.5)*1.4,2.0+rnd(t.z,t.x)*1.6)});
  if(has("snowpeak")){const ps=(d,fall)=>{const b=bAt(d.x,d.z),r=rnd(d.x*.7,d.z);let n;if(b==="tundra")n=has("icepeak")?"icepeak":"snowpeak";else if(b==="mountain")n=r<.6?"snowpeak":(has("crag")?"crag":"snowpeak");else if(b==="desert")n=has("mesa")?"mesa":"crag";else if(b==="hills")n=has("hill")?"hill":"snowpeak";else n=fall;if(has(n))add(n,d.x,d.y+.7,d.z,Math.max(4,d.sy*8*1.25),.72)};L.peakS.forEach(d=>ps(d,"snowpeak"));L.peakB.forEach(d=>ps(d,"crag"))}
  const sh={oak:1,pine:.6,snowpine:.6,willow:.9,dead:.5,cactus:.5,bush:.8,boulder:.8,rock:.8};
  for(const n in lst)put(world,n,lst[n],sh[n]||0)}
 const HOUSE=["cottage","cottage2","cottage","cottage2","cottage"];
 function hide(g){g.children.forEach(c=>{if(c.isMesh)c.visible=false})}
 function house(g,h,i){const n=has(HOUSE[i%5])?HOUSE[i%5]:(has("cottage")?"cottage":null);if(!n)return;hide(h);
  put(g,n,[[h.position.x,h.position.y,h.position.z,5.2,(i%2)===1]],0,true)}
 const PO={fort:["tower",11],hut:["hut",6.4],obelisk:["obelisk",8.6],ruin:["ruin",5.5],shrine:["stones",4.2]};
 function poi(p,g){const d=PO[p.id];if(!d||!has(d[0]))return;hide(g);put(g,d[0],[[0,0,0,d[1],false]],.6,true)}
 const NJ={Witch:"witch",Alchemist:"alch",Herbalist:"herb",Priest:"priest",Innkeeper:"inn",Merchant:"merch","Old soldier":"soldier",Bard:"bard",Scholar:"scholar","Dwarf miner":"dwarf",Farmer:"farm",Hermit:"hermit",Hunter:"hunter",Ferryman:"ferry","Fortune-teller":"seer",Nomad:"nomad",Astrologer:"astro",Oracle:"oracle",Magus:"magus",Gnostic:"gnostic",Cultist:"cultist",Templar:"templar"};
 function npc(g,n){const k="n_"+(NJ[n.job]||"");if(!has(k))return;hide(g);const m=new THREE.SpriteMaterial({map:tex(k),alphaTest:.5,fog:true}),s=new THREE.Sprite(m),h=({dwarf:1.55,farm:2.05,hermit:1.95,witch:2.0})[NJ[n.job]]||2.05;s.center.set(.5,0);s.scale.set(h*SA[k],h,1);s.position.y=-.05;g.add(s);TINT.push(m);g.userData.spr=s}
 let lastK=-1;
 function tint(day){const k=Math.max(0,Math.min(1,day*1.15)),r=.3+.7*k,gg=.34+.66*k,b=.52+.48*k;const key=Math.round(k*50);if(key===lastK)return;lastK=key;TINT.forEach(m=>m.color.setRGB(r*.98,gg*.98,b*.98))}
 const _nt=window.nightTick;window.nightTick=function(day,cp){if(_nt)_nt.apply(this,arguments);tint(day)};
 return{has,skip,foliage,house,poi,npc,hide}
})();

/* ===== Occultica voices: better picks, per-character voices, natural pacing, voice settings ===== */
(function(){
 if(!window.speechSynthesis)return;
 const SS=speechSynthesis,LS={get(k,d){try{const v=localStorage.getItem("occultica.v."+k);return v===null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem("occultica.v."+k,v)}catch(e){}}};
 const MALE=/\b(guy|ryan|davis|daniel|oliver|arthur|george|james|mark|david|alex|fred|thomas|eric|roger|christopher|brian|liam|william|rishi|male|aaron|gordon|lee|rocko|reed|jason|tony|andrew|brandon|steffan|connor|mitchell|sam|alfie|elliot|noah|cooper|jacob|ollie|henry|jack|harry|ethan|luke|adam|mason|ben|max|neil|prabhat|ravi|hemant|jorge|diego|pierre)\b/i;
 const FEMALE=/\b(aria|jenny|sonia|libby|zira|samantha|karen|moira|serena|susan|hazel|emma|michelle|ana|jane|sara|female|fiona|tessa|victoria|kate|amy|allison|ava|nicole|salli|joanna|kimberly|ivy|kendra|ruth|natasha|clara|catherine|heather|linda|ellen|veena|rocko|sandy|shelley|flo|grandma|nora|yuna|mia|maisie|natasha|neerja|abbi|bella|hollie|olivia|elsie|evelyn|emily|nova|shimmer|sarah|lucy|grace|holly|isla|charlotte|sophie|abby|zoe|chloe|lily|madison|jess|leah|mary|monica|paola|elena|jessa|ashley|molly)\b/i;
 const GOOD=/(natural|neural|online|premium|enhanced|siri)/i;
 let voices=[];
 function load(){voices=SS.getVoices().filter(v=>/^en/i.test(v.lang))}
 load();SS.onvoiceschanged=load;
 function score(v){let s=0;if(GOOD.test(v.name))s+=60;if(/google/i.test(v.name))s+=25;if(/microsoft/i.test(v.name))s+=10;if(/en[-_](US|GB|AU|IE|CA)/i.test(v.lang))s+=5;if(/en[-_]GB/i.test(v.lang))s+=2;if(!v.localService)s+=3;if(/espeak|compact/i.test(v.name))s-=40;return s}
 function gender(v){if(FEMALE.test(v.name))return"f";if(MALE.test(v.name))return"m";return"?"}
 function best(g){const c=voices.filter(v=>gender(v)===g).sort((a,b)=>score(b)-score(a));return c[0]||null}
 function byName(n){return voices.find(v=>v.name===n)||null}
 function pref(role,seed){ // role: dm | m | f
  if(!voices.length)load();
  const saved=byName(LS.get("v_"+role,""));if(saved)return saved;
  const ranked=voices.slice().sort((a,b)=>score(b)-score(a));
  const nat=ranked.filter(v=>GOOD.test(v.name));
  if(role==="dm"){return nat.find(v=>gender(v)!=="f")||nat[0]||best("m")||ranked[0]||null}
  const exact=nat.filter(v=>gender(v)===role),unk=nat.filter(v=>gender(v)==="?");
  const pool=exact.length?exact:(unk.length?unk:nat);
  if(pool.length)return pool[(seed||0)%pool.length];
  return best(role)||best(role==="m"?"f":"m")||ranked[0]||null}
 const FEM_JOB=/^(innkeeper|fortune-teller|witch|herbalist|oracle|seer)$/i;
 function genderOf(n){return FEM_JOB.test(n.job||"")?"f":"m"}
 function clean(t){return String(t)
  .replace(/\bgp\b/gi,"gold pieces").replace(/\bHP\b/g,"hit points").replace(/\bXP\b/g,"experience").replace(/\bAC\b/g,"armor class").replace(/\bd20\b/gi,"d twenty")
  .replace(/[|_*#\[\]{}<>~^]/g," ").replace(/\s*[—–]\s*/g,", ").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,"").replace(/\s+/g," ").trim()}
 function chunks(t){const parts=clean(t).match(/[^.!?;:]+[.!?;:]*\s*/g)||[t];const out=[];let cur="";
  for(const p of parts){if((cur+p).length<170)cur+=p;else{if(cur)out.push(cur.trim());cur=p}}if(cur)out.push(cur.trim());return out}
 let token=0;
 let busy=0;function stop(){token++;busy=0;try{SS.cancel()}catch(e){}if(window.MUS)MUS.duck(0)}
 function ready(cb){if(voices.length){cb();return}load();if(voices.length){cb();return}let done=0;const f=()=>{if(done)return;done=1;load();cb()};try{SS.addEventListener("voiceschanged",f,{once:true})}catch(e){}setTimeout(f,1800)}
 function say(text,who){
  stop();const my0=token;ready(()=>{if(my0!==token)return;say2(text,who)})}
 function say2(text,who){
  stop();const my=token;busy=Date.now();const isDM=who==="dm";if(window.MUS)MUS.duck(1);
  const role=isDM?"dm":genderOf(who||{});const v=pref(role,who&&who.seed);
  const rate=parseFloat(LS.get("rate","0.92"))*(isDM?.96:1);
  let pitch=isDM?.86:(role==="f"?1.02:.92);
  if(!isDM&&who&&typeof who.seed==="number"){pitch+=((who.seed%5)-2)*.05;}
  if(v&&GOOD.test(v.name))pitch=1; // natural voices already sound human: leave pitch alone
  const list=chunks(text);window.OV.last=(v?v.name:'(default)')+' | role '+role+' | pitch '+pitch.toFixed(2)+' rate '+rate.toFixed(2);
  (function next(i){
   if(my!==token)return;if(i>=list.length){busy=0;if(window.MUS)MUS.duck(0);return}
   const u=new SpeechSynthesisUtterance(list[i]);if(v){u.voice=v;u.lang=v.lang}
   u.rate=rate;u.pitch=Math.max(.5,Math.min(1.6,pitch));u.volume=1;
   u.onend=()=>setTimeout(()=>next(i+1),/[.!?]$/.test(list[i])?260:120);u.onerror=()=>{setTimeout(()=>next(i+1),60)};
   SS.speak(u)})(0)}
 window.OV={busy:()=>busy&&Date.now()-busy<45000,say,stop,voices:()=>voices,pref,genderOf};
 // game hooks
 try{LS.set("npc","1");voiceOn=true;localStorage.setItem("occultica.dmvoice","1")}catch(e){}
 try{const _rd=renderDlg;renderDlg=function(){_rd.apply(this,arguments);LS.set("npc",voiceOn?"1":"0")}}catch(e){}
 try{speak=function(t,n){if(typeof voiceOn==="undefined"||!voiceOn)return;say(t,n)}}catch(e){}
 // ---- settings UI ----
 const css=document.createElement("style");
 css.textContent="#ovbtn{position:absolute;left:84px;top:8px;z-index:6;padding:7px 11px;background:#f6e8c0;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:999px;font:700 .8rem 'Cinzel',serif;cursor:pointer;box-shadow:0 2px 0 #e8b04a,0 6px 14px #0007}#ovbtn:hover{background:#fff3cf}"+
 "#ovp{max-height:80%;overflow:auto;position:absolute;left:8px;top:54px;z-index:7;width:min(380px,calc(100% - 16px));background:#f6e8c0;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:12px;padding:12px 14px;font:.95rem/1.4 Georgia,serif;box-shadow:0 12px 28px #000a}#ovp[hidden]{display:none}#ovp label{display:block;margin:6px 0 2px;font:700 .72rem 'Cinzel',serif;color:#a8324b}#ovp select,#ovp input{width:100%;font:inherit}#ovp button{margin:8px 6px 0 0;font:700 .74rem 'Cinzel',serif;background:#fff6dc;color:#1c1a3a;border:1.5px solid #1c1a3a;border-radius:999px;padding:5px 11px;cursor:pointer}#ovp small{display:block;opacity:.75;margin-top:6px}";
 document.head.appendChild(css);
 const cw=document.querySelector(".cw")||document.body;
 const b=document.createElement("button");b.id="ovbtn";b.type="button";b.textContent="Voices";b.hidden=true;
 const p=document.createElement("div");p.id="ovp";p.hidden=true;
 cw.appendChild(b);cw.appendChild(p);
 function sel(role,label){const l=document.createElement("label");l.textContent=label;const s=document.createElement("select");
  const cur=pref(role);voices.slice().sort((a,c)=>score(c)-score(a)).forEach(v=>{const o=document.createElement("option");o.value=v.name;o.textContent=v.name+(GOOD.test(v.name)?"  (natural)":"");if(cur&&cur.name===v.name)o.selected=true;s.appendChild(o)});
  s.onchange=()=>{LS.set("v_"+role,s.value);say(role==="dm"?"The road is long, traveller, and the night is longer.":"Well met. Pull up a stool, and hear what I have to say.",role==="dm"?"dm":{name:role==="f"?"Edda":"Tobias",seed:2})};
  p.appendChild(l);p.appendChild(s)}
 function build(){p.innerHTML="";const h=document.createElement("div");h.innerHTML="<b>Voices</b>";p.appendChild(h);
  if(!voices.length){p.appendChild(document.createTextNode("No voices found on this device."));return}
  sel("dm","Dungeon Master");sel("m","Villagers (men)");sel("f","Villagers (women)");
  const l=document.createElement("label");l.textContent="Speed";p.appendChild(l);
  const r=document.createElement("input");r.type="range";r.min=".7";r.max="1.2";r.step=".02";r.value=LS.get("rate","0.92");r.oninput=()=>LS.set("rate",r.value);p.appendChild(r);
  const t=document.createElement("button");t.textContent="Test";t.onclick=()=>say("Greetings, wanderer. The tests ahead are many, but you do not walk alone.","dm");p.appendChild(t);
  const tm=document.createElement("button");tm.textContent="Test villager (man)";tm.onclick=()=>{say("Well met, traveler. Sit by the fire and rest a while.",{name:"Tobias",seed:3});setTimeout(diag,200)};p.appendChild(tm);
  const tf=document.createElement("button");tf.textContent="Test villager (woman)";tf.onclick=()=>{say("Well met, traveler. Sit by the fire and rest a while.",{name:"Edda",seed:4});setTimeout(diag,200)};p.appendChild(tf);
  const c=document.createElement("button");c.textContent="Close";c.onclick=()=>{p.hidden=true;stop()};p.appendChild(c);
  const dg=document.createElement("small");dg.id="ovdiag";dg.style.whiteSpace="pre-wrap";p.appendChild(dg);function diag(){dg.textContent="Last voice used: "+(OV.last||"none yet")+"\nVoices found: "+voices.length+"\n"+voices.map(v=>v.name+" ["+gender(v)+(GOOD.test(v.name)?",natural":"")+"]").join("\n")}diag();
  const n=document.createElement("small");n.textContent="Best voices depend on your device. On Windows, Edge or Chrome offer the most natural ones; Windows 11 lets you add more under Settings, Time and language, Speech.";p.appendChild(n)}
 b.onclick=()=>{if(!p.hidden){p.hidden=true;return}load();build();p.hidden=false};
 setInterval(()=>{const gm=document.getElementById("game");b.hidden=!(gm&&!gm.hidden&&typeof hero!=="undefined"&&hero);if(b.hidden)p.hidden=true},500);
})();

window.MUSIC_URLS={"main": "audio/movement_jam.mp3", "trial": "audio/die_trying.mp3", "planet": "audio/outer_planet.mp3", "intro": "audio/movie_intro.mp3", "ice": "audio/breakbaby.mp3", "main2": "audio/movement_3.mp3", "boss": "audio/big_battle.mp3"};
/* ===== Occultica background music: two looping tracks, crossfaded by scene, ducked under voices ===== */
(function(){
 const LSg=k=>{try{return localStorage.getItem("occultica.music."+k)}catch(e){return null}},LSs=(k,v)=>{try{localStorage.setItem("occultica.music."+k,v)}catch(e){}};
 const URLS=window.MUSIC_URLS||{};
 // per-track loudness so the tracks sit at the same level
 const GAIN={main:1,trial:1,planet:1,main2:1,ice:.62,boss:.62,intro:3};
 const T={};
 Object.keys(URLS).forEach(k=>{const a=new Audio();a.loop=k!=="intro";a.preload="auto";a.src=URLS[k];T[k]={a,v:0,hold:0};if(k==="intro")a.addEventListener("ended",()=>{T.intro.hold=1;setTimeout(()=>{T.intro.hold=0;try{T.intro.a.currentTime=0}catch(e){}kick()},14000)})});
 let want=LSg("on")!=="0",base=.2,duck=false,started=false,scene=(typeof hero==="undefined"||!hero)&&T.intro?"intro":"main",timer=null;
 const level=k=>want?(k===scene?base*GAIN[k]*(duck?.35:1):0):0;
 function step(){
  let busy=false;
  for(const k in T){const o=T[k],t=level(k);o.v+=(t-o.v)*.12;if(Math.abs(t-o.v)<.004)o.v=t;else busy=true;
   try{o.a.volume=Math.max(0,Math.min(1,o.v))}catch(e){}
   if(started&&want&&k===scene&&o.a.paused&&!o.hold)o.a.play().catch(()=>{});
   if(o.v===0&&t===0&&!o.a.paused)o.a.pause()}
  timer=busy?setTimeout(step,50):null}
 function kick(){if(!timer)step()}
 function start(){if(!want||!(T.main||T.intro))return;started=true;kick()}
 /* warm-up: start every track once, silently, a few seconds apart while nothing is happening, so the first switch
    (e.g. into a boss fight) never has to load and decode a big file in the middle of the action */
 const warmed={};
 function warm(){try{if(!started||!want)return;const fight=(typeof C!=="undefined"&&C&&!C.over);if(fight)return;
  for(const k in T){if(warmed[k]||k===scene)continue;warmed[k]=1;const o=T[k],a=o.a;if(!a.paused)return;
   a.volume=0;a.muted=true;const p=a.play();const done=()=>{try{a.pause();a.currentTime=0;a.muted=false}catch(e){}};
   if(p&&p.then)p.then(()=>setTimeout(done,350)).catch(()=>{warmed[k]=0;a.muted=false});else setTimeout(done,350);return}}catch(e){}}
 setInterval(warm,4000);
 window.MUS={duck(f){duck=!!f;kick()},scene(s){if(!T[s]||s===scene)return;scene=s;kick()},toggle(){want=!want;LSs("on",want?"1":"0");if(want)started=true;kick();return want},isOn:()=>want,tracks:T};
 ["pointerdown","keydown","touchstart"].forEach(ev=>addEventListener(ev,()=>{start()},{passive:true}));
 setTimeout(()=>{try{start()}catch(e){}},400);
 // pick the track from what is happening: fights and dungeons get the trial music
 setInterval(()=>{try{const hasHero=typeof hero!=="undefined"&&hero;if(!hasHero){MUS.scene(T.intro?"intro":"main");return}
  const fight=(typeof C!=="undefined"&&C&&!C.over&&(!C.rt||C.near)),dg=(typeof DG!=="undefined"&&DG);const occ=(typeof occOpen!=="undefined"&&occOpen),night=(typeof todDay!=="undefined"&&todDay<.12);
  const ice=T.ice&&(dg?(DG.th&&DG.th.b==="tundra"):(typeof lastBiome!=="undefined"&&lastBiome==="tundra"));
  const bi=dg?"":(typeof lastBiome!=="undefined"?lastBiome:""),alt=T.main2&&/^(desert|swamp|mountain)$/.test(bi);
  const big=fight&&T.boss&&C&&(C.boss||C.story||/Tetramorph|Chorus|Archon|Bael|Drake|Hydra|Dragon|Hollow King|Dune King|Giant|Gorrum|Seraph|Ophan|Argus|Beholder/i.test((C.e&&C.e.name)||""));
  MUS.scene(big?"boss":ice&&(dg||fight||!night)?"ice":fight||dg?"trial":(occ||night)?"planet":alt?"main2":"main")}catch(e){}},700);
 const sb=document.getElementById("snd");
 if(sb){const mb=document.createElement("button");mb.className="alt";mb.id="mus";mb.type="button";const lab=()=>{mb.textContent="Music: "+(want?"on":"off")};lab();mb.onclick=()=>{MUS.toggle();lab()};sb.parentNode.insertBefore(mb,sb.nextSibling)}
})();

/* ===== The Dungeon Master: scene narrator with a voice ===== */
(function(){
const G=id=>document.getElementById(id);
const hash=(a,b,c)=>{let h=(a*374761393+b*668265263+(c||0)*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296};
const pick=(a,r)=>a[Math.floor(r*a.length)%a.length];
let press=0,lastKey="",voiceOK=true,curText="";
try{voiceOK=localStorage.getItem("occultica.dmvoice")!=="0"}catch(e){}
const light=()=>{const d=typeof todDay==="number"?todDay:1;return d>.8?"day":d>.5?"late":d>.22?"dusk":"night"};
const PD=[["Sun","gold and vigor are in favour, and so are boasts"],["Moon","dreams run close to the surface and the tides of the blood are high"],["Mars","iron wants to be drawn and tempers are short"],["Mercury","roads, thieves and clever bargains share the same crossroads"],["Jupiter","oaths hold, purses fatten, and old debts get remembered"],["Venus","wells, wine and soft promises are all more persuasive than usual"],["Saturn","bones, patience and long memories hold sway"]];

/* ---------- overworld pools, by region ---------- */
const W={
forest:{
 sight:{day:["Green light falls through the leaves in coins, and the trunks lean together as if listening.","Whisperwood is in full leaf. Every path looks like the right one, which is how it earns its name.","Sunbeams stand between the trees like pillars in a green cathedral."],late:["The light has gone amber and low. Long shadows lie across the moss like sleeping animals.","Gold slants between the boles and turns the dust to slow sparks."],dusk:["Dusk has gathered in the branches. The trees are black lace against a rose sky.","The forest is going indigo from the roots upward, and the first star is already awake."],night:["The wood is nearly black. Moonlight comes down in thin silver threads, and the leaves hold it like water.","Night in Whisperwood: every trunk a pillar, every gap a door."]},
 smell:["Wet bark, crushed fern and the sweetness of old leaves slowly becoming soil.","Mushrooms and cold moss, with a thread of woodsmoke from very far away.","Resin and rain-soaked earth, clean as a cellar."],
 sound:["Somewhere a woodpecker keeps a patient count.","The leaves murmur, and for a moment it sounds almost like a sentence.","A twig cracks behind you. When you turn, only a squirrel, who looks guilty."],
 liquid:["Dew beads every web and bends the light into small rainbows.","Water seeps from a mossy root and runs away over the stones, cold enough to ache."],
 touch:["The air is cool and green against your cheeks.","The ground gives softly, as if the forest is breathing under your boots."],
 odd:["The trees here lean the same direction, as though something once passed that way and they never stopped watching it.","Look closely: the moss grows only on the side that faces the village. Whisperwood keeps a compass of its own."],
 tip:"Whisperwood is the gentle start of the world, and the gentle start is how heroes get comfortable. The herbs here answer to the planets, so learn which ones belong to whom."},
tundra:{
 sight:{day:["Frostmarch glitters, a white plain pricked with blue shadows and the slow breath of drifting snow.","The snow is blinding and perfectly clean. Your own footprints are the only argument in it."],late:["Pale gold sits low on the ice. Every ridge casts a shadow as blue as a vein.","The sun is a coin behind thin cloud, and the plain has gone the colour of pearl."],dusk:["The snow has turned violet. The horizon is a thin red wound closing.","Dusk makes the drifts glow from within, like lanterns made of salt."],night:["Stars crowd the black above the snow, and the ice answers them back, blue and cold.","The tundra is silent and silver. Even your heartbeat sounds loud."]},
 smell:["Nothing at all, except cold, which has a smell after all: iron and clean stone.","A faint sharpness, like struck flint, and underneath it the memory of pine."],
 sound:["The wind hisses across the crust and sings in the gaps of the rocks.","Ice ticks and groans somewhere deep under you, settling like an old house."],
 liquid:["Meltwater gleams in a seam of the ice, and the cold breath above it smokes.","A frozen stream lies under glass, and you can see the bubbles caught in mid-leap."],
 touch:["Your breath freezes in your collar, and the cold finds every seam in your gear.","The wind pushes at your chest like a patient hand."],
 odd:["The snow here is tracked, but not by anything with feet you recognise. The prints drift, as though whatever made them was not quite touching the ground.","Notice how far the sound carries. Frostmarch has a way of keeping every word you say."],
 tip:"Frostmarch is far from any bed. Carry potions, and turn back before you are brave. Cold demons and drifting wraiths do not tire."},
mountain:{
 sight:{day:["The Ashen Peaks stand like broken teeth, grey and brown against a hard blue sky.","Scree and cairn and wind-scoured stone: the mountains wear no colour but their own."],late:["The ridges glow bronze, and the valleys beneath them are already full of shadow.","The sun lies along the rock and finds every crack."],dusk:["The peaks go violet at the edges and black at the root. The sky above them is a bruise.","Ash-coloured light, and cold air falling downhill like water."],night:["The mountains are huge shapes where the stars stop. You walk in the dark between their knees.","Starlight pools on bare stone, and the wind has the whole night to itself."]},
 smell:["Hot stone, flint and the thin sourness of old ash.","Cold rock and the ghost of woodsmoke from some high hearth."],
 sound:["Pebbles tick down a slope somewhere above you, and then nothing.","The wind plays the rock like a flute, three notes only, and never the fourth."],
 liquid:["A thread of snowmelt runs down a seam in the rock, clear as glass and cold as an oath.","Water beads on the cave-lip, one slow drop at a time, keeping time for no one."],
 touch:["The stone is rough under your hand, still holding some of the day.","The air is thin and dry and tastes faintly of metal."],
 odd:["The cairns here were stacked by someone careful. Each stone has been turned so its lichen faces the same way, toward something you cannot see.","The ash on the ground is too fine for any fire you know. Whatever burned here burned long ago and completely."],
 tip:"The Ashen Peaks hold mines and old dwarf-works. The folk who dig there are friendly if you are polite; the things they dug up are not."},
swamp:{
 sight:{day:["Mirewater lies under a low grey sky, a quilt of reed and dark water stitched with pale mist.","Cypress knees rise from the black pools like the fingers of drowned men."],late:["The light is thick and brown. The surface of every pool holds a second, dimmer swamp.","Gnats drift in the amber light like a slow snowfall."],dusk:["Fog rises with the dusk, and the reeds become a crowd of tall, patient figures.","The pools turn the colour of old copper, and something blinks in one of them."],night:["The swamp at night is a held breath. Marsh-lights wander at the edge of sight and do not mean you well.","Black water, black sky, and the pale fire of rot among the reeds."]},
 smell:["Sulphur, tannin and the sweet rot of leaves a hundred seasons deep.","Wet mud, stagnant water and a cold green note like a crushed stem."],
 sound:["Frogs begin together, stop together, and begin again, like a congregation.","Something large and slow slips into the water just out of sight."],
 liquid:["Black water sits in the footprint of every step, and the bubbles that rise from it are warm.","A skin of green weed covers the pool, perfectly still, until you look away."],
 touch:["The air is wet and warm and clings to your skin like a hand.","The ground quivers under your weight as if it were thinking about swallowing you."],
 odd:["The marsh-lights move against the wind. Old Mirewater hands say never follow one, and never wave at it either.","Every reed here is bent slightly toward a point to the north, as if the whole marsh were leaning in to hear something."],
 tip:"Mirewater creatures drain strength and bend will. Keep your mind sharp and your blessings fresh, and do not accept hospitality from anything that smiles too wide."},
desert:{
 sight:{day:["The Sunscar Waste is a sea of pale gold under a white sky, and the heat bends the horizon.","Dunes ripple away in long, wind-combed lines. A broken column leans out of the sand like a drowned mast."],late:["Shadows lengthen and the dunes turn orange and rose, their ridges as sharp as blades.","The sand glows like embers, and the sky above it is the colour of a peach."],dusk:["The sky goes violet over the dunes, and the first stars appear above a ruined arch.","Dusk comes quickly in the Waste. The heat drains out of the sand like a held breath."],night:["The desert is silver and cold. Every dune holds a sliver of moon.","Night: a deep sky full of stars, and a silence that feels listened to."]},
 smell:["Hot dust, dry stone and a bare breath of myrrh, from nowhere, from long ago.","Sun-baked clay and the sharp sweetness of dry thyme."],
 sound:["Sand whispers off the ridges in long hushed sighs.","A distant stone clicks and settles, and the air above the ruins seems to shiver with it."],
 liquid:["You see no water, only the dried-up memory of it: a pale crust in a hollow, cracked into hexagons.","A hidden spring somewhere nearby makes the air green at the edges. Wells are older than kings out here."],
 touch:["The heat presses on your shoulders like a hand. Sweat dries before it can form.","Sand has found its way into every strap and buckle you own."],
 odd:["The sand here is carved with faint straight lines, too regular to be the wind. Half buried, a stair goes down to a door nobody sealed on purpose.","Notice that no birds cross the ruins. Not one. They go around."],
 tip:"Ruins keep what the sand keeps. Mummies, sand magi and old guardians sleep here. Bring water, and a respect for locked things."},
hills:{
 sight:{day:["Highcairn rolls away in green and gold, the hills dotted with stone cairns, each one a sleeping king.","Wind combs the long grass into silver waves, and cloud-shadows chase each other over the barrows."],late:["The hills have turned honey-coloured and the cairns throw long shadows like sundials.","Low light turns the grass to bronze. A hawk hangs on the wind, perfectly still."],dusk:["Dusk spreads a lilac haze over the cairns, and the first fires of distant homesteads prick the dark.","The wind drops, the hills hold still, and the barrows seem a little closer than before."],night:["The hills are dark waves under a wide sky. The cairns hold the stars like cupped hands.","A cold clear night over Highcairn, and every barrow keeps its secrets."]},
 smell:["Wild thyme, warm turf and the old grass-and-iron smell of the open sky.","Sheep-wool, peat smoke and a hint of wet stone."],
 sound:["The wind makes a long, low note in the cairn-stones that is almost a word.","A lark rises somewhere high and spills its whole heart out."],
 liquid:["A little burn chatters down the slope, brown as tea and bright as bells.","Rain-water has pooled in the hollow of a standing stone, perfectly clear, with a single bright star in it."],
 touch:["The wind is brisk and clean and tugs at your cloak.","The turf is springy and cool, and the grass is wet to the knee."],
 odd:["Each cairn has a single stone placed on top that does not match the others, brought from somewhere much farther away. Someone is still visiting.","The sheep avoid one particular hollow, and so, in all honesty, should you."],
 tip:"The barrows of Highcairn hold old kings, and old kings remember debts. Go in rested, and go in armed."}
};
/* tile-driven extras */
const NEAR={water:"Water is close, and you can hear it before you see it.",ice:"Ice shines nearby, thick and blue, with a dark shape deep inside that is probably only a stone.",tree:"Trees crowd close here and cut the wind to a murmur.",pine:"Dark pines stand close, and the snow beneath them is untouched and deep.",peak:"A wall of rock rises close at hand, cold in its own shadow.",cactus:"Thorned things stand about in the sand, patient as old men.",mire:"A patch of dark mire lies close by, its surface skinned with green.",dead:"Dead trees stand in the water here, grey as bone, and some are not quite dead.",ruin:"Old stone lies underfoot: worked, laid, and then abandoned."};
const SITE={village:"Smoke curls from chimneys and somebody is hammering something. Oakhollow is close, and the lanterns are lit.",shrine:"A shrine stands near, small and neat, with fresh flowers that nobody here admits to leaving.",ice:"Something under the ice glows faintly, a long way off, and then not.",fort:"Weathered walls and a banner too faded to read: a fort, and probably a garrison of one.",hut:"A crooked hut crouches near, with herbs hung to dry and a thread of green smoke.",obelisk:"A tall stone stands against the sky, carved to the top and humming very faintly.",ruin:"Broken walls rise from the grass, a scholar's kind of place, which means a dangerous one."};

/* ---------- dungeon pools ---------- */
const DR=[
 {sight:["The stair ends in a narrow landing where daylight gives up halfway down.","You stand on the last step before the dark begins. Behind you the world is bright and small."],smell:["Cold stone, old dust and the clean sharp smell of the world above.","A breath of damp earth, and under it a faint animal staleness."],sound:["Your own footsteps come back to you a half-second late, and slightly wrong.","Somewhere far below, water drips on a rhythm that almost sounds patient."],tip:"Dungeons are the world's real test. Fill your belly, check your gear, and remember that this stair is also the way home."},
 {sight:["A long hall, its ceiling lost in the dark. Scorch marks and old claw-scars cover the walls.","The torches are cold, but the floor shows signs of recent traffic: scuffed, trampled, a little too clean."],smell:["Old sweat, wet fur and the sour tang of something recently alive.","Smoke gone cold and, beneath it, a smell like copper pennies."],sound:["Breathing. Not yours.","A slow scrape, like claws being sharpened, stops the moment you listen for it."],tip:"A guarded hall means a watcher that never left. Know your HP before you step inside. Retreating is cheaper than dying."},
 {sight:["A small alcove, the dust on its floor so thick it has the look of a carpet, except in one corner.","A low niche in the wall, with a shelf, a stain and the pale ghost of a handprint."],smell:["Beeswax and ancient parchment, and a bitter hint of verdigris.","Cold iron and a green, metallic damp."],sound:["It is very quiet here. The quiet has a texture, like folded cloth.","Something small settles in the dark with the faint tick of a stone."],tip:"Alcoves reward the patient. The dust that lies too evenly is almost always lying. Search, but watch your step first."},
 {sight:["A wide chamber, pillared, its far wall invisible. The air here shimmers faintly as if the room were slightly out of tune.","Columns climb into darkness. Fine runes run round the base, half worn away and not quite symmetrical."],smell:["Thick air, wrong air: stale, and sweet, like flowers left a month in a closed room.","Candle-wax, cold ash and something that smells almost, but not quite, like rain."],sound:["The echo here comes back changed, as if the room were repeating you to someone else.","A low hum, felt more than heard, lives in the floor."],tip:"Chambers like this keep the second-toughest thing in the place. Catch your breath, mend what you can, and mind the exits."},
 {sight:["A heavy door of old iron, rust-bloomed and studded, with a lock the size of a fist. Whatever lies beyond has been shut away on purpose.","The passage ends in a plain, thick door. Scratches around the keyhole show that you are not the first to be stubborn."],smell:["Rust and cold oil, and from the crack beneath the door a thin cold draft that smells of something deep.","Hot iron, though nothing here is hot."],sound:["You hear nothing through the door. That is also information.","The door ticks faintly as it cools, though you cannot think what warmed it."],tip:"A locked door has three honest answers: the key, the pick, or the shoulder. Keys have a way of being left in earlier, quieter rooms."},
 {sight:["The deepest chamber is vast, and lit by something that is not a flame. In its centre waits a shape that has already seen you.","A great vault of black stone, and a smear of faint light where the largest thing in the dungeon stirs."],smell:["Old blood, old stone and a cold, enormous breath coming up from somewhere below.","Incense gone to ash, and under it the heavy sweetness of a very old meal."],sound:["A slow breath fills the room and drains out again. The walls tremble faintly with it.","Silence, and then, from somewhere very close, the scrape of something large getting to its feet."],tip:"The deepest rooms hit hardest in the first round. Heal before you open that last door. The hoard is only any good to the living."}
];
const DB={forest:{liq:"Black water seeps through the floor and runs in a thin line toward the walls, bringing the smell of tomb-roots.",lit:"Pale roots hang from the ceiling like old hair, and bone-white fungus gives the only light."},
 tundra:{liq:"Meltwater runs down the walls and refreezes in glassy ropes.",lit:"Blue light from the ice itself, cold, flat and steady."},
 mountain:{liq:"A thread of water falls from a crack in the ceiling and rings in an iron bucket someone left for it.",lit:"Dwarf lanterns, dusty and dim, throw soft amber circles that never quite meet."},
 swamp:{liq:"Black water stands ankle-deep and ripples when nothing is moving.",lit:"A sickly green phosphor clings to the walls and lights your hands from below."},
 desert:{liq:"A bone-dry cistern gapes in the floor, with a ring of white salt where the water used to be.",lit:"Sand-coloured light seeps from a shaft high above, hot and thick as honey."},
 hills:{liq:"Cold water beads on the barrow walls and drips on the sleepers' bones.",lit:"The torches in their iron brackets burn low and blue, as if the air itself were old."}};

/* ---------- composer ---------- */
function over(){
 const b=biome[hy][hx],P=W[b],L=light(),r=n=>hash(hx,hy,press*7+n);
 const out=[];
 out.push(pick(P.sight[L],hash(hx,hy,1)));
 const facets=[["smell",P.smell],["sound",P.sound],["liquid",P.liquid],["touch",P.touch]];
 const f1=facets[Math.floor(r(2)*4)],f2=facets[(Math.floor(r(2)*4)+1+Math.floor(r(3)*3))%4];
 out.push(pick(f1[1],hash(hx,hy,3+press)),pick(f2[1],hash(hx,hy,9+press)));
 // what is actually near
 let nearT={};for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=hx+dx,y=hy+dy;if(x<0||y<0||y>=map.length||x>=map[0].length)continue;nearT[map[y][x]]=1}
 const nk=Object.keys(NEAR).filter(k=>nearT[k]);if(nk.length&&r(4)>.35)out.push(NEAR[pick(nk,r(5))]);
 // nearby places
 let bestP=null,bd=1e9;POIS.forEach(p=>{const d=Math.hypot(p.x-hx,p.y-hy);if(d<bd){bd=d;bestP=p}});
 if(bestP&&bd<=4&&!bestP.hidden&&SITE[bestP.id])out.push(SITE[bestP.id]);
 else if(bestP&&bestP.hidden&&bd<=2.3)out.push("The ground rings oddly underfoot here. Something old has been buried with great care, and the grass has not quite forgiven it.");
 // nearby folk
 const npc=NPCS.filter(n=>Math.hypot(n.x-hx,n.y-hy)<=5).sort((a,c)=>Math.hypot(a.x-hx,a.y-hy)-Math.hypot(c.x-hx,c.y-hy))[0];
 if(npc)out.push("Voices carry from the "+compass(npc.x-hx,npc.y-hy)+": "+(/^[aeiou]/i.test(npc.job)?"an ":"a ")+npc.job.toLowerCase()+" is nearby, and likely willing to talk.");
 // odd take
 if(r(6)>.45)out.push(pick(P.odd,r(7)));
 else if(r(8)>.6){const d=PD[new Date().getDay()];out.push("By the old reckoning this is the day of "+d[0]+": "+d[1]+".")}
 // tips and gentle navigation, never the answer
 const tips=[];
 if(hero.hp<hero.maxHp*.4)tips.push("You are hurting. Potions help, and so does a bed at Oakhollow, "+compass(POIS.find(p=>p.id==="village").x-hx,POIS.find(p=>p.id==="village").y-hy)+" of here.");
 if(L==="night"||L==="dusk")tips.push("The dark favours the things that hunt. A little caution is not cowardice.");
 tips.push(P.tip);
 tips.push("Danger grows with distance from Oakhollow. If the monsters start to look unfriendly, the village is a good place to remember.");
 tips.push("Talk to people twice. The old folk give hints, and the second visit is usually the better one.");
 tips.push("Press M outdoors to meditate. The sky pays attention to people who sit still.");
 tips.push("True knowledge is not free: grimoires cost gold, and some cost more.");
 const un=POIS.filter(p=>!p.hidden&&!found[p.id]);
 if(un.length){const q=un.sort((a,c)=>Math.hypot(a.x-hx,a.y-hy)-Math.hypot(c.x-hx,c.y-hy))[0];tips.push("The wind from the "+compass(q.x-hx,q.y-hy)+" carries something: "+pick(["smoke and the faint ring of metal.","a cold draft and the ghost of a bell.","the smell of old stone.","a hum, too low for words."],hash(q.x,q.y,2))+" That is as much as the wind will tell you.")}
 out.push(tips[(press+Math.floor(r(10)*tips.length))%tips.length]);
 return out;
}
window.DR=DR;
function inDg(){
 const i=DG.s.r,R=DR[i],B=DB[DG.th.b]||DB.forest,r=n=>hash(i,DG.t*13+DG.p.id.length,press*5+n);
 const out=[];
 out.push("This is "+DG.th.n[i]+". "+pick(R.sight,r(1)));
 const first=(i%2===0||r(2)>.5)?B.lit:B.liq;out.push(first);
 out.push(pick(R.smell,r(3)));out.push(pick(R.sound,r(4)));
 if(r(5)>.55)out.push(first===B.lit?B.liq:B.lit);
 const tips=[R.tip];
 if(hero.hp<maxHP()*.45)tips.unshift("You are bleeding the kind of luck that does not come back. Retreat to the stair, mend, and return.");
 if(i===4&&!DG.s.unl)tips.push("The lock is old iron. Rogues and lockpicks have an easier time of it, but a shoulder works if you have more bravado than skill.");
 if(i===2&&DG.s.ch&&DG.s.ch[2])tips.push("You've already turned this alcove over. Nothing else glints in the dust.");
 if(DG.s.clr&&DG.s.clr[i])out.push("The room is quiet now. Whatever lived here no longer does.");
 out.push(tips[0]);
 return out;
}
function inFight(){
 const e=C.e,hp=e.hp/e.max,r=n=>hash(e.name.length,e.max,press*3+n);
 const out=["Steel and breath: a "+e.name+" stands against you."];
 out.push(hp>.85?"It is whole and wary, and it has not yet shown what it can do.":hp>.5?"It is hurt, and it knows it. Its movements have gotten a little quicker and a little meaner.":hp>.2?"It is badly wounded. Its guard is ragged and its eyes are looking for the way out.":"It is nearly done, swaying and bleeding, with one good strike left in it.");
 if(e.sp==="drain")out.push("Something about it feels hungry in a way that has nothing to do with blood. Fight quickly, and do not let it linger on you.");
 else if(e.sp==="charm")out.push("Its voice is lovely, and that is the first thing wrong with it. Do not listen too closely.");
 else if(e.undead)out.push("It does not breathe, and it will not tire. Holy things and clean fire are old and honest answers.");
 else out.push(pick(["It is a straightforward sort of danger. Guard your flank and watch its feet.","It fights like something with nothing to lose. Do not make it learn otherwise."],r(1)));
 if(hero.hp<hero.maxHp*.35)out.push("You are on the thin edge. The retreat is open, and survival is not a sin.");
 return out;
}
function compose(){
 if(typeof hero==="undefined"||!hero)return["The tale has not begun yet, and the Dungeon Master is patient."];
 try{if(typeof C!=="undefined"&&C&&!C.over)return inFight();if(typeof DG!=="undefined"&&DG)return inDg();return over()}catch(e){return["The Dungeon Master clears his throat and thinks of nothing at all for a moment."]}
}

/* ---------- voice ---------- */
let voice=null;
function pickVoice(){if(!window.speechSynthesis)return;const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
 const pref=[/daniel/i,/google uk english male/i,/arthur/i,/oliver/i,/david/i,/alex/i,/male/i,/guy/i,/mark/i,/george/i];
 for(const p of pref){const v=vs.find(v=>p.test(v.name));if(v){voice=v;return}}voice=vs[0]||null}
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function speakDM(t){if(!voiceOK||!window.speechSynthesis)return;if(window.OV){OV.say(t,"dm");return}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);if(voice)u.voice=voice;u.pitch=.62;u.rate=.88;u.volume=1;speechSynthesis.speak(u)}catch(e){}}
function stopDM(){try{if(window.OV)OV.stop();else window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}

/* ---------- UI ---------- */
const css=document.createElement("style");
css.textContent="#dmbtn{position:absolute;left:8px;top:8px;z-index:6;display:flex;align-items:center;gap:7px;padding:7px 12px 7px 9px;background:#f6e8c0;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:999px;font:700 .86rem 'Cinzel',serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 2px 0 #e8b04a,0 6px 14px #0007}#dmbtn:hover{background:#fff3cf}#dmbtn:active{transform:translateY(1px)}#dmbtn svg{width:20px;height:20px;flex:none}"+
"#dmpanel{position:absolute;left:8px;top:52px;z-index:6;width:min(430px,calc(100% - 150px));max-height:46%;overflow:auto;background:#f6e8c0;color:#1c1a3a;border:2px solid #1c1a3a;border-radius:12px;padding:12px 14px 10px;box-shadow:0 3px 0 #e8b04a,0 12px 28px #000a;font:1.02rem/1.45 'IM Fell English',Georgia,serif}#dmpanel[hidden]{display:none}"+
"#dmpanel h4{margin:0 0 6px;font:700 .8rem 'Cinzel',serif;letter-spacing:.09em;color:#a8324b;display:flex;justify-content:space-between;gap:8px}#dmpanel p{margin:0 0 .5em}#dmpanel p.t{padding-top:.4em;border-top:1px dashed #1c1a3a66;font-style:italic;color:#2c2a5a}"+
"#dmpanel .r{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;position:sticky;top:-12px;background:#f6e8c0;padding:4px 0}#dmpanel button{font:700 .76rem 'Cinzel',serif;background:#fff6dc;color:#1c1a3a;border:1.5px solid #1c1a3a;border-radius:999px;padding:5px 11px;cursor:pointer}#dmpanel button:hover{background:#e8b04a}"+
"@media(max-width:560px){#dmpanel{width:calc(100% - 16px);top:50px;max-height:48%}#dmbtn span{display:none}}";
document.head.appendChild(css);
const btn=document.createElement("button");btn.id="dmbtn";btn.type="button";btn.setAttribute("aria-label","Ask the Dungeon Master to describe the scene");btn.hidden=true;
btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#1c1a3a" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2l2.4 6.2 6.6.5-5 4.3 1.6 6.5L12 16l-5.6 3.5L8 13 3 8.7l6.6-.5z" fill="#e8b04a"/><circle cx="12" cy="11" r="2" fill="#1c1a3a"/></svg><span>DM</span>';
const panel=document.createElement("div");panel.id="dmpanel";panel.hidden=true;panel.setAttribute("role","status");panel.setAttribute("aria-live","polite");
const cw=document.querySelector(".cw")||document.body;cw.appendChild(btn);cw.appendChild(panel);
function render(lines){panel.innerHTML="";const h=document.createElement("h4");h.innerHTML="<span>THE DUNGEON MASTER</span>";panel.appendChild(h);
 const tip=lines.length>1?lines[lines.length-1]:null,body=tip?lines.slice(0,-1):lines;
 body.forEach(t=>{const p=document.createElement("p");p.textContent=t;panel.appendChild(p)});
 if(tip){const p=document.createElement("p");p.className="t";p.textContent=tip;panel.appendChild(p)}
 const r=document.createElement("div");r.className="r";
 const mk=(t,f)=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=f;r.appendChild(b);return b};
 mk("Another look",()=>go(true));
 const vb=mk(voiceOK&&window.speechSynthesis?"Voice on":"Voice off",()=>{voiceOK=!voiceOK;try{localStorage.setItem("occultica.dmvoice",voiceOK?"1":"0")}catch(e){}vb.textContent=voiceOK?"Voice on":"Voice off";if(voiceOK)speakDM(curText);else stopDM()});
 if(!window.speechSynthesis)vb.style.display="none";
 mk("Close",()=>{panel.hidden=true;stopDM()});
 panel.insertBefore(r,h.nextSibling)}
function go(again){
 const key=(typeof DG!=="undefined"&&DG?"d"+DG.p.id+DG.s.r:"o"+hx+","+hy);
 if(again||key===lastKey)press++;else{press=0;lastKey=key}
 const lines=compose();curText=lines.join(" ");render(lines);panel.hidden=false;speakDM(curText)}
btn.onclick=()=>{if(!panel.hidden&&!btn.dataset.again){panel.hidden=true;stopDM();return}go(false)};
setInterval(()=>{const gm=G("game");btn.hidden=!(gm&&!gm.hidden&&typeof hero!=="undefined"&&hero);if(btn.hidden&&!panel.hidden){panel.hidden=true;stopDM()}},500);
})();

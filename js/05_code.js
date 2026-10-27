
/* ===== NAT: detailed near-field trees, bushes and rocks (Quaternius Stylized Nature MegaKit, free licence) ===== */
window.NAT=(function(){
 if(typeof THREE==="undefined"||!window.NAT_B64)return null;
 const T=THREE;let D=null,H=null,TX={},CACHE={};
 /* which pack models stand in for which game plant, and the height (in pack units) that maps to the game's height */
 const MAP={
  oak:{m:["CommonTree_1","CommonTree_2","CommonTree_3","CommonTree_5"],ref:7.0,amp:.5,tint:[.88,.94,.84]},
  willow:{m:["TwistedTree_1","TwistedTree_3"],ref:12.5,amp:.55,tint:[.82,.95,.7],center:1},
  pine:{m:["Pine_1","Pine_2","Pine_3","Pine_4","Pine_5"],ref:7.6,amp:.32},
  snowpine:{m:["Pine_1","Pine_3","Pine_4","Pine_5"],ref:7.6,amp:.28,snow:1},
  dead:{m:["DeadTree_1","DeadTree_2","DeadTree_3"],ref:9.5,amp:.1},
  bush:{m:["Bush_Common","Bush_Common_Flowers","Bush_Common"],ref:1.9,amp:.28},
  boulder:{m:["Rock_Medium_1","Rock_Medium_2","Rock_Medium_3"],ref:2.1,amp:0,rock:1}
 };
 function init(){if(D)return;const bin=atob(NAT_B64),n=bin.length,u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=bin.charCodeAt(i);
  const hl=new DataView(u.buffer).getUint32(0,true);H=JSON.parse(new TextDecoder().decode(u.subarray(4,4+hl)));D=u.buffer.slice(4+hl)}
 const sl=(a,Ty)=>{const c=D.slice(a[0],a[0]+a[1]);return new Ty(c)};
 function tex(name){if(TX[name])return TX[name];const t=H.tex[name],b=D.slice(t.d[0],t.d[0]+t.d[1]);
  const tx=new T.Texture(),im=new Image(),url=URL.createObjectURL(new Blob([b],{type:t.fmt==="jpg"?"image/jpeg":"image/webp"}));
  {const c=document.createElement('canvas');c.width=c.height=2;const g=c.getContext('2d');g.fillStyle=t.fmt==='jpg'?'#6a5a48':'#4a6a30';g.fillRect(0,0,2,2);tx.image=c;tx.needsUpdate=true}
  im.onload=()=>{tx.image=im;tx.needsUpdate=true};im.src=url;tx.anisotropy=4;tx.flipY=false;return TX[name]=tx}
 /* pack model -> one BufferGeometry with a group per material, scaled to unit height and sunk to its trunk base */
 function geo(name,ref,asp,center){
  const pr=H.models[name],P=[],N=[],U=[],C=[],I=[],groups=[],mats=[];let vb=0,hasC=false;
  /* trunk-base offset for leaning trees */
  let ox=0,oz=0;
  if(center){let sx=0,sz=0,k=0;pr.forEach(p=>{const q=sl(p.p,Uint16Array);for(let i=0;i<p.n;i++){const y=q[i*3+1]/65535*p.sc[1]+p.mn[1];if(y<.6){sx+=q[i*3]/65535*p.sc[0]+p.mn[0];sz+=q[i*3+2]/65535*p.sc[2]+p.mn[2];k++}}});if(k){ox=sx/k;oz=sz/k}}
  const hs=1/ref,ws=1/(ref*asp);
  pr.forEach(p=>{const q=sl(p.p,Uint16Array),nr=sl(p.nr,Int8Array),uv=sl(p.uv,Uint16Array),col=p.c?sl(p.c,Uint8Array):null,ix=sl(p.i,Uint16Array),start=I.length;
   for(let i=0;i<p.n;i++){const x=q[i*3]/65535*p.sc[0]+p.mn[0]-ox,y=q[i*3+1]/65535*p.sc[1]+p.mn[1],z=q[i*3+2]/65535*p.sc[2]+p.mn[2]-oz;
    P.push(x*ws,y*hs,z*ws);N.push(nr[i*3]/127,nr[i*3+1]/127,nr[i*3+2]/127);U.push(uv[i*2]/65535*p.us[0]+p.um[0],uv[i*2+1]/65535*p.us[1]+p.um[1]);
    if(col){hasC=true;C.push(col[i*3]/255,col[i*3+1]/255,col[i*3+2]/255)}else C.push(1,1,1)}
   for(let i=0;i<ix.length;i++)I.push(ix[i]+vb);
   groups.push([start,I.length-start,mats.length]);mats.push({n:p.mat,vc:!!col,mask:p.mask});vb+=p.n});
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(P,3));g.setAttribute("normal",new T.Float32BufferAttribute(N,3));g.setAttribute("uv",new T.Float32BufferAttribute(U,2));
  if(hasC)g.setAttribute("color",new T.Float32BufferAttribute(C,3));
  const sw=new Float32Array(vb);for(let i=0;i<vb;i++){const y=P[i*3+1];sw[i]=Math.min(1,Math.max(0,y-.12)*1.4)}
  g.setAttribute("sw",new T.BufferAttribute(sw,1));g.setIndex(I);groups.forEach(q=>g.addGroup(q[0],q[1],q[2]));g.userData.mats=mats;g.computeBoundingSphere();return g}
 const MC={};
 function mat(n,desc,def,XT){const key=n+"|"+desc.n+"|"+desc.vc;if(MC[key])return MC[key];
  const leaf=/Leaves|Leaf|Flowers/.test(desc.n),m=new T.MeshLambertMaterial({map:tex(desc.n),alphaTest:desc.mask?.5:0,side:leaf?T.DoubleSide:T.FrontSide,vertexColors:desc.vc});
  if(def.tint&&leaf)m.color.setRGB(def.tint[0],def.tint[1],def.tint[2]);
  const amp=leaf?def.amp:def.amp*.45,snow=def.snow&&leaf?1:0;
  m.onBeforeCompile=sh=>{sh.uniforms.uT=XT;
   sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT;attribute float sw;varying float vUp;")
    .replace("#include <begin_vertex>","#include <begin_vertex>\nvUp=normalize(mat3(instanceMatrix)*objectNormal).y;\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.31+instanceMatrix[3].z*.23;float wv=sin(uT*1.25+ph)+.45*sin(uT*2.7+ph*2.1+position.y*3.);\ntransformed.x+=wv*sw*sw*"+amp.toFixed(3)+";transformed.z+=cos(uT*.9+ph*1.3)*sw*sw*"+(amp*.6).toFixed(3)+";\n#endif");
   sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nvarying float vUp;").replace("#include <alphatest_fragment>","#include <alphatest_fragment>\n"+(snow?"diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.94,1.),smoothstep(-.1,.7,vUp)*.55);":""))};
  m.customProgramCacheKey=()=>"nat"+amp.toFixed(2)+snow+(desc.vc?"c":"")+(desc.mask?"m":"");
  return MC[key]=m}
 return{
  has:n=>!!MAP[n]&&!!window.NAT_B64,
  on:()=>!!window.NAT_B64&&!(window.NO_NAT),
  nr:()=>{const q=(window.GFX&&GFX.q!=null)?GFX.q:2;return [0,14,22,32][Math.max(0,Math.min(3,q))]},
  /* returns {g:[geometry per variant], m:[material array per variant]} */
  make(n,asp,XT){init();const d=MAP[n],key=n+asp;if(CACHE[key])return CACHE[key];
   const g=d.m.map(nm=>geo(nm,d.ref,asp||1,d.center)),m=g.map(gg=>gg.userData.mats.map(x=>mat(n,x,d,XT)));return CACHE[key]={g,m}}
 }
})();

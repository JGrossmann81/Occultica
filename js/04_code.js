
/* ===== tree3d: real 3D instanced trees, bushes, rocks, cacti and grass (replaces the flat crossed panels) ===== */
window.G3D=(function(){
 if(typeof THREE==="undefined")return null;
 const T=THREE,V3=T.Vector3,Col=T.Color;
 /* tiny seeded random + value noise */
 function rng(s){s=(s>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
 const h3=(x,y,z)=>{const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return v-Math.floor(v)};
 function vn(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const L=(a,b,t)=>a+(b-a)*t;return L(L(L(h3(xi,yi,zi),h3(xi+1,yi,zi),u),L(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),u),v),L(L(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),u),L(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),u),v),w)}
 /* geometry accumulator: positions, colours, normals, sway weight */
 function Acc(){return{p:[],c:[],n:[],s:[]}}
 function addGeo(A,g,m,colFn,swFn){
  g=g.index?g.toNonIndexed():g;g.applyMatrix4(m);g.computeVertexNormals();
  const p=g.attributes.position,n=g.attributes.normal,c=new Col();
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);A.p.push(x,y,z);A.n.push(n.getX(i),n.getY(i),n.getZ(i));colFn(c,x,y,z,n.getY(i),i);A.c.push(c.r,c.g,c.b);A.s.push(swFn?swFn(x,y,z):0)}}
 function build(A){const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(A.p,3));g.setAttribute("normal",new T.Float32BufferAttribute(A.n,3));g.setAttribute("color",new T.Float32BufferAttribute(A.c,3));g.setAttribute("sw",new T.Float32BufferAttribute(A.s,1));return g}
 const MX=(px,py,pz,sx,sy,sz,rx,ry,rz)=>{const m=new T.Matrix4(),q=new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),s=new V3(sx==null?1:sx,sy==null?sx:sy,sz==null?sx:sz);return m.compose(new V3(px,py,pz),q,s)};
 /* lumpy blob: icosahedron with noisy radius */
 function blobGeo(det,amp,seed,flat){const g=new T.IcosahedronGeometry(1,det),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),l=Math.hypot(x,y,z)||1,nx=x/l,ny=y/l,nz=z/l,k=1+amp*(vn(nx*2.2+seed,ny*2.2,nz*2.2+seed*.7)-.5)*2+amp*.5*(vn(nx*5+seed,ny*5,nz*5)-.5)*2;p.setXYZ(i,nx*k,ny*k*(flat||1),nz*k)}return g}
 /* jagged cone (pine tier) */
 function tierGeo(seg,jag,seed){const g=new T.ConeGeometry(1,1,seg*2,1,true),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<0){const a=Math.atan2(z,x),k=1+jag*(vn(Math.cos(a)*3+seed,0,Math.sin(a)*3)-.5)*2+jag*.6*Math.sin(a*seg);p.setXYZ(i,x*k,y-.06*Math.sin(a*seg*.5+seed),z*k)}}g.translate(0,.5,0);return g}
 const grad=(a,b,t)=>a.clone().lerp(b,Math.max(0,Math.min(1,t)));
 const C=n=>new Col(n);
 /* ---------- recipes (unit space: x,z in -.5..+.5, y 0..1) ---------- */
 function trunk(A,r0,r1,h,col0,col1,bend,seed,y0){const g=new T.CylinderGeometry(r1,r0,h,14,9,true);g.translate(0,h/2+(y0||0),0);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),k=(y-(y0||0))/h,x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),
   fur=1+.09*Math.sin(a*9+vn(x*6+seed,y*4,z*6)*5)+.05*(vn(x*22+seed,y*10,z*22)-.5)*2,flare=1+.75*Math.pow(Math.max(0,1-k*5),2.2)*(.6+.4*Math.sin(a*5+seed)),w=fur*flare*(1+.12*(vn(x*9+seed,y*7,z*9)-.5)*2);
   p.setXYZ(i,x*w+bend*k*k*.5,y,z*w)}
  addGeo(A,g,new T.Matrix4(),(c,x,y,z,ny)=>{const a=Math.atan2(z,x);c.copy(col0).lerp(col1,Math.min(1,y/(h+(y0||0))));const gr=.78+.3*Math.abs(Math.sin(a*9+vn(x*6,y*4,z*6)*5));c.multiplyScalar((.85+.3*vn(x*14,y*9,z*14))*gr);
   const m=Math.max(0,vn(x*5+seed,y*3,z*5)-.5)*2*Math.max(0,1-y/(h*.7+.01))*(.4+.6*Math.max(0,Math.sin(a+seed)));if(m>.05)c.lerp(new Col(0x4c6a2a),Math.min(.75,m*1.2))},(x,y)=>Math.max(0,y-.5)*.05)}
 function canopy(A,blobs,seed,cols,sw){blobs.forEach((b,i)=>{const bc=cols[i%cols.length].clone(),g=blobGeo(1,b[4]==null?.2:b[4],seed+i*1.7,b[5]||1);
   addGeo(A,g,MX(b[0],b[1],b[2],b[3],b[3],b[3]),(c,x,y,z,ny)=>{const k=(y-(b[1]-b[3]))/(b[3]*2);c.copy(bc).multiplyScalar(.62+.55*k+.12*ny);const v=.92+.16*vn(x*12+seed,y*12,z*12);c.multiplyScalar(v)},(x,y)=>sw*(.35+Math.max(0,y-.35)*.9))})}
 const REC={
  oak(s){const A=Acc(),r=rng(s*91+7);const bark=C(0x4a3320),bark2=C(0x2e2014);
   trunk(A,.055,.03,.55,bark,bark2,(r()-.5)*.1,s);
   /* two limbs */
   [[.07,.5,.55],[-.08,.46,-.7],[.05,.4,-1.0],[-.04,.58,.9]].forEach(([dx,y,a])=>addGeo(A,new T.CylinderGeometry(.012,.022,.22,5),MX(dx,y+.05,0,1,1,1,0,0,a),(c)=>c.copy(bark),null));
   const cols=[C(0x3d6a26),C(0x4f7c2c),C(0x34601f),C(0x5a8832)];
   const B=[[0,.72,0,.27,.2],[.17+r()*.05,.6,.08,.2,.22],[-.18,.62,-.07-r()*.05,.21,.2],[.04,.86+r()*.04,-.12,.19,.2],[-.06,.54,.2,.19,.22],[.12,.9,.1,.15,.2],[.0,.5,-.2,.16,.2],[-.2,.8,.12,.14,.2]];
   canopy(A,B,s*3.1,cols,.1);return build(A)},
  willow(s){const A=Acc(),r=rng(s*53+3);trunk(A,.07,.04,.5,C(0x4a3a28),C(0x30261a),.14,s);
   const cols=[C(0x6f9a3a),C(0x7fa845),C(0x5f8a30)];
   canopy(A,[[0,.72,0,.3,.16,.6],[.16,.66,.06,.2,.18,.7],[-.17,.67,-.05,.2,.18,.7],[.02,.8,-.1,.2,.16,.65]],s*2.3,cols,.12);
   for(let i=0;i<20;i++){const a=i/20*6.283+r()*.3,rr=.2+r()*.12,len=.34+r()*.28,top=.66-r()*.06;
    const g=new T.ConeGeometry(.012+r()*.01,len,3,3,true);g.rotateX(Math.PI);g.translate(0,-len/2,0);
    addGeo(A,g,MX(Math.cos(a)*rr,top,Math.sin(a)*rr,1,1,1,0,0,0),(c,x,y)=>{c.copy(C(0x8cb04c)).lerp(C(0xb9cf6a),(top-y)/len)},(x,y)=>Math.max(0,top-y)*.9)}
   return build(A)},
  pine(s,snow){const A=Acc(),r=rng(s*29+5);trunk(A,.04,.018,.9,C(0x4a3626),C(0x30241a),0,s);
   const N=7,cols=[C(0x20502c),C(0x275c34),C(0x1c4626)];
   for(let i=0;i<N;i++){const k=i/(N-1),y=.14+k*.64+(r()-.5)*.02,rad=.5*(1-k*.78)*(.92+r()*.14),hh=.30-k*.1;
    addGeo(A,tierGeo(5+((i+s)%3),.18,s*2+i),MX(0,y,0,rad,hh,rad,0,r()*6.28,0),(c,x,yy,z,ny)=>{c.copy(cols[i%3]).multiplyScalar(.7+.45*(yy-y)/hh+.1*vn(x*10,yy*10,z*10));if(snow){const m=Math.max(0,Math.min(1,(ny+.15)*2.2));c.lerp(C(0xeef4ff),m*(.5+.4*vn(x*7,yy*7,z*7)))}},(x,yy)=>.1+Math.max(0,yy-.2)*.2)}
   addGeo(A,new T.ConeGeometry(.05,.16,5),MX(0,.88,0),(c,x,y)=>{c.copy(cols[0]);if(snow)c.lerp(C(0xffffff),.7)},()=>.3);return build(A)},
  dead(s){const A=Acc(),r=rng(s*17+9);const c0=C(0x6a5c4c),c1=C(0x3e362e);trunk(A,.045,.016,.75,c0,c1,(r()-.5)*.18,s);
   for(let i=0;i<5;i++){const a=r()*6.283,y=.28+r()*.38,len=.2+r()*.22,tilt=.7+r()*.6;
    addGeo(A,new T.CylinderGeometry(.006,.016,len,4),MX(Math.cos(a)*len*.3,y+len*.2,Math.sin(a)*len*.3,1,1,1,Math.sin(a)*tilt,0,-Math.cos(a)*tilt),(c)=>c.copy(c0).lerp(c1,.4),(x,yy)=>.05)}
   return build(A)},
  cactus(s){const A=Acc(),r=rng(s*13+1);const col=C(0x4d8a3d),col2=C(0x6aa84e);
   const col_=(c,x,y,z)=>{c.copy(col).lerp(col2,vn(x*20,y*3,z*20));/* ribs */const a=Math.atan2(z,x);c.multiplyScalar(.82+.22*Math.cos(a*9))};
   addGeo(A,new T.CylinderGeometry(.075,.085,.78,10,3),MX(0,.39,0),col_,null);addGeo(A,new T.SphereGeometry(.075,10,6,0,6.283,0,1.57),MX(0,.78,0),col_,null);
   [[.17,.46,1],[-.16,.56,-1]].forEach(([x,y,d])=>{addGeo(A,new T.CylinderGeometry(.04,.045,.2,8),MX(x*.6,y,0,1,1,1,0,0,d*1.5708),col_,null);addGeo(A,new T.CylinderGeometry(.04,.042,.26,8),MX(x,y+.13,0),col_,null);addGeo(A,new T.SphereGeometry(.04,8,5,0,6.283,0,1.57),MX(x,y+.26,0),col_,null)});return build(A)},
  bush(s){const A=Acc(),r=rng(s*7+2);const cols=[C(0x3b6a27),C(0x4b7c30),C(0x2f5a21)];
   canopy(A,[[0,.32,0,.3,.22,.78],[.2,.26,.08,.22,.22,.8],[-.2,.27,-.06,.22,.22,.8],[.04,.34,.2,.2,.2,.8]],s*4.1,cols,.12);
   for(let i=0;i<6;i++){const a=r()*6.28,rr=.22+r()*.14;addGeo(A,new T.IcosahedronGeometry(.02,0),MX(Math.cos(a)*rr,.3+r()*.15,Math.sin(a)*rr),(c)=>c.set(r()<.5?0xc0302a:0xe8d040),null)}return build(A)},
  boulder(s,sand){const A=Acc(),r=rng(s*23+11);const base=sand?C(0xb59066):C(0x7d7a72),moss=C(0x55683a);
   const parts=[[0,.2,0,.42,1,.7,.9],[.3,.1,.12,.2,1,.7,.9],[-.28,.09,-.1,.16,1,.8,.8],[.12,.07,-.3,.13,1,.8,.8],[-.1,.06,.32,.11,1,.8,.8]];
   parts.forEach((q,i)=>{const g=blobGeo(sand?1:2,sand?.18:.2,s*3+i*2,.72);
    addGeo(A,g,MX(q[0],q[1],q[2],q[3]*(1+r()*.2),q[3]*(.8+r()*.15),q[3]*(.9+r()*.2),0,r()*6,0),(c,x,y,z,ny)=>{const st=.88+.14*Math.sin(y*26+vn(x*3+s,y*3,z*3)*6),cr=Math.abs(vn(x*7+s,y*7,z*7)-.5)<.025?.55:1;c.copy(base).multiplyScalar((.6+.32*vn(x*9+s,y*9,z*9)+.08*ny)*st*cr);if(!sand&&ny>.5&&vn(x*5,y*5,z*5)>.55)c.lerp(moss,.55);if(!sand&&ny<.6&&vn(x*13+s,y*13,z*13)>.7)c.lerp(C(0xb9a35a),.5)},null)});
   return build(A)},
  tuft(s){const A=Acc(),r=rng(s*5+1);const n=7;
   for(let i=0;i<n;i++){const a=r()*6.283,rr=r()*.12,h=.55+r()*.45,w=.045,bend=(.08+r()*.18);
    const g=new T.BufferGeometry(),pp=[],ii=[];const seg=3;for(let k=0;k<=seg;k++){const t=k/seg,y=t*h,off=bend*t*t,ww=w*1.15*(1-t*.92);pp.push(-ww,y,off,ww,y,off)}for(let k=0;k<seg;k++){const b=k*2;ii.push(b,b+1,b+2,b+1,b+3,b+2)}
    g.setAttribute("position",new T.Float32BufferAttribute(pp,3));g.setIndex(ii);
    addGeo(A,g,MX(Math.cos(a)*rr,0,Math.sin(a)*rr,1,1,1,0,a+r(),0),(c,x,y)=>{c.copy(C(0x2c4a1c)).lerp(C(0xa0b84e),y/h*.9).multiplyScalar(.85+.3*r())},(x,y)=>y*.55)}
   return build(A)},
  reeds(s){const A=Acc(),r=rng(s*3+8);
   for(let i=0;i<8;i++){const a=r()*6.283,rr=r()*.14,h=.7+r()*.3,bend=.05+r()*.12;const g=new T.BufferGeometry(),pp=[],ii=[],seg=5;
    for(let k=0;k<=seg;k++){const t=k/seg,y=t*h,off=bend*t*t,ww=.022*(1-t*.9);pp.push(-ww,y,off,ww,y,off)}for(let k=0;k<seg;k++){const b=k*2;ii.push(b,b+1,b+2,b+1,b+3,b+2)}
    g.setAttribute("position",new T.Float32BufferAttribute(pp,3));g.setIndex(ii);
    addGeo(A,g,MX(Math.cos(a)*rr,0,Math.sin(a)*rr,1,1,1,0,a+r(),0),(c,x,y)=>c.copy(C(0x5a7a34)).lerp(C(0x9aa850),y/h),(x,y)=>y*.4);
    if(r()<.55)addGeo(A,new T.CylinderGeometry(.018,.018,.12,5),MX(Math.cos(a)*rr+.01,h*.94,Math.sin(a)*rr+bend*.9,1,1,1,0,0,0),(c)=>c.set(0x5a3c22),(x,y)=>.35)}
   return build(A)}
 };
 const KIND={oak:["oak"],willow:["willow"],pine:["pine"],snowpine:["pine",1],dead:["dead"],cactus:["cactus"],bush:["bush"],boulder:["boulder"],rock:["boulder",1],tuft:["tuft"],reeds:["reeds"]};
 const NV={oak:2,willow:2,pine:2,snowpine:2,dead:2,cactus:2,bush:2,boulder:3,rock:2,tuft:2,reeds:2};
 const GEO={};function geos(n){if(GEO[n])return GEO[n];const [k,f]=KIND[n],a=[];for(let v=0;v<NV[n];v++)a.push(REC[k](v+1,f));return GEO[n]=a}
 /* material with wind sway, shared per sway strength */
 const XT={value:0},MATS={};
 function mat(grass,amp){const key=(grass?"g":"t")+amp;if(MATS[key])return MATS[key];
  const m=new T.MeshLambertMaterial({vertexColors:true,side:grass?T.DoubleSide:T.FrontSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uT=XT;
   sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT;attribute float sw;")
    .replace("#include <begin_vertex>","#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.31+instanceMatrix[3].z*.23;float wv=sin(uT*1.25+ph)+.45*sin(uT*2.7+ph*2.1);\ntransformed.x+=wv*sw*"+amp.toFixed(3)+";transformed.z+=cos(uT*.9+ph*1.3)*sw*"+(amp*.6).toFixed(3)+";\n#endif")};
  m.customProgramCacheKey=()=>"g3d"+key;return MATS[key]=m}
 const AMP={oak:.55,willow:.7,pine:.35,snowpine:.3,dead:.15,cactus:0,bush:.3,boulder:0,rock:0,tuft:.9,reeds:.8};
 /* ---------- level of detail: full 3D models near you, the painted cut-outs further out, nothing beyond the fog ---------- */
 const SETS=[];            /* one entry per vegetation type */
 const OPT=window.GVEG={r3:55,far:110,on:true,shadows:false,dirty:true};
 function control(parent,n,list,far,SA){
  if(!KIND[n]||!list.length)return;const NT=(window.NAT&&NAT.has(n)&&NAT.on())?NAT.make(n,(SA&&SA[n])||1,XT):null,gs=NT?NT.g:geos(n),gp=NT?geos(n):null,NVn=gs.length,NVp=gp?gp.length:0,grass=(n==="tuft"||n==="reeds"),N=list.length;
  const asp=(SA&&SA[n])||1,mm=new T.Matrix4(),q=new T.Quaternion(),p=new V3(),s=new V3(),ya=new V3(0,1,0),cc=new Col();
  const vari=new Uint8Array(N),vm=new Uint8Array(N),cnt=new Array(NVn).fill(0),cntp=new Array(NVp).fill(0);
  const M3=new Float32Array(N*16),C3=new Float32Array(N*3);
  list.forEach((d,i)=>{const vi=Math.floor(h3(d[0]*1.7,d[2]*3.1,i*.13)*NVn)%NVn;vari[i]=vi;cnt[vi]++;if(gp){const vp=Math.floor(h3(d[2]*2.3,d[0]*1.1,i*.31)*NVp)%NVp;vm[i]=vp;cntp[vp]++}
   const h=d[3],w=h*asp*(d[5]||1)*(n==="tuft"?.9:n==="reeds"?.8:1.0),yaw=h3(d[0]*12.9,d[2]*78.2,3)*6.2832;q.setFromAxisAngle(ya,yaw);p.set(d[0],d[1],d[2]);
   const j=.9+.2*h3(d[0],d[2]*2,5);s.set(w*j,h,w*(.9+.2*h3(d[2],d[0],9)));mm.compose(p,q,s);mm.toArray(M3,i*16);
   const t=h3(d[0]*3.3,d[2]*1.9,1),v=.82+.34*t;
   if(n==="oak"||n==="bush"||n==="willow")cc.setRGB(v*(.96+.1*h3(d[2],d[0],4)),v,v*(.92+.1*h3(d[0],d[0],8)));else cc.setRGB(v,v,v);C3[i*3]=cc.r;C3[i*3+1]=cc.g;C3[i*3+2]=cc.b});
  const mid=gp?gp.map((g,vi)=>{const im=new T.InstancedMesh(g,mat(grass,AMP[n]),Math.max(1,cntp[vi]));im.count=0;im.frustumCulled=false;im.castShadow=false;im.receiveShadow=false;im.instanceColor=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,cntp[vi])*3).fill(1),3);im.onBeforeRender=()=>{XT.value=performance.now()/1000};parent.add(im);return im}):null;
  const near=gs.map((g,vi)=>{const im=new T.InstancedMesh(g,NT?NT.m[vi]:mat(grass,AMP[n]),Math.max(1,cnt[vi]));im.count=0;im.frustumCulled=false;im.castShadow=false;im.receiveShadow=false;
   im.instanceColor=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,cnt[vi])*3).fill(1),3);im.onBeforeRender=()=>{XT.value=performance.now()/1000};parent.add(im);return im});
  const Mf=far.instanceMatrix.array.slice(),far0=far;
  SETS.push({n,grass,N,vari,vm,M3,C3,near,mid,far:far0,Mf,list});OPT.dirty=true}
 /* refresh which instances are drawn as 3D, as cut-outs, or not at all */
 let lx=1e9,lz=1e9,ly=0,lt=0;
 function refresh(cx,cz,fx,fz,ds){
  const R3=OPT.on?OPT.r3:0,F=OPT.far,R2=R3*R3,F2=F*F;
  const NR=(window.NAT&&NAT.nr)?NAT.nr():0,NR2=Math.min(NR,R3)*Math.min(NR,R3);
  for(const S of SETS){const kc=new Array(S.near.length).fill(0),kp=S.mid?new Array(S.mid.length).fill(0):null;let fc=0;const fa=S.far.instanceMatrix.array;
   for(let i=0;i<S.N;i++){const d=S.list[i],dx=d[0]-cx,dz=d[2]-cz,d2=dx*dx+dz*dz;
    if(d2>F2||(S.grass&&d2>R2))continue;
    if(d2>100&&dx*fx+dz*fz<-.5*Math.sqrt(d2)&&!(ds&&d2<900))continue;         /* behind you */
    if(S.mid&&d2<R2&&d2>=NR2){const vi=S.vm[i],im=S.mid[vi];if((kp[vi]+1)*16>im.instanceMatrix.array.length)continue;const k=kp[vi]++;im.instanceMatrix.array.set(S.M3.subarray(i*16,i*16+16),k*16);{const ca=im.instanceColor&&im.instanceColor.array;if(ca&&k*3+3<=ca.length&&S.C3)ca.set(S.C3.subarray(i*3,i*3+3),k*3)}}
    else if(d2<R2){const vi=S.vari[i],im=S.near[vi];if((kc[vi]+1)*16>im.instanceMatrix.array.length)continue;const k=kc[vi]++;im.instanceMatrix.array.set(S.M3.subarray(i*16,i*16+16),k*16);{const ca=im.instanceColor&&im.instanceColor.array;if(ca&&k*3+3<=ca.length&&S.C3)ca.set(S.C3.subarray(i*3,i*3+3),k*3)}}
    else if(!S.grass){if((fc+1)*16>fa.length)continue;fa.set(S.Mf.subarray(i*16,i*16+16),fc*16);fc++}}
   S.near.forEach((im,vi)=>{im.count=kc[vi];im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.visible=kc[vi]>0});
   if(S.mid)S.mid.forEach((im,vi)=>{im.count=kp[vi];im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.visible=kp[vi]>0});
   S.far.count=fc;S.far.instanceMatrix.needsUpdate=true;S.far.visible=fc>0}}
 let _vu0=null;
 function hook(){if(_vu0||typeof vmUpdate==="undefined")return;_vu0=vmUpdate;
  vmUpdate=function(dt){_vu0(dt);try{if(typeof camera==="undefined"||!camera||typeof world==="undefined"||!world.visible||!SETS.length)return;
    lt+=dt;const cp=camera.position;camera.getWorldDirection(_wd);const fx=_wd.x,fz=_wd.z,l=Math.hypot(fx,fz)||1,ang=Math.atan2(fx,fz);
    const moved=Math.hypot(cp.x-lx,cp.z-lz);let da=Math.abs(ang-ly);if(da>Math.PI)da=2*Math.PI-da;
    if(typeof worldFog!=="undefined"&&worldFog)OPT.far=Math.min(160,worldFog.far*1.04+6);
    if(OPT.dirty||moved>2.2||da>.22||lt>.7){lt=0;lx=cp.x;lz=cp.z;ly=ang;OPT.dirty=false;
     const cs=OPT.shadows;SETS.forEach(S=>{if(!S.grass)S.near.forEach(im=>{if(im.castShadow!==cs)im.castShadow=cs})});
     refresh(cp.x,cp.z,fx/l,fz/l,cs)}
   }catch(e){if(!window.__g3e){window.__g3e=1;console.warn("g3d",e)}}}}
 const _wd=new V3();
 hook();
 return{has:n=>!!KIND[n],control,KIND,opt:OPT,sets:SETS}
})();


const $=id=>document.getElementById(id);
const W=80,H=60,TS=32,VW=15,VH=11,SEED=1337;
/* ---------- deterministic world ---------- */
function hs(x,y){let n=Math.sin(x*127.1+y*311.7+SEED*0.7)*43758.5453;return n-Math.floor(n)}
function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 return hs(xi,yi)*(1-u)*(1-v)+hs(xi+1,yi)*u*(1-v)+hs(xi,yi+1)*(1-u)*v+hs(xi+1,yi+1)*u*v}
const BIOMES={
 forest:{n:"Whisperwood",c:"#3d5a2e",at:[40,30]},
 tundra:{n:"Frostmarch",c:"#cfe0e8",at:[40,6]},
 mountain:{n:"Ashen Peaks",c:"#7d7468",at:[70,12]},
 swamp:{n:"Mirewater",c:"#4a5a3a",at:[68,48]},
 desert:{n:"Sunscar Waste",c:"#d1b370",at:[14,50]},
 hills:{n:"Highcairn Hills",c:"#6f8a45",at:[12,14]}
};
const BK=Object.keys(BIOMES);
const T={ // c colour, s solid
 grass:{c:"#3d5a2e"},tree:{c:"#274a22",s:1,g:"T"},water:{c:"#2f5f8f",s:1},sand:{c:"#d1b370"},cactus:{c:"#d1b370",s:1,g:"Y"},
 snow:{c:"#dfeaf0"},pine:{c:"#dfeaf0",s:1,g:"A"},ice:{c:"#8fc0d8",s:1},peak:{c:"#5e574d",s:1,g:"^"},rock:{c:"#7d7468"},
 hill:{c:"#6f8a45"},bog:{c:"#4a5a3a"},dead:{c:"#4a5a3a",s:1,g:"t"},mire:{c:"#3a4a30",s:1},ruin:{c:"#8a8374"}
};
const map=[],biome=[];
for(let y=0;y<H;y++){map.push([]);biome.push([]);for(let x=0;x<W;x++){
 let best=null,bd=1e9;
 for(const k of BK){const a=BIOMES[k].at;const d=Math.hypot(x-a[0],(y-a[1])*1.15)+(vn(x/6,y/6)-.5)*16;if(d<bd){bd=d;best=k}}
 biome[y][x]=best;
 const n=vn(x/3.1,y/3.1),n2=vn(x/9+50,y/9+50);let t="grass";
 switch(best){
  case"forest":t=n>.72?"tree":n2<.2?"water":"grass";break;
  case"tundra":t=n>.75?"pine":n2<.16?"ice":"snow";break;
  case"mountain":t=n>.62?"peak":"rock";break;
  case"swamp":t=n>.8?"mire":n<.24?"dead":"bog";break;
  case"desert":t=n>.84?"cactus":n2>.88?"peak":"sand";break;
  case"hills":t=n>.78?"peak":n>.7?"tree":"hill";break;
 }
 map[y][x]=t}}
const SX=40,SY=30;for(let y=SY-2;y<=SY+2;y++)for(let x=SX-2;x<=SX+2;x++)map[y][x]="grass";
/* reachable set */
const reach=new Uint8Array(W*H);{const q=[[SX,SY]];reach[SY*W+SX]=1;while(q.length){const[x,y]=q.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy;if(a<0||b<0||a>=W||b>=H||reach[b*W+a]||T[map[b][a]].s)continue;reach[b*W+a]=1;q.push([a,b])}}}
/* fixed points of interest, placed by seeded scan of reachable tiles */
const POI_DEF=[
 ["village","Oakhollow Village","forest","v",0,"A smoke-stained hamlet. A good place to rest and trade (coming in a later phase)."],
 ["shrine","Whisper Shrine","forest","s",0,"Moss-covered stones hum faintly. A blessing waits here (coming soon)."],
 ["crypt","Hollow Crypt","forest","d",1,"HIDDEN DUNGEON: a cracked slab hides a stair down into the dark."],
 ["ice","Frozen Temple","tundra","t",0,"Ice-glazed pillars ring a silent altar."],
 ["cave","Wyrmfrost Cave","tundra","d",1,"HIDDEN DUNGEON: warm breath curls from a cave mouth in the snow."],
 ["fort","Ashen Watchtower","mountain","r",0,"A broken watchtower. Goblin banners flutter on the top."],
 ["mine","Deepdelve Mine","mountain","d",1,"HIDDEN DUNGEON: a collapsed mine, the dwarves' lanterns still lit."],
 ["hut","Mirewitch Hut","swamp","v",0,"A hut on stilts. Something stirs in the cauldron."],
 ["sunk","Sunken Sanctum","swamp","d",1,"HIDDEN DUNGEON: half-drowned steps lead into a flooded temple."],
 ["obelisk","Sunscar Obelisk","desert","t",0,"A black obelisk, humming in the heat."],
 ["tomb","Dune King's Tomb","desert","d",1,"HIDDEN DUNGEON: sand slides away to reveal a sealed door."],
 ["ruin","Highcairn Ruins","hills","r",0,"Toppled arches and a rusted portcullis."],
 ["lair","Giant's Barrow","hills","d",1,"HIDDEN DUNGEON: a barrow mound large enough to stable a giant."]
];
const SITE_DEFS=[
 ["hermes","Temple of Hermes Trismegistus","forest","t",0,"Two pillars, one black, one white. A lamp burns in a roofless sanctum and the floor is inlaid with ten circles joined by twenty-two paths."],
 ["seals","Circle of the Seven Seals","hills","t",0,"Seven standing stones, each carved with a grid of numbers and a knotted line. Each stone hums at a different pitch."],
 ["pantheon","Pantheon of Forgotten Gods","mountain","r",0,"Twelve basalt idols stand in a ring. Their eyes follow you. One niche is empty, and somehow the emptiest."],
 ["archon","Archon's Gate","swamp","t",0,"A gate of black stone and seven concentric rings, turning slowly. Each ring is a heaven, and each has a keeper."],
 ["athanor","Ouroboros Athanor","desert","t",0,"A great clay furnace that has never gone cold. A golden serpent swallows its own tail above it. Over the door: V.I.T.R.I.O.L."],
 ["iching","Pagoda of the Eight Trigrams","tundra","t",0,"A five-tiered pagoda ringed in lantern light. On its floor, eight trigrams circle a turning black and white eye."],
 ["ziggurat","Ziggurat of the Seven Heavens","desert","t",0,"A stepped tower of mud brick, one stage for each wandering star. A flame on the summit watches the sky."],
 ["pyramid","Black Pyramid of Thoth","mountain","t",0,"A pyramid of basalt, capped in gold. A narrow door opens at its foot. Someone, long ago, left it ajar."],
 ["runes","Ring of the Rune-Stones","tundra","r",0,"Menhirs ring a frozen pool, each cut with a single glowing rune. Wind plays between them in fifths."],
 ["coven","Sabbat Grove","forest","v",0,"A fire in the clearing and a circle of stones. Witches turn about it, singing one low word again and again. A stag skull watches."],
 ["cathedral","Ruined Cathedral of the Hollow Choir","hills","r",0,"Roofless nave, a rose window still glowing in the dark. The choir stalls are occupied, in a manner of speaking."]];
SITE_DEFS.push(
 ["kn1","Commandery of the Two Pillars","forest","t",0,"A walled hall of pale stone. A black pillar and a white pillar flank the gate, and the floor within is checkered. Knights of the old order keep watch."],
 ["kn2","Preceptory of the Checkered Floor","hills","t",0,"A square hall on a hill, its floor laid in black and white. Square and compass are carved over the door."],
 ["kn3","Hall of the Winter Watch","tundra","t",0,"A frozen hall whose watchfires never die. Banners hang stiff in the still air."],
 ["kn4","Chapter of the Blazing Star","mountain","t",0,"A mountain chapter-house under a star of white light. The gate opens only for those who ask the right way."]);
SITE_DEFS.push(["dt_saturn","Chapel of the Slow Lead","tundra","t",0,"Black monoliths lean toward an hourglass of stone. The sand does not fall."],["dt_jupiter","Grove of the Thunderer","forest","t",0,"Four columns hold up the sky, and an oak stands where the altar should be."],["dt_mars","Iron Ward-Hall","mountain","t",0,"A ring of spears faces outward. Four braziers burn red around an empty anvil."],["dt_sun","Altar of the Unsetting Sun","desert","t",0,"A golden disc on a pole burns without fire in a ring of white sand."],["dt_venus","Rose Terraces of Cypris","hills","t",0,"Three arches of living rose and a basin of clear water. Someone is humming."],["dt_mercury","Causeway of the Caduceus","swamp","t",0,"A staff taller than a tree stands at the end of a plank causeway."],["dt_moon","Silver Pool of Selene","forest","t",0,"A round pool holds a second, smaller moon, even at noon."],["dt_garden","Hanging Gardens of the Ravine","hills","t",0,"Terraces climb a ravine, green with plants that should not grow together."],["dt_mirror","The Mirror Flats","desert","t",0,"A salt flat so level and wet it has become a sky."],["dt_bell","The Drowned Bell Tower","swamp","t",0,"A tower rises out of the bog. A green bell still hangs in its arch."]);SITE_DEFS.forEach(d=>POI_DEF.push(d));

const POIS=[];
POI_DEF.forEach((p,i)=>{
 const a=BIOMES[p[2]].at;let found=null,r=0;
 outer:for(r=3+((i*7)%9);r<45&&!found;r++){for(let k=0;k<36;k++){const ang=(k/36)*6.283+i*1.7;const x=Math.round(a[0]+Math.cos(ang)*r),y=Math.round(a[1]+Math.sin(ang)*r);
  if(x<2||y<2||x>=W-2||y>=H-2||biome[y][x]!==p[2]||!reach[y*W+x]||POIS.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)<8)||(Math.abs(x-SX)+Math.abs(y-SY)<6))continue;found={x,y};break outer}}
 if(!found)found={x:SX+3+i,y:SY+2};
 POIS.push({id:p[0],name:p[1],x:found.x,y:found.y,k:p[3],hidden:!!p[4],text:p[5]});
});
(function(){const fl={forest:"grass",tundra:"snow",mountain:"rock",swamp:"bog",desert:"sand",hills:"hill"};POIS.forEach(p=>{if(!SITE_DEFS.some(d=>d[0]===p.id))return;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=p.x+dx,y=p.y+dy;if(x<0||y<0||x>=W||y>=H||Math.hypot(dx,dy)>4.2)continue;map[y][x]=fl[biome[y][x]];reach[y*W+x]=1}})})();
/* ---------- state ---------- */
let hero=null,hx=SX,hy=SY,seen=new Uint8Array(W*H),found={},keyName="";
function loadHero(h){hero=h;initHero(hero);keyName="hollowmere.world."+h.name+"."+h.created;
 try{const s=JSON.parse(localStorage.getItem(keyName)||"null");if(s){hx=s.x;hy=s.y;seen=Uint8Array.from(atob(s.seen),c=>c.charCodeAt(0));found=s.found||{};got=s.got||{};if(s.hero){hero=s.hero;initHero(hero)}}}catch(e){}
 fixStats();$("start").hidden=true;$("game").hidden=false;renderLeg();reveal();hud();draw();syncP();initGL();$("view").scrollIntoView({block:"start"});
 say(Object.keys(found).length?"Welcome back, "+hero.name+".":"You stand in Whisperwood. Open Pack and spells to see your gear. Danger grows with distance.");}
function save(){if(!hero)return;try{localStorage.setItem(keyName,JSON.stringify({x:hx,y:hy,seen:btoa(String.fromCharCode(...seen)),found,got,hero}))}catch(e){}}
function hud(){fixStats();const b=BIOMES[biome[hy][hx]];const e=$("hud");e.innerHTML="";
 [hero.name+", "+hero.race+" "+hero.cls+(hero.kn&&hero.kn.rank?", "+KNR[hero.kn.rank]:""),"Lv "+hero.level,"HP "+hero.hp+"/"+hero.maxHp,RES[hero.cls]+" "+hero.mana+"/"+hero.maxMana,"AC "+hero.ac,hero.gold+" gp","XP "+hero.xp+(XPT[hero.level]?"/"+XPT[hero.level]:""),"Region: "+b.n,"Found: "+Object.keys(found).length+"/"+POIS.length].forEach((t,i)=>{const sp=document.createElement(i?"span":"b");sp.textContent=t;e.appendChild(sp)})}
function say(t){$("log").textContent=t;if(typeof toast==="function")toast(t)}
function reveal(){const R=5;for(let y=hy-R;y<=hy+R;y++)for(let x=hx-R;x<=hx+R;x++){if(x<0||y<0||x>=W||y>=H)continue;if(Math.hypot(x-hx,y-hy)<=R+.3)seen[y*W+x]=1}}
function near(p,d){return Math.abs(p.x-hx)<=d&&Math.abs(p.y-hy)<=d}
/* ================= PHASE 5: first-person 3D (three.js) ================= */
const TW=2;
let renderer,scene,camera,world,skyM,sunM,hemi,sunL,waterM,baseM,partsM,cloudG,glReady=false,qual=2,noEnter=null,defeatedFlag=0,lastBiome=null;
const P={x:SX*TW+1,z:SY*TW+1};let yaw=0,pitch=0,bob=0,shakeT=0,faceT=null;
const keys={},joy={x:0,y:0};let npcMeshes={},pickMeshes={},poiMeshes={},clock=0;
const mini=$("mini"),mx=mini.getContext("2d");
const PC={v:"#d9a85a",s:"#9fd0a0",t:"#b9d3ea",r:"#c0b5a0",d:"#d2603f"};
function syncP(){P.x=hx*TW+1;P.z=hy*TW+1}
function tileSolid(tx,ty){return tx<0||ty<0||tx>=W||ty>=H||T[map[ty][tx]].s}
function blocked(wx,wz,r){for(const[dx,dz]of[[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]])if(tileSolid(Math.floor((wx+dx)/TW),Math.floor((wz+dz)/TW)))return true;if(window.TREEH&&TREEH.size){const tx=Math.floor(wx/TW),ty=Math.floor(wz/TW);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=TREEH.get((ty+b)*W+tx+a);if(l)for(const t of l)if(Math.hypot(t.x-wx,t.z-wz)<t.r+r*.8)return true}}return NPCS.some(n=>Math.hypot(n.x*TW+1-wx,n.y*TW+1-wz)<.9)}
/* ---- height field and colours ---- */
const AMP={forest:1.2,tundra:1,mountain:5.5,swamp:.25,desert:1.5,hills:3},BASE={forest:0,tundra:.3,mountain:2.5,swamp:0,desert:0,hills:1};
const BCOL={forest:[.30,.48,.22],hills:[.48,.61,.30],tundra:[.92,.95,.97],mountain:[.52,.49,.44],swamp:[.33,.39,.25],desert:[.85,.73,.47]};
const gA=new Float32Array(W*H),gB=new Float32Array(W*H),gWt=new Float32Array(W*H),gR=new Float32Array(W*H),gG=new Float32Array(W*H),gBl=new Float32Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,b=biome[y][x],t=map[y][x];gA[i]=AMP[b];gB[i]=BASE[b];gWt[i]=(t==="water"||t==="ice"||t==="mire")?1:0;
 let c=BCOL[b].slice();if(t==="tree")c=c.map(v=>v*.72);else if(t==="peak")c=[.45,.43,.4];else if(gWt[i])c=[.17,.26,.21];else if(t==="dead"||t==="bog")c=c.map(v=>v*.85);
 gR[i]=c[0];gG[i]=c[1];gBl[i]=c[2]}
function bil(grid,x,z){const gx=x/TW-.5,gz=z/TW-.5,x0=Math.max(0,Math.min(W-1,Math.floor(gx))),z0=Math.max(0,Math.min(H-1,Math.floor(gz))),x1=Math.min(W-1,x0+1),z1=Math.min(H-1,z0+1),fx=Math.max(0,Math.min(1,gx-x0)),fz=Math.max(0,Math.min(1,gz-z0));
 return(grid[z0*W+x0]*(1-fx)+grid[z0*W+x1]*fx)*(1-fz)+(grid[z1*W+x0]*(1-fx)+grid[z1*W+x1]*fx)*fz}
const FLAT=[];
function hfn(x,z){const n=vn(x*.07,z*.07)*.65+vn(x*.19+10,z*.19)*.25+vn(x*.5,z*.5)*.1;let h=bil(gB,x,z)+(n-.5)*2*bil(gA,x,z)-bil(gWt,x,z)*2.2;
 const d=Math.hypot(x-(SX*TW+1),z-(SY*TW+1));if(d<9){const k=d/9;h=h*k*k*(3-2*k)}for(const f of FLAT){const dd=Math.hypot(x-f.x,z-f.z);if(dd<f.R){const k=dd/f.R;h=f.h+(h-f.h)*k*k*(3-2*k)}}return h}
/* ---- helpers ---- */
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0,flatShading:true},o||{}));
function mk(p,geo,mat,x,y,z,o){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(o&&o.r)m.rotation.set(o.r[0],o.r[1],o.r[2]);if(o&&o.s)m.scale.set(o.s[0],o.s[1],o.s[2]);m.castShadow=!(o&&o.ns);m.receiveShadow=true;p.add(m);return m}
const coneG=(r,h,s)=>{const g=new THREE.ConeGeometry(r,h,s||6);g.translate(0,h/2,0);return g},cylG=(a,b,h,s)=>{const g=new THREE.CylinderGeometry(a,b,h,s||6);g.translate(0,h/2,0);return g};
const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3(),_p=new THREE.Vector3(),_c=new THREE.Color();
function inst(geo,list,cast,o){if(!list.length)return;const m=new THREE.InstancedMesh(geo,M(0xffffff,o),list.length);
 list.forEach((d,i)=>{_e.set(d.rx||0,d.ry||0,d.rz||0);_q.setFromEuler(_e);_p.set(d.x,d.y,d.z);_s.set(d.sx,d.sy||d.sx,d.sz||d.sx);_m.compose(_p,_q,_s);m.setMatrixAt(i,_m);_c.set(d.c);m.setColorAt(i,_c)});
 m.castShadow=!!cast;m.receiveShadow=true;m.frustumCulled=false;world.add(m);return m}
function label(text){const c=document.createElement("canvas");c.width=768;c.height=96;const g=c.getContext("2d");g.font="bold 34px Georgia,serif";g.textAlign="center";g.fillStyle="rgba(10,8,6,.7)";const w=Math.min(760,g.measureText(text).width+36);g.fillRect(384-w/2,16,w,60);g.fillStyle="#E9DDBF";g.fillText(text,384,60,740);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(4.2,.52,1);s.renderOrder=10;return s}
function radTex(r,g,b){const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,`rgba(${r},${g},${b},1)`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=gr;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
/* ---- terrain ---- */
function buildTerrain(){const g=new THREE.PlaneGeometry(W*TW,H*TW,W*TW*2,H*TW*2);g.rotateX(-Math.PI/2);g.translate(W*TW/2,0,H*TW/2);const pos=g.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setY(i,hfn(pos.getX(i),pos.getZ(i)));g.computeVertexNormals();const nor=g.attributes.normal,col=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),k=.8+.4*vn(x*.9,z*.9),st=Math.max(0,Math.min(1,(.88-nor.getY(i))*7));
  col[i*3]=bil(gR,x,z)*k*(1-st)+.47*st;col[i*3+1]=bil(gG,x,z)*k*(1-st)+.44*st;col[i*3+2]=bil(gBl,x,z)*k*(1-st)+.40*st}
 g.setAttribute("color",new THREE.BufferAttribute(col,3));terrainWeights(g,pos,nor);const t=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,map:(()=>{const n=noiseTex(128,5,[W*TW/8,H*TW/8],true);return n})(),bumpScale:1.4}));t.material.bumpMap=t.material.map;t.material.map.anisotropy=8;paintTerrain(t.material);t.receiveShadow=true;world.add(t)}
/* ---- foliage ---- */
const VHS=[[-5,-3],[5,-4],[-6,3],[6,3],[0,-7]],_p2=new THREE.Vector3();
function WINM(){if(!WINM.m){WINM.m=M(0xffe08a,{emissive:0xffb040,emissiveIntensity:.5});winMats.push(WINM.m)}return WINM.m}
function extras(L,x,y,b,cx,cz,r,r2,r3,jx,jz,gy){const rr=k=>hs(x*13+k,y*17+k*3);
 if((b==="forest"||b==="hills")&&rr(1)<.2){const pc=[0xffe14a,0xff7aa8,0xffffff,0xb08aff][(rr(2)*4)|0];for(let k=0;k<4;k++){const fx=cx+(rr(3+k)-.5)*1.8,fz=cz+(rr(7+k)-.5)*1.8;L.flw.push({x:fx,y:hfn(fx,fz)+.3,z:fz,sx:.08,c:pc})}}
 if((b==="forest"||b==="swamp")&&rr(5)<.09){const mc=b==="swamp"?0xb04aff:[0xd8402a,0xe0902a][(rr(6)*2)|0];for(let k=0;k<3;k++){const fx=jx+(rr(8+k)-.5)*.6,fz=jz+(rr(11+k)-.5)*.6,fy=hfn(fx,fz);L.mushS.push({x:fx,y:fy,z:fz,sx:1,sy:.8+k*.2,c:0xe8dcc0});L.mush.push({x:fx,y:fy+.2+k*.04,z:fz,sx:.12+k*.03,sy:.1,c:mc})}}
 if(b==="forest"&&rr(9)>.965)L.log.push({x:jx,y:gy+.18,z:jz,sx:1,sy:1,ry:rr(4)*6,c:0x6a4a2c});
 if(b==="desert"&&rr(10)<.05){L.bone.push({x:jx,y:gy+.08,z:jz,sx:.5+rr(2),sy:.5,ry:rr(1)*6,c:0xe8e0c8});L.bone.push({x:jx+.3,y:gy+.08,z:jz+.2,sx:.4,sy:.5,ry:rr(3)*6,c:0xe8e0c8})}}
function buildFoliage(){window.TREEH=new Map();const L={trunk:[],can:[],can2:[],ptr:[],p1:[],p2:[],p3:[],peak:[],cap:[],cac:[],arm:[],dead:[],br:[],tuft:[],rock:[],reed:[],slab:[],ice:[],bush:[],peakS:[],peakB:[],flw:[],mush:[],mushS:[],log:[],pad:[],bone:[]};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=map[y][x],b=biome[y][x],cx=x*TW+1,cz=y*TW+1,r=hs(x*7,y*13),r2=hs(x*3+1,y*5+2),r3=hs(x*11+5,y*2+9),jx=cx+(r-.5)*.8,jz=cz+(r2-.5)*.8,gy=hfn(jx,jz);if(siteNear(cx,cz,9))continue;
  if(t==="tree"){const s=.9+r*.6,tc=b==="hills"?(r2>.5?0x7a8c3a:0x6a7d3a):(r2>.5?0x2f5a2a:0x3a6a2e);L.trunk.push({x:jx,y:gy-.1,z:jz,sx:s,sy:s,c:0x5a3d22});L.can.push({x:jx,y:gy+2.0*s,z:jz,sx:s*1.25,sy:s*1.1,ry:r*6,c:tc});L.can2.push({x:jx,y:gy+3.1*s,z:jz,sx:s*.85,ry:r2*6,c:tc+0x0a140a})}
  else if(t==="pine"){const s=.9+r*.5;L.ptr.push({x:jx,y:gy-.1,z:jz,sx:s,c:0x4a3524});L.p1.push({x:jx,y:gy+.7*s,z:jz,sx:s*1.3,sy:s,c:0x2a5a48});L.p2.push({x:jx,y:gy+1.9*s,z:jz,sx:s,sy:s,c:0x2f6650});L.p3.push({x:jx,y:gy+3.0*s,z:jz,sx:s*.7,sy:s,c:0xe8f0f4})}
  else if(t==="peak"){const ph=b==="mountain"?6+r*5:3+r*3,sx=1.1+r2*.5;(b==="mountain"||b==="tundra"?L.peakS:L.peakB).push({x:cx,y:gy-.8,z:cz,sx,sy:ph/8,ry:r*6,c:r>.5?0xffffff:0xe6dcd2})}
  else if(t==="cactus"){const s=.6+r*.45;L.cac.push({x:jx,y:gy-.1,z:jz,sx:s,c:0x3f7a3a});L.arm.push({x:jx+.25*s,y:gy+.9*s,z:jz,sx:s,c:0x3f7a3a});L.arm.push({x:jx-.25*s,y:gy+1.2*s,z:jz,sx:s*.9,c:0x3f7a3a})}
  else if(t==="dead"){const s=.9+r*.5;L.dead.push({x:jx,y:gy-.1,z:jz,sx:s,c:0x3a342a});L.br.push({x:jx,y:gy+1.2*s,z:jz,sx:s,rz:.9,ry:r*6,c:0x3a342a});L.br.push({x:jx,y:gy+1.7*s,z:jz,sx:s*.8,rz:-.8,ry:r2*6,c:0x3a342a})}
  else if(t==="mire"){L.slab.push({x:cx,y:-.12,z:cz,sx:TW,sy:1,c:0x3f4a2a});for(let k=0;k<5;k++){const rx=cx+(hs(x*5+k,y)-.5)*1.8,rz=cz+(hs(x,y*5+k)-.5)*1.8;L.reed.push({x:rx,y:-.2,z:rz,sx:1,sy:.8+hs(k,x+y)*.8,c:0x7a8a3a})}}
  else if(t==="ice"){L.ice.push({x:cx,y:-.05,z:cz,sx:TW,sy:.2,sz:TW,c:0xbfe2f2})}
  else if(t==="water"){if(b==="swamp"&&r<.55)for(let k=0;k<2;k++)L.pad.push({x:cx+(hs(x*5+k,y)-.5)*1.6,y:-.36,z:cz+(hs(x,y*5+k)-.5)*1.6,sx:.45+hs(k,x+y)*.35,sy:1,c:0x3f7a3a})}
  else if(t!=="water"){extras(L,x,y,b,cx,cz,r,r2,r3,jx,jz,gy);if(b==="forest"&&t==="grass"&&Math.hypot(x-SX,y-SY)>9&&hs(x*5+3,y*9+1)<.1){const s=.95+r3*.6,ux=cx+(r-.5)*1.1,uz=cz+(r2-.5)*1.1,uy=hfn(ux,uz),tc=r2>.5?0x2f5a2a:0x3a6a2e;L.trunk.push({x:ux,y:uy-.1,z:uz,sx:s,sy:s,c:0x5a3d22});L.can.push({x:ux,y:uy+2.0*s,z:uz,sx:s*1.25,sy:s*1.1,ry:r*6,c:tc});L.can2.push({x:ux,y:uy+3.1*s,z:uz,sx:s*.85,ry:r2*6,c:tc+0x0a140a});const kk=y*W+x;(TREEH.get(kk)||TREEH.set(kk,[]).get(kk)).push({x:ux,z:uz,r:.34})}const n=b==="forest"||b==="hills"?4:b==="swamp"?2:b==="desert"?1:0,tc=b==="forest"?0x5c9a3a:b==="hills"?0x93b255:b==="swamp"?0x7a8a3a:0xb59a5a;
   for(let k=0;k<n;k++)L.tuft.push({x:cx+(hs(x*9+k,y*3)-.5)*1.9,y:hfn(cx,cz)-.05,z:cz+(hs(x*3,y*9+k)-.5)*1.9,sx:.55+hs(k,x)*.4,sy:.45+hs(y,k)*.5,c:tc+(k%2?0x0a140a:0)});
   if(r3<.12&&(b==="forest"||b==="hills"))L.bush.push({x:jx,y:gy+.2,z:jz,sx:.5+r*.4,sy:.4,c:b==="forest"?0x2f6a2a:0x6a8a3a});
   const rk=b==="mountain"?.35:(b==="desert"||b==="hills")?.12:.04;if(r2<rk)L.rock.push({x:jx,y:gy+.1,z:jz,sx:.3+r*.5,sy:.25+r2*.3,sz:.3+r3*.4,ry:r*6,c:b==="desert"?0xb0a07a:0x8a8478})}}
 SPR.foliage(L);const VC={vertexColors:true,roughness:.9},wi=(m,a)=>{if(m)windify(m.material,a)};
 inst(gradGeo(cylG(.18,.28,2.2,7),0x808080,0xffffff,.1),SPR.skip("oak",L.trunk),true,VC);
 wi(inst(gradGeo(lumpy(new THREE.IcosahedronGeometry(1,1),.4,3),0x5c5c5c,0xffffff,.4),SPR.skip("oak",L.can),true,VC),.035);
 wi(inst(gradGeo(lumpy(new THREE.IcosahedronGeometry(1,1),.4,7),0x6a6a6a,0xffffff,.35),SPR.skip("oak",L.can2),true,VC),.045);
 inst(cylG(.14,.2,1,5),SPR.skip("pine",L.ptr),true);
 wi(inst(gradGeo(coneG(1.1,1.6,8),0x6c6c6c,0xffffff,.2),SPR.skip("pine",L.p1),true,VC),.02);wi(inst(gradGeo(coneG(.85,1.5,8),0x707070,0xffffff,.2),SPR.skip("pine",L.p2),true,VC),.025);wi(inst(gradGeo(coneG(.6,1.3,8),0x909090,0xffffff,.1),SPR.skip("pine",L.p3),true,VC),.03);
 inst(peakGeo(1,true),SPR.skip("snowpeak",L.peakS),true,{vertexColors:true,flatShading:true});inst(peakGeo(2,false),SPR.skip("snowpeak",L.peakB),true,{vertexColors:true,flatShading:true});
 inst(gradGeo(cylG(.2,.22,1.8,7),0x909090,0xffffff,.1),SPR.skip("cactus",L.cac),true,VC);inst(cylG(.1,.1,.8,5),SPR.skip("cactus",L.arm),true);inst(cylG(.1,.16,2.2,5),SPR.skip("dead",L.dead),true);inst(cylG(.05,.08,1.2,4),SPR.skip("dead",L.br),true);
 wi(inst(gradGeo(coneG(.07,.55,3),0x607050,0xffffff,0),SPR.skip("tuft",L.tuft),false,VC),.3);inst(gradGeo(lumpy(new THREE.DodecahedronGeometry(1,0),.3,5),0x808080,0xffffff,.3),SPR.skip("boulder",L.rock),true,VC);wi(inst(gradGeo(lumpy(new THREE.IcosahedronGeometry(1,1),.35,9),0x707070,0xffffff,.3),SPR.skip("bush",L.bush),true,VC),.05);
 wi(inst(cylG(.04,.05,1.4,4),SPR.skip("reeds",L.reed),false),.22);
 inst(new THREE.SphereGeometry(1,5,4),L.flw,false);inst(new THREE.SphereGeometry(1,7,5,0,6.3,0,1.6),L.mush,false);inst(cylG(.04,.05,.25,5),L.mushS,false);
 inst(gradGeo(cylG(.2,.22,1.9,7),0x909090,0xffffff,.1).rotateZ(Math.PI/2),L.log,true,VC);inst(new THREE.CylinderGeometry(1,1,.03,10),L.pad,false);inst(new THREE.BoxGeometry(1,.2,.2),L.bone,false);
 const sg=new THREE.PlaneGeometry(2,2);sg.rotateX(-Math.PI/2);inst(sg,L.slab,false,{flatShading:false,roughness:.4});inst(new THREE.BoxGeometry(1,1,1),L.ice,false,{flatShading:false,roughness:.15,transparent:true,opacity:.85})}
/* ---- structures at points of interest ---- */
function buildPoi(p){const g=new THREE.Group(),st=PM("flag",0xffffff,.1,1),wd=PM("door",0xffffff,.45,1),gy=hfn(p.x*TW+1,p.y*TW+1);g.position.set(p.x*TW+1,gy,p.y*TW+1);
 const light=(c,i,d,y)=>{const l=new THREE.PointLight(c,i,d);l.position.set(0,y,0);g.add(l);return l};
 if(p.id==="village"){const hs3=[[-5,-3,0.3],[5,-4,-.4],[-6,3,.8],[6,3,-.9],[0,-7,0]];hs3.forEach(([x,z,ry],i)=>{const h=new THREE.Group();h.position.set(x,hfn(g.position.x+x,g.position.z+z)-gy,z);h.rotation.y=ry;
   mk(h,new THREE.BoxGeometry(3.2,2.2,2.8),PM("parch",0xf2eadc,.2,1.0),0,1.1,0);mk(h,new THREE.ConeGeometry(2.7,1.6,4),PM("roof",0xffffff,.8,1),0,3,0,{r:[0,Math.PI/4,0]});mk(h,new THREE.BoxGeometry(.7,1.3,.1),wd,0,.65,1.42);mk(h,new THREE.BoxGeometry(.5,.5,.1),WINM(),.9,1.4,1.42,{ns:1});mk(h,new THREE.BoxGeometry(.5,.5,.1),WINM(),-.9,1.4,1.42,{ns:1});mk(h,new THREE.BoxGeometry(.4,1.1,.4),M(0x6a5a50),-.8,3.3,-.5);SPR.house(g,h,i);g.add(h)});
  mk(g,new THREE.CylinderGeometry(.9,1,.7,8),st,0,.35,0);mk(g,new THREE.CylinderGeometry(.7,.7,.2,8),M(0x1a3a5a),0,.62,0,{ns:1});const f=light(0xff9a40,1.4,18,1.2);f.userData.flick=1;
  mk(g,new THREE.ConeGeometry(.3,.8,5),M(0xffb040,{emissive:0xff7a20,emissiveIntensity:1}),3,.45,0,{ns:1})}
 else if(p.id==="shrine"){for(let i=0;i<8;i++){const a=i/8*6.283;mk(g,new THREE.BoxGeometry(.7,2+(i%3)*.4,.5),st,Math.cos(a)*3.2,1,Math.sin(a)*3.2,{r:[0,-a,0]})}
  mk(g,new THREE.CylinderGeometry(.8,1,.6,8),st,0,.3,0);const o=mk(g,new THREE.SphereGeometry(.45,12,10),M(0x8ad0ff,{emissive:0x4aa0ff,emissiveIntensity:1.2,flatShading:false}),0,1.5,0,{ns:1});o.userData.float=1;light(0x6ab0ff,1.6,16,1.6)}
 else if(p.id==="ice"){for(let i=0;i<6;i++){const a=i/6*6.283;mk(g,new THREE.CylinderGeometry(.35,.45,3.5+(i%2),6),M(0xbfe2f2,{transparent:true,opacity:.85,roughness:.15}),Math.cos(a)*3.4,1.8,Math.sin(a)*3.4)}
  mk(g,new THREE.BoxGeometry(1.8,1,1),M(0xdff2fa,{roughness:.2}),0,.5,0);light(0x9fd8ff,1,14,2)}
 else if(p.id==="fort"){mk(g,new THREE.CylinderGeometry(1.8,2.2,9,8),st,0,4.5,0);for(let i=0;i<8;i++){const a=i/8*6.283;mk(g,new THREE.BoxGeometry(.7,.8,.7),st,Math.cos(a)*1.7,9.4,Math.sin(a)*1.7)}
  mk(g,new THREE.CylinderGeometry(.06,.06,3,4),wd,0,10.5,0);mk(g,new THREE.BoxGeometry(1.4,.8,.05),M(0x2a7a2a),.7,11.3,0,{ns:1});mk(g,new THREE.BoxGeometry(.9,1.4,.2),M(0x2a2018),0,.7,1.9)}
 else if(p.id==="hut"){[[-1.4,-1.2],[1.4,-1.2],[-1.4,1.2],[1.4,1.2]].forEach(([x,z])=>mk(g,new THREE.CylinderGeometry(.12,.14,2.4,5),wd,x,1.2,z));
  mk(g,new THREE.BoxGeometry(3.6,.2,3.2),wd,0,2.4,0);mk(g,new THREE.BoxGeometry(3,1.8,2.6),M(0x7a5a3a),0,3.4,0);mk(g,new THREE.ConeGeometry(2.8,1.4,4),M(0x3f5a2a),0,5,0,{r:[0,Math.PI/4,0]});
  const l=light(0x7aff7a,1.4,16,3);mk(g,new THREE.SphereGeometry(.2,8,6),M(0xaaffaa,{emissive:0x55ff55,emissiveIntensity:1.5}),1.8,2.8,1.4,{ns:1});mk(g,new THREE.CylinderGeometry(.5,.4,.5,8),M(0x2a2a2a),-2.4,.3,2)}
 else if(p.id==="obelisk"){mk(g,new THREE.BoxGeometry(1.8,.4,1.8),st,0,.2,0);mk(g,new THREE.CylinderGeometry(.5,.9,7,4),M(0x15121a,{roughness:.3}),0,3.9,0);mk(g,new THREE.ConeGeometry(.5,1,4),M(0x15121a),0,7.9,0);
  for(let i=0;i<4;i++)mk(g,new THREE.BoxGeometry(.1,.5,.02),M(0xffb040,{emissive:0xff8a20,emissiveIntensity:1.5}),0,2+i*1.1,.62-i*.08,{ns:1});light(0xff9a40,1.2,15,3)}
 else if(p.id==="ruin"){for(let i=0;i<7;i++){const a=i/7*6.283,hgt=1.5+hs(i,3)*3;mk(g,new THREE.BoxGeometry(.8,hgt,.8),st,Math.cos(a)*3.6,hgt/2,Math.sin(a)*3.6,{r:[0,a,(i%3-1)*.06]})}
  mk(g,new THREE.BoxGeometry(5,.6,.8),st,0,3.6,-3.6,{r:[0,0,.05]});mk(g,new THREE.BoxGeometry(1.6,.5,1.1),st,1.5,.3,1.2,{r:[0,.5,0]})}
 else if(SITE_DEFS.some(d=>d[0]===p.id)){buildSite(p,g)}
 else{ // hidden dungeon entrance
  mk(g,new THREE.BoxGeometry(.9,3.4,.9),st,-1.5,1.7,0);mk(g,new THREE.BoxGeometry(.9,3.4,.9),st,1.5,1.7,0);mk(g,new THREE.BoxGeometry(4,.8,1),st,0,3.6,0);
  mk(g,new THREE.PlaneGeometry(2.1,3.2),new THREE.MeshBasicMaterial({color:0x020101}),0,1.6,0,{ns:1});for(let i=0;i<4;i++)mk(g,new THREE.BoxGeometry(2.4,.25,.7),M(0x6a645a),0,.1+i*0,.8+i*.6,{ns:1});
  g.userData.hidden=1}
 SPR.poi(p,g);g.children.forEach(c=>{if(c.isMesh)c.frustumCulled=true});world.add(g);return g}
function buildNpc(n){const g=new THREE.Group(),j=JOBS[n.job],col=new THREE.Color(j.col).getHex(),skin=M(0xe0b890);
 mk(g,new THREE.ConeGeometry(.5,1.35,8),M(col),0,.68,0,{s:[1,1,1]});mk(g,new THREE.SphereGeometry(.2,10,8),skin,0,1.55,0);
 mk(g,new THREE.CylinderGeometry(.07,.08,.6,5),M(col),.42,1,0,{r:[0,0,.4]});mk(g,new THREE.CylinderGeometry(.07,.08,.6,5),M(col),-.42,1,0,{r:[0,0,-.4]});
 const hat={Witch:()=>mk(g,new THREE.ConeGeometry(.3,.7,8),M(0x4a2a6a),0,2.0,0),Priest:()=>mk(g,new THREE.ConeGeometry(.22,.4,6),M(0xf0e8d0),0,1.95,0),"Old soldier":()=>mk(g,new THREE.SphereGeometry(.23,8,6,0,6.3,0,1.6),M(0x8a8f98),0,1.58,0),Farmer:()=>mk(g,new THREE.CylinderGeometry(.42,.42,.05,10),M(0xd8c070),0,1.72,0),Merchant:()=>mk(g,new THREE.SphereGeometry(.24,8,6),M(0xc04030),0,1.72,0),Bard:()=>mk(g,new THREE.ConeGeometry(.2,.35,5),M(0xd86a8a),0,1.85,0,{r:[0,0,.3]}),Hermit:()=>mk(g,new THREE.ConeGeometry(.3,.5,7),M(col),0,1.8,0),Nomad:()=>mk(g,new THREE.ConeGeometry(.3,.5,7),M(col),0,1.8,0),Alchemist:()=>mk(g,new THREE.CylinderGeometry(.25,.28,.25,8),M(0x3a2a18),0,1.78,0),Astrologer:()=>mk(g,new THREE.ConeGeometry(.28,.8,8),M(0x2a3a8a,{emissive:0x101840}),0,2.0,0),Oracle:()=>mk(g,new THREE.SphereGeometry(.25,8,6,0,6.3,0,1.9),M(0x5a1a4a),0,1.6,0),Magus:()=>mk(g,new THREE.ConeGeometry(.24,.9,7),M(0x3a1a5a),0,2.05,0),Gnostic:()=>mk(g,new THREE.SphereGeometry(.25,8,6,0,6.3,0,1.9),M(0xd8d4b0),0,1.6,0),Cultist:()=>mk(g,new THREE.ConeGeometry(.3,.6,8),M(0x14101a),0,1.9,0),Templar:()=>mk(g,new THREE.SphereGeometry(.24,8,6,0,6.3,0,1.7),M(0xc8ccd8,{metalness:.6}),0,1.6,0)}[n.job];
 if(hat)hat();else mk(g,new THREE.SphereGeometry(.21,8,6,0,6.3,0,1.3),M(0x5a3a22),0,1.6,0);
 if(["Priest","Witch","Hermit","Nomad","Ferryman","Old soldier","Magus","Alchemist","Astrologer","Oracle","Gnostic"].includes(n.job))mk(g,new THREE.CylinderGeometry(.03,.03,2,4),M(0x6a4a2a),.6,1,.15);
 SPR.npc(g,n);const l=label(n.name+", "+n.job);l.position.y=2.6;l.visible=false;g.add(l);g.userData.l=l;g.position.set(n.x*TW+1,hfn(n.x*TW+1,n.y*TW+1),n.y*TW+1);g.rotation.y=hs(n.seed,4)*6.28;world.add(g);return g}
function buildPickup(p){const g=new THREE.Group(),y=hfn(p.x*TW+1,p.y*TW+1);g.position.set(p.x*TW+1,y,p.y*TW+1);
 if(p.k==="chest"){mk(g,new THREE.BoxGeometry(.9,.5,.6),M(0x6b4a22),0,.25,0);mk(g,new THREE.CylinderGeometry(.3,.3,.9,8,1,false,0,3.14),M(0x7b5a2a),0,.5,0,{r:[0,0,Math.PI/2]});mk(g,new THREE.BoxGeometry(.12,.3,.64),M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.8}),0,.35,0,{ns:1});g.userData.float=0}
 else{for(let i=0;i<6;i++){const a=i/6*6.28;mk(g,new THREE.ConeGeometry(.1,.55,4),M(0x5fbf4a),Math.cos(a)*.25,.27,Math.sin(a)*.25,{r:[Math.sin(a)*.3,0,Math.cos(a)*.3],ns:1})}mk(g,new THREE.SphereGeometry(.09,6,5),M(PLN[herbPlanet(p)].c,{emissive:PLN[herbPlanet(p)].c,emissiveIntensity:.7}),0,.5,0,{ns:1})}
 world.add(g);return g}
function hidePick(id){if(pickMeshes[id])pickMeshes[id].visible=false}

/* ---- monsters ---- */
const EYE=(c)=>new THREE.MeshBasicMaterial({color:c});
function eyes(g,y,z,dx,c,r){[-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(r||.04,6,5),EYE(c||0xffe040));e.position.set(s*dx,y,z);e.userData.keep=1;g.add(e)})}
function humanoid(o){const g=new THREE.Group(),w=o.w||1,sk=M(o.skin),cl=M(o.cloth),dk=M(o.dark||0x2a2018);
 [-1,1].forEach(s=>mk(g,cylG(.13*w,.15*w,.8,6),dk,s*.17*w,0,0));mk(g,new THREE.BoxGeometry(.58*w,.75,.34*w),cl,0,1.15,0);
 [-1,1].forEach(s=>{const a=mk(g,cylG(.09*w,.1*w,.72,6),o.fur?cl:sk,s*.4*w,1.45,0,{r:[0,0,s*.35]});a.geometry.translate(0,-.36,0);(g.userData.arms=g.userData.arms||[]).push(a);mk(g,new THREE.BoxGeometry(.2*w,.12,.3*w),dk,s*.17*w,.06,.05);});mk(g,new THREE.BoxGeometry(.6*w,.09,.36*w),M(0x4a3020),0,.82,0);
 mk(g,new THREE.SphereGeometry(.23,10,8),sk,0,1.78,0);eyes(g,1.82,.19,.09,o.eye||0xffe040);
 if(o.ears)[-1,1].forEach(s=>mk(g,new THREE.ConeGeometry(.08,.35,4),sk,s*.28,1.85,0,{r:[0,0,-s*1.4]}));
 if(o.tusks)[-1,1].forEach(s=>mk(g,new THREE.ConeGeometry(.04,.14,4),M(0xf0ead0),s*.07,1.7,.2,{r:[Math.PI,0,0],ns:1}));
 if(o.hood)mk(g,new THREE.ConeGeometry(.3,.55,8),cl,0,1.95,-.03);
 if(o.helmet)mk(g,new THREE.SphereGeometry(.25,8,6,0,6.3,0,1.5),M(0x9a9aa8,{metalness:.5,roughness:.4}),0,1.82,0);
 if(o.beard)mk(g,new THREE.ConeGeometry(.2,.5,6),M(0x8a5a2a),0,1.55,.12,{r:[Math.PI,0,0]});
 if(o.crown)for(let i=0;i<5;i++){const a=i/5*6.28;mk(g,new THREE.ConeGeometry(.05,.2,4),M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.6}),Math.cos(a)*.18,2.07,Math.sin(a)*.18,{ns:1})}
 if(o.hair)mk(g,new THREE.SphereGeometry(.25,8,6,0,6.3,0,1.2),M(o.hair),0,1.82,-.02);
 if(o.glow){cl.emissive=new THREE.Color(0x40ffb0);cl.emissiveIntensity=.35}
 if(o.wrap)for(let i=0;i<4;i++)mk(g,new THREE.TorusGeometry(.3*w,.025,4,10),M(0xbfb690),0,.9+i*.22,0,{r:[Math.PI/2,0,0],ns:1});
 if(o.tail)mk(g,coneG(.15,1,5),sk,0,.5,-.3,{r:[-1.2,0,0]});
 const wp=o.weapon;if(wp==="sword"){mk(g,new THREE.BoxGeometry(.07,1,.03),M(0xd0d4dc,{metalness:.7,roughness:.3}),.5*w,1.2,.25,{r:[.6,0,0]});mk(g,new THREE.BoxGeometry(.3,.05,.06),M(0x6a4a2a),.5*w,.78,.4)}
 else if(wp==="axe"){mk(g,new THREE.CylinderGeometry(.04,.04,1.2,5),M(0x6a4a2a),.5*w,1.2,.2,{r:[.4,0,0]});mk(g,new THREE.BoxGeometry(.5,.35,.06),M(0x9a9aa8,{metalness:.6}),.5*w,1.65,.4)}
 else if(wp==="club")mk(g,new THREE.CylinderGeometry(.06,.16,1.2,6),M(0x6a4a2a),.52*w,1.2,.25,{r:[.5,0,0]});
 else if(wp==="dagger")mk(g,new THREE.BoxGeometry(.05,.5,.03),M(0xd0d4dc,{metalness:.7}),.45*w,1.15,.3,{r:[.8,0,0]});
 else if(wp==="staff"){mk(g,new THREE.CylinderGeometry(.04,.05,2.1,5),M(0x5a3a22),.5,1.05,.15);const o2=mk(g,new THREE.SphereGeometry(.14,10,8),M(0xb070ff,{emissive:0x8a40ff,emissiveIntensity:1.3}),.5,2.2,.15,{ns:1})}
 if(o.shield)mk(g,new THREE.CylinderGeometry(.35,.35,.06,10),M(0xb0b0c0,{metalness:.5}),-.5,1.2,.25,{r:[Math.PI/2,0,0]});
 g.scale.setScalar(o.s||1);return g}
function wolf(c){const g=new THREE.Group(),m=M(c);mk(g,new THREE.SphereGeometry(.5,10,8),m,0,.75,0,{s:[.7,.7,1.4]});mk(g,new THREE.SphereGeometry(.28,10,8),m,0,.95,.8);mk(g,new THREE.ConeGeometry(.14,.4,5),m,0,.88,1.1,{r:[Math.PI/2,0,0]});
 [-1,1].forEach(s=>{mk(g,new THREE.ConeGeometry(.08,.22,4),m,s*.14,1.2,.72);[.4,-.4].forEach(z=>mk(g,cylG(.07,.09,.6,5),m,s*.22,0,z))});mk(g,coneG(.1,.7,5),m,0,.8,-.9,{r:[-1.9,0,0]});eyes(g,1.02,1.02,.1,0xff4020,.035);g.scale.setScalar(1.3);return g}
function wraith(c){const g=new THREE.Group(),m=M(c,{transparent:true,opacity:.7,emissive:c,emissiveIntensity:.3,roughness:.5});mk(g,coneG(.75,2.1,9),m,0,0,0,{ns:1});for(let i=0;i<5;i++){const a=i/5*6.28;mk(g,coneG(.22,.8,4),m,Math.cos(a)*.55,-.25,Math.sin(a)*.55,{r:[0,0,Math.PI],ns:1})}
 mk(g,new THREE.SphereGeometry(.28,10,8),M(0x101820),0,2.0,0.05,{ns:1});eyes(g,2.02,.25,.1,0x80e0ff,.06);[-1,1].forEach(s=>mk(g,coneG(.1,.9,5),m,s*.55,1.6,.2,{r:[1.2,0,s*.7],ns:1}));g.position.y=.4;g.userData.float=1;return g}
function imp(c){const g=new THREE.Group(),m=M(c);mk(g,new THREE.SphereGeometry(.3,8,6),m,0,.8,0,{s:[1,1.2,1]});mk(g,new THREE.SphereGeometry(.2,8,6),m,0,1.25,0);eyes(g,1.28,.16,.07,0xffe040,.04);[-1,1].forEach(s=>{mk(g,new THREE.ConeGeometry(.05,.25,4),M(0x2a1a1a),s*.1,1.5,0);mk(g,new THREE.ConeGeometry(.35,.6,3),M(0x5a2a3a),s*.35,.95,-.15,{r:[0,0,s*-.9],ns:1})});mk(g,coneG(.05,.6,4),m,0,.6,-.25,{r:[-1,0,0]});g.userData.float=1;g.scale.setScalar(1.1);return g}
function demon(c,drake){const g=new THREE.Group(),m=M(c,{emissive:c,emissiveIntensity:.18}),dk=M(0x2a1410);mk(g,cylG(.55,.4,1.2,8),m,0,.9,0);mk(g,new THREE.SphereGeometry(.45,10,8),m,0,2.35,drake?.4:0,{s:drake?[.8,.8,1.3]:[1,1,1]});eyes(g,2.4,drake?.9:.38,.18,0xffe040,.07);
 [-1,1].forEach(s=>{mk(g,coneG(.1,.7,5),dk,s*.3,2.7,0,{r:[-.3,0,-s*.5]});mk(g,cylG(.16,.2,1.1,6),m,s*.75,1.5,0,{r:[0,0,s*.7]});mk(g,new THREE.ConeGeometry(1.2,1.8,3),M(0x3a1a18,{side:THREE.DoubleSide}),s*1.2,2.2,-.5,{r:[0,0,s*-1.2],ns:1});mk(g,cylG(.18,.22,.9,6),dk,s*.25,0,0)});
 mk(g,coneG(.2,1.5,5),m,0,.7,-.5,{r:[-1.7,0,0]});g.scale.setScalar(drake?1.9:1.6);return g}
function hydra(c){const g=new THREE.Group(),m=M(c,{roughness:.6});mk(g,new THREE.SphereGeometry(1,12,10),m,0,.8,0,{s:[1.4,.8,1.5]});g.userData.necks=[];
 for(let k=0;k<4;k++){const n=new THREE.Group();n.position.set((k-1.5)*.55,1.2,.6);for(let i=0;i<5;i++)mk(n,new THREE.SphereGeometry(.2-.01*i,8,6),m,0,.35*i+.1,.12*i*i*.4);const h=new THREE.Group();h.position.set(0,1.85,.75);mk(h,new THREE.SphereGeometry(.25,8,6),m,0,0,0,{s:[1,.8,1.4]});eyes(h,.08,.2,.1,0xffe040,.045);mk(h,new THREE.ConeGeometry(.04,.15,4),M(0xf0ead0),.08,-.15,.25,{r:[Math.PI,0,0],ns:1});n.add(h);g.add(n);g.userData.necks.push(n)}return g}
function scorpion(c){const g=new THREE.Group(),m=M(c);mk(g,new THREE.SphereGeometry(.6,10,8),m,0,.6,0,{s:[1,.55,1.3]});mk(g,new THREE.SphereGeometry(.3,8,6),m,0,.6,.9);eyes(g,.78,1.1,.1,0xff3020,.045);
 for(let i=0;i<5;i++)mk(g,new THREE.SphereGeometry(.22-i*.02,8,6),m,0,.7+i*.28-i*i*.015,-.9-i*.15+i*i*.06);mk(g,coneG(.07,.35,4),M(0x3a1a10),0,1.8,-.85,{r:[1.4,0,0]});
 [-1,1].forEach(s=>{mk(g,new THREE.BoxGeometry(.5,.18,.7),m,s*.65,.55,1.05,{r:[0,s*.4,0]});for(let k=0;k<3;k++)mk(g,cylG(.04,.04,.7,4),m,s*.5,.2,.4-k*.45,{r:[0,0,s*-1.1]})});g.scale.setScalar(1.3);return g}
function beholder(c){const g=new THREE.Group(),m=M(c,{flatShading:false,roughness:.5});mk(g,new THREE.SphereGeometry(1.1,16,12),m,0,1.6,0);const e=mk(g,new THREE.SphereGeometry(.5,12,10),M(0xf4f0e0,{flatShading:false}),0,1.7,.75,{ns:1});mk(g,new THREE.SphereGeometry(.28,10,8),new THREE.MeshBasicMaterial({color:0x40ff80}),0,1.7,1.15).userData.keep=1;mk(g,new THREE.SphereGeometry(.14,8,6),new THREE.MeshBasicMaterial({color:0x000000}),0,1.7,1.35).userData.keep=1;
 g.userData.stalks=[];for(let i=0;i<7;i++){const a=(i/7)*Math.PI-.1,s=new THREE.Group();s.position.set(Math.cos(a+Math.PI/2)*.7,2.2+Math.sin(a)*.2,.2);mk(s,cylG(.07,.09,.9,5),m,0,0,0);const ey=mk(s,new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xff4060}),0,.95,0,{ns:1});ey.userData.keep=1;s.rotation.z=(i-3)*.38;g.add(s);g.userData.stalks.push(s)}
 for(let i=0;i<10;i++){const a=i/10*3.14+3.14;mk(g,new THREE.ConeGeometry(.05,.2,4),M(0xf0ead0),Math.cos(a)*.45,.9+Math.sin(a)*.12,.85,{r:[Math.PI,0,0],ns:1})}g.userData.float=1;return g}
const HUM=[[/Goblin/,{s:.85,skin:0x6b9a3a,cloth:0x5a4228,ears:1,weapon:"dagger"}],[/Orc/,{s:1.2,w:1.35,skin:0x4f7a3a,cloth:0x4a3a30,tusks:1,weapon:"axe"}],[/Nymph/,{w:.8,skin:0x9fe0cf,cloth:0x3f9a6a,glow:1,hair:0x3f7a3a,eye:0x80ffd0}],
 [/Magician/,{skin:0xd8b8a0,cloth:0x4a2a6a,hood:1,weapon:"staff"}],[/Yeti/,{s:1.8,w:1.5,skin:0xe8eef2,cloth:0xdde6ec,fur:1,eye:0x40a0ff}],[/Dwarf|Gorrum/,{s:.85,w:1.4,skin:0xd8a880,cloth:0x6a4a2a,beard:1,helmet:1,weapon:"axe"}],
 [/Giant/,{s:2.6,w:1.5,skin:0xc09070,cloth:0x6a5a40,weapon:"club"}],[/Lizard/,{skin:0x5a8a4a,cloth:0x3a5a3a,tail:1,weapon:"dagger",eye:0xff6020}],[/Bandit/,{skin:0xd8b090,cloth:0x4a4036,hood:1,weapon:"dagger"}],
 [/Mummy|King/,{skin:0xd8d0b0,cloth:0xd8d0b0,wrap:1,crown:1,eye:0x60ff90}],[/Paladin/,{skin:0xd8b8a0,cloth:0xb0b0c0,helmet:1,weapon:"sword",shield:1}]];
function makeFoe(name,col,boss){const c=new THREE.Color(col).getHex();let g;
 if(/Archon|Bael/.test(name))g=demon(c,false);else if(/Homunculus|Lemure/.test(name))g=imp(c);else if(/Wolf/.test(name))g=wolf(c);else if(/Wraith|Shade|Shadow/.test(name))g=wraith(c);else if(/Hydra/.test(name))g=hydra(c);else if(/Scorpion/.test(name))g=scorpion(c);else if(/Beholder/.test(name))g=beholder(c);else if(/Imp/.test(name))g=imp(c);else if(/Demon|Drake/.test(name))g=demon(c,/Drake/.test(name));
 else{const h=HUM.find(x=>x[0].test(name));g=humanoid(h?h[1]:{skin:0xd8b8a0,cloth:c,weapon:"sword"})}
 if(boss){g.scale.multiplyScalar(1.35)}
 g.userData.mats=[];g.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&!o.userData.keep){o.material=o.material.clone();g.userData.mats.push(o.material)}});return g}
/* ---- atmosphere ---- */
const ATM={forest:{sk:[0x4f8fd8,0xbfe0ff],fog:0xa9c9a0,n:25,f:110,hm:[0xcfe8ff,0x4a6a34],sun:0xfff0d0,si:1.15,pt:"leaf"},tundra:{sk:[0x7fa6d0,0xe6f0f8],fog:0xdce8f0,n:18,f:85,hm:[0xe0f0ff,0x9aa8b8],sun:0xeaf2ff,si:.95,pt:"snow"},
 mountain:{sk:[0x5a7090,0xc0c8d0],fog:0xa4aab2,n:25,f:100,hm:[0xc8d0e0,0x6a6458],sun:0xfff4e0,si:1.05,pt:"none"},swamp:{sk:[0x4a6a5a,0x9ab08a],fog:0x6f8060,n:10,f:58,hm:[0xa8c0a0,0x3a4a2a],sun:0xd8e8b0,si:.65,pt:"fly"},
 desert:{sk:[0x3a82d0,0xf6d9a0],fog:0xe8cc94,n:28,f:115,hm:[0xfff0c8,0xb89a60],sun:0xffe4b0,si:1.4,pt:"dust"},hills:{sk:[0x5a98e0,0xc6e4ff],fog:0xb9d3a2,n:30,f:120,hm:[0xd8ecff,0x5a7a3a],sun:0xfff6dc,si:1.2,pt:"leaf"}};
const cur={top:new THREE.Color(),hor:new THREE.Color(),fog:new THREE.Color(),h1:new THREE.Color(),h2:new THREE.Color(),sun:new THREE.Color(),n:25,f:110,si:1.1},tgt={key:"forest"};
function setAtmos(b,now){tgt.key=b;if(now)lerpAtm(1)}
function lerpAtm(k){const a=ATM[tgt.key];cur.top.lerp(_c.set(a.sk[0]),k);cur.hor.lerp(_c.set(a.sk[1]),k);cur.fog.lerp(_c.set(a.fog),k);cur.h1.lerp(_c.set(a.hm[0]),k);cur.h2.lerp(_c.set(a.hm[1]),k);cur.sun.lerp(_c.set(a.sun),k);cur.n+=(a.n-cur.n)*k;cur.f+=(a.f-cur.f)*k;cur.si+=(a.si-cur.si)*k}
let pMode="";const PN=450;
function setParticles(mode){if(mode===pMode)return;pMode=mode;partsM.visible=mode!=="none"&&qual>0;const m=partsM.material;
 const cfg={snow:[0xffffff,.1,THREE.NormalBlending],leaf:[0xd6e08a,.09,THREE.NormalBlending],dust:[0xe0c080,.08,THREE.NormalBlending],fly:[0xd8ff6a,.16,THREE.AdditiveBlending],none:[0xffffff,.1,THREE.NormalBlending]}[mode];m.color.setHex(cfg[0]);m.size=cfg[1];m.blending=cfg[2];m.needsUpdate=true}
/* ---- init ---- */
function initGL(){if(glReady)return;const view=$("view");
 try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"})}catch(e){view.textContent="Your browser could not start 3D graphics (WebGL).";return}
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;renderer.domElement.className="gl";view.appendChild(renderer.domElement);scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(72,1,.1,320);scene.add(camera);
 world=new THREE.Group();scene.add(world);
 hemi=new THREE.HemisphereLight(0xcfe8ff,0x4a6a34,.95);scene.add(hemi);sunL=new THREE.DirectionalLight(0xfff0d8,1.1);sunL.castShadow=true;sunL.shadow.mapSize.set(1024,1024);const sc=sunL.shadow.camera;sc.left=-34;sc.right=34;sc.top=34;sc.bottom=-34;sc.near=1;sc.far=140;sunL.shadow.bias=-.0006;scene.add(sunL,sunL.target);
 skyM=new THREE.Mesh(new THREE.SphereGeometry(300,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color()},hor:{value:new THREE.Color()}},vertexShader:"varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform vec3 top;uniform vec3 hor;varying vec3 vP;void main(){float h=clamp(normalize(vP).y*1.5,0.,1.);gl_FragColor=vec4(mix(hor,top,pow(h,.7)),1.);}"}));skyM.renderOrder=-2;scene.add(skyM);
 sunM=new THREE.Group();const sd=new THREE.Mesh(new THREE.SphereGeometry(10,16,12),new THREE.MeshBasicMaterial({color:0xfff4c0,fog:false}));sunM.add(sd);const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex(255,230,160),transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));gl.scale.set(110,110,1);sunM.add(gl);scene.add(sunM);
 cloudG=new THREE.Group();const ct=radTex(255,255,255);for(let i=0;i<16;i++){const c=new THREE.Mesh(new THREE.PlaneGeometry(60+hs(i,1)*70,26+hs(i,2)*20),new THREE.MeshBasicMaterial({map:ct,transparent:true,opacity:.55,depthWrite:false,fog:false}));c.rotation.x=Math.PI/2;c.position.set((hs(i,3)-.5)*500,80+hs(i,4)*40,(hs(i,5)-.5)*500);cloudG.add(c)}scene.add(cloudG);
 baseM=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshBasicMaterial({color:0xa9c9a0}));baseM.rotation.x=-Math.PI/2;baseM.position.y=-2.6;scene.add(baseM);
 const wg=new THREE.PlaneGeometry(W*TW,H*TW,36,28);wg.rotateX(-Math.PI/2);wg.translate(W*TW/2,0,H*TW/2);waterM=new THREE.Mesh(wg,new THREE.MeshStandardMaterial({color:0x8fc0d0,map:waterTex(),transparent:true,opacity:.82,roughness:.12,metalness:.25,flatShading:true}));waterM.position.y=-.45;waterM.receiveShadow=true;world.add(waterM);
 const pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3);for(let i=0;i<PN*3;i++)pp[i]=(Math.random()-.5)*48;pg.setAttribute("position",new THREE.BufferAttribute(pp,3));partsM=new THREE.Points(pg,new THREE.PointsMaterial({size:.1,transparent:true,opacity:.85,depthWrite:false,sizeAttenuation:true}));partsM.frustumCulled=false;scene.add(partsM);
 buildTerrain();buildFoliage();POIS.forEach(p=>{poiMeshes[p.id]=buildPoi(p)});NPCS.forEach(n=>{npcMeshes[n.id]=buildNpc(n)});PICK.forEach(p=>{pickMeshes[p.id]=buildPickup(p);if(got[p.id])pickMeshes[p.id].visible=false});
 entL=new THREE.PointLight(0xff6a30,0,14);scene.add(entL);worldFog=new THREE.Fog(0xa9c9a0,25,110);dungFog=new THREE.Fog(0x050403,3,27);scene.fog=worldFog;
 buildVm();initSky2();initOrrery();initPost();initOcc();initFauna();initMist();renderer.autoClear=false;setAtmos(biome[hy][hx],true);setQuality(/Mobi|Android|iPhone|iPad/.test(navigator.userAgent)?1:2);
 new ResizeObserver(resize).observe(view);resize();glReady=true;bindInput();requestAnimationFrame(frame)}
let entL=null,worldFog=null,dungFog=null;
function setQuality(q){qual=q;renderer.setPixelRatio(Math.min(devicePixelRatio||1,q>=3?2.5:q===2?2:q===1?1.25:1));sunL.castShadow=q>=2;renderer.shadowMap.enabled=q>=2;{const ms=q>=3?2048:1024;if(sunL.shadow.mapSize.x!==ms){sunL.shadow.mapSize.set(ms,ms);if(sunL.shadow.map){sunL.shadow.map.dispose();sunL.shadow.map=null}}}renderer.shadowMap.type=THREE.PCFSoftShadowMap;setPost(q>=1);world.traverse(o=>{if(o.material)o.material.needsUpdate=true});if(partsM)partsM.visible=pMode!=="none"&&q>0;resize();const b=$("gfx");if(b)b.textContent="Graphics: "+["Low","Medium","High","Ultra"][q]}
function resize(){const v=$("view");if(!renderer||!v.clientWidth)return;renderer.setSize(v.clientWidth,v.clientHeight,false);camera.aspect=v.clientWidth/v.clientHeight;camera.updateProjectionMatrix();if(typeof POST!=="undefined"&&POST.ok)postSize()}

let curSpell="";
/* ================= PHASE 6: polish systems ================= */
const WIND={value:0},winMats=[];let todDay=1,vmScene,vmCam,vmG,vmKey="",vmSwing=-1,vmCast=0,foeL,lantern,moonL,starsM,moonM,fauna={},dmgList=[];
const DAYLEN=420,NIGHT={top:new THREE.Color(0x070a1e),hor:new THREE.Color(0x1d2540),fog:new THREE.Color(0x141a30)},_t1=new THREE.Color(),_t2=new THREE.Color(),_t3=new THREE.Color();
function windify(mat,amt){mat.onBeforeCompile=s=>{s.uniforms.uTime=WIND;s.vertexShader=s.vertexShader.replace("#include <common>","#include <common>\nuniform float uTime;").replace("#include <begin_vertex>","#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat sw=sin(uTime*1.7+instanceMatrix[3].x*.45+instanceMatrix[3].z*.6);transformed.x+=sw*max(position.y,0.)*"+amt.toFixed(3)+";transformed.z+=cos(uTime*1.3+instanceMatrix[3].z*.5)*max(position.y,0.)*"+(amt*.6).toFixed(3)+";\n#endif")}}
function gradGeo(geo,lo,hi,jit){const p=geo.attributes.position,col=new Float32Array(p.count*3);let mn=1e9,mx2=-1e9;for(let i=0;i<p.count;i++){mn=Math.min(mn,p.getY(i));mx2=Math.max(mx2,p.getY(i))}
 const a=new THREE.Color(lo),b=new THREE.Color(hi);for(let i=0;i<p.count;i++){const k=(p.getY(i)-mn)/(mx2-mn||1),n=jit?(vn(p.getX(i)*3,p.getZ(i)*3+p.getY(i))-.5)*jit:0;_c.copy(a).lerp(b,Math.max(0,Math.min(1,k+n)));col[i*3]=_c.r;col[i*3+1]=_c.g;col[i*3+2]=_c.b}
 geo.setAttribute("color",new THREE.BufferAttribute(col,3));return geo}
function lumpy(geo,amt,seed){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+(vn(x*2.1+seed,z*2.1+y*1.7+seed*2)-.5)*amt;p.setXYZ(i,x*k,y*k,z*k)}geo.computeVertexNormals();return geo}
function peakGeo(seed,snow){const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position,col=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=vn(x*2.2+seed*7,z*2.2+y*1.8+seed*3),yy=Math.max(0,(y+.3)/1.3),tap=1-yy*.9,r=1+(n-.5)*.5;
  const X=x*r*tap*2.7,Z=z*r*tap*2.7,Y=Math.max(0,(y+.3))*6.2*(1+(n-.5)*.3);p.setXYZ(i,X,Y,Z);
  const sn=snow&&Y>4+n*1.6,v=.78+n*.3;if(sn){col[i*3]=.95;col[i*3+1]=.97;col[i*3+2]=1}else{col[i*3]=.52*v;col[i*3+1]=.49*v;col[i*3+2]=.45*v}}
 g.setAttribute("color",new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g}
/* ---- particles, projectiles, damage numbers ---- */
const vfx={pool:[],act:[],pr:[],tex:null,
 get(add){let s=this.pool.pop();if(!s){s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.tex||(this.tex=radTex(255,255,255)),transparent:true,depthWrite:false}))}s.material.blending=add?THREE.AdditiveBlending:THREE.NormalBlending;scene.add(s);return s},
 spawn(pos,col,size,vel,life,o){o=o||{};const s=this.get(!o.smoke);s.material.color.setHex(col);s.position.copy(pos);s.scale.setScalar(size);s.material.opacity=1;this.act.push({s,v:vel.clone(),life,max:life,size,g:o.g||0,grow:o.grow||0,smoke:!!o.smoke})},
 burst(pos,col,n,speed,size,life,g){for(let i=0;i<n;i++){const v=new THREE.Vector3(Math.random()-.5,Math.random()-.2,Math.random()-.5).normalize().multiplyScalar(speed*(.4+Math.random()*.8));this.spawn(pos,col,size*(.6+Math.random()*.7),v,life*(.6+Math.random()*.6),{g:g||0})}},
 smoke(pos){this.spawn(pos,0x9a9a9a,.7,new THREE.Vector3((Math.random()-.3)*.5,1.1,(Math.random()-.5)*.4),2.6,{smoke:1,grow:1.4})},
 proj(from,to,col,dur,size,cb){this.pr.push({a:from.clone(),b:to.clone(),t:0,dur,col,size,cb,s:this.get(true)});this.pr[this.pr.length-1].s.material.color.setHex(col)},
 update(dt){for(let i=this.act.length-1;i>=0;i--){const p=this.act[i];p.life-=dt;if(p.life<=0){scene.remove(p.s);this.pool.push(p.s);this.act.splice(i,1);continue}p.v.y-=p.g*dt;p.s.position.addScaledVector(p.v,dt);const k=p.life/p.max;p.s.material.opacity=p.smoke?k*.35:k;p.s.scale.setScalar(p.size*(p.smoke?1+(1-k)*p.grow:.4+k*.6))}
  for(let i=this.pr.length-1;i>=0;i--){const q=this.pr[i];q.t+=dt;const k=Math.min(1,q.t/q.dur);q.s.position.lerpVectors(q.a,q.b,k);q.s.position.y+=Math.sin(k*Math.PI)*.5;q.s.scale.setScalar(q.size);this.spawn(q.s.position,q.col,q.size*.7,new THREE.Vector3((Math.random()-.5)*.4,(Math.random()-.5)*.4,(Math.random()-.5)*.4),.3);
   if(k>=1){scene.remove(q.s);this.pool.push(q.s);this.pr.splice(i,1);q.cb&&q.cb()}}}};
function dmgNum(text,color,pos,big){const e=document.createElement("div");e.className="dn";e.textContent=text;e.style.color=color;if(big)e.style.fontSize="2rem";$("view").appendChild(e);dmgList.push({e,p:pos.clone(),t:0,dx:(Math.random()-.5)*30})}
function updDmg(dt){const v=$("view"),w=v.clientWidth,h=v.clientHeight;for(let i=dmgList.length-1;i>=0;i--){const d=dmgList[i];d.t+=dt;if(d.t>1.3){d.e.remove();dmgList.splice(i,1);continue}_p.copy(d.p).project(camera);d.e.style.left=((_p.x*.5+.5)*w+d.dx)+"px";d.e.style.top=((-_p.y*.5+.5)*h-d.t*50)+"px";d.e.style.opacity=Math.min(1,(1.3-d.t)*2)}}
/* ---- first-person hands and weapon ---- */
function buildVm(){vmScene=new THREE.Scene();vmCam=new THREE.PerspectiveCamera(62,1,.02,10);vmScene.add(new THREE.HemisphereLight(0xffffff,0x6a5a48,1.0));const dl=new THREE.DirectionalLight(0xfff0d8,1.1);dl.position.set(1,2,1.5);vmScene.add(dl);vmG=new THREE.Group();vmScene.add(vmG)}
function vmRebuild(){while(vmG.children.length)vmG.remove(vmG.children[0]);const w=hero.eq.w||"",skin=M(0xe0b890,{flatShading:false}),sl=M(new THREE.Color(JOBS_CLS[hero.cls]||0x6a5a4a).getHex(),{flatShading:false}),R=new THREE.Group(),Lh=new THREE.Group();
 const mt=(c,o)=>M(c,Object.assign({metalness:.55,roughness:.35,flatShading:false,emissive:0x1a1e24},o||{}));
 R.position.set(.36,-.36,-.62);Lh.position.set(-.36,-.36,-.62);
 const hand=(g)=>{mk(g,new THREE.SphereGeometry(.075,10,8),skin,0,0,0,{ns:1});const a=mk(g,new THREE.CylinderGeometry(.065,.08,.5,8),sl,0,-.02,.28,{r:[Math.PI/2+.25,0,0],ns:1})};
 hand(R);const wg=new THREE.Group();wg.rotation.x=-.25;R.add(wg);R.userData.w=wg;
 const blade=(len,c,em)=>{mk(wg,new THREE.BoxGeometry(.045,len,.012),mt(c,em?{emissive:em,emissiveIntensity:.9}:{}),0,.12+len/2,0,{ns:1});mk(wg,new THREE.BoxGeometry(.2,.03,.04),mt(0x8a6a2a),0,.1,0,{ns:1});mk(wg,new THREE.CylinderGeometry(.018,.02,.16,6),M(0x4a2a18),0,.02,0,{ns:1});mk(wg,new THREE.SphereGeometry(.03,6,5),mt(0xc0a040),0,-.07,0,{ns:1})};
 if(/Dagger|knife/i.test(w))blade(.32,0xd4d8e0);else if(/Flamebrand/.test(w))blade(.7,0xe8d0b0,0xff6a10);else if(/Frostfang/.test(w))blade(.72,0xbfe6ff,0x40a0ff);else if(/Sunblade/.test(w))blade(.78,0xfff0b0,0xffc040);else if(/Blazing Star/.test(w))blade(.8,0xffffff,0xfff080);else if(/Compass/.test(w))blade(.7,0xd8e4ff,0x6090ff);else if(/Plumb|Square/.test(w))blade(.68,0xe0e0f0,0x90a0c0);else if(/sword/i.test(w))blade(.66,0xd4d8e0);
 else if(/Mace|hammer/i.test(w)){mk(wg,new THREE.CylinderGeometry(.02,.025,.5,6),M(0x5a3a22),0,.2,0,{ns:1});mk(wg,/hammer/i.test(w)?new THREE.BoxGeometry(.16,.1,.1):new THREE.SphereGeometry(.07,8,6),mt(0x9a9aa8),0,.5,0,{ns:1});if(!/hammer/i.test(w))for(let i=0;i<6;i++){const a=i/6*6.28;mk(wg,new THREE.ConeGeometry(.02,.05,4),mt(0x9a9aa8),Math.cos(a)*.07,.5,Math.sin(a)*.07,{r:[Math.sin(a)*1.4,0,-Math.cos(a)*1.4],ns:1})}}
 else if(/staff/i.test(w)){mk(wg,new THREE.CylinderGeometry(.018,.025,1.3,6),M(0x5a3a22),0,.45,0,{ns:1});mk(wg,new THREE.SphereGeometry(.07,10,8),M(0xb070ff,{emissive:0x8a40ff,emissiveIntensity:1.6,flatShading:false}),0,1.12,0,{ns:1})}
 else if(/wand/i.test(w)){mk(wg,new THREE.CylinderGeometry(.012,.02,.34,6),M(0x4a2a18),0,.15,0,{ns:1});mk(wg,new THREE.SphereGeometry(.03,8,6),M(0xff8a30,{emissive:0xff6010,emissiveIntensity:1.8}),0,.34,0,{ns:1})}
 else if(/bow/i.test(w)){const b=mk(wg,new THREE.TorusGeometry(.38,.017,6,20,Math.PI),M(0x6a4a2a),0,.2,0,{r:[0,0,Math.PI/2],ns:1});mk(wg,new THREE.BoxGeometry(.004,.76,.004),M(0xe8e0c0),-.0,.2,0,{ns:1})}
 vmG.add(R);R.userData.k=0;hero._vmR=R;
 if(hero.eq.s){const sh=new THREE.Group();sh.position.set(-.38,-.3,-.58);mk(sh,new THREE.CylinderGeometry(.27,.27,.04,16),mt(0x8a8a98),0,0,0,{r:[Math.PI/2,.3,0],ns:1});mk(sh,new THREE.SphereGeometry(.06,8,6),mt(0xc0a040),0,0,.03,{ns:1});vmG.add(sh);hero._vmS=sh}
 else{hand(Lh);vmG.add(Lh)}hero._vmL=Lh;vmKey=(hero.eq.w||"")+"|"+(hero.eq.s||"")+"|"+hero.cls}
const JOBS_CLS={Fighter:0x7a2a2a,Paladin:0xb0b0c0,Cleric:0xe0d8c0,Rogue:0x2a2a30,Magician:0x4a2a7a,Ranger:0x3a5a2a};
function vmUpdate(dt){if(!vmG||!hero)return;if(vmKey!==(hero.eq.w||"")+"|"+(hero.eq.s||"")+"|"+hero.cls)vmRebuild();const ax=Math.max(.45,Math.min(1,camera.aspect/1.3)),R=hero._vmR,Lh=hero._vmL,mv=Math.abs(joy.x)+Math.abs(joy.y)+(keys.w||keys.s||keys.a||keys.d||keys.ArrowUp||keys.ArrowDown?1:0);
 const sway=Math.sin(bob*.5)*(mv?.012:.003),idle=Math.sin(clock*1.4)*.004;vmG.position.set(Math.cos(bob*.25)*(mv?.01:0),sway+idle,0);
 let sx=0,sy=0,sz=0,rx=0,rz=0;if(vmSwing>=0){vmSwing+=dt;const p=Math.min(1,vmSwing/.2),s=Math.sin(p*Math.PI);rx=-.5*s-.2*Math.sin(p*3);rz=(.7-p*1.7);sz=-.22*s;sx=-.08*s;if(p>=1)vmSwing=-1}
 R.position.set(.36*ax+sx,-.36+sy,-.62+sz);R.rotation.set(rx,0,vmSwing>=0?rz:0);
 if(vmCast>0){vmCast-=dt;const k=Math.sin(Math.min(1,(.6-vmCast)/.6)*Math.PI);Lh.position.set(-.3*ax,-.3+k*.14,-.62-k*.1);Lh.rotation.x=k*.5;}else{Lh.position.set(-.36*ax,-.36,-.62);Lh.rotation.x=0}
 if(hero._vmS)hero._vmS.position.x=-.38*ax;vmG.visible=!D&&!packOpen;
 vmScene.children.forEach(o=>{if(o.isHemisphereLight)o.intensity=.35+.65*todDay;if(o.isDirectionalLight)o.intensity=.25+.85*todDay})}
const vfx_vm=[];
/* ---- time of day ---- */
function updateTOD(){const ph=(clock/DAYLEN+.1)%1,sh=Math.sin(ph*6.2832),day=Math.max(0,Math.min(1,sh*1.8+.25)),dusk=Math.exp(-Math.pow(sh*3.4,2));todDay=day;
 _t1.copy(NIGHT.top).lerp(cur.top,day);_t2.copy(NIGHT.hor).lerp(cur.hor,day);_t3.set(0xff7a3a);_t2.lerp(_t3,dusk*.5);
 skyM.material.uniforms.top.value.copy(_t1);skyM.material.uniforms.hor.value.copy(_t2);
 worldFog.color.copy(NIGHT.fog).lerp(cur.fog,day).lerp(_t3,dusk*.3);baseM.material.color.copy(worldFog.color);const nf=.7+.3*day;worldFog.near=cur.n*nf;worldFog.far=cur.f*nf;
 hemi.intensity=.16+.8*day;hemi.color.copy(cur.h1).lerp(NIGHT.hor,1-day);hemi.groundColor.copy(cur.h2).multiplyScalar(.3+.7*day);
 sunL.color.copy(cur.sun).lerp(_t3,dusk*.6);sunL.intensity=cur.si*day;moonL.intensity=.4*(1-day);
 const sd=_p.set(Math.cos(ph*6.2832)*.85,sh,.4).normalize();SUN.copy(sd);sunM.visible=sh>-.08;starsM.material.opacity=(1-day)*.95;nightTick(day,camera.position);moonM.visible=day<.7;lantern.intensity=.15+(1-day)*1.1;
 const nightK=1-day;winMats.forEach(m=>{m.emissiveIntensity=.15+nightK*1.6});return day}
const SUN=new THREE.Vector3(.5,.7,.35);
/* ---- fauna: birds and butterflies ---- */
function initFauna(){fauna.birds=[];fauna.bf=[];fauna.g=new THREE.Group();scene.add(fauna.g);
 for(let i=0;i<9;i++){const b=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0x3a3028,side:THREE.DoubleSide});const body=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,5),m);body.rotation.x=Math.PI/2;b.add(body);
  const wl=new THREE.Mesh(new THREE.PlaneGeometry(.6,.22),m),wr=wl.clone();wl.position.x=-.3;wr.position.x=.3;const pl=new THREE.Group(),pr=new THREE.Group();pl.add(wl);pr.add(wr);b.add(pl,pr);b.userData={pl,pr,m,a:i*.7,r:16+hs(i,1)*26,h:12+hs(i,2)*12,sp:.12+hs(i,3)*.1};fauna.g.add(b);fauna.birds.push(b)}
 for(let i=0;i<7;i++){const m=new THREE.MeshBasicMaterial({color:[0xffb040,0xff6a8a,0xfff070,0x80c0ff][i%4],side:THREE.DoubleSide}),b=new THREE.Group(),w1=new THREE.Mesh(new THREE.PlaneGeometry(.16,.12),m),w2=w1.clone();w1.position.x=-.08;w2.position.x=.08;b.add(w1,w2);b.userData={w1,w2,i};fauna.g.add(b);fauna.bf.push(b)}}
function updFauna(dt,cp,day){const bi=ATM[tgt.key],k=tgt.key,showB=day>.35&&k!=="tundra",showF=day>.5&&(k==="forest"||k==="hills");
 fauna.birds.forEach((b,i)=>{b.visible=showB;if(!showB)return;const u=b.userData;u.a+=dt*u.sp;const x=cp.x+Math.cos(u.a)*u.r,z=cp.z+Math.sin(u.a)*u.r;b.position.set(x,cp.y+u.h+Math.sin(clock*.6+i)*1.5,z);b.rotation.y=-u.a;const f=Math.sin(clock*(k==="desert"?4:9)+i)*.9;u.pl.rotation.z=f;u.pr.rotation.z=-f;
  b.scale.setScalar(k==="desert"||k==="mountain"?1.8:1);u.m.color.setHex(k==="swamp"?0x15151a:k==="desert"?0x2a2018:k==="mountain"?0x4a3a2a:0x5a4a38)});
 fauna.bf.forEach((b,i)=>{b.visible=showF;if(!showF)return;const x=cp.x+Math.sin(clock*.3+i*2)*9,z=cp.z+Math.cos(clock*.27+i*3)*9;b.position.set(x,hfn(x,z)+1.2+Math.sin(clock*.9+i)*.5,z);b.rotation.y=clock*.5+i;const f=Math.abs(Math.sin(clock*14+i));b.userData.w1.rotation.z=f*.9;b.userData.w2.rotation.z=-f*.9})}
/* ---- sky extras ---- */
function initSky2(){const sp=new Float32Array(700*3);for(let i=0;i<700;i++){const a=Math.random()*6.283,b=Math.acos(Math.random()*.95+.04),r=285;sp[i*3]=r*Math.sin(b)*Math.cos(a);sp[i*3+1]=r*Math.cos(b);sp[i*3+2]=r*Math.sin(b)*Math.sin(a)}
 const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.BufferAttribute(sp,3));starsM=new THREE.Points(sg,new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,color:0xffffff,transparent:true,opacity:0,depthWrite:false,fog:false}));starsM.frustumCulled=false;scene.add(starsM);
 moonM=new THREE.Group();moonM.add(new THREE.Mesh(new THREE.SphereGeometry(8,16,12),new THREE.MeshBasicMaterial({color:0xe8eeff,fog:false})));const mg=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex(190,210,255),transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));mg.scale.set(70,70,1);moonM.add(mg);scene.add(moonM);
 moonL=new THREE.DirectionalLight(0x8aa8ff,0);scene.add(moonL);lantern=new THREE.PointLight(0xffc880,.15,14);camera.add(lantern);lantern.position.set(.2,-.1,0);
 foeL=new THREE.PointLight(0xffffff,0,9);scene.add(foeL)}
function initMist(){const t=radTex(255,255,255);for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){const b=biome[y][x];if(!((b==="swamp"&&hs(x,y*3)<.55)||(b==="tundra"&&hs(x*2,y)<.12)||(b==="mountain"&&hs(x,y*2)<.1)))continue;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,color:b==="swamp"?0x9fb58a:0xe0ecf4,transparent:true,opacity:b==="swamp"?.3:.22,depthWrite:false}));s.scale.set(14+hs(x,y)*8,5,1);const wx=x*TW+1,wz=y*TW+1;s.position.set(wx,hfn(wx,wz)+1.1,wz);s.userData.m=1;world.add(s)}}
function noiseTex(w,seed,rep,bright){const c=document.createElement("canvas");c.width=c.height=w;const g=c.getContext("2d"),d=g.createImageData(w,w);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const n=(vn(x*.09+seed,y*.09)*.5+vn(x*.3,y*.3+seed)*.35+Math.random()*.15),v=Math.floor((bright?170:90)+n*(bright?85:150));const i=(y*w+x)*4;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}g.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);return t}

/* ---- input ---- */
function interact(){if(C||packOpen||D||DG||occOpen||!hero)return;const n=nearNpc();if(window.HW&&HW.near())HW.use();else if(window.HM&&HM.near())HM.enter();else if(n)talk(n);else{const st=nearSite();if(st)openSite(st)}}
function nearNpc(){let b=null,bd=3.4;NPCS.forEach(n=>{const d=Math.hypot(n.x*TW+1-P.x,n.y*TW+1-P.z);if(d<bd){bd=d;b=n}});return b}
function faceNpc(n){faceT=Math.atan2(-(n.x*TW+1-P.x),-(n.y*TW+1-P.z))}
function bindInput(){
 addEventListener("keydown",e=>{if(!hero||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(("wasd".includes(k)&&k.length===1)||k.startsWith("Arrow")||k==="Shift"){keys[k]=1;if(k.startsWith("Arrow"))e.preventDefault()}if((k==="e"||k===" ")&&!e.repeat){interact();if(k===" ")e.preventDefault()}});
 addEventListener("keyup",e=>{delete keys[e.key.length===1?e.key.toLowerCase():e.key]});addEventListener("blur",()=>{for(const k in keys)delete keys[k]});
 const v=$("view");let ld=null;
 v.addEventListener("pointerdown",e=>{ld={id:e.pointerId,x:e.clientX,y:e.clientY};try{v.setPointerCapture(e.pointerId)}catch(x){}});
 v.addEventListener("pointermove",e=>{if(!ld||e.pointerId!==ld.id||(C&&!C.rt)||packOpen||D)return;const dx=e.clientX-ld.x,dy=e.clientY-ld.y;ld.x=e.clientX;ld.y=e.clientY;yaw-=dx*.006;pitch=Math.max(-1.1,Math.min(1.1,pitch-dy*.005));if(DG&&!(C&&C.rt))yaw=Math.max(-1.2,Math.min(1.2,yaw))});
 const up=e=>{if(ld&&e.pointerId===ld.id)ld=null};v.addEventListener("pointerup",up);v.addEventListener("pointercancel",up);
 const jy=$("joy"),th=jy.firstElementChild;let jd=null;
 const jm=e=>{const r=jy.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),l=Math.hypot(dx,dy),k=l>45?45/l:1;joy.x=dx*k/45;joy.y=dy*k/45;th.style.transform=`translate(${dx*k}px,${dy*k}px)`};
 jy.addEventListener("pointerdown",e=>{jd=e.pointerId;try{jy.setPointerCapture(e.pointerId)}catch(x){}jm(e);e.preventDefault()});jy.addEventListener("pointermove",e=>{if(e.pointerId===jd)jm(e)});
 const jx=e=>{if(e.pointerId===jd){jd=null;joy.x=joy.y=0;th.style.transform=""}};jy.addEventListener("pointerup",jx);jy.addEventListener("pointercancel",jx);
 $("prompt").addEventListener("pointerdown",e=>{e.preventDefault();interact()})}
/* ---- movement and world events ---- */
function move(dt){let fw=0,st=0,tr=0;if(keys.w||keys.ArrowUp)fw++;if(keys.s||keys.ArrowDown)fw--;if(keys.a)st--;if(keys.d)st++;if(keys.ArrowLeft)tr++;if(keys.ArrowRight)tr--;
 fw-=joy.y;st+=joy.x;yaw+=tr*1.9*dt;let dx=-Math.sin(yaw)*fw+Math.cos(yaw)*st,dz=-Math.cos(yaw)*fw-Math.sin(yaw)*st;const l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l}
 const sp=(keys.Shift&&!(C&&C.rt)?7:4.2)*dt*(window.RT&&C&&C.rt&&RT.block?.5:1)*(window.RT&&C&&C.rt&&RT.slow>0?.45:1)*(window.OMEN?OMEN.m("speed"):1);dx*=sp;dz*=sp;if(!dx&&!dz)return;
 if(!blocked(P.x+dx,P.z,.45))P.x+=dx;if(!blocked(P.x,P.z+dz,.45))P.z+=dz;bob+=dt*9;
 const tx=Math.floor(P.x/TW),ty=Math.floor(P.z/TW);if(tx!==hx||ty!==hy){hx=tx;hy=ty;tileEnter()}
 pickupNearby();dgEntranceCheck()}
function tileEnter(){reveal();
 for(const p of POIS)if(!found[p.id]&&near(p,p.hidden?1:2)){found[p.id]=1;say(p.hidden?"You find "+p.name+".":"Discovered: "+p.name);tryAudio(true);hud()}
 const b=biome[hy][hx];if(b!==lastBiome){lastBiome=b;setAmbience(b);setAtmos(b);}
 maybeEncounter();hud();draw();clearTimeout(save.t);save.t=setTimeout(save,400)}
function pickupNearby(){const p=PICK.find(q=>!got[q.id]&&Math.hypot(q.x*TW+1-P.x,q.y*TW+1-P.z)<1.5);if(p){pickupAt(p.x,p.y);hud()}}
function dgEntranceCheck(){if(C)return;if(noEnter){const q=POIS.find(x=>x.id===noEnter);if(Math.hypot(q.x*TW+1-P.x,q.y*TW+1-P.z)>3.4)noEnter=null}
 for(const p of POIS)if(p.hidden&&found[p.id]&&noEnter!==p.id&&Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z)<1.4){save();enterDg(p);return}}
function draw(){drawMini()}
function drawMini(){mx.fillStyle="#0a0806";mx.fillRect(0,0,W,H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(seen[y*W+x]){mx.fillStyle=BIOMES[biome[y][x]].c;mx.fillRect(x,y,1,1)}
 POIS.forEach(p=>{if(seen[p.y*W+p.x]&&(!p.hidden||found[p.id])){mx.fillStyle=PC[p.k];mx.fillRect(p.x-1,p.y-1,3,3)}});
 const fx0=P.x/TW,fy0=P.z/TW;mx.strokeStyle="#fff";mx.lineWidth=1;mx.beginPath();mx.moveTo(fx0,fy0);mx.lineTo(fx0-Math.sin(yaw)*6,fy0-Math.cos(yaw)*6);mx.stroke();mx.fillStyle="#ff5a3a";mx.fillRect(fx0-1,fy0-1,3,3)}
let toastT=0;function toast(t){const e=$("toast");if(!e)return;e.textContent=t;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>{e.style.opacity=0},4500)}
function flash(c){const f=$("flash");f.style.transition="none";f.style.background=c;f.style.opacity=1;requestAnimationFrame(()=>{f.style.transition="opacity .45s";f.style.opacity=0})}
/* ---- combat visuals ---- */
const fx3={g:null,lunge:-1,hitT:0,dieT:-1,base:null,fw:null,
 spawn(f){this.clear();const boss=!!(DG&&f[0]===DG.th.boss);this.g=makeFoe(f[0],f[9],boss);let x,z,found=false;
  if(DG){x=camera.position.x-Math.sin(yaw)*4.2;z=camera.position.z-Math.cos(yaw)*4.2}
  else{for(const dist of[4.2,3.4,5]){for(const dy of[0,.5,-.5,1,-1,1.6,-1.6,2.4,-2.4,3.14]){const a=yaw+dy,px=P.x-Math.sin(a)*dist,pz=P.z-Math.cos(a)*dist;
    if(!blocked(px,pz,.7)&&!blocked((P.x+px)/2,(P.z+pz)/2,.4)){x=px;z=pz;yaw=a;found=true;break}}if(found)break}
   if(!found){x=P.x-Math.sin(yaw)*3;z=P.z-Math.cos(yaw)*3}}
  this.fw=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  this.g.position.set(x,DG?0:Math.max(hfn(x,z),-.3),z);this.g.rotation.y=yaw;this.base=this.g.position.clone();this.lunge=-1;this.dieT=-1;this.hitT=0;this.t0=clock;scene.add(this.g);this.sh=new THREE.Mesh(new THREE.CircleGeometry(.9,18).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.38,depthWrite:false}));this.sh.scale.setScalar(this.g.scale.x*(f[0].match(/Giant|Hydra|Demon|Drake/)?1.8:1));scene.add(this.sh);const nm=f[0];this.lc=/Imp|Demon|Drake|Fire|Flame|Salamander/.test(nm)?0xff5020:/Wraith|Mummy|King|Ghost|Lich|Skeleton|Zombie/.test(nm)?0x60ffb0:/Frost|Ice|Yeti|Snow/.test(nm)?0x80c8ff:/Hydra|Swamp|Bog|Lizard/.test(nm)?0x70ff50:/Beholder|Mage|Magic|Wizard/.test(nm)?0xb070ff:0xffa060;this.fc=new THREE.Vector3();this.dsm=0},
 ctr(){const p=this.g.position;return _p2.set(p.x,p.y+1.3*this.g.scale.y,p.z)},
 hit(n){this.hitT=.4;if(this.g&&typeof n==="number"){const c=this.ctr().clone();dmgNum(String(n),"#ffd86a",c,n>=10);vfx.burst(c,0xffd080,14,3.6,.2,.5,7)}},
 swing(){vmSwing=0},strike(){this.lunge=0},
 hurt(d){shakeT=.4;flash("rgba(190,20,10,.55)");if(typeof d==="number"){camera.getWorldDirection(_p);_p2.copy(camera.position).addScaledVector(_p,2.2);_p2.y-=.35;dmgNum("-"+d,"#ff6a5a",_p2.clone(),d>=8)}},die(){this.dieT=0;if(this.g)vfx.burst(this.ctr().clone(),0xffffff,18,2.4,.3,.9,-1)},
 clear(){if(this.g){scene.remove(this.g);this.g=null}if(this.sh){scene.remove(this.sh);this.sh=null}if(foeL)foeL.intensity=0},
 sf(k){if(!glReady)return;if(k==="spell"){flash("rgba(110,150,255,.25)");vmCast=.6;if(this.g){const nm=curSpell||"",col=/Fire|Flame|Burn|Meteor|Scorch/i.test(nm)?0xff6a20:/Frost|Ice|Cold|Chill/i.test(nm)?0x80d0ff:/Light|Shock|Thunder|Bolt/i.test(nm)?0xffff80:/Turn|Smite|Holy|Sacred|Radiant|Sun/i.test(nm)?0xfff0b0:/Poison|Acid|Venom/i.test(nm)?0x80ff50:0xb080ff,to=this.ctr().clone();camera.getWorldDirection(_p);const fr=camera.position.clone().addScaledVector(_p,.6);fr.y-=.3;fr.x+=.15;vfx.proj(fr,to,col,.38,.55,()=>{vfx.burst(to,col,26,4,.3,.7,0);if(foeL){foeL.color.setHex(col);foeL.intensity=3;foeL.position.copy(to)}})}}else if(k==="heal")flash("rgba(90,220,120,.35)");else if(k==="win")flash("rgba(255,220,120,.3)")},
 update(dt){const g=this.g;if(!g)return;if(this.sh){this.sh.position.set(this.base.x,this.base.y+.04,this.base.z)}if(foeL&&!(foeL.intensity>1.2)){foeL.color.setHex(this.lc);foeL.intensity=this.dieT>=0?0:.55+.25*Math.sin(clock*3);foeL.position.set(this.base.x,this.base.y+1.6,this.base.z)}else if(foeL){foeL.intensity*=Math.max(0,1-dt*5)}
  const t=clock-this.t0,fl=g.userData.float?.35+Math.sin(t*2)*.12:0;let off=0;
  if(this.lunge>=0){this.lunge+=dt;off=Math.sin(Math.min(1,this.lunge/.45)*Math.PI)*(this.lungeAmp==null?2:this.lungeAmp);if(this.lunge>.45)this.lunge=-1}
  g.position.set(this.base.x-this.fw.x*off,this.base.y+fl+(g.userData.float?0:Math.abs(Math.sin(t*1.6))*.04),this.base.z-this.fw.z*off);
  if(g.userData.arms){const k=this.lunge>=0?Math.sin(Math.min(1,this.lunge/.45)*Math.PI):0;g.userData.arms.forEach((a,i)=>{a.rotation.x=-k*2.1+Math.sin(t*1.7+i*3)*.06})}
  if(g.userData.necks)g.userData.necks.forEach((n,i)=>{n.rotation.z=Math.sin(t*1.4+i*1.7)*.35;n.rotation.x=Math.sin(t*1.1+i)*.2});
  if(g.userData.stalks)g.userData.stalks.forEach((s,i)=>{s.rotation.x=Math.sin(t*1.8+i)*.25});
  if(this.hitT>0){this.hitT-=dt;const k=Math.max(0,this.hitT/.4);g.userData.mats.forEach(m=>{m.emissive.setRGB(k,k*.15,0);m.emissiveIntensity=k*1.2});g.rotation.z=Math.sin(this.hitT*60)*.08*k}
  if(this.dieT>=0){this.dieT+=dt;if(this.dieT<1.2&&Math.random()<dt*14)vfx.smoke(this.ctr().clone().add(new THREE.Vector3((Math.random()-.5)*.8,(Math.random()-.5)*.6,(Math.random()-.5)*.8)));const p=Math.min(1,this.dieT/1.1);if(!g.userData.fig){g.rotation.x=-p*1.4;g.position.y-=p*.5}g.userData.mats.forEach(m=>{m.transparent=true;m.opacity=1-p*.9})}}};
/* ---- dungeon interiors ---- */
const dgCam={x:0,z:0};let tex={};
function brickTex(){if(tex.b)return tex.b;const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");g.fillStyle="#2a2622";g.fillRect(0,0,256,256);
 for(let r=0;r<8;r++){const y=r*32,off=(r%2)*32;for(let x=-64;x<256;x+=64){const sh=Math.floor(Math.random()*34)-17;g.fillStyle=`rgb(${136+sh},${130+sh},${122+sh})`;g.fillRect(x+off+2,y+2,60,28)}}
 for(let i=0;i<3000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.14})`;g.fillRect(Math.random()*256,Math.random()*256,2,2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return tex.b=t}
function flagTex(){if(tex.f)return tex.f;const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");g.fillStyle="#1e1b18";g.fillRect(0,0,256,256);
 for(let r=0;r<4;r++)for(let q=0;q<4;q++){const sh=Math.floor(Math.random()*30)-15;g.fillStyle=`rgb(${120+sh},${116+sh},${108+sh})`;g.fillRect(q*64+3,r*64+3,58,58)}
 for(let i=0;i<3500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.16})`;g.fillRect(Math.random()*256,Math.random()*256,2,2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return tex.f=t}
const DIMS={0:[12,16],1:[14,16],2:[9,9],3:[16,16],4:[12,12],5:[16,22]};
function buildRoom(i,th,s){if(!DGT.crypt.tint){DGT.crypt.tint=0x8a9a8a;DGT.cave.tint=0x9fc8e8;DGT.mine.tint=0xa0805a;DGT.sunk.tint=0x6f8f6f;DGT.tomb.tint=0xd0b078;DGT.lair.tint=0x8a6a4a}
 const g=new THREE.Group(),[w,d]=DIMS[i],h=i===5?7:5,tint=th.tint,cave=th===DGT.cave;g.userData.camz=d/2-1.6;g.userData.lights=[];
 const bt=(rx,ry)=>{const t=brickTex().clone();t.needsUpdate=true;t.repeat.set(rx,ry);return t},wallM=(rx)=>{const t=bt(rx,h/2.5);return M(tint,{map:t,bumpMap:t,bumpScale:2.2,flatShading:false,roughness:.95})};
 const ft=flagTex().clone();ft.needsUpdate=true;ft.repeat.set(w/3,d/3);mk(g,new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),M(tint,{map:ft,bumpMap:ft,bumpScale:1.8,flatShading:false}),0,0,0,{ns:1});
 mk(g,new THREE.PlaneGeometry(w,d).rotateX(Math.PI/2),M(0x1a1612,{flatShading:false}),0,h,0,{ns:1});
 mk(g,new THREE.PlaneGeometry(w,h),wallM(w/3),0,h/2,-d/2,{ns:1});mk(g,new THREE.PlaneGeometry(w,h).rotateY(Math.PI),wallM(w/3),0,h/2,d/2,{ns:1});
 mk(g,new THREE.PlaneGeometry(d,h).rotateY(Math.PI/2),wallM(d/3),-w/2,h/2,0,{ns:1});mk(g,new THREE.PlaneGeometry(d,h).rotateY(-Math.PI/2),wallM(d/3),w/2,h/2,0,{ns:1});
 const stone=M(tint,{map:brickTex(),flatShading:false});for(let z=-d/2+3.5;z<=d/2-3;z+=4.5)[-1,1].forEach(sx=>mk(g,new THREE.CylinderGeometry(.45,.5,h,10),stone,sx*(w/2-1.4),h/2,z));
 const fc=cave?0x8ad0ff:0xff9a30,lc=cave?0x7ab8ff:0xff8a3a,tz=[-d/4,d/4];tz.forEach(z=>[-1,1].forEach(sx=>{const x=sx*(w/2-.2);mk(g,new THREE.BoxGeometry(.12,.5,.12),M(0x3a2a1a),x,2.2,z);mk(g,new THREE.ConeGeometry(.14,.4,6),M(fc,{emissive:fc,emissiveIntensity:1.6}),x,2.65,z,{ns:1});
  const l=new THREE.PointLight(lc,1.7,16);l.position.set(x-sx*.3,2.8,z);l.userData.base=1.7;g.add(l);g.userData.lights.push(l)}));
 [-1,1].forEach(sx=>{const x=sx*(w/2-2.4),z=-d/2+.2;mk(g,new THREE.BoxGeometry(.12,.5,.12),M(0x3a2a1a),x,2.4,z);mk(g,new THREE.ConeGeometry(.14,.4,6),M(fc,{emissive:fc,emissiveIntensity:1.6}),x,2.85,z,{ns:1});const l=new THREE.PointLight(lc,1.5,14);l.position.set(x,3,z+.5);l.userData.base=1.5;g.add(l);g.userData.lights.push(l)});
 const door=(wall,state,text)=>{const dg=new THREE.Group(),big=(i===4);const sc=big?1.3:1;const fr=M(0x5a544a);
  [-1.25,1.25].forEach(x=>mk(dg,new THREE.BoxGeometry(.5,3.3*sc,.55),fr,x*sc,1.65*sc,0));mk(dg,new THREE.BoxGeometry(3.4*sc,.55,.55),fr,0,3.4*sc,0);
  if(state==="open"){mk(dg,new THREE.PlaneGeometry(2*sc,3.2*sc),new THREE.MeshBasicMaterial({color:0x1a0f08}),0,1.6*sc,-.05,{ns:1});mk(dg,new THREE.PlaneGeometry(1.2*sc,1.2*sc),new THREE.MeshBasicMaterial({color:0xffd890,transparent:true,opacity:.35}),0,1.6*sc,-.1,{ns:1})}
  else if(state==="locked"){for(let k=-3;k<=3;k++)mk(dg,new THREE.BoxGeometry(.1,3.2*sc,.1),M(0x55565e,{metalness:.7,roughness:.4}),k*.3*sc,1.6*sc,.05);for(let k=0;k<4;k++)mk(dg,new THREE.BoxGeometry(2.1*sc,.1,.1),M(0x55565e,{metalness:.7}),0,.5*sc+k*.8*sc,.05);mk(dg,new THREE.SphereGeometry(.18,8,6),M(0xff3a2a,{emissive:0xff2010,emissiveIntensity:1.2}),0,1.5*sc,.2,{ns:1})}
  else{mk(dg,new THREE.BoxGeometry(2.1*sc,3.2*sc,.2),M(0x4a3220),0,1.6*sc,0);for(let k=0;k<3;k++)mk(dg,new THREE.BoxGeometry(2.1*sc,.12,.25),M(0x2a2a30,{metalness:.6}),0,.7*sc+k*.9*sc,.02)}
  const lb=label(text);lb.position.y=4.1*sc;lb.scale.set(5,.9,1);dg.add(lb);
  const q={N:[0,-d/2+.3,0],S:[0,d/2-.3,Math.PI],W:[-w/2+.3,0,Math.PI/2],E:[w/2-.3,0,-Math.PI/2]}[wall];if(wall==="N"||wall==="S"){dg.position.set(0,0,q[1])}else dg.position.set(q[0],0,0);dg.rotation.y=q[2];g.add(dg)};
 const ex=EXITS[i],fwd=ex.filter(j=>j>i);ex.forEach(j=>{const wall=j<i?"S":(fwd.length===2?(j===fwd[0]?"W":"N"):"N"),lk=(i===4&&j===5&&!s.unl);door(wall,lk?"locked":(i===4&&j===5?"open":"closed"),"To "+th.n[j]+(lk?" (locked)":""))});
 const bone=M(0xe0d8c0),gold=M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.7});
 if(i===0){for(let k=0;k<6;k++)mk(g,new THREE.BoxGeometry(3.2,.3,.9),stone,0,.15+k*.3,d/2-5+k*.8);const lg=new THREE.PointLight(0xfff0c0,1.2,12);lg.position.set(0,3.5,d/2-2);g.add(lg);mk(g,new THREE.PlaneGeometry(3,2.4),new THREE.MeshBasicMaterial({color:0xfff0c0,transparent:true,opacity:.55}),0,2.6,d/2-.1,{r:[0,Math.PI,0],ns:1})}
 if(i===1){[-1,1].forEach(sx=>{mk(g,new THREE.PlaneGeometry(1.2,3),M(th===DGT.crypt?0x5a1a3a:0x7a2a1a,{side:THREE.DoubleSide,flatShading:false}),sx*(w/2-.15),3.2,0,{r:[0,sx*-Math.PI/2,0],ns:1})})}
 if(i===2){const ch=new THREE.Group();ch.position.set(0,0,-d/2+1.8);mk(ch,new THREE.BoxGeometry(1.4,.8,.8),M(0x6b4a22),0,.4,0);const lid=mk(ch,new THREE.BoxGeometry(1.4,.25,.8),M(0x7b5a2a),0,s.ch[2]?1.0:.9,s.ch[2]?-.5:0,{r:[s.ch[2]?-1.1:0,0,0]});mk(ch,new THREE.BoxGeometry(.2,.4,.84),gold,0,.65,0,{ns:1});
  if(!s.ch[2]){const l=new THREE.PointLight(0xffd060,1,6);l.position.set(0,1.2,0);ch.add(l)}g.add(ch)}
 if(i===3)for(let k=0;k<4;k++){const sx=k<2?-1:1,z=-3+(k%2)*5;mk(g,new THREE.BoxGeometry(1.4,.8,2.8),M(0x6a645a),sx*3.2,.4,z);mk(g,new THREE.BoxGeometry(1.5,.25,2.9),M(0x8a847a),sx*3.2,.9,z,{r:[0,0,sx*.04]})}
 if(i===5){mk(g,new THREE.BoxGeometry(8,.5,5),stone,0,.25,-d/2+2.5);mk(g,new THREE.BoxGeometry(6,.5,3.6),stone,0,.7,-d/2+2.3);mk(g,new THREE.BoxGeometry(1.6,.8,1.3),M(0x3a2a2a),0,1.4,-d/2+1.6);mk(g,new THREE.BoxGeometry(1.6,2.6,.3),M(0x3a2a2a),0,2.4,-d/2+1.0);[-.5,.5].forEach(x=>mk(g,new THREE.OctahedronGeometry(.14),M(0xff3040,{emissive:0xff1020,emissiveIntensity:1.4}),x,3.4,-d/2+1.1,{ns:1}));
  [-1,1].forEach(sx=>{mk(g,new THREE.CylinderGeometry(.5,.35,1.2,8),M(0x2a2a30),sx*5,.6,-d/2+2.6);mk(g,new THREE.ConeGeometry(.35,.9,6),M(0xff8a30,{emissive:0xff6a10,emissiveIntensity:1.8}),sx*5,1.7,-d/2+2.6,{ns:1});const l=new THREE.PointLight(0xff7a30,1.6,14);l.position.set(sx*5,2.2,-d/2+2.8);l.userData.base=1.6;g.add(l);g.userData.lights.push(l)});
  const ch=new THREE.Group();ch.position.set(0,.95,-d/2+3.3);mk(ch,new THREE.BoxGeometry(1.6,.8,.9),M(0x6b4a22),0,.4,0);mk(ch,new THREE.BoxGeometry(1.6,.25,.9),M(0x7b5a2a),0,s.boss?1.0:.9,s.boss?-.55:0,{r:[s.boss?-1.2:0,0,0]});
  if(!s.boss&&s.clr[5]){const l=new THREE.PointLight(0xffd060,1.6,8);l.position.set(0,1.4,0);ch.add(l)}g.add(ch);
  for(let k=0;k<14;k++)mk(g,new THREE.SphereGeometry(.18+hs(k,2)*.2,6,5),gold,(hs(k,5)-.5)*3.6,.95+.1,-d/2+3.3+(hs(k,7)-.5)*1.6,{ns:1})}
 if(cave)for(let k=0;k<26;k++)mk(g,new THREE.ConeGeometry(.12+hs(k,2)*.12,.7+hs(k,3)*1.1,5),M(0xcfeaff,{transparent:true,opacity:.85,roughness:.1}),(hs(k,5)-.5)*(w-2),h-.4,(hs(k,6)-.5)*(d-2),{r:[Math.PI,0,0],ns:1});
 if(th===DGT.mine)for(let z=-d/2+2;z<d/2;z+=3)mk(g,new THREE.BoxGeometry(w,.35,.4),M(0x5a3d22),0,h-.3,z);
 if(th===DGT.sunk){const wp=mk(g,new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),M(0x2a6a6a,{transparent:true,opacity:.55,roughness:.1,flatShading:false}),0,.12,0,{ns:1})}
 if(i===1||i===3)for(let k=0;k<10;k++)mk(g,new THREE.BoxGeometry(.3,.1,.1),bone,(hs(k,i)-.5)*(w-4),.06,(hs(k,i+9)-.5)*(d-4),{r:[0,hs(k,2)*6,0],ns:1});
 dungDecor(g,i,w,d,h,th,s);
 g.userData.fog=new THREE.Color(tint).multiplyScalar(.1);g.add(new THREE.AmbientLight(cave?0x506080:0x504840,1.5));return g}
const dg3={g:null,sig:"",
 enter(){world.visible=false;[skyM,sunM,cloudG,baseM,partsM,starsM,moonM,fauna.g].forEach(o=>o.visible=false);moonL.intensity=0;lantern.intensity=.5;hemi.intensity=0;sunL.intensity=0;sunL.castShadow=false;this.sig="";yaw=0;pitch=0;noEnter=DG.p.id},
 show(){const s=DG.s,sig=[s.r,s.unl,s.clr[5]?1:0,s.boss,s.ch[2]?1:0].join();if(sig===this.sig)return;this.sig=sig;if(this.g)scene.remove(this.g);this.g=buildRoom(s.r,DG.th,s);scene.add(this.g);
  scene.fog=dungFog;dungFog.color.copy(this.g.userData.fog);scene.background=this.g.userData.fog;dgCam.x=0;dgCam.z=this.g.userData.camz},
 leave(p){if(world.visible)return;if(this.g)scene.remove(this.g);this.g=null;scene.background=null;world.visible=true;[skyM,sunM,cloudG,baseM,starsM,moonM,fauna.g].forEach(o=>o.visible=true);partsM.visible=pMode!=="none"&&qual>0;hemi.intensity=.95;sunL.castShadow=qual>=2;
  if(defeatedFlag){defeatedFlag=0;syncP()}else if(p){const c=[[0,3.4],[0,-3.4],[3.4,0],[-3.4,0]];for(const[dx,dz]of c){const x=p.x*TW+1+dx,z=p.y*TW+1+dz;if(!blocked(x,z,.45)){P.x=x;P.z=z;yaw=Math.atan2(dx,dz);break}}hx=Math.floor(P.x/TW);hy=Math.floor(P.z/TW)}
  scene.fog=worldFog}};

function dungDecor(g,i,w,d,h,th,s){const wood=M(0x6a4a2a),dk=M(0x2a2018),bone=M(0xe4dcc4),web=new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz],k)=>{if(hs(k+i*5,3)<.55){const t=new THREE.Mesh(new THREE.BufferGeometry(),web);const x=sx*(w/2-.02),z=sz*(d/2-.02),L=1.6+hs(k,i)*.8;t.geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array([x,h,z, x-sx*L,h,z, x,h-L*.9,z, x,h,z, x,h,z-sz*L, x,h-L*.9,z, x,h,z, x-sx*L,h,z, x,h,z-sz*L]),3));g.add(t)}});
 const crate=(x,z,sc,ry)=>{const c=mk(g,new THREE.BoxGeometry(.9*sc,.9*sc,.9*sc),wood,x,.45*sc,z,{r:[0,ry,0]});mk(g,new THREE.BoxGeometry(.95*sc,.08*sc,.95*sc),dk,x,.9*sc-.04,z,{r:[0,ry,0],ns:1});mk(g,new THREE.BoxGeometry(.95*sc,.08*sc,.95*sc),dk,x,.1*sc,z,{r:[0,ry,0],ns:1})},
  barrel=(x,z)=>{mk(g,new THREE.CylinderGeometry(.4,.4,.95,10),wood,x,.48,z);[.2,.75].forEach(y=>mk(g,new THREE.CylinderGeometry(.42,.42,.07,10),M(0x3a3a40,{metalness:.5}),x,y,z,{ns:1}))},
  skull=(x,z,ry)=>{mk(g,new THREE.SphereGeometry(.13,8,6),bone,x,.14,z,{ns:1});mk(g,new THREE.BoxGeometry(.12,.07,.1),bone,x,.06,z+.08*Math.cos(ry),{ns:1})};
 const cx=w/2-1.1,cz=d/2-1.1;
 if(i===1||i===3||i===4){crate(-cx,-cz+.5,1,.3);crate(-cx+.9,-cz+.4,.7,-.2);barrel(cx,-cz+.8);barrel(cx-.9,-cz+.5)}
 if(i===2||i===5){barrel(-cx,cz-1);crate(cx,cz-1,1.1,.5)}
 if(th&&(th.n&&/rypt|omb|lair/i.test(th.n[0]||"")||true)&&(i===1||i===3||i===5||i===2))for(let k=0;k<5;k++)skull((hs(k,i+20)-.5)*(w-3),(hs(k,i+30)-.5)*(d-3),hs(k,i)*6);
 if(i===0){const sh=new THREE.Mesh(new THREE.ConeGeometry(2.2,h,16,1,true),new THREE.MeshBasicMaterial({color:0xfff0c0,transparent:true,opacity:.09,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));sh.position.set(0,h/2,d/2-3);sh.rotation.x=.45;g.add(sh)}
 if(!th.n||true){const pg=new THREE.BufferGeometry(),pa=new Float32Array(90*3);for(let k=0;k<90;k++){pa[k*3]=(Math.random()-.5)*(w-1);pa[k*3+1]=Math.random()*h;pa[k*3+2]=(Math.random()-.5)*(d-1)}pg.setAttribute("position",new THREE.BufferAttribute(pa,3));const pt=new THREE.Points(pg,new THREE.PointsMaterial({size:.06,color:0xffe8c0,transparent:true,opacity:.5,depthWrite:false}));g.add(pt);g.userData.motes=pt}
 if(hs(i,41)<.6){const pud=new THREE.Mesh(new THREE.CircleGeometry(.9+hs(i,2),14).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x101820,roughness:.05,metalness:.6}));pud.position.set((hs(i,5)-.5)*(w-5),.02,(hs(i,6)-.5)*(d-5));g.add(pud)}}

/* ---- frame loop ---- */
let lastT=0,fpsA=0,fpsN=0,mapT=0,wfr=0,fpsStart=0;
function frame(t){requestAnimationFrame(frame);if(!glReady||!hero||$("game").hidden)return;const dt=Math.min(.06,(t-lastT)/1000||.016);lastT=t;clock+=dt;
 if(!fpsStart)fpsStart=t;fpsA+=dt;fpsN++;if(fpsA>2.5){const fps=fpsN/fpsA;if(t-fpsStart>3000&&fps<22&&qual>0){setQuality(qual-1);toast("Graphics lowered to keep the game smooth.")}fpsA=0;fpsN=0}
 const busy=(C&&!C.rt)||packOpen||D||occOpen;if(!busy&&!DG){if(!(C&&C.rt&&(RT.stun>0||RT.dead>0)))move(dt)}else if(!busy&&DG&&C&&C.rt)RT.dgMove(dt);
 if(D&&faceT!=null){let d=faceT-yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;yaw+=d*Math.min(1,dt*4)}
 if((C&&!C.rt)||D)pitch+=(-.24-pitch)*Math.min(1,dt*3);
 if(DG)camera.position.set(dgCam.x,1.7+Math.sin(clock*1.3)*.02,dgCam.z);else camera.position.set(P.x,Math.max(hfn(P.x,P.z),-.45)+1.7+Math.sin(bob)*.05,P.z);
 if(shakeT>0){shakeT-=dt}
 camera.rotation.set(pitch,yaw,0,"YXZ");const cp=camera.position;
 if(!DG){lerpAtm(1-Math.exp(-dt*1.2));if(scene.fog!==worldFog)scene.fog=worldFog;updateTOD();
  skyM.position.copy(cp);baseM.position.set(cp.x,-2.6,cp.z);const sd=SUN;sunM.position.set(cp.x+sd.x*250,cp.y+sd.y*250,cp.z+sd.z*250);sunL.position.set(P.x+sd.x*60,Math.max(sd.y,.12)*60,P.z+sd.z*60);moonM.position.set(cp.x-sd.x*250,cp.y-sd.y*250,cp.z-sd.z*250);moonL.position.set(-sd.x*60,Math.abs(sd.y)*60+10,-sd.z*60);starsM.position.copy(cp);starsM.rotation.y=clock*.004;sunL.target.position.set(P.x,0,P.z);
  cloudG.position.set(cp.x,0,cp.z);cloudG.children.forEach(c=>{c.position.x+=dt*1.5;if(c.position.x>250)c.position.x-=500});
  if(++wfr%3===0){const pos=waterM.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,Math.sin(clock*.9+x*.35)*.05+Math.cos(clock*.7+z*.3)*.04)}pos.needsUpdate=true}
  setParticles(ATM[tgt.key].pt);if(partsM.visible){const pp=partsM.geometry.attributes.position,m=pMode;for(let i=0;i<PN;i++){let x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);
   if(m==="snow"){y-=1.4*dt;x+=Math.sin(clock+i)*.4*dt}else if(m==="leaf"){y-=.35*dt;x+=.5*dt;z+=Math.sin(clock*.7+i)*.3*dt}else if(m==="dust"){x+=2.2*dt;y+=Math.sin(clock+i)*.05*dt}else{y+=Math.sin(clock*1.3+i*3)*.35*dt;x+=Math.cos(clock*.8+i)*.3*dt}
   if(x<cp.x-24)x+=48;else if(x>cp.x+24)x-=48;if(z<cp.z-24)z+=48;else if(z>cp.z+24)z-=48;const lo=m==="fly"?cp.y-2.2:cp.y-2,hi=m==="fly"?cp.y+.6:cp.y+14;if(y<lo)y+=hi-lo;else if(y>hi)y-=hi-lo;pp.setXYZ(i,x,y,z)}pp.needsUpdate=true}
  let nl=0;entL.intensity=0;POIS.forEach(p=>{const g=poiMeshes[p.id],dx=g.position.x-cp.x,dz=g.position.z-cp.z,dd=Math.hypot(dx,dz);if(p.id==="village"&&dd<70&&Math.random()<dt*3){const q=VHS[(Math.random()*5)|0];vfx.smoke(_p2.set(g.position.x+q[0]-.8,g.position.y+4.3,g.position.z+q[1]-.5))}
   if(p.hidden){g.visible=!!found[p.id]||dd<7;if(g.visible&&dd<28&&!nl){nl=1;entL.position.set(g.position.x,g.position.y+2.4,g.position.z+1.4);entL.intensity=1.3+Math.sin(clock*9+p.x)*.15}}
   g.children.forEach(c=>{if(c.isPointLight){if(c.userData.base==null)c.userData.base=c.intensity;c.intensity=dd>46?0:c.userData.base*(.55+.9*(1-todDay))*(c.userData.flick?.82+.18*Math.sin(clock*8+p.x):1)}if(c.userData.float)c.position.y=1.5+Math.sin(clock*1.6)*.12})});
  NPCS.forEach(n=>{const g=npcMeshes[n.id],dx=cp.x-g.position.x,dz=cp.z-g.position.z,dd=Math.hypot(dx,dz);g.userData.l.visible=dd<9;g.position.y=hfn(g.position.x,g.position.z)+Math.sin(clock*1.7+n.seed)*.02;
   if(dd<6){let d=Math.atan2(dx,dz)-g.rotation.y;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;g.rotation.y+=d*Math.min(1,dt*3)}});
  PICK.forEach(p=>{const g=pickMeshes[p.id];if(g.visible&&p.k==="herb")g.rotation.y+=dt*.6});
  const pr=$("prompt"),nn=!busy?nearNpc():null,ns=!busy&&!nn?nearSite():null;if(window.HW&&HW.near()){pr.style.display="block";pr.textContent=HW.label()+"  (E or tap)"}else if(window.HM&&HM.near()){pr.style.display="block";pr.textContent=HM.label()+"  (E or tap)"}else if(nn){pr.style.display="block";pr.textContent="Talk to "+nn.name+"  (E or tap)"}else if(ns){pr.style.display="block";pr.textContent="Enter "+ns.name+"  (E or tap)"}else pr.style.display="none"}
 else{$("prompt").style.display="none";lantern.intensity=.55;if(dg3.g&&dg3.g.userData.motes)dg3.g.userData.motes.rotation.y=clock*.03;if(dg3.g)dg3.g.userData.lights.forEach((l,i)=>{l.intensity=l.userData.base*(.82+.18*Math.sin(clock*9+i*2)+(Math.random()-.5)*.06)})}
 WIND.value=clock;fx3.update(dt);vfx.update(dt);updDmg(dt);if(!DG)updFauna(dt,cp,todDay);vmUpdate(dt);occFrame(dt,cp);orreryUpdate(cp,dt);if(t-mapT>300){mapT=t;if(!DG)drawMini()}
 if(POST.on)postRender(t);else{renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera);if(vmG&&vmG.visible){vmCam.aspect=camera.aspect;vmCam.updateProjectionMatrix();renderer.clearDepth();renderer.render(vmScene,vmCam)}}}


function renderLeg(){const l=$("leg");l.innerHTML="";BK.forEach(k=>{const s=document.createElement("span");const i=document.createElement("i");i.style.background=BIOMES[k].c;s.appendChild(i);s.appendChild(document.createTextNode(BIOMES[k].n));l.appendChild(s)})}
/* ---------- ambient sound (Web Audio, generated) ---------- */
let ac=null,master=null,windG=null,windF=null,timer=null,mode="forest",on=false;
function noiseBuf(){const b=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
function initAudio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
 const s=ac.createBufferSource();s.buffer=noiseBuf();s.loop=true;windF=ac.createBiquadFilter();windF.type="bandpass";windF.frequency.value=500;windF.Q.value=.6;windG=ac.createGain();windG.gain.value=.05;
 const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.12;lg.gain.value=.03;lfo.connect(lg);lg.connect(windG.gain);lfo.start();
 s.connect(windF);windF.connect(windG);windG.connect(master);s.start()}
function tone(f1,f2,dur,type,vol,when){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f1,ac.currentTime+when);o.frequency.exponentialRampToValueAtTime(f2,ac.currentTime+when+dur);
 g.gain.setValueAtTime(0,ac.currentTime+when);g.gain.linearRampToValueAtTime(vol,ac.currentTime+when+dur*.2);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+when+dur);o.connect(g);g.connect(master);o.start(ac.currentTime+when);o.stop(ac.currentTime+when+dur+.05)}
const SND={
 forest:{wf:420,wv:.04,ev:()=>{const n=1+((Math.random()*3)|0),base=2200+Math.random()*1800;for(let i=0;i<n;i++)tone(base,base*1.5,.12,"sine",.08,i*.16)},gap:[1800,5000]},
 hills:{wf:600,wv:.07,ev:()=>{const b=2600+Math.random()*1200;tone(b,b*1.3,.1,"sine",.06,0);tone(b*1.2,b,.1,"sine",.06,.14)},gap:[3000,7000]},
 tundra:{wf:900,wv:.12,ev:()=>{},gap:[8000,9000]},
 mountain:{wf:700,wv:.1,ev:()=>{tone(1400,900,.9,"triangle",.04,0)},gap:[7000,14000]},
 desert:{wf:350,wv:.08,ev:()=>{},gap:[8000,9000]},
 swamp:{wf:300,wv:.05,ev:()=>{const n=2+((Math.random()*3)|0);for(let i=0;i<n;i++)tone(180,110,.09,"square",.05,i*.13);if(Math.random()<.6)for(let i=0;i<8;i++)tone(5200,5200,.03,"sine",.025,.5+i*.05)},gap:[1500,4000]}
};
function setAmbience(b){mode=b;if(!ac)return;const s=SND[b];windF.frequency.linearRampToValueAtTime(s.wf,ac.currentTime+2);windG.gain.linearRampToValueAtTime(s.wv,ac.currentTime+2);schedule()}
function schedule(){clearTimeout(timer);if(!on)return;const s=SND[mode];timer=setTimeout(()=>{if(on)s.ev();schedule()},s.gap[0]+Math.random()*(s.gap[1]-s.gap[0]))}
function tryAudio(chime){if(!on||!ac)return;if(chime){tone(660,990,.5,"triangle",.1,0);tone(990,1320,.6,"triangle",.08,.12)}}
$("snd").onclick=()=>{on=!on;if(on){initAudio();ac.resume();master.gain.linearRampToValueAtTime(.8,ac.currentTime+1);setAmbience(biome[hy][hx]);$("snd").textContent="Sound: on"}else{if(master)master.gain.linearRampToValueAtTime(0,ac.currentTime+.5);clearTimeout(timer);$("snd").textContent="Sound: off"}};
/* ================= PHASE 3: items, spells, combat ================= */
const rnd=n=>Math.floor(Math.random()*n)+1;
const mod=s=>Math.floor((s-10)/2);
const sg=n=>(n>=0?"+":"")+n;
const roll=(n,s)=>{let t=0;for(let i=0;i<n;i++)t+=rnd(s);return t};
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
const ITEMS={
 "Dagger":{t:"w",d:[1,4],f:1},"Hunting knife":{t:"w",d:[1,4],f:1},"Longsword":{t:"w",d:[1,8]},"Warhammer":{t:"w",d:[1,8]},"Mace":{t:"w",d:[1,6]},
 "Quarterstaff":{t:"w",d:[1,6]},"Shortbow":{t:"w",d:[1,6],f:1},"Ember wand":{t:"w",d:[1,4],f:1,sp:1,desc:"Spell focus. +1 spell power."},
 "Flamebrand":{t:"w",d:[1,8],b:2,h:1,m:1,desc:"Magic sword wreathed in flame. +1 to hit, +2 damage."},
 "Frostfang":{t:"w",d:[1,10],b:1,h:1,m:1,desc:"Rimed magic blade. +1 to hit, +1 damage."},
 "Sunblade of Dawn":{t:"w",d:[2,6],b:3,h:2,m:1,desc:"Legendary. +2 to hit, +3 damage, burns the undead."},
 "Leather armor":{t:"a",ac:2},"Scale vest":{t:"a",ac:3},"Chain shirt":{t:"a",ac:4},
 "Dwarven mail":{t:"a",ac:5,m:1,desc:"Dwarf-forged mail. AC +5."},"Mithral plate":{t:"a",ac:7,m:1,desc:"Light as silk, hard as a mountain. AC +7."},
 "Shield":{t:"s",ac:1},"Tower shield":{t:"s",ac:2},
 "Holy symbol":{t:"c",sp:1,desc:"+1 spell power."},
 "Talisman of Warding":{t:"c",ac:2,m:1,desc:"Magic talisman. +2 AC."},
 "Eagle Eye Charm":{t:"c",h:2,m:1,desc:"Magic charm. +2 to hit."},
 "Bloodstone Amulet":{t:"c",hp:4,m:1,desc:"Magic amulet. +4 max HP."},
 "Raven Totem":{t:"c",mp:3,m:1,desc:"Magic totem. +3 max mana."},
 "Healing herb":{t:"u",heal:[2,6,3],desc:"Heal 2d6+3."},"Healing potion":{t:"u",heal:[4,6,6],desc:"Heal 4d6+6."},
 "Mana potion":{t:"u",mana:6,desc:"Restore 6 mana."},"Smoke vial":{t:"u",smoke:1,desc:"Escape any fight."},
 "Iron key":{t:"k",desc:"Opens iron doors in dungeons."},"Silver key":{t:"k",desc:"Opens silver locks."},
 "Lockpicks":{t:"k",desc:"For simple locks."},"Spellbook":{t:"k",desc:"Your arcane notes."},
 "Ruby":{t:"g",v:120},"Sapphire":{t:"g",v:90},"Emerald":{t:"g",v:100},"Moonstone":{t:"g",v:60}
};
const SLOT={w:"Weapon",a:"Armor",s:"Shield",c:"Charm"};
const HD={Fighter:10,Paladin:10,Cleric:8,Rogue:8,Magician:6,Ranger:10};
const MPB={Magician:8,Cleric:6,Paladin:4,Ranger:4,Rogue:4,Fighter:4};
const CAST={Magician:"INT",Cleric:"WIS",Paladin:"CHA",Ranger:"WIS",Fighter:"STR",Rogue:"DEX"};
const RES={Magician:"Mana",Cleric:"Mana",Paladin:"Mana",Ranger:"Stamina",Rogue:"Stamina",Fighter:"Stamina"};
const SPELLS={
 "Magic Missile":{c:["Magician"],lv:1,mp:2,d:"Three darts that never miss. 3d4.",u:"dmg",dice:[3,4]},
 "Fire Bolt":{c:["Magician"],lv:2,mp:3,d:"Roll to hit. 3d8 fire.",u:"atk",dice:[3,8]},
 "Sleep":{c:["Magician"],lv:3,mp:3,d:"Foe sleeps 2 turns. Not the undead.",u:"sleep",n:2},
 "Arcane Shield":{c:["Magician"],lv:4,mp:3,d:"+4 AC for this fight.",u:"ward",n:4},
 "Cure Wounds":{c:["Cleric"],lv:1,mp:2,d:"Heal 2d6 + WIS.",u:"heal",dice:[2,6],mod:"WIS",field:1},
 "Smite":{c:["Cleric"],lv:1,mp:2,d:"2d6 radiant, no roll.",u:"dmg",dice:[2,6]},
 "Bless":{c:["Cleric","Paladin"],lv:2,mp:2,d:"+2 to hit for 4 turns.",u:"bless",n:4},
 "Turn Undead":{c:["Cleric","Paladin"],lv:3,mp:3,d:"Undead take 4d6 and may cower.",u:"turn"},
 "Lay on Hands":{c:["Paladin"],lv:1,mp:2,d:"Heal 2d6 + CHA.",u:"heal",dice:[2,6],mod:"CHA",field:1},
 "Divine Smite":{c:["Paladin"],lv:2,mp:3,d:"Weapon attack with +3d8 radiant.",u:"atkw",extra:[3,8]},
 "Power Strike":{c:["Fighter"],lv:1,mp:2,d:"Weapon attack, double dice.",u:"atkw",dbl:1},
 "Second Wind":{c:["Fighter"],lv:2,mp:2,d:"Heal 1d10 + level.",u:"heal",dice:[1,10],lvl:1,field:1},
 "Shield Wall":{c:["Fighter"],lv:3,mp:2,d:"+4 AC for this fight.",u:"ward",n:4},
 "Backstab":{c:["Rogue"],lv:1,mp:2,d:"Weapon attack + 3d6 sneak damage.",u:"atkw",extra:[3,6]},
 "Smoke Step":{c:["Rogue"],lv:2,mp:2,d:"Vanish and escape.",u:"flee"},
 "Poison Blade":{c:["Rogue"],lv:3,mp:3,d:"Weapon attack + 2d6 poison.",u:"atkw",extra:[2,6]},
 "Arrow Volley":{c:["Ranger"],lv:1,mp:2,d:"Two shots, each rolled. d8 + DEX.",u:"volley"},
 "Entangle":{c:["Ranger"],lv:2,mp:2,d:"Roots hold any foe 2 turns.",u:"sleep",n:2,any:1},
 "Healing Spores":{c:["Ranger"],lv:3,mp:3,d:"Heal 2d6 + WIS.",u:"heal",dice:[2,6],mod:"WIS",field:1}
};
/* foes: [name,hp,ac,atk,dmgN,dmgS,dmgB,xp,minTier,colour,special,undead] */
const FOES={
 forest:[["Goblin",7,13,3,1,6,1,25,0,"#6b9a3a"],["Wolf",9,12,3,1,6,2,25,0,"#8a8a8a"],["Nymph",14,12,4,1,4,2,45,1,"#7fd0c0","charm"],["Orc Raider",15,13,5,1,8,3,60,1,"#4f7a3a"],["Dark Magician",18,12,5,2,6,2,90,2,"#7a4aa0"]],
 tundra:[["Frost Wolf",11,13,4,1,8,2,40,0,"#bcd6e6"],["Frost Wraith",20,13,5,1,6,3,80,1,"#9fb8d8","drain",1],["Yeti",32,12,6,1,10,4,110,2,"#e8eef2"],["Frost Demon",45,15,7,2,6,4,200,3,"#5aa0d8"]],
 mountain:[["Goblin Archer",9,13,4,1,6,2,30,0,"#6b9a3a"],["Orc Warrior",18,14,5,1,10,3,70,1,"#4f7a3a"],["Renegade Dwarf",24,16,5,1,8,4,90,2,"#b07a4a"],["Stone Giant",55,15,7,2,8,4,240,3,"#8a8070"]],
 swamp:[["Bog Imp",8,13,4,1,6,2,30,0,"#8a4a6a","drain"],["Lizardfolk",16,14,5,1,8,2,55,1,"#5a8a4a"],["Bog Wraith",20,13,5,1,6,3,80,1,"#6a8a8a","drain",1],["Hydra",50,14,6,1,8,3,260,3,"#3a8a5a","multi"]],
 desert:[["Bandit Rogue",16,14,5,1,6,3,60,0,"#a08a60"],["Giant Scorpion",15,13,5,1,8,3,60,1,"#b0702a"],["Mummy",28,13,6,1,10,3,100,2,"#d8d0b0","drain",1],["Dust Demon",40,15,7,2,6,3,210,3,"#c0502a"]],
 hills:[["Bandit",12,13,4,1,8,2,40,0,"#a08a60"],["Fallen Paladin",30,17,6,1,8,4,120,2,"#b0b0c0"],["Hill Giant",52,14,7,2,8,4,230,3,"#a07a5a"],["Beholder",60,16,7,2,6,4,350,3,"#a03a6a","charm"]]
};
const POOL=[["Longsword","Chain shirt","Shield","Eagle Eye Charm","Dagger"],["Scale vest","Frostfang","Talisman of Warding","Tower shield","Mace"],["Dwarven mail","Bloodstone Amulet","Frostfang","Raven Totem"],["Flamebrand","Mithral plate","Raven Totem","Sunblade of Dawn","Talisman of Warding"]];
const XPT=[0,100,250,450,700,1000,1400,1900,2500,3200,4000];
function tierAt(x,y){const d=Math.hypot(x-SX,y-SY);return d<14?0:d<26?1:d<38?2:3}
/* pickups: fixed chests and herb patches */
const PICK=[];for(let i=0;i<6000&&PICK.length<92;i++){const x=Math.floor(hs(i,11)*W),y=Math.floor(hs(i,29)*H);
 if(x<1||y<1||x>=W-1||y>=H-1||!reach[y*W+x]||Math.abs(x-SX)+Math.abs(y-SY)<5||POIS.some(p=>p.x===x&&p.y===y)||PICK.some(p=>p.x===x&&p.y===y))continue;
 PICK.push({id:"p"+PICK.length,x,y,k:(PICK.length%2||PICK.length>=46)?"herb":"chest"})}
let got={},C=null,packOpen=false;
/* ---- derived stats ---- */
const AT=()=>hero.attrs;
const gear=()=>({w:ITEMS[hero.eq.w]||null,a:ITEMS[hero.eq.a]||null,s:ITEMS[hero.eq.s]||null,c:ITEMS[hero.eq.c]||null});
const gsum=k=>{const g=gear();return["w","a","s","c"].reduce((t,s)=>t+((g[s]&&g[s][k])||0),0)+knB(k)+(window.TLN?TLN.stat(k):0)};
const calcAC=()=>10+mod(AT().DEX)+gsum("ac");
const prof=()=>1+Math.ceil(hero.level/4);
const maxHP=()=>Math.round((hero.baseHp+hero.hpGain)*1.5)+8+gsum("hp")+(window.OMEN?OMEN.b("hp"):0);
const maxMP=()=>Math.max(3,MPB[hero.cls]+hero.level*2+mod(AT()[CAST[hero.cls]])+gsum("mp"));
const spBonus=()=>gsum("sp");
const known=()=>Object.keys(SPELLS).filter(n=>SPELLS[n].c.includes(hero.cls)&&SPELLS[n].lv<=hero.level&&(!SPELLS[n].g||(hero.occ&&hero.occ.sp[n])));
function initHero(h){
 if(h.v3)return;h.v3=1;h.baseHp=h.maxHp;h.hpGain=0;h.inv={};h.eq={};h.xp=h.xp||0;h.level=h.level||1;h.steps=0;
 const kit=h.kit&&h.kit.length?h.kit:["Dagger","Leather armor","Healing herb x2"];
 kit.forEach(s=>{const m=s.match(/^(.*?)(?: x(\d+))?$/);let nm=m[1].trim(),q=+m[2]||1;if(nm==="Herb pouch")nm="Healing herb";if(ITEMS[nm]&&ITEMS[nm].t!=="u"&&ITEMS[nm].t!=="k")q=1;if(ITEMS[nm])h.inv[nm]=(h.inv[nm]||0)+q});
 h.inv["Healing potion"]=(h.inv["Healing potion"]||0)+1;
 ["w","a","s","c"].forEach(sl=>{const n=Object.keys(h.inv).find(k=>ITEMS[k].t===sl);if(n)h.eq[sl]=n});
}
function fixStats(){hero.maxHp=maxHP();hero.hp=Math.min(hero.hp,hero.maxHp);hero.ac=calcAC();hero.maxMana=maxMP();if(hero.mana==null)hero.mana=hero.maxMana;hero.mana=Math.min(hero.mana,hero.maxMana)}
function giveItem(n,q){hero.inv[n]=(hero.inv[n]||0)+(q||1)}
function addLoot(n){const it=ITEMS[n];if(it.t==="w"||it.t==="a"||it.t==="s"||it.t==="c"){if(hero.inv[n]){hero.gold+=40;return n+" (already owned, sold for 40 gp)"}}giveItem(n);return n}
function addXp(n,out){hero.xp+=n;out.push("+"+n+" XP.");
 while(hero.level<XPT.length&&hero.xp>=XPT[hero.level]){hero.level++;const g=Math.max(1,rnd(HD[hero.cls])+mod(AT().CON));hero.hpGain+=g;fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;
  out.push("LEVEL UP! You are level "+hero.level+". +"+g+" max HP, "+RES[hero.cls]+" restored.");
  Object.keys(SPELLS).forEach(s=>{if(SPELLS[s].c.includes(hero.cls)&&SPELLS[s].lv===hero.level)out.push("New ability: "+s+".")})}}
function healHero(n){const b=hero.hp;hero.hp=Math.min(maxHP(),hero.hp+n);return hero.hp-b}
/* ---- small helpers ---- */
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
function btn(text,fn,cls,dis){const b=el("button",text,cls||"alt");b.onclick=fn;if(dis)b.disabled=true;return b}
function sfx(k){fx3.sf(k);if(!on||!ac)return;if(k==="hit")tone(240,80,.16,"sawtooth",.12,0);else if(k==="miss")tone(320,200,.08,"triangle",.05,0);else if(k==="spell"){tone(500,1300,.35,"sine",.1,0)}else if(k==="heal"){tone(520,780,.3,"triangle",.1,0);tone(780,1040,.3,"triangle",.08,.15)}else if(k==="win"){tone(520,520,.15,"square",.06,0);tone(660,660,.15,"square",.06,.15);tone(880,880,.3,"square",.06,.3)}}
/* ---- pickups ---- */
function lootChest(){const t=tierAt(hx,hy),out=[],g=(rnd(20)+10)*(t+1);hero.gold+=g;out.push(g+" gp");
 if(Math.random()<.75)out.push(addLoot(pickOne(POOL[t])));
 if(Math.random()<.5)out.push(addLoot(pickOne(["Ruby","Sapphire","Emerald","Moonstone"])));
 if(Math.random()<.4)out.push(addLoot(hero.inv["Iron key"]?"Silver key":"Iron key"));
 if(Math.random()<.6){giveItem("Healing potion");out.push("Healing potion")}
 if(Math.random()<.06){const gk="Lesser Key of Solomon";if(!hero.inv[gk]&&!(hero.occ&&hero.occ.read[gk])){giveItem(gk);out.push(gk+" (grimoire)")}}
 return out.join(", ")}
function pickupAt(x,y){const p=PICK.find(q=>q.x===x&&q.y===y&&!got[q.id]);if(!p)return;got[p.id]=1;hidePick(p.id);
 if(p.k==="chest"){say("You open a chest and find: "+lootChest()+".");sfx("win")}
 else gatherHerb(p)}
/* ---- encounters ---- */
function maybeEncounter(){hero.steps++;
 if(hero.steps%6===0&&hero.mana<maxMP())hero.mana++;if(hero.steps%10===0&&hero.hp<maxHP())hero.hp++;
 if(Math.abs(hx-SX)+Math.abs(hy-SY)<6||POIS.some(p=>p.x===hx&&p.y===hy))return;
 if(Math.random()>.07)return;
 const t=tierAt(hx,hy),list=FOES[biome[hy][hx]].filter(f=>f[8]<=t);startCombat(pickOne(list),t)}
/* ---- combat ---- */
function startCombat(f,tier,after){
 C={e:{name:f[0],hp:f[1],max:f[1],ac:f[2],atk:f[3],dn:f[4],ds:f[5],db:f[6],xp:f[7],col:f[9],sp:f[10]||"",undead:!!f[11],skip:0},tier,after,ward:0,bless:0,lost:0,over:false,busy:false,menu:null,lines:[]};
 $("cbt").hidden=false;fx3.spawn(f);if(hero.occ&&hero.occ.fort>0){C.fh=(C.fh||0)+2;hero.occ.fort--;C.lines.push("Fortune favours you. +2 to hit.")}
 if(hero.fate){const k=hero.fate.k,c=C,e=C.e;if(k==="hit")c.fh=2;else if(k==="hit-")c.fh=-1;else if(k==="dmg")c.fd=2;else if(k==="ac")c.ward+=2;else if(k==="bad-ac")c.ward-=1;else if(k==="foe-")e.atk-=2;else if(k==="foe+")e.atk+=1;c.lines.push("Fate: "+hero.fate.txt+".");hero.fate=null}
 clog("A "+f[0]+" appears in "+BIOMES[biome[hy][hx]].n+"!");
 const hi=rnd(20)+mod(AT().DEX),fi=rnd(20);clog("Initiative: you "+hi+", foe "+fi+".");
 rc();if(fi>hi){C.busy=true;rc();setTimeout(foeTurn,700)}}
function clog(t){C.lines.push(t);if(C.lines.length>9)C.lines.shift()}
function atkRoll(bonus,ac){const d=rnd(20),tot=d+bonus;return{d,tot,hit:d===20||(d!==1&&tot>=ac),crit:d===20,fumble:d===1}}
function foeDamage(n){const e=C.e;e.hp=Math.max(0,e.hp-n);fx3.hit(n);if(e.hp<=0)victory()}
function weaponAttack(o){o=o||{};fx3.swing();const e=C.e,g=gear().w||{d:[1,2]},m=g.f?Math.max(mod(AT().STR),mod(AT().DEX)):mod(AT().STR);
 const bonus=prof()+m+(g.h||0)+gsum("h")+(C.bless?2:0)+(C.fh||0),r=atkRoll(bonus,e.ac);
 const head="You swing"+(hero.eq.w?" your "+hero.eq.w:"")+": d20 "+r.d+sg(bonus)+" = "+r.tot+" vs AC "+e.ac+". ";
 if(!r.hit){clog(head+(r.fumble?"Critical miss!":"Miss."));sfx("miss");return}
 const cm=r.crit?2:1;let dmg=roll(g.d[0]*(o.dbl?2:1)*cm,g.d[1])+m+(g.b||0);
 if(o.extra)dmg+=roll(o.extra[0]*cm,o.extra[1]);
 dmg+=(C.fd||0);if((hero.eq.w==="Sunblade of Dawn"||hero.eq.w==="Sword of the Blazing Star")&&e.undead)dmg+=roll(2,6);
 clog(head+(r.crit?"CRITICAL HIT! ":"Hit. ")+dmg+" damage.");sfx("hit");foeDamage(dmg)}
function castSpell(nm,field){curSpell=nm;const s=SPELLS[nm];if(hero.mana<s.mp){(field?say:clog)("Not enough "+RES[hero.cls].toLowerCase()+".");return false}
 const e=C&&C.e;hero.mana-=s.mp;const L=field?say:clog;
 switch(s.u){
  case"heal":{const n=roll(s.dice[0],s.dice[1])+(s.mod?mod(AT()[s.mod]):0)+(s.lvl?hero.level:0)+spBonus(),got2=healHero(Math.max(1,n));L(nm+": you recover "+got2+" HP.");sfx("heal");break}
  case"dmg":{const n=roll(s.dice[0],s.dice[1])+spBonus();clog(nm+" hits for "+n+" damage.");sfx("spell");foeDamage(n);break}
  case"atk":{const b=prof()+mod(AT()[CAST[hero.cls]])+(C.bless?2:0)+(C.fh||0),r=atkRoll(b,e.ac);
   if(!r.hit){clog(nm+": d20 "+r.d+sg(b)+" = "+r.tot+" vs AC "+e.ac+". It misses.");sfx("miss");break}
   const n=roll(s.dice[0]*(r.crit?2:1),s.dice[1])+spBonus();clog(nm+": d20 "+r.d+sg(b)+" = "+r.tot+". "+(r.crit?"CRITICAL! ":"")+n+" damage.");sfx("spell");foeDamage(n);break}
  case"atkw":clog(nm+"!");sfx("spell");weaponAttack(s);break;
  case"volley":{sfx("spell");for(let i=0;i<2&&e.hp>0;i++){const b=prof()+mod(AT().DEX)+(C.bless?2:0)+(C.fh||0),r=atkRoll(b,e.ac);
    if(r.hit){const n=roll(r.crit?2:1,8)+mod(AT().DEX);clog("Shot "+(i+1)+": d20 "+r.d+sg(b)+" = "+r.tot+". Hit for "+n+".");foeDamage(n)}else clog("Shot "+(i+1)+": d20 "+r.d+sg(b)+" = "+r.tot+". Miss.")}break}
  case"sleep":if(e.undead&&!s.any){clog(nm+" has no effect on the undead.")}else{e.skip=s.n;clog(nm+": "+e.name+" is held for "+s.n+" turns.")}sfx("spell");break;
  case"ward":C.ward=s.n;clog(nm+": +"+s.n+" AC for this fight.");sfx("spell");break;
  case"bless":C.bless=s.n;clog(nm+": +2 to hit for "+s.n+" turns.");sfx("spell");break;
  case"turn":sfx("spell");if(e.undead){const n=roll(4,6)+spBonus();clog(nm+": holy light sears the "+e.name+" for "+n+".");foeDamage(n);if(C&&!C.over&&Math.random()<.5){e.skip=2;clog(e.name+" cowers for 2 turns.")}}else clog(nm+": the "+e.name+" is not undead.");break;
  case"chord":{sfx("spell");e.skip=s.n;if(s.ward)C.ward=Math.max(C.ward,s.ward);clog(nm+": "+e.name+" is stunned for "+s.n+" turns.");foeDamage(roll(s.dice[0],s.dice[1])+spBonus());break}
  case"flee":clog(nm+": you slip away.");endCombat();return true}
 return true}
function useItem(nm,field){const it=ITEMS[nm];if(!hero.inv[nm])return false;const L=field?say:clog;
 if(it.heal){if(field&&hero.hp>=maxHP()){say("You are at full health.");return false}hero.inv[nm]--;const n=roll(it.heal[0],it.heal[1])+it.heal[2];L(nm+": you recover "+healHero(n)+" HP.");sfx("heal")}
 else if(it.mana){if(field&&hero.mana>=maxMP()){say("Already at full "+RES[hero.cls].toLowerCase()+".");return false}hero.inv[nm]--;const b=hero.mana;hero.mana=Math.min(maxMP(),hero.mana+it.mana);L(nm+": +"+(hero.mana-b)+" "+RES[hero.cls].toLowerCase()+".");sfx("heal")}
 else if(it.smoke){if(field)return false;hero.inv[nm]--;clog("You throw down the smoke vial and slip away.");endCombat();return true}
 if(hero.inv[nm]<=0)delete hero.inv[nm];return true}
function heroAct(fn){if(!C||C.busy||C.over)return;C.menu=null;const r=fn();if(r===false){rc();return}if(!C||C.over)return afterRender();
 if(C.e.hp<=0)return;C.busy=true;rc();setTimeout(foeTurn,650)}
function afterRender(){rc();hud();draw()}
function foeTurn(){if(!C||C.over)return;const e=C.e;
 if(e.skip>0){e.skip--;clog(e.name+" is held and cannot act.")}
 else{const n=e.sp==="multi"?2:1;
  for(let i=0;i<n&&hero.hp>0;i++){const ac=calcAC()+C.ward,r=atkRoll(e.atk,ac);fx3.strike();
   if(!r.hit){clog(e.name+" attacks: d20 "+r.d+sg(e.atk)+" = "+r.tot+" vs your AC "+ac+". Miss.");sfx("miss");continue}
   const dmg=roll(e.dn*(r.crit?2:1),e.ds)+e.db;hero.hp=Math.max(0,hero.hp-dmg);fx3.hurt(dmg);
   clog(e.name+" attacks: d20 "+r.d+sg(e.atk)+" = "+r.tot+". "+(r.crit?"CRITICAL! ":"Hit. ")+dmg+" damage.");sfx("hit");
   if(e.sp==="drain"&&hero.mana>0){hero.mana--;clog("It drains your "+RES[hero.cls].toLowerCase()+".")}
   if(e.sp==="charm"&&Math.random()<.4&&!C.lost){C.lost=1;clog("You are charmed and will lose your next action.")}}}
 if(hero.hp<=0)return defeat();
 if(C.bless>0)C.bless--;
 C.busy=false;hud();
 if(C.lost){C.lost=0;clog("You stand dazed and do nothing.");C.busy=true;rc();return setTimeout(foeTurn,650)}
 rc()}
function victory(){const e=C.e,out=[];C.over=true;C.won=1;fx3.die();C.menu=null;clog(e.name+" is defeated!");sfx("win");
 const g=Math.round((rnd(8)+C.tier*5)*(1+C.tier)*(window.OMEN?OMEN.m("reward"):1));hero.gold+=g;out.push(g+" gp");
 if(Math.random()<.55*(window.OMEN?OMEN.m("herb"):1)){giveItem("Healing herb");out.push("Healing herb")}
 if(Math.random()<.2+C.tier*.04){giveItem("Healing potion");out.push("Healing potion")}
 if(Math.random()<.08){giveItem("Mana potion");out.push("Mana potion")}
 if(C.tier>=1&&Math.random()<.1)out.push(addLoot(pickOne(["Ruby","Sapphire","Emerald","Moonstone"])));
 if(Math.random()<.05+C.tier*.025)out.push(addLoot(pickOne(POOL[C.tier])));
 clog("Loot: "+out.join(", ")+".");const x=[];addXp(Math.round(e.xp*(window.OMEN?OMEN.m("reward"):1)),x);x.forEach(clog);fixStats();rc();hud();save()}
function defeat(){C.over=true;C.dead=1;defeatedFlag=1;C.lost=0;const lost=Math.floor(hero.gold/2);hero.gold-=lost;fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hx=SX;hy=SY;syncP();reveal();
 clog("You fall... and wake at the Whisperwood camp. You lost "+lost+" gp.");rc();hud();draw();save()}
function endCombat(){const cb=C&&C.after,won=C&&C.won,dead=C&&C.dead;if(C)C.over=true;$("cbt").hidden=true;fx3.clear();C=null;fixStats();hud();draw();save();if(dead){closeDg();return}if(cb)cb(!!won)}
function rc(){if(!C)return;const e=C.e;
 $("cname").textContent=e.name+(e.undead?" (undead)":"");$("cname").style.color=e.col;
 $("ebar").style.width=Math.max(0,e.hp/e.max*100)+"%";$("ehp").textContent="HP "+e.hp+"/"+e.max+"  AC "+e.ac+(e.skip?"  (held)":"");
 $("hbar").style.width=Math.max(0,hero.hp/maxHP()*100)+"%";$("mbar").style.width=Math.max(0,hero.mana/maxMP()*100)+"%";
 $("hhp").textContent=hero.name+": HP "+hero.hp+"/"+maxHP()+"  "+RES[hero.cls]+" "+hero.mana+"/"+maxMP()+"  AC "+(calcAC()+C.ward);
 const lg=$("clog");lg.innerHTML="";C.lines.slice(-4).forEach((l,i,a)=>lg.appendChild(el("div",l,i===a.length-1?"last":"")));
 const m=$("cmenu");m.innerHTML="";const dis=C.busy;
 if(C.over){m.appendChild(btn(C.dead?"Rise again":"Continue",endCombat,"go"));return}
 if(C.menu==="spell"){known().forEach(n=>{const s=SPELLS[n],b=btn(n+" ("+s.mp+") - "+s.d,()=>heroAct(()=>castSpell(n)),"alt",dis||hero.mana<s.mp);m.appendChild(b)});m.appendChild(btn("Back",()=>{C.menu=null;rc()}))}
 else if(C.menu==="item"){const us=Object.keys(hero.inv).filter(n=>ITEMS[n].t==="u");if(!us.length)m.appendChild(el("p","You carry no consumables."));us.forEach(n=>m.appendChild(btn(n+" x"+hero.inv[n]+" - "+ITEMS[n].desc,()=>heroAct(()=>useItem(n)),"alt",dis)));m.appendChild(btn("Back",()=>{C.menu=null;rc()}))}
 else{m.appendChild(btn("Attack",()=>heroAct(()=>weaponAttack()),"go",dis));
  m.appendChild(btn(RES[hero.cls]==="Mana"?"Spells":"Skills",()=>{C.menu="spell";rc()},"alt",dis));
  m.appendChild(btn("Items",()=>{C.menu="item";rc()},"alt",dis));
  m.appendChild(btn("Flee",()=>heroAct(()=>{const r=rnd(20)+mod(AT().DEX);if(r>=10){clog("You flee (d20+DEX = "+r+").");endCombat();return true}clog("You fail to escape (d20+DEX = "+r+").")}),"alt",dis))}}
/* ---- pack screen ---- */
function openPack(){if(C)return;packOpen=true;$("pack").hidden=false;renderPack()}
function closePack(){packOpen=false;$("pack").hidden=true;hud();draw();save();if(DG)renderDg()}
function renderPack(){const b=$("packbox");b.innerHTML="";fixStats();
 b.appendChild(el("h2",hero.name+", level "+hero.level+" "+hero.race+" "+hero.cls));
 b.appendChild(el("p","HP "+hero.hp+"/"+hero.maxHp+" | "+RES[hero.cls]+" "+hero.mana+"/"+hero.maxMana+" | AC "+hero.ac+" | "+hero.gold+" gp | XP "+hero.xp+(XPT[hero.level]?"/"+XPT[hero.level]:""),"sub"));
 b.appendChild(el("p",Object.keys(AT()).map(k=>k+" "+AT()[k]+" ("+sg(mod(AT()[k]))+")").join("  "),"sub"));
 b.appendChild(el("h3","Equipped"));
 ["w","a","s","c"].forEach(sl=>{const n=hero.eq[sl],r=el("div",null,"line");r.appendChild(el("span",SLOT[sl]+": "+(n||"none")+(n&&ITEMS[n].desc?" - "+ITEMS[n].desc:""),"grow"));if(n)r.appendChild(btn("Remove",()=>{hero.eq[sl]=null;renderPack()}));b.appendChild(r)});
 b.appendChild(el("h3","Backpack"));
 const names=Object.keys(hero.inv);if(!names.length)b.appendChild(el("p","Empty.","sub"));
 const order={w:0,a:1,s:2,c:3,u:4,h:4.5,b:4.6,k:5,g:6};names.sort((a,c)=>order[ITEMS[a].t]-order[ITEMS[c].t]).forEach(n=>{const it=ITEMS[n],r=el("div",null,"line");
  let d=n+(hero.inv[n]>1?" x"+hero.inv[n]:"");if(it.t==="w")d+=" ("+it.d[0]+"d"+it.d[1]+(it.b?"+"+it.b:"")+")";if(it.t==="a"||it.t==="s")d+=" (AC +"+it.ac+")";if(it.t==="g")d+=" ("+it.v+" gp)";if(it.m)d+=" *magic*";if(it.desc)d+=" - "+it.desc;
  {const ik=iconFor(n,it);if(ik){const im=new Image();im.src=ICON[ik];im.className="ic";im.alt="";r.appendChild(im)}}r.appendChild(el("span",d,"grow"));
  if(SLOT[it.t]&&hero.eq[it.t]!==n)r.appendChild(btn("Equip",()=>{hero.eq[it.t]=n;renderPack()}));
  if(it.t==="u"&&!it.smoke)r.appendChild(btn("Use",()=>{useItem(n,true);renderPack();hud()}));
  if(it.t==="b")r.appendChild(btn("Read",()=>{closePack();readBook(n)}));if(it.t==="g")r.appendChild(btn("Sell",()=>{hero.gold+=it.v;hero.inv[n]--;if(hero.inv[n]<=0)delete hero.inv[n];renderPack();hud()}));
  b.appendChild(r)});
 b.appendChild(el("h3",RES[hero.cls]==="Mana"?"Spells":"Skills"));
 known().forEach(n=>{const s=SPELLS[n],r=el("div",null,"line");r.appendChild(el("span",n+" ("+s.mp+" "+RES[hero.cls].toLowerCase()+") - "+s.d,"grow"));if(s.field)r.appendChild(btn("Cast",()=>{castSpell(n,true);renderPack();hud()},"alt",hero.mana<s.mp));b.appendChild(r)});
 const nx=Object.keys(SPELLS).filter(n=>SPELLS[n].c.includes(hero.cls)&&SPELLS[n].lv>hero.level);if(nx.length)b.appendChild(el("p","Unlocks later: "+nx.map(n=>n+" (level "+SPELLS[n].lv+")").join(", "),"sub"));
 b.appendChild(btn("Close pack",closePack,"go"))}

/* ================= PHASE 4: NPCs, tarot, dungeons ================= */
let D=null,DG=null,voiceOn=false;
const JOBS={
 Innkeeper:{col:"#c9743a",rest:1,k:"inn"},Merchant:{col:"#c9a24a",shop:"Merchant",k:"merch"},Farmer:{col:"#8fa04a",k:"farm"},
 "Fortune-teller":{col:"#9a5ac0",tarot:1,k:"mystic"},Priest:{col:"#e8e0c0",bless:1,k:"priest"},Hermit:{col:"#8a7a6a",tarot:1,k:"mystic"},
 "Old soldier":{col:"#8a8f98",k:"soldier"},Witch:{col:"#5a9a5a",tarot:1,k:"witch"},Herbalist:{col:"#6aa84f",shop:"Herbalist",k:"herb"},
 Bard:{col:"#d86a8a",k:"bard"},Hunter:{col:"#8a6a3a",k:"hunter"},"Dwarf miner":{col:"#b07a4a",k:"dwarf"},
 Scholar:{col:"#5a7ac0",k:"scholar"},Ferryman:{col:"#4a8aaa",k:"ferry"},Nomad:{col:"#c0a060",tarot:1,k:"mystic"}
};
const LINES={
 inn:["The ale is watered down, but so is the well. Take your pick.","Stew is mutton on Tuesdays. And every other day, to be honest.","A gnome paid me in buttons last week. Buttons! I took them anyway.","Roof leaks over room three. Room three is cheaper because of it.","If you hear thumping in the cellar, that's the cat. Probably the cat."],
 merch:["Prices are fair, and also fixed, so don't bother haggling.","Bought a crate of fine candles. Fine only at being wax, as it turns out.","Everybody wants potions. Nobody wants to pay for the good ones.","Roads are bad this season, so my prices are bad too."],
 farm:["Turnips came in early. Don't ask me why. I'm not complaining.","My goat got into the barley again. That goat has a vendetta.","My knees say rain. My knees are never wrong, only late.","Orcs trampled my beans last spring. Beans don't forget."],
 mystic:["The cards hum when you're near. Either you're fated or I need sleep.","Never trust a cat that stares at the moon, nor a man who stares at his purse.","I once read for a king. He asked for a refund.","Mist before noon means a secret is awake somewhere."],
 priest:["Peace upon your road, traveler. And dry socks.","The old gods are patient. Their shrine roof is not, it leaks.","Light a candle where you can. The dark is never impressed by speeches."],
 soldier:["Thirty years on that tower. Not once did anybody bring me soup.","Goblins march the way they dance: badly, and loudly.","Keep your shield high and your opinions low. That's my whole secret."],
 witch:["Eye of newt? Please. It's mostly onions these days.","Don't mind the bubbling. It's soup. Possibly.","The swamp talks at night. Mostly complaints."],
 herb:["Foxglove for fevers, yarrow for cuts. Never swap them. Ask the last fellow.","A herb is just a weed with good publicity.","Green patches along the road are free for the taking. Take only what you need."],
 bard:["I've a song about a dragon afraid of heights. It rhymes badly.","Tip well and I'll make you sound braver in the next verse.","My lute has three strings. The fourth is a metaphor."],
 hunter:["Wolves hunt in packs. Never fight two when one will do.","Tracks by the water are fresh. Something large drinks here.","Quiet feet, loud arrows. That's the trade."],
 dwarf:["A good vein sings if you tap it right. This one only whimpers.","Stone's honest. It's the folk above ground you can't trust.","Dwarven mail is heavy for a reason. The reason is that it works."],
 scholar:["Fascinating ruin. The mortar alone is a thesis.","The old tongues have eleven words for 'ruin'. We use six of them daily.","I'm cataloguing every pebble. Slow work."],
 ferry:["The swamp has a mood, and today it's soggy.","I charge nothing, but the swamp charges a toll in socks.","Slow poles, steady hands. That's the whole trade."]
};
const TIPS=[
 "Undead fear holy light. Clerics and paladins can Turn them. Sleep does nothing to the dead.",
 "Healing herbs grow in green patches along the roads. Take them, they're free.",
 "Gold squares in the grass are chests. Some hold keys. Dungeon doors love keys.",
 "A rogue with lockpicks can open most doors. Anyone can force one, but it'll hurt.",
 "The farther from camp, the nastier the monsters. Go slowly if your gear is thin.",
 "Mana returns a little as you walk. Stamina too. Don't waste it on weak goblins.",
 "Gems sell for good coin. Open your pack and sell them when you're low.",
 "A shield and a talisman will save you more often than a bigger sword.",
 "Hidden dungeons only show when you're almost on top of them. Walk the edges of old ruins.",
 "Bless gives a bonus to hit for a few turns. Cast it before the big fight.",
 "If a fight goes badly, flee early. A smoke vial always works.",
 "Nymphs and Beholders can charm you into losing a turn. Kill them fast.",
 "Wraiths drain your mana. Cut them down before they empty you.",
 "Every dungeon has an alcove with a key, a guarded hall, and a locked door before the boss. Search the quiet rooms."
];
const FIRST=["Bram","Maudie","Tobias","Edda","Corwin","Sable","Ildrin","Pip","Hanna","Gorm","Wren","Osric","Tamsin","Yorick","Lenka","Dorrin"];
const LAST=["Thistlewood","Ashby","Marrow","Pennywhistle","Dunmore","Oakes","Fenn","Rook"];
/* ===== OCCULTICA: data ===== */
const PLN=[
 {n:"Saturn",g:"♄",m:"lead",d:6,c:"#9a8ab8",h:["Henbane","Nightshade","Comfrey"],v:"time, boundaries and endings",k:15},
 {n:"Jupiter",g:"♃",m:"tin",d:4,c:"#4a7ad0",h:["Hyssop","Sage","Betony"],v:"law, wealth and benevolence",k:34},
 {n:"Mars",g:"♂",m:"iron",d:2,c:"#d84a3a",h:["Wormwood","Nettle","Thistle"],v:"war, courage and severing",k:65},
 {n:"Sun",g:"☉",m:"gold",d:0,c:"#f0c030",h:["Saffron","Heliotrope","St John's Wort"],v:"life, glory and clarity",k:111},
 {n:"Venus",g:"♀",m:"copper",d:5,c:"#3ab87a",h:["Rose","Myrtle","Yarrow"],v:"love, beauty and harmony",k:175},
 {n:"Mercury",g:"☿",m:"quicksilver",d:3,c:"#e8903a",h:["Fennel","Lavender","Marjoram"],v:"speech, craft and cunning",k:260},
 {n:"Moon",g:"☽",m:"silver",d:1,c:"#c0d0f0",h:["Mugwort","Willow bark","Jasmine"],v:"dreams, tides and secrets",k:369}];
const DAYN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TALS={Saturn:{ac:3},Jupiter:{hp:6},Mars:{h:3},Sun:{hp:3,h:1},Venus:{sp:2},Mercury:{mp:5},Moon:{mp:3,sp:1}};
const TALD={Saturn:"+3 AC",Jupiter:"+6 max HP",Mars:"+3 to hit",Sun:"+3 max HP, +1 to hit",Venus:"+2 spell power",Mercury:"+5 max mana",Moon:"+3 max mana, +1 spell power"};
const ELXD={Saturn:{mana:6},Jupiter:{heal:[2,6,4]},Mars:{heal:[2,8,2]},Sun:{heal:[3,8,6]},Venus:{heal:[2,6,6]},Mercury:{mana:8},Moon:{mana:12}};
const AC_ALL=["Fighter","Paladin","Cleric","Rogue","Magician","Ranger"];
PLN.forEach(p=>{p.h.forEach(h=>{ITEMS[h]={t:"h",pl:p.n,desc:p.n+" herb, sacred to "+p.m+". Used in seals and elixirs."}});
 ITEMS["Seal of "+p.n]=Object.assign({t:"c",m:1,desc:"Planetary seal of "+p.n+" ("+TALD[p.n]+")."},TALS[p.n]);
 ITEMS["Elixir of "+p.n]=Object.assign({t:"u",desc:"Alchemical elixir of "+p.n+"."},ELXD[p.n].heal?{heal:ELXD[p.n].heal,desc:"Elixir of "+p.n+": restores health."}:{mana:ELXD[p.n].mana,desc:"Elixir of "+p.n+": restores "+ELXD[p.n].mana+" mana."})});
ITEMS["Philosopher's Stone"]={t:"c",hp:10,mp:6,sp:2,m:1,desc:"The Great Work, complete. +10 max HP, +6 max mana, +2 spell power."};
const BOOKS={
 "Corpus Hermeticum":{sp:"As Above, So Below",lore:"Seventeen treatises of Hermes Thrice-Great. They teach that the cosmos is a single living mind, and the adept a spark of it. The margins are written in your own handwriting, from a hand you have not yet used."},
 "Key of Solomon":{sp:"Solomonic Circle",lore:"The Clavicula Salomonis: pentacles, fasts, and the ordering of the planetary hours. Draw the circle once, and draw it exactly. What stands outside it is not impressed by sincerity."},
 "Picatrix":{sp:"Draw Down the Moon",lore:"Ghayat al-Hakim, the Aim of the Sage: the making of images beneath the stars and the secret correspondences of herb, stone and planet. It warns that the knowledge is bought, not given."},
 "Emerald Tablet":{sp:"Quintessence",lore:"That which is below is like that which is above, and that which is above is like that which is below, to accomplish the miracles of the one thing. A green slab, three lines deep, and nothing on earth is simpler or more dangerous."},
 "Grimorium Verum":{sp:"Binding Sigil",lore:"The True Grimoire. Its sigils bind a will to a name. The binder is bound as well, but only by what they did not read."},
 "Sepher Raziel":{sp:"Angelic Word",lore:"The Book of the Angel Raziel, keeper of the secrets. Its pages hum with names of the heavenly host. One word heals. One word unmakes. You must learn which is which."},
 "Lesser Key of Solomon":{sp:"Summon Goetic Spirit",lore:"The Goetia: seventy-two spirits, their ranks, seals and prices. Each page is a contract. You do not read it so much as are read by it."},
 "Book of Abramelin":{sp:"Holy Guardian Angel",lore:"Eighteen months of prayer, in a place apart, for a single meeting with your own guardian. You read the short version. It is long enough."},
 "Enochian Tablets":{sp:"Call of the Aethyrs",lore:"Thirty Aethyrs, nested like a dream inside a dream, in an angelic tongue that no mouth was meant to speak twice. The letters rearrange themselves when watched."},
 "Havamal Rune-Song":{sp:"Rune of Tiwaz",lore:"Odin hung nine nights on the windswept tree, wounded by his own spear, and took up the runes screaming. Eighteen charms follow. You will know the first."}};
Object.keys(BOOKS).forEach(k=>{ITEMS[k]={t:"b",desc:"Grimoire. Read it from your pack to learn "+BOOKS[k].sp+"."}});
Object.assign(SPELLS,{
 "As Above, So Below":{c:AC_ALL,lv:1,mp:3,g:1,d:"+2 to hit for 6 turns. Hermetic.",u:"bless",n:6},
 "Solomonic Circle":{c:AC_ALL,lv:1,mp:3,g:1,d:"+6 AC for this fight. Key of Solomon.",u:"ward",n:6},
 "Draw Down the Moon":{c:AC_ALL,lv:1,mp:5,g:1,d:"Silver fire, 3d8, no roll. Picatrix.",u:"dmg",dice:[3,8]},
 "Quintessence":{c:AC_ALL,lv:1,mp:6,g:1,d:"Heal 5d6 + WIS. Emerald Tablet.",u:"heal",dice:[5,6],mod:"WIS",field:1},
 "Binding Sigil":{c:AC_ALL,lv:1,mp:3,g:1,d:"Binds any foe for 3 turns. Grimorium Verum.",u:"sleep",n:3,any:1},
 "Angelic Word":{c:AC_ALL,lv:1,mp:4,g:1,d:"Heal 4d6 + WIS. Sepher Raziel.",u:"heal",dice:[4,6],mod:"WIS",field:1},
 "Summon Goetic Spirit":{c:AC_ALL,lv:1,mp:5,g:1,d:"A spirit strikes for 4d6, no roll. Goetia.",u:"dmg",dice:[4,6]},
 "Holy Guardian Angel":{c:AC_ALL,lv:1,mp:5,g:1,d:"+8 AC for this fight. Abramelin.",u:"ward",n:8},
 "Call of the Aethyrs":{c:AC_ALL,lv:1,mp:6,g:1,d:"Roll to hit. 5d8 force. Enochian.",u:"atk",dice:[5,8]},
 "Rune of Tiwaz":{c:AC_ALL,lv:1,mp:4,g:1,d:"Roll to hit. 3d10 spear of light. Havamal.",u:"atk",dice:[3,10]}});
TIPS.push("Herbs gathered on their planet's day yield double: Saturn on Saturday, Jupiter on Thursday, Mars on Tuesday, Sun on Sunday, Venus on Friday, Mercury on Wednesday, Moon on Monday.",
 "Occult temples hide grimoires. Read one from your pack and any class can learn its spell.",
 "At the Circle of the Seven Seals you can craft a planetary Seal from three herbs of that planet and 40 gold.",
 "The Great Work needs four elixirs brewed at the Athanor: Saturn (black), Moon (white), Sun (yellow), Mars (red).",
 "A bad I Ching omen means an ambush. A good one grants fortune in your next fights.",
 "The Archon's Gate reveals every hidden dungeon, but only to one who defeats its keeper.");
Object.assign(JOBS,{Alchemist:{col:"#c0a040",shop:"Occultist",k:"alch"},Astrologer:{col:"#4a5ab0",tarot:1,k:"astro"},Oracle:{col:"#a04a8a",tarot:1,ich:1,k:"oracle"},Magus:{col:"#6a3a9a",shop:"Occultist",k:"magus"},Gnostic:{col:"#c8c8a0",k:"gnostic"},Cultist:{col:"#3a2a40",k:"cult"}});
JOBS.Witch.shop="Occultist";
Object.assign(LINES,{
 alch:["Solve et coagula: dissolve, then bind. Most folk only manage the dissolving.","Four stages to the Work: black, white, yellow, red. Skip one and the flask cracks.","Lead is Saturn's metal. Sit with it long enough and it teaches patience, or madness.","The Athanor in the desert never goes cold. I have stopped asking who feeds it.","Visita Interiora Terrae Rectificando Invenies Occultum Lapidem. Visit the interior of the earth and, rectifying, you will find the hidden stone.","A homunculus is just a bad idea that learned to walk."],
 astro:["Gather herbs on their planet's day and the yield doubles. Wormwood on Tuesday, mugwort on Monday.","Saturn rules Saturday and old age and every door that closes. Do not begin a journey under him.","As above, so below. The stars do not push, but they do lean.","A seal cut under the right planet holds. Cut under the wrong one, it merely looks pretty.","Seven wanderers, seven metals, seven days. The week is a spell we all cast without knowing."],
 oracle:["Three coins, six times, and the Book of Changes answers. It is never wrong, only blunt.","When a line grows old it turns into its opposite. So does luck.","Standstill follows peace, and peace follows standstill. Weep at neither.","The sage does not ask whether to act. The sage asks what the moment wants."],
 magus:["The Key of Solomon begins with fasting and ends with a circle that must not be broken. Remember both.","Names have weight. Say one wrong in the circle and something answers that you did not call.","A grimoire is not a spellbook. It is a contract with the author's dead intentions.","The Picatrix teaches the making of images beneath the stars. It also teaches regret.","I bind spirits by name and by seal. They resent it. They always resent it."],
 gnostic:["The world was made by a blind craftsman who believed he was alone. Something in you remembers otherwise.","The Archons keep the gates of the seven heavens. Each asks for a password the body does not know.","Matter is a prison, but the lock is on the inside.","Sophia fell, and the spark fell with her. Every one of us is a splinter of that light.","Do not seek to be saved. Seek to remember."],
 cult:["The robes are warm. The rites are not.","We do not worship. We attend.","Hush. The candle remembers your name.","Something under the hill answers to a number. I will not say which."]});
LINES.witch.push("Mugwort for dreams, wormwood for courage, henbane for... don't ask what for.","Cross the threshold left foot first or the house will notice.","We keep the old calendar. The moon owes us rent.","Hecate keeps the crossroads. Leave her a candle, not a request.","The cards say you'll meet a stranger. I am the stranger. Hello.","Never accept a gift from a witch. Do accept the soup.");
const _F=(a,b)=>FOES[a].push(b);
_F("forest",["Black Cultist",14,12,4,1,8,2,50,0,"#3a2a3a"]);_F("forest",["Coven Witch",18,12,5,1,6,2,75,1,"#6a3a8a","charm"]);_F("forest",["Goetic Wraith",26,13,6,2,6,2,120,2,"#b04a4a","drain",1]);
_F("tundra",["Draugr",30,14,6,1,10,3,110,2,"#7a9a9a","drain",1]);_F("tundra",["Rune Magus",22,13,5,2,6,2,100,2,"#5a7ac0"]);
_F("mountain",["Cult Magus",20,13,5,2,6,2,95,2,"#5a2a8a"]);_F("mountain",["Archon",52,16,7,2,8,4,290,3,"#d8c060"]);
_F("swamp",["Homunculus",9,13,4,1,6,2,35,0,"#c08a8a","drain"]);_F("swamp",["Mirewitch",22,13,6,1,8,3,105,1,"#4a8a5a","charm"]);_F("swamp",["Lemure",18,12,5,1,6,2,60,1,"#8a6a5a","drain"]);
_F("desert",["Ushabti Guardian",28,15,6,1,10,3,105,2,"#c0a050"]);_F("desert",["Sand Magus",20,13,5,2,6,2,95,2,"#a0703a"]);
_F("hills",["Rogue Mage",22,13,5,2,6,2,100,2,"#7a4a90"]);_F("hills",["Bael, Goetic King",60,16,8,2,8,4,360,3,"#a02030","multi"]);
const GUARD={cult:["Black Cultist",20,12,5,1,8,3,80,0,"#3a2a3a"],ush:["Ushabti Guardian",34,15,6,1,10,3,140,0,"#c0a050"],drg:["Draugr",36,14,6,1,10,3,140,0,"#7a9a9a","drain",1],arch:["Archon",52,16,7,2,8,4,290,0,"#d8c060"],lem:["Lemure",30,13,5,1,8,3,110,0,"#8a6a5a","drain"]};
const GODS=[["Hecate","Greek","crossroads, witchcraft, the three-faced torch-bearer"],["Hermes Trismegistus","Hellenistic Egyptian","Thrice-Great, author of the Hermetica"],["Thoth","Egyptian","writing, measure and the moon"],["Isis","Egyptian","great magic and the hidden name of Ra"],["Osiris","Egyptian","the dismembered lord of the dead and the grain"],["Anubis","Egyptian","jackal-headed guide of souls"],["Set","Egyptian","storm, chaos and the red desert"],["Ra","Egyptian","the sun-barque that sails the underworld each night"],["Maat","Egyptian","truth, whose feather weighs the heart"],["Zeus","Greek","sky, oaths and thunder"],["Athena","Greek","craft and strategy"],["Apollo","Greek","prophecy, plague and the lyre"],["Dionysus","Greek","ecstasy, wine and mysteries"],["Persephone","Greek","queen of the underworld"],["Pan","Greek","wild places and sudden panic"],["Nyx","Greek","primordial night"],["Odin","Norse","the one-eyed, who won the runes"],["Freya","Norse","seidr magic and the slain"],["Hel","Norse","keeper of the unhonored dead"],["Loki","Norse","trickster and shapeshifter"],["Shiva","Hindu","destroyer and ascetic, dancer in the fire"],["Kali","Hindu","time devouring itself"],["Vishnu","Hindu","the preserver of ten descents"],["Ganesha","Hindu","remover of obstacles"],["Durga","Hindu","the unconquerable mother"],["Guanyin","Buddhist","she who hears the cries of the world"],["Amitabha","Buddhist","infinite light of the Pure Land"],["Amaterasu","Shinto","sun goddess, hidden in her cave"],["Susanoo","Shinto","storm and the serpent-slayer"],["Inari","Shinto","rice, foxes and fortune"],["Quetzalcoatl","Aztec","feathered serpent of wind and learning"],["Tezcatlipoca","Aztec","smoking mirror, night and fate"],["Tlaloc","Aztec","rain and mountain springs"],["Inanna-Ishtar","Mesopotamian","love and war, who descended and returned"],["Marduk","Babylonian","dragon-slayer, builder of the ziggurat-city"],["Tiamat","Babylonian","the salt sea, mother of monsters"],["Ereshkigal","Mesopotamian","queen of the great below"],["Cernunnos","Celtic","horned lord of beasts"],["The Morrigan","Celtic","crow-queen of battle and fate"],["Brigid","Celtic","flame, forge and poetry"],["Mithras","Persian-Roman","bull-slayer of the cave mysteries"],["Ahura Mazda","Zoroastrian","wise lord of light and truth"],["Angra Mainyu","Zoroastrian","the destructive spirit of the lie"],["Perun","Slavic","the thunder oak"],["Tengri","Turkic-Mongol","the eternal blue sky"],["Papa Legba","Vodou","opener of the crossroads gate"],["Pachamama","Andean","the earth that feeds and takes back"],["Baal","Canaanite","storm rider of the high places"],["Dagon","West Semitic","lord of the grain"],["Abraxas","Gnostic","Abrasax, the three hundred and sixty-five heavens"],["Sophia","Gnostic","Wisdom, fallen into matter"],["Yaldabaoth","Gnostic","the blind demiurge who thought himself alone"],["The Pleroma","Gnostic","the Fullness beyond all aeons"],["Metatron","Jewish mystical","scribe of heaven"],["Michael","Abrahamic angelic","captain of the host"],["Lilith","Mesopotamian and Jewish folklore","night spirit of storm and wasteland"],["The Nameless","Abrahamic","no statue stands here. The niche is empty by design"]];
const RUNES=[["Fehu","wealth, cattle, gold that must be kept moving"],["Uruz","the aurochs: raw strength and health"],["Thurisaz","the thorn: a gate, a giant, a warning"],["Ansuz","the divine word, breath and inspiration"],["Raidho","the ride: a journey and its right order"],["Kenaz","the torch: knowledge and craft"],["Gebo","the gift: exchange that binds both parties"],["Wunjo","joy, harmony, the end of sorrow"],["Hagalaz","hail: disruption that cannot be bargained with"],["Nauthiz","need: the fire made by friction"],["Isa","ice: stillness, and the stuckness of things"],["Jera","the year: harvest after the proper season"],["Eihwaz","the yew: the axis between worlds, death and endurance"],["Perthro","the lot-cup: fate, mystery and the hidden thing"],["Algiz","the elk-sedge: protection with open arms"],["Sowilo","the sun: victory and guidance"],["Tiwaz","the spear of Tyr: justice, bought with sacrifice"],["Berkano","the birch: birth, growth, the mother"],["Ehwaz","the horse: trust between two who move as one"],["Mannaz","humankind: the self among others"],["Laguz","water: intuition, the deep and the flood"],["Ingwaz","the seed: potential stored for the right time"],["Dagaz","dawn: the breakthrough, the day after the dark"],["Othala","the homestead: inheritance and what is truly yours"]];
const HEX=["The Creative|Strength that begins all things.","The Receptive|Yield, and carry.","Difficulty at the Beginning|Birth pains. Keep going.","Youthful Folly|Ask the teacher, once.","Waiting|Nourish yourself. The rain is coming.","Conflict|Do not press the quarrel to its end.","The Army|Discipline decides the war.","Holding Together|Bind yourself to the right companion.","Small Taming|Small forces gather. Clouds, but no rain yet.","Treading|Walk behind the tiger with care.","Peace|Heaven and earth meet. Enjoy it while it lasts.","Standstill|The doors are closed. Withdraw and endure.","Fellowship|Open company beyond your own clan.","Great Possession|Wealth requires modesty.","Modesty|The mountain hidden beneath the earth.","Enthusiasm|Music moves armies. Prepare.","Following|Adapt to the times.","Work on the Decayed|Repair what the elders spoiled.","Approach|Spring draws near. Act soon.","Contemplation|Look, and be seen.","Biting Through|Break the obstruction.","Grace|Beauty adorns but is not the thing.","Splitting Apart|The house is falling. Stay still.","Return|The turning point. Begin again.","Innocence|Do not scheme. The unexpected comes.","Great Taming|Hold your power in reserve.","Nourishment|Mind what you swallow and what you say.","Great Exceeding|The ridgepole sags. Move boldly.","The Abysmal|Danger on danger. Be sincere.","The Clinging|Fire needs fuel. Cling to the right thing.","Influence|Attraction. Open yourself to the courting.","Duration|Persist in the right direction.","Retreat|Withdraw before the dark advances.","Great Power|Strength. Do not abuse it.","Progress|The sun rises over the earth.","Darkening of the Light|Hide your brightness in the dark times.","The Family|Order begins at the hearth.","Opposition|Estranged, yet small things still align.","Obstruction|Water on the mountain. Turn back and reflect.","Deliverance|Thunder breaks the storm. Forgive and move on.","Decrease|Lessen yourself. A sincere offering suffices.","Increase|Wind and thunder. Benefit by helping others.","Breakthrough|Resolve. Announce the truth.","Coming to Meet|A dangerous temptation arrives uninvited.","Gathering|Assemble, and make sacrifice.","Pushing Upward|Climb slowly toward the light.","Oppression|Exhausted, the lake has drained. Keep your word.","The Well|The village changes. The well does not.","Revolution|Molting. Change at the right moment.","The Cauldron|The vessel of transformation feeds the wise.","The Arousing|Thunder. Shock, then laughter.","Keeping Still|The mountain. Stop, and see.","Development|Gradual progress, like a tree on the mountain.","The Marrying Maiden|Beware the unequal bond.","Abundance|The noon sun. It will wane.","The Wanderer|A stranger in a strange land. Be courteous.","The Gentle|Wind. Penetrate gently and persist.","The Joyous|The lake smiles. Sincerity.","Dispersion|Dissolve the ice of ego.","Limitation|Set boundaries. Do not be bitter.","Inner Truth|Even pigs and fishes are moved.","Small Exceeding|Attend to small things.","After Completion|Order at last. The danger returns.","Before Completion|Nearly across. The fox wets his tail."];
const HEXG=[1,11,14,15,16,17,19,24,25,32,35,37,42,46,48,50,53,55,57,58,61],HEXB=[6,12,23,29,33,36,38,39,44,47];
const HLOW=[[0,0],[4,4],[1,2],[2,3],[0,2],[2,0],[2,4],[4,2],[0,5],[7,0],[0,4],[4,0],[6,0],[0,6],[3,4],[4,1],[1,7],[5,3],[7,4],[4,5],[1,6],[6,3],[4,3],[1,4],[1,0],[0,3],[1,3],[5,7],[2,2],[6,6],[3,7],[5,1],[3,0],[0,1],[4,6],[6,4],[6,5],[7,6],[3,2],[2,1],[7,3],[1,5],[0,7],[5,0],[4,7],[5,4],[2,7],[5,2],[6,7],[5,6],[1,1],[3,3],[3,5],[7,1],[6,1],[3,6],[5,5],[7,7],[2,5],[7,2],[7,5],[3,1],[6,2],[2,6]];
const TRIG=[[1,1,1],[1,0,0],[0,1,0],[0,0,1],[0,0,0],[0,1,1],[1,0,1],[1,1,0]],TRIGN=["Heaven","Thunder","Water","Mountain","Earth","Wind","Fire","Lake"];
const HMAP={};HLOW.forEach((lu,i)=>{HMAP[lu[0]*8+lu[1]]=i+1});
const KAM={3:[[4,9,2],[3,5,7],[8,1,6]],4:[[4,14,15,1],[9,7,6,12],[5,11,10,8],[16,2,3,13]],5:[[11,24,7,20,3],[4,12,25,8,16],[17,5,13,21,9],[10,18,1,14,22],[23,6,19,2,15]],6:[[6,32,3,34,35,1],[7,11,27,28,8,30],[19,14,16,15,23,24],[18,20,22,21,17,13],[25,29,10,9,26,12],[36,5,33,4,2,31]],7:[[22,47,16,41,10,35,4],[5,23,48,17,42,11,29],[30,6,24,49,18,36,12],[13,31,7,25,43,19,37],[38,14,32,1,26,44,20],[21,39,8,33,2,27,45],[46,15,40,9,34,3,28]]};
(function(){const n=8,a=[];for(let r=0;r<n;r++){a.push([]);for(let c=0;c<n;c++){let v=r*n+c+1;if(r%4===c%4||(r%4)+(c%4)===3)v=65-v;a[r].push(v)}}KAM[8]=a;
 const m=9,s=[];for(let r=0;r<m;r++)s.push(new Array(m).fill(0));let r=0,c=(m-1)/2;for(let k=1;k<=m*m;k++){s[r][c]=k;const nr=(r-1+m)%m,nc=(c+1)%m;if(s[nr][nc]){r=(r+1)%m}else{r=nr;c=nc}}KAM[9]=s})();
const KORD=[3,4,5,6,7,8,9];

/* ===== KNIGHTHOOD: data ===== */
const KNR=["Unsworn","Squire","Knight","Knight-Commander","Master of the Order"],KNLV=[0,1,3,5,7],MARTIAL=["Fighter","Ranger","Paladin"];
const KNB=[{},{hp:3},{hp:6,ac:1},{hp:10,ac:1,h:1},{hp:15,ac:2,h:2}];
function knB(k){if(typeof hero==="undefined"||!hero||!hero.kn)return 0;const r=hero.kn.rank|0;if(!r)return 0;let v=KNB[r][k]||0;if(MARTIAL.includes(hero.cls)){if(k==="hp")v=Math.ceil(v*1.5);if(k==="h"&&r>=2)v+=1}return v}
const KN=()=>hero.kn||(hero.kn={rank:0,sw:{},les:{},rest:-99});
Object.assign(ITEMS,{"Sword of the Square":{t:"w",d:[1,8],b:1,h:1,m:1,desc:"Hewn true. +1 to hit, +1 damage."},"Plumb-Line Sword":{t:"w",d:[1,10],b:2,h:1,m:1,desc:"It never leans. +1 to hit, +2 damage."},"Compass Sword":{t:"w",d:[1,10],b:2,h:2,m:1,desc:"Keeps within its bounds. +2 to hit, +2 damage."},"Sword of the Blazing Star":{t:"w",d:[2,6],b:3,h:2,m:1,desc:"The spark of the Pleroma. +2 to hit, +3 damage, burns the undead."}});
Object.assign(SPELLS,{"Vow of the Order":{c:AC_ALL,lv:1,mp:2,g:1,d:"+2 to hit for 5 turns. Knighthood.",u:"bless",n:5},"Shield of the Order":{c:AC_ALL,lv:1,mp:3,g:1,d:"+5 AC for this fight. Knighthood.",u:"ward",n:5},"Mercy of the Order":{c:AC_ALL,lv:1,mp:3,g:1,d:"Heal 3d6 + CHA. Knighthood.",u:"heal",dice:[3,6],mod:"CHA",field:1},"Blazing Star":{c:AC_ALL,lv:1,mp:5,g:1,d:"4d8 light, no roll. Master's technique.",u:"dmg",dice:[4,8]},
 "Knight's Charge":{c:["Fighter","Paladin","Ranger"],lv:1,mp:3,g:1,d:"Weapon attack, double dice. Knighthood.",u:"atkw",dbl:1},"Templar's Smite":{c:["Fighter","Paladin"],lv:1,mp:4,g:1,d:"Weapon attack + 4d8 radiant. Knighthood.",u:"atkw",extra:[4,8]},"Pathfinder's Mark":{c:["Ranger"],lv:1,mp:3,g:1,d:"Weapon attack + 3d6 marked-prey damage.",u:"atkw",extra:[3,6]}});
const KNL=[["The Square","Honest dealing: act on the square.","The Square tests a corner. It teaches you to measure your deeds against what is true, and to deal fairly with all."],["The Compass","Keep your passions within bounds.","The Compass draws the circle past which desire does not go. A hero's strength includes the strength to stop."],["The Level","All stand equal before the dust.","The Level reminds the knight that rank is a duty, not a rung above others. Prince and beggar share the grave."],["The Plumb Line","Uprightness of conduct.","The Plumb Line hangs true at any hour. So should a knight's word."],["The Two Pillars","Strength and establishment, severity and mercy.","Two columns hold the gate: strength and steadiness. Justice needs both, and the knight walks between them."],["The Checkered Floor","Light and shadow, walked together.","Black squares and white, joined. Good and ill are met on the same floor, and the wise walk it without fear of either."],["The Rough Ashlar","The self before the work.","An unhewn stone, as you were. The Perfect Ashlar is the same stone after patient craft. It was never a different stone."],["The Trowel","Spread kindness like mortar.","The trowel spreads the cement that unites. Fellowship is mortar. It is spread, never hoarded."],["The Ladder","Faith, hope and charity.","Rungs rising toward the stars. Charity is the highest, and the only rung you cannot leave behind."],["The Blazing Star","The spark of truth within.","In the Gnostic reading, the star is the spark of the Pleroma lodged in you. It guides, and it is yours to feed."],["The Beehive","Honest industry.","Many hands, one work. A knight is no idler."],["The Acacia","What endures beyond the grave.","A sprig of evergreen: the part of a deed that does not die."]];
const KNSTAGE=["The Call: an old order has set a charge before you. Seek its halls: the Two Pillars in the forest, the Checkered Floor in the hills, the Winter Watch in the tundra, and the Blazing Star in the mountains.","The Trials: you are a Squire. The Preceptory of the Checkered Floor will test your understanding as well as your arm.","The Ordeal: you are a Knight. At the Winter Watch you must stand a night vigil and meet what comes.","The Abyss: you are a Knight-Commander. At the Blazing Star you will face the one opponent you have not yet fought.","The Return: you are a Master of the Order. Carry the light back to the world."];
Object.assign(JOBS,{Templar:{col:"#d8d8e8",shop:"Armorer",k:"templar"}});
LINES.templar=["Strength is a pillar, not a fist. Stand like one.","We do not call it a secret. We call it a discipline.","A knight is stone that has agreed to be shaped.","The floor is checkered because the road is. Walk on both colors.","Rank is a duty, not a rung.","Swear to the true, never to the loud.","The Rough Ashlar is you today. The Perfect Ashlar is the same stone, later."];
TIPS.push("Four Gnostic Templar halls hold trials. Each trial earns a rank, a lesson and a technique, and each opens a vault with a magic sword.","Knighthood helps every class. Fighters, Rangers and Paladins gain extra health and a to-hit bonus from every rank.");
/* ---- geometry lessons, harmonic spells, meditation lore ---- */
Object.assign(SPELLS,{
 "Perfect Fifth":{c:["Rogue"],lv:1,mp:2,g:1,d:"Strike a 3:2 chord. Any foe, even the undead, is stunned for 1 turn.",u:"sleep",n:1,any:1,mus:[1,1.5]},
 "Octave Chime":{c:["Rogue"],lv:2,mp:3,g:1,d:"A 2:1 octave rings out. Any foe is stunned for 2 turns.",u:"sleep",n:2,any:1,mus:[1,2]},
 "Pythagorean Chord":{c:["Rogue"],lv:4,mp:4,g:1,d:"A 4:5:6 chord. Stuns for 2 turns and the dissonance wounds. 2d6.",u:"chord",n:2,dice:[2,6],mus:[1,1.25,1.5]},
 "Harmony of the Spheres":{c:["Rogue"],lv:6,mp:5,g:1,d:"Seven notes in ratio. Stuns for 3 turns, 3d6 damage, and steadies you: +2 AC this fight.",u:"chord",n:3,dice:[3,6],ward:2,mus:[1,1.125,1.25,1.5,2]}});
const GEOS=["The Monochord","The Builder's Triangle","The Vesica Piscis","The Pentagram and the Golden Section","The Cube and the Six Faces"];
KNL.push(
 ["The Monochord","Halve the string and you hear the octave.","The Order's masters taught that music is number made audible. Stop a string at its middle and it sounds the octave, 2 to 1. Two thirds gives the fifth, 3 to 2. Three quarters gives the fourth, 4 to 3. Harmony is not luck. It is proportion, and the same proportions are said to govern the spheres.",()=>geoFig(0)],
 ["The Builder's Triangle","Three, four and five make a true corner.","A cord with twelve knots, laid out 3, 4 and 5, makes a perfect right angle. Builders of cathedrals used it to set the square of every wall. The lesson: a sound structure, like a sound life, rests on a true corner.",()=>geoFig(1)],
 ["The Vesica Piscis","Two circles that share their centres make a lens of light.","Draw two equal circles, each passing through the centre of the other. Where they overlap lies the vesica, the lens or fish-bladder shape. From it an equal triangle can be raised, and from the triangle, much else. It stands for unity giving birth to difference without losing itself.",()=>geoFig(2)],
 ["The Pentagram and the Golden Section","Each part bears to the whole as the greater part bears to the lesser.","In the five-pointed star every line cuts another in the golden ratio, about 1.618 to 1. The old schools prized it as the proportion of living things: shells, flowers and the human hand. A knight is asked to cut his life the same way, so each part serves the whole.",()=>geoFig(3)],
 ["The Cube and the Six Faces","The cube is the stable earth.","Six faces, twelve edges, eight corners, and every one a right angle. The cube was the old emblem of the earth and of steadfastness. The lesson: be foursquare, firm on every side you present to the world.",()=>geoFig(4)]);
TIPS.push("Pass the first trial of the knights and you can meditate. Press M, sit still, and heal. Do it inside a temple and nothing can touch you.","In the open, meditation heals you but the wild may find you. Pick your ground.","A Rogue who studies the geometry of the Order learns to stun foes with chords. The math is the music.");
/* ---- meditation visions: side quests ---- */
Object.assign(ITEMS,{
 "Lamp of the Thrice-Great":{t:"c",m:1,mp:4,desc:"A flame that needs no oil. +4 max mana."},
 "Stag-Skull Charm":{t:"c",m:1,hp:8,desc:"Antlers that grow green each spring. +8 max HP."},
 "Leaden Ring":{t:"c",m:1,ac:2,hp:4,desc:"Heavy with the patience of Saturn. +2 AC, +4 HP."},
 "Philosopher's Salt":{t:"c",m:1,mp:6,sp:1,desc:"White salt from a cold athanor. +6 max mana, +1 spell power."},
 "Yarrow Stalks":{t:"c",m:1,h:2,sp:1,desc:"Fifty stalks, one set aside. +2 to hit, +1 spell power."},
 "Tiwaz Spearhead":{t:"c",m:1,h:2,hp:3,desc:"Odin's rune cut into iron. +2 to hit, +3 HP."},
 "Sigil of the Seven":{t:"c",m:1,ac:1,h:1,hp:4,mp:2,sp:1,desc:"Seven planets in one seal. +1 AC, +1 to hit, +4 HP, +2 mana, +1 spell power."}});
Object.assign(SPELLS,{
 "Veil of Visions":{c:AC_ALL,lv:1,mp:3,g:1,d:"A veil of futures already seen. +3 AC for this fight.",u:"ward",n:3},
 "Choir Song":{c:AC_ALL,lv:2,mp:3,g:1,d:"A voice that is not yours. Heals 2d6 + level.",u:"heal",dice:[2,6],lvl:1,field:1}});
const VQ=[
 {id:"lamp",lv:1,t:"The Lamp That Drinks",site:"hermes",need:[["pl","Sun",3]],vis:"A roofless sanctum. A lamp with no oil, and it burns. Three golden flowers lie at its foot, and the flame bends toward you as if it wanted to speak.",rw:{xp:80,item:"Lamp of the Thrice-Great"},done:"You lay the Sun herbs at the foot of the lamp. The flame drinks them and a small light stays in your palm."},
 {id:"stag",lv:1,t:"The Hungry Stag",site:"coven",need:[["pl","Moon",2],["pl","Venus",2]],vis:"A stag skull on a post. A woman with no face lays silver flowers and soft roses in its jaws. The antlers fill with green leaves, then drop them, then fill again.",rw:{xp:90,gold:40,item:"Stag-Skull Charm"},done:"You feed the stag skull. The coven sings one low word and a charm of antler is pressed into your hand."},
 {id:"lead",lv:2,t:"The Weight of Years",site:"seals",need:[["i","Seal of Saturn",1],["pl","Saturn",2]],vis:"Seven standing stones. The first, the heaviest, is cracked across. Lead-grey flowers wilt in your hands, and a seal pressed into the crack makes the whole stone ring like a bell.",rw:{xp:120,item:"Leaden Ring"},done:"The seal sinks into the crack and the stone rings. When the sound fades there is a ring of lead at your feet."},
 {id:"salt",lv:3,t:"The Salt of Sol",site:"athanor",need:[["i","Elixir of Sun",1],["pl","Mercury",3]],vis:"A furnace gone cold. You pour golden light into it and add quicksilver herbs, and on the cold glass a white salt crystallizes, star by star.",rw:{xp:160,item:"Philosopher's Salt"},done:"Gold and quicksilver meet in the cold athanor. A white salt grows on the glass and you collect it."},
 {id:"coins",lv:3,t:"Coins Without a Face",site:"iching",need:[["hex",null,8]],vis:"Three coins fall and never land. Each time they turn you see a line, broken or whole. Eight shapes pass before the sound stops.",rw:{xp:150,item:"Yarrow Stalks"},done:"You have read eight hexagrams. The oracle sets a bundle of yarrow stalks before you."},
 {id:"spear",lv:4,t:"The Nine Nights",site:"runes",need:[["pl","Mars",3]],vis:"A tree in a gale. A spear in your side. Red flowers heaped at the roots to feed the wound. The wind speaks one rune, once.",rw:{xp:180,item:"Tiwaz Spearhead"},done:"You feed the roots with Martian herbs. The wind speaks its rune and an iron spearhead drops from the branches."},
 {id:"scribe",lv:5,t:"What the Scribe Wrote",site:"pyramid",need:[["read",null,3],["i","Elixir of Moon",1]],vis:"An ibis-headed scribe. Three books open on his table, and a silver cup beside them. He writes your name without looking up and the ink does not dry.",rw:{xp:200,spell:"Veil of Visions"},done:"Three books read and a silver cup emptied. The scribe finishes your name and you learn the Veil of Visions."},
 {id:"choir",lv:5,t:"The Missing Voice",site:"cathedral",need:[["pl","Jupiter",3],["i","Healing herb",2]],vis:"A choir stall with one empty seat. Blue flowers strewn on the stone, green herbs in a bowl, and the empty seat hums the missing note.",rw:{xp:220,spell:"Choir Song"},done:"You fill the empty stall with herbs and flowers. The note is sung, and you learn the Choir Song."},
 {id:"seven",lv:6,t:"Seven for Seven",site:"ziggurat",need:[["i","Seal of Mars",1],["i","Seal of Jupiter",1],["i","Seal of Venus",1]],vis:"Seven stages climbing. At each a different seal burns. Three are dark and they are the ones you hold. Place them and the whole tower lights.",rw:{xp:300,item:"Sigil of the Seven"},done:"You set the seals on their stages. The ziggurat lights from base to crown and the Sigil of the Seven forms in the air."}];
TIPS.push("Meditate and the stars may send you a vision. A vision is a task, and the Codex remembers it for you.");

const NPCS=[];
function addNpc(job,ax,ay){for(let r=1;r<10;r++)for(let k=0;k<24;k++){const ang=k/24*6.283+NPCS.length*1.3,x=Math.round(ax+Math.cos(ang)*r),y=Math.round(ay+Math.sin(ang)*r);
 if(x<1||y<1||x>=W-1||y>=H-1||!reach[y*W+x]||(x===SX&&y===SY)||POIS.some(p=>p.x===x&&p.y===y)||PICK.some(p=>p.x===x&&p.y===y)||NPCS.some(p=>Math.abs(p.x-x)+Math.abs(p.y-y)<2))continue;
 const i=NPCS.length;NPCS.push({id:"n"+i,name:(/^(Innkeeper|Fortune-teller|Witch|Herbalist|Oracle|Seer)$/.test(job)?["Maudie","Edda","Hanna","Wren","Tamsin","Lenka","Sable","Ildrin"][(i*3+1)%8]:["Bram","Tobias","Corwin","Pip","Gorm","Osric","Yorick","Dorrin"][(i*3+2)%8])+" "+LAST[(i*3+(i>>4))%LAST.length],job,x,y,seed:i});return}}
{const v=POIS.find(p=>p.id==="village");["Innkeeper","Merchant","Farmer","Fortune-teller"].forEach(j=>addNpc(j,v.x,v.y));
 [["shrine","Priest"],["ice","Hermit"],["fort","Old soldier"],["hut","Witch"],["obelisk","Nomad"],["ruin","Scholar"]].forEach(([id,j])=>{const p=POIS.find(q=>q.id===id);addNpc(j,p.x,p.y)});
 [["Bard","forest",-6,4],["Hunter","forest",5,-8],["Herbalist","hills",4,3],["Dwarf miner","mountain",-3,4],["Ferryman","swamp",-4,-3],["Merchant","desert",6,-4],["Farmer","hills",-2,8],["Bard","tundra",5,4]].forEach(([j,b,dx,dy])=>{const a=BIOMES[b].at;addNpc(j,a[0]+dx,a[1]+dy)})}
{const A=id=>POIS.find(q=>q.id===id);[["Magus","hermes"],["Alchemist","hermes"],["Astrologer","ziggurat"],["Alchemist","athanor"],["Oracle","iching"],["Witch","coven"],["Witch","coven"],["Witch","coven"],["Gnostic","archon"],["Cultist","archon"],["Cultist","cathedral"],["Magus","seals"],["Priest","cathedral"],["Hermit","runes"],["Scholar","pyramid"]].forEach(([j,id])=>{const p=A(id);if(p)addNpc(j,p.x,p.y)});
 [["Witch","swamp",3,2],["Witch","forest",-8,-2],["Magus","mountain",5,5],["Astrologer","desert",-4,3],["Alchemist","hills",5,-3],["Oracle","tundra",-5,3],["Witch","hills",-6,-6],["Cultist","mountain",-7,2]].forEach(([j,b,dx,dy])=>{const a=BIOMES[b].at;addNpc(j,a[0]+dx,a[1]+dy)})}

{const A=id=>POIS.find(q=>q.id===id);[["Templar","kn1"],["Templar","kn1"],["Templar","kn2"],["Old soldier","kn2"],["Templar","kn3"],["Templar","kn4"]].forEach(([j,id])=>{const p=A(id);if(p)addNpc(j,p.x,p.y)})}

/* ---- tarot ---- */
const RN=["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"];
const GL="☆✦☾❀♛✠♥➤♘⚓☸⚖⚓☠⚘♨☢★☽☀⚑✵".split("");
const TAROT=[
 ["The Fool","A leap of faith pays off.","A careless step.","hit","foe+"],["The Magician","Your talents are sharp.","Tricks and smoke.","mana","hit-"],
 ["The High Priestess","Hidden knowledge stirs.","A secret kept too long.","xp","bad-ac"],["The Empress","Abundance and comfort.","Waste and neglect.","heal","foe+"],
 ["The Emperor","Order and iron will.","Stubbornness.","ac","hit-"],["The Hierophant","Old wisdom guides you.","Rigid dogma.","xp","foe+"],
 ["The Lovers","A bond, a choice well made.","A choice avoided.","heal","bad-ac"],["The Chariot","Victory through will.","Control slips away.","hit","foe+"],
 ["Strength","Gentle courage.","Doubt gnaws.","dmg","hit-"],["The Hermit","A lantern in the dark.","Isolation.","xp","bad-ac"],
 ["Wheel of Fortune","Luck turns your way.","The wheel grinds down.","gold","foe+"],["Justice","A fair reckoning.","An unfair price.","ac","hit-"],
 ["The Hanged Man","Wait, and see anew.","Stalling.","mana","bad-ac"],["Death","An ending and a beginning.","Clinging to what is gone.","dmg","foe+"],
 ["Temperance","Balance restored.","Excess.","heal","hit-"],["The Devil","Temptation you can use.","Chains of greed.","gold","bad-ac"],
 ["The Tower","Upheaval clears the way.","Disaster delayed, not denied.","foe-","foe+"],["The Star","Hope returns.","Hope dims.","hit","bad-ac"],
 ["The Moon","Dreams and strange paths.","Fear of shadows.","xp","hit-"],["The Sun","Radiant success.","Clouded joy.","heal","foe+"],
 ["Judgement","A calling answered.","Self-doubt.","dmg","hit-"],["The World","A journey fulfilled.","Unfinished business.","ac","bad-ac"]
];
const FATE={hit:"+2 to hit in your next fight",dmg:"+2 damage in your next fight",ac:"+2 AC in your next fight","foe-":"your next foe attacks at -2","hit-":"-1 to hit in your next fight","bad-ac":"-1 AC in your next fight","foe+":"your next foe attacks at +1",
 heal:"you recover 8 HP",mana:"you regain 4 "+"mana",gold:"you find 20 gp",xp:"you gain 30 XP"};
function tarotReading(){const idx=[];while(idx.length<3){const i=rnd(22)-1;if(!idx.includes(i))idx.push(i)}
 const cards=idx.map((i,k)=>({i,rev:Math.random()<.3,pos:["Past","Present","Future"][k]}));
 const pr=cards[1],t=TAROT[pr.i],key=pr.rev?t[4]:t[3];let eff="";
 if(key==="heal"){healHero(8)}else if(key==="mana"){hero.mana=Math.min(maxMP(),hero.mana+4)}else if(key==="gold"){hero.gold+=20}else if(key==="xp"){const o=[];addXp(30,o);fixStats()}else{hero.fate={k:key,txt:FATE[key]}}
 return{cards,eff:"Your present card, "+t[0]+(pr.rev?" reversed":"")+", brings fate: "+FATE[key]+"."}}
/* ---- dialogue ---- */
function speak(t,n){if(!voiceOn||!window.speechSynthesis)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.pitch=.6+(n.seed%7)*.2;u.rate=.95;speechSynthesis.speak(u)}catch(e){}}
function compass(dx,dy){const a=(Math.atan2(dy,dx)*180/Math.PI+360)%360;return["east","south-east","south","south-west","west","north-west","north","north-east"][Math.round(a/45)%8]}
function dirLine(){const opts=[];
 POIS.forEach(p=>{if(found[p.id])return;const d=Math.hypot(p.x-hx,p.y-hy),L=Math.max(1,Math.round(d/2)),c=compass(p.x-hx,p.y-hy);
  if(p.hidden)opts.push("The old folk whisper of a hidden stair somewhere in the "+BIOMES[biome[p.y][p.x]].n+", to the "+c+" of here. You'll find it only by walking close.");
  else opts.push("They talk of "+p.name+", about "+L+" leagues to the "+c+".")});
 const v=POIS.find(p=>p.id==="village");opts.push("If you need a bed, Oakhollow village is "+Math.max(1,Math.round(Math.hypot(v.x-hx,v.y-hy)/2))+" leagues "+compass(v.x-hx,v.y-hy)+".");
 const k=pickOne(BK),a=BIOMES[k].at;opts.push("The "+BIOMES[k].n+" lies "+compass(a[0]-hx,a[1]-hy)+" of here. Mind the monsters.");
 return pickOne(opts)}
function tipLine(){const o=[];if(hero.hp<maxHP()*.4)o.push("You look half dead. Eat a healing herb before you do something brave.");
 if(!hero.inv["Iron key"]&&!hero.inv["Lockpicks"])o.push("No key, no picks? Then be ready to force a door, and mind your fingers.");
 if(hero.level<3)o.push("Stay near camp till you've a few levels. The wild bites back.");o.push(...TIPS,...TIPS);return pickOne(o)}
function greet(n){return pickOne(["Well met, traveler. I'm "+n.name+", the local "+n.job.toLowerCase()+".","Ah, a new face. "+n.name+" at your service.","Mind the road. I'm "+n.name+". What can I do for you?"])}
function chatLine(n){const j=JOBS[n.job];if(Math.random()<.25)return tipLine();return pickOne(LINES[j.k])}
const STOCK={Merchant:[["Healing herb",8],["Healing potion",25],["Mana potion",20],["Smoke vial",15],["Dagger",10],["Leather armor",25],["Shield",30]],Herbalist:[["Healing herb",6],["Healing potion",22],["Mana potion",18]]};
function talk(n){if(D||C||packOpen||DG)return;D={n,text:greet(n),cards:null,view:"main"};$("dlg").hidden=false;faceNpc(n);renderDlg();speak(D.text,n)}
function dsay(t,cards){D.text=t;D.cards=cards||null;D.view="main";renderDlg();speak(t,D.n)}
function closeDlg(){D=null;faceT=null;$("dlg").hidden=true;try{speechSynthesis.cancel()}catch(e){}hud();draw();save()}
function renderDlg(){const n=D.n,j=JOBS[n.job],b=$("dlgbox");b.innerHTML="";
 const h=el("h2",n.name+", "+n.job);h.style.color=j.col;b.appendChild(h);
 b.appendChild(el("p","“"+D.text+"”","say"));
 if(D.cards){const g=el("div",null,"cards");D.cards.cards.forEach(c=>{const t=TAROT[c.i],d=el("div",null,"tc"+(c.rev?" rev":""));d.appendChild(el("div",c.pos,"pos"));d.appendChild(el("div",GL[c.i],"g"));d.appendChild(el("b",t[0]));d.appendChild(el("small",RN[c.i]+(c.rev?" reversed":"")));d.appendChild(el("small",c.rev?t[2]:t[1]));g.appendChild(d)});b.appendChild(g);b.appendChild(el("p",D.cards.eff,"msg"))}
 b.appendChild(el("p",hero.gold+" gp","sub"));
 const m=el("div",null,"menu");
 if(D.view==="shop"){STOCK[j.shop].forEach(([it,pr])=>m.appendChild(btn("Buy "+it+" - "+pr+" gp",()=>{
   const owned=ITEMS[it].t!=="u"&&ITEMS[it].t!=="h"&&hero.inv[it];if(owned){dsay("You already carry one of those.");return}
   if(hero.gold<pr){dsay("Come back when your purse is heavier.");return}hero.gold-=pr;giveItem(it);dsay("A pleasure. "+it+" is yours.");D.view="shop";renderDlg()},"alt",hero.gold<pr)));
  m.appendChild(btn("Back",()=>{D.view="main";renderDlg()}))}
 else{m.appendChild(btn("Chat",()=>dsay(chatLine(n))));m.appendChild(btn("Ask for tips",()=>dsay(tipLine())));m.appendChild(btn("Ask for directions",()=>dsay(dirLine())));
  if(j.tarot)m.appendChild(btn("Tarot reading - 5 gp",()=>{if(hero.gold<5){dsay("The cards do not read for free, friend. Five gold.");return}hero.gold-=5;const r=tarotReading();hud();dsay("Sit. Let the cards speak.",r)},"alt",hero.gold<5));
  if(j.ich)m.appendChild(btn("Cast the I Ching - 5 gp",()=>{closeDlg();castIChing()},"alt",hero.gold<5));
  if(j.shop)m.appendChild(btn("Trade",()=>{D.view="shop";renderDlg()}));
  if(j.rest)m.appendChild(btn("Rest at the inn - 10 gp",()=>{if(hero.gold<10){dsay("A bed costs ten gold. Floors are free but cold.");return}hero.gold-=10;fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hud();dsay("You sleep like the dead. HP and "+RES[hero.cls].toLowerCase()+" are full.")},"alt",hero.gold<10));
  if(j.bless)m.appendChild(btn("Ask for a blessing",()=>{if(hero.steps-(hero.lastBless||-99)<40){dsay("The gods are busy. Walk a while and ask again.");return}hero.lastBless=hero.steps;fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hud();dsay("Light mend you. You are whole again.")}))}
 m.appendChild(btn("Voice: "+(voiceOn?"on":"off"),()=>{voiceOn=!voiceOn;renderDlg();if(voiceOn)speak(D.text,n)}));
 m.appendChild(btn("Leave",closeDlg,"go"));b.appendChild(m)}
/* ---- dungeons ---- */
const DGT={
 crypt:{b:"forest",n:["Stair of Bones","Ossuary","Weeping Alcove","Hall of Urns","Sealed Door","Throne of the Hollow King"],boss:"The Hollow King",u:1,intro:"Cold air breathes up from a crack beneath the slab. Bones crunch underfoot."},
 cave:{b:"tundra",n:["Breath of Frost","Ice Gallery","Glittering Grotto","Frozen Lake Cavern","Rimed Gate","Wyrm's Hoard"],boss:"The Wyrmfrost Drake",intro:"Warm breath curls from the cave mouth and freezes in the air."},
 mine:{b:"mountain",n:["Collapsed Adit","Lantern Gallery","Dwarf Shrine","Flooded Shaft","Iron Gate","Forge of the Deep"],boss:"Foreman Gorrum",intro:"Dwarven lanterns still burn in the dark. Something has been mining wrong."},
 sunk:{b:"swamp",n:["Drowned Steps","Algae Hall","Reliquary Niche","Flooded Nave","Barnacled Door","Sanctum of the Hydra"],boss:"The Sanctum Hydra",intro:"Half-drowned steps lead into a temple that the swamp is slowly eating."},
 tomb:{b:"desert",n:["Sand-choked Door","Hall of Jackals","Scarab Alcove","Painted Antechamber","Sealed Slab","Burial Chamber"],boss:"The Dune King",u:1,intro:"The sand slides away to reveal a sealed doorway painted with jackals."},
 lair:{b:"hills",n:["Barrow Mouth","Bone-strewn Hall","Giant's Pantry","Trophy Hall","Great Door","The Giant's Hoard"],boss:"The Barrow Giant",intro:"The mound is big enough to stable a giant. Something has been feeding in it."}
};
const EXITS={0:[1],1:[0,2,3],2:[1],3:[1,4],4:[3,5],5:[4]};
function dgState(p){hero.dg=hero.dg||{};return hero.dg[p.id]=hero.dg[p.id]||{r:0,clr:{},unl:0,ch:{},tr:{},boss:0}}
function enterDg(p){if(!DGT[p.id])return;DG={p,th:DGT[p.id],t:tierAt(p.x,p.y),prev:0,msg:DGT[p.id].intro,s:dgState(p)};DG.s.r=0;$("dng").hidden=false;dg3.enter();renderDg()}
function closeDg(){const pp=DG&&DG.p;dg3.leave(pp);DG=null;$("dng").hidden=true;fixStats();hud();draw();save();say("You climb back into the light.")}
function roomText(i){return["The way back up is behind you.","A guarded hall. Whatever lives here has not left.","A quiet alcove. Something glints under the dust.","A wide chamber. The air is thick and wrong.","A heavy door seals the way ahead. Its lock is old iron.","The deepest chamber. Something large waits, and it knows you are here."][i]}
function goRoom(i){const s=DG.s,th=DG.th;DG.prev=s.r;s.r=i;DG.msg="";
 if(i===2&&!s.tr[2]){s.tr[2]=1;const dc=10+DG.t*2,r=rnd(20)+mod(AT().DEX);
  if(r>=dc)DG.msg="You spot a tripwire and step over it (d20+DEX = "+r+" vs DC "+dc+").";
  else{const d=Math.max(0,Math.min(hero.hp-1,roll(1+DG.t,6)));hero.hp-=d;DG.msg="A dart trap! (d20+DEX = "+r+" vs DC "+dc+") You take "+d+" damage."}}
 renderDg();if((i===1||i===3||i===5)&&!s.clr[i])fightRoom(i)}
function fightRoom(i){const th=DG.th;let f;
 if(i===5){const bs=FOES[th.b][FOES[th.b].length-1];f=[th.boss,Math.round(bs[1]*1.6),bs[2]+1,bs[3]+1,bs[4],bs[5],bs[6],bs[7]*3,3,bs[9],bs[10]||"",!!th.u]}
 else{const pool=FOES[th.b].filter(x=>x[8]<=DG.t+1);f=i===3?pool[pool.length-1]:pickOne(pool)}
 startCombat(f,i===5?Math.min(3,DG.t+1):DG.t,won=>{if(won){DG.s.clr[i]=1;DG.msg=i===5?th.boss+" falls. The hoard is yours to open.":"The room falls quiet."}else{DG.s.r=DG.prev;DG.msg="You backed out of the fight."}renderDg()})}
function dgRoll(label,bonus,dc,onOk,onFail){const r=rnd(20),t=r+bonus,ok=r===20||(r!==1&&t>=dc);DG.msg=label+" (d20 "+r+sg(bonus)+" = "+t+" vs DC "+dc+"): ";if(ok){DG.msg+="success.";onOk()}else{DG.msg+="failed.";onFail&&onFail()}renderDg()}
function renderDg(){dg3.show();const b=$("dngbox");b.innerHTML="";const s=DG.s,th=DG.th,i=s.r;fixStats();
 b.appendChild(el("h2",DG.p.name));b.appendChild(el("h3",th.n[i]));b.appendChild(el("p",roomText(i),"sub"));
 if(DG.msg)b.appendChild(el("p",DG.msg,"msg"));
 b.appendChild(el("p","HP "+hero.hp+"/"+maxHP()+" | "+RES[hero.cls]+" "+hero.mana+"/"+maxMP()+" | "+hero.gold+" gp"+(s.boss?" | Dungeon cleared":""),"sub"));
 EXITS[i].forEach(j=>{const lk=(i===4&&j===5&&!s.unl);b.appendChild(btn((lk?"[locked] ":"")+"Go to "+th.n[j],()=>goRoom(j),"alt",lk))});
 if(i===4&&!s.unl){
  b.appendChild(btn("Use Iron key",()=>{hero.inv["Iron key"]--;if(hero.inv["Iron key"]<=0)delete hero.inv["Iron key"];s.unl=1;DG.msg="The key turns. The door grinds open.";renderDg()},"alt",!hero.inv["Iron key"]));
  b.appendChild(btn("Pick the lock"+(hero.cls==="Rogue"?" (rogue skill)":""),()=>dgRoll("You work the lock",mod(AT().DEX)+prof()+(hero.inv.Lockpicks?2:0)+(hero.cls==="Rogue"?3:0),12+DG.t,()=>{s.unl=1;DG.msg+=" The door swings open."})));
  b.appendChild(btn("Force the door",()=>dgRoll("You shoulder the door",mod(AT().STR),14+DG.t,()=>{s.unl=1;DG.msg+=" Wood splinters."},()=>{const d=Math.min(hero.hp-1,roll(1,6));hero.hp-=Math.max(0,d);DG.msg+=" You take "+Math.max(0,d)+" damage."})))}
 if(i===2&&!s.ch[2])b.appendChild(btn("Search the alcove",()=>{s.ch[2]=1;giveItem("Iron key");DG.msg="Under the dust you find: Iron key, "+lootChest()+".";renderDg()},"go"));
 if(i===5&&s.clr[5]&&!s.boss)b.appendChild(btn("Open the hoard",()=>{s.boss=1;const o=[lootChest(),lootChest(),addLoot(pickOne(POOL[Math.min(3,DG.t+1)])),addLoot("Silver key")];const x=[];addXp(100*(DG.t+1),x);fixStats();DG.msg="HOARD: "+o.join(", ")+". "+x.join(" ");sfx("win");renderDg()},"go"));
 if(i===0)b.appendChild(btn("Leave the dungeon",closeDg,"go"));
 b.appendChild(btn("Pack and spells",openPack))}

/* ---------- start ---------- */
$("load").onclick=()=>{try{const h=JSON.parse(decodeURIComponent(escape(atob($("code").value.trim()))));if(!h.name||!h.attrs)throw 0;loadHero(h)}catch(e){$("err").textContent="That code did not read. Copy the full hero code from the Character Forge."}};
$("sample").onclick=()=>{const k={Fighter:["Longsword","Chain shirt","Shield","Healing herb x2"],Paladin:["Warhammer","Chain shirt","Holy symbol","Healing herb x1"],Cleric:["Mace","Scale vest","Holy symbol","Healing herb x3"],Rogue:["Dagger","Leather armor","Lockpicks","Smoke vial"],Magician:["Quarterstaff","Spellbook","Ember wand","Mana potion x1"],Ranger:["Shortbow","Leather armor","Hunting knife","Herb pouch x2"]};
 const c=$("scls").value;loadHero({name:"Sample "+c,race:"Human",cls:c,level:1,xp:0,attrs:{STR:14,DEX:13,CON:14,INT:13,WIS:13,CHA:12},hp:12,maxHp:12,ac:12,gold:60,created:1,kit:k[c]})};
$("packbtn").onclick=openPack;$("gfx").onclick=()=>setQuality((qual+3)%4);$("codex").onclick=()=>{if(!C&&!D&&!packOpen&&!DG)openCodex()};
$("reset").onclick=()=>{seen=new Uint8Array(W*H);found={};hx=SX;hy=SY;lastBiome=null;syncP();reveal();save();hud();draw();say("The map fades from memory.")};
/* ================= OCCULTICA: symbols, textures, structures ================= */
const OCCP=()=>{const o=hero.occ||(hero.occ={sp:{},seals:{},hex:{},gods:{},runes:{},read:{},site:{},herbs:{},gw:{},fort:0,pray:-99,med:-99,inv:-99});return o};
const RDEF=[[[[.3,0],[.3,1]],[[.3,.72],[.8,.5]],[[.3,.45],[.8,.23]]],[[[.2,0],[.2,1],[.8,.7],[.8,0]]],[[[.3,0],[.3,1]],[[.3,.78],[.78,.5],[.3,.25]]],[[[.3,0],[.3,1]],[[.3,1],[.8,.78]],[[.3,.7],[.8,.48]]],[[[.3,0],[.3,1],[.8,.75],[.3,.5],[.8,0]]],[[[.75,.82],[.3,.5],[.75,.18]]],[[[.2,.1],[.8,.9]],[[.2,.9],[.8,.1]]],[[[.3,0],[.3,1],[.78,.78],[.3,.52]]],[[[.2,0],[.2,1]],[[.8,0],[.8,1]],[[.2,.65],[.8,.35]]],[[[.5,0],[.5,1]],[[.2,.35],[.8,.65]]],[[[.5,0],[.5,1]]],[[[.5,.95],[.2,.72],[.5,.5]],[[.5,.5],[.8,.28],[.5,.05]]],[[[.5,0],[.5,1]],[[.5,1],[.8,.78]],[[.5,0],[.2,.22]]],[[[.28,0],[.28,1],[.78,.72],[.28,.45]]],[[[.5,0],[.5,1]],[[.5,.5],[.2,.9]],[[.5,.5],[.8,.9]]],[[[.65,1],[.3,.66],[.7,.34],[.35,0]]],[[[.5,0],[.5,1]],[[.5,1],[.2,.68]],[[.5,1],[.8,.68]]],[[[.3,0],[.3,1],[.75,.78],[.3,.5],[.75,.22],[.3,0]]],[[[.2,0],[.2,1],[.5,.62],[.8,1],[.8,0]]],[[[.2,0],[.2,1]],[[.8,0],[.8,1]],[[.2,1],[.8,.5]],[[.8,1],[.2,.5]]],[[[.3,0],[.3,1],[.72,.75]]],[[[.5,1],[.8,.5],[.5,0],[.2,.5],[.5,1]]],[[[.2,0],[.2,1],[.8,0],[.8,1],[.2,0]]],[[[.5,1],[.2,.55],[.5,.1],[.8,.55],[.5,1]],[[.5,.55],[.25,0]],[[.5,.55],[.75,0]]]];
function drawRune(g,i,cx,cy,h,lw){const w=h*.6;RDEF[i%24].forEach(pl=>{g.beginPath();pl.forEach(([x,y],k)=>{const px=cx+(x-.5)*w,py=cy-(y-.5)*h;k?g.lineTo(px,py):g.moveTo(px,py)});g.stroke()})}
const _tc={};
function mkCanvas(n){const c=document.createElement("canvas");c.width=c.height=n;return c}
function ringRunes(g,cx,cy,r,h,col,n){g.strokeStyle=col;g.lineWidth=h*.08;for(let i=0;i<n;i++){const a=i/n*6.2832-1.5708;g.save();g.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.rotate(a+1.5708);drawRune(g,i,0,0,h,0);g.restore()}}
function star(g,cx,cy,r,n,k){g.beginPath();for(let i=0;i<=n;i++){const a=(i*k)/n*6.2832-1.5708,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
function circ(g,cx,cy,r,fill){g.beginPath();g.arc(cx,cy,r,0,6.2832);fill?g.fill():g.stroke()}
function tri(g,cx,cy,r,up,bar){g.beginPath();for(let i=0;i<3;i++){const a=(up?-1.5708:1.5708)+i*2.0944;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.stroke();if(bar){g.beginPath();g.moveTo(cx-r*.55,cy+(up?r*.2:-r*.2));g.lineTo(cx+r*.55,cy+(up?r*.2:-r*.2));g.stroke()}}
const SEPH=[[.5,.05],[.75,.18],[.25,.18],[.75,.38],[.25,.38],[.5,.5],[.75,.65],[.25,.65],[.5,.78],[.5,.95]],SPATH=[[0,1],[0,2],[0,5],[1,2],[1,5],[1,3],[2,5],[2,4],[3,4],[3,5],[3,6],[4,5],[4,7],[5,6],[5,7],[5,8],[6,7],[6,8],[7,8],[6,9],[7,9],[8,9]];
function symCanvas(kind,idx,col){const k=kind+idx+col;if(_tc[k])return _tc[k];if(kind==="checker"||kind==="sqc")return(_tc[k]=symKn(kind,col));const N=512,c=mkCanvas(N),g=c.getContext("2d"),C=N/2;g.strokeStyle=col;g.fillStyle=col;g.lineWidth=4;g.lineCap=g.lineJoin="round";g.shadowColor=col;g.shadowBlur=10;
 circ(g,C,C,N*.47);g.lineWidth=2;circ(g,C,C,N*.455);
 if(kind==="tree"){g.lineWidth=3;circ(g,C,C,N*.36);SPATH.forEach(([a,b])=>{g.beginPath();g.moveTo(SEPH[a][0]*N*.7+N*.15,SEPH[a][1]*N*.78+N*.11);g.lineTo(SEPH[b][0]*N*.7+N*.15,SEPH[b][1]*N*.78+N*.11);g.stroke()});SEPH.forEach(([x,y])=>{const px=x*N*.7+N*.15,py=y*N*.78+N*.11;g.fillStyle="rgba(0,0,0,.65)";circ(g,px,py,N*.045,1);g.stroke();g.lineWidth=3});ringRunes(g,C,C,N*.41,N*.06,col,24)}
 else if(kind==="hept"){g.lineWidth=4;star(g,C,C,N*.36,7,2);g.lineWidth=2;star(g,C,C,N*.36,7,3);for(let i=0;i<7;i++){const a=i/7*6.2832-1.5708,x=C+Math.cos(a)*N*.36,y=C+Math.sin(a)*N*.36;g.fillStyle=PLN[i].c;g.shadowColor=PLN[i].c;circ(g,x,y,N*.032,1)}g.shadowColor=col;ringRunes(g,C,C,N*.415,N*.055,col,28)}
 else if(kind==="penta"){g.lineWidth=5;star(g,C,C,N*.34,5,2);g.lineWidth=2;circ(g,C,C,N*.34);for(let i=0;i<5;i++){const a=i/5*6.2832-1.5708;g.fillStyle=col;circ(g,C+Math.cos(a)*N*.34,C+Math.sin(a)*N*.34,N*.018,1)}ringRunes(g,C,C,N*.405,N*.06,col,24);for(let i=0;i<4;i++){const a=i/4*6.2832+.78;g.beginPath();g.arc(C+Math.cos(a)*N*.2,C+Math.sin(a)*N*.2,N*.03,a+1,a+5.3);g.stroke()}}
 else if(kind==="hex"){g.lineWidth=5;tri(g,C,C,N*.34,1);tri(g,C,C,N*.34,0);g.lineWidth=2;circ(g,C,C,N*.2);ringRunes(g,C,C,N*.405,N*.06,col,24)}
 else if(kind==="ouro"){g.lineWidth=14;g.beginPath();g.arc(C,C,N*.33,.35,6.0);g.stroke();g.lineWidth=3;g.beginPath();g.arc(C,C,N*.33,.2,.35);g.stroke();circ(g,C+Math.cos(.28)*N*.33,C+Math.sin(.28)*N*.33,N*.03,1);g.lineWidth=3;tri(g,C,C-N*.07,N*.13,1);tri(g,C,C+N*.07,N*.13,0);tri(g,C-N*.14,C+N*.12,N*.09,0,1);tri(g,C+N*.14,C-N*.1,N*.09,1,1);circ(g,C,C,N*.03,1);g.beginPath();g.arc(C+N*.2,C+N*.2,N*.025,0,6.28);g.stroke();ringRunes(g,C,C,N*.42,N*.05,col,32)}
 else if(kind==="bagua"){for(let i=0;i<8;i++){const a=i/8*6.2832-1.5708,x=C+Math.cos(a)*N*.34,y=C+Math.sin(a)*N*.34;g.save();g.translate(x,y);g.rotate(a+1.5708);for(let l=0;l<3;l++){g.lineWidth=7;const yy=(l-1)*N*.032;g.beginPath();if(TRIG[i][2-l]){g.moveTo(-N*.06,yy);g.lineTo(N*.06,yy)}else{g.moveTo(-N*.06,yy);g.lineTo(-N*.012,yy);g.moveTo(N*.012,yy);g.lineTo(N*.06,yy)}g.stroke()}g.restore()}g.lineWidth=3;circ(g,C,C,N*.2);g.beginPath();g.arc(C,C,N*.2,1.5708,4.712);g.arc(C,C-N*.1,N*.1,4.712,1.5708,true);g.arc(C,C+N*.1,N*.1,4.712,1.5708);g.fill();g.fillStyle="#000";circ(g,C,C-N*.1,N*.025,1);g.fillStyle=col;circ(g,C,C+N*.1,N*.025,1);g.lineWidth=2;g.beginPath();for(let i=0;i<8;i++){const a=(i+.5)/8*6.2832,x=C+Math.cos(a)*N*.415,y=C+Math.sin(a)*N*.415;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.stroke()}
 else if(kind==="rings"){for(let i=0;i<7;i++){g.strokeStyle=PLN[i].c;g.shadowColor=PLN[i].c;g.lineWidth=3;circ(g,C,C,N*(.12+i*.05));for(let j=0;j<3;j++){const a=j*2.09+i;g.fillStyle=PLN[i].c;circ(g,C+Math.cos(a)*N*(.12+i*.05),C+Math.sin(a)*N*(.12+i*.05),N*.012,1)}}g.strokeStyle=col;g.shadowColor=col;g.lineWidth=4;tri(g,C,C+N*.01,N*.1,1);g.beginPath();g.ellipse(C,C+N*.01,N*.045,N*.025,0,0,6.28);g.stroke();circ(g,C,C+N*.01,N*.012,1)}
 else if(kind==="ishtar"){g.lineWidth=5;star(g,C,C,N*.38,8,1);g.lineWidth=2;for(let i=0;i<8;i++){const a=i/8*6.2832;g.beginPath();g.moveTo(C+Math.cos(a)*N*.1,C+Math.sin(a)*N*.1);g.lineTo(C+Math.cos(a)*N*.38,C+Math.sin(a)*N*.38);g.stroke()}g.beginPath();for(let i=0;i<16;i++){const a=i/16*6.2832,r=i%2?N*.1:N*.24;i?g.lineTo(C+Math.cos(a)*r,C+Math.sin(a)*r):g.moveTo(C+Math.cos(a)*r,C+Math.sin(a)*r)}g.closePath();g.stroke();ringRunes(g,C,C,N*.415,N*.05,col,32)}
 else if(kind==="rose"){for(let i=0;i<12;i++){const a=i/12*6.2832;g.beginPath();g.ellipse(C+Math.cos(a)*N*.24,C+Math.sin(a)*N*.24,N*.12,N*.04,a,0,6.28);g.stroke()}circ(g,C,C,N*.1);circ(g,C,C,N*.04,1);for(let i=0;i<12;i++){const a=i/12*6.2832;circ(g,C+Math.cos(a)*N*.4,C+Math.sin(a)*N*.4,N*.02,1)}g.lineWidth=2;circ(g,C,C,N*.36)}
 else if(kind==="pyr"){g.lineWidth=5;tri(g,C,C+N*.05,N*.3,1);g.lineWidth=3;g.beginPath();g.ellipse(C,C+N*.04,N*.11,N*.06,0,0,6.28);g.stroke();circ(g,C,C+N*.04,N*.03,1);g.beginPath();g.moveTo(C-N*.11,C+N*.07);g.lineTo(C-N*.13,C+N*.22);g.stroke();ringRunes(g,C,C,N*.415,N*.05,col,28)}
 else if(kind==="gods"){g.lineWidth=4;star(g,C,C,N*.36,12,5);g.lineWidth=2;circ(g,C,C,N*.14);for(let i=0;i<12;i++){const a=i/12*6.2832;circ(g,C+Math.cos(a)*N*.4,C+Math.sin(a)*N*.4,N*.012,1)}ringRunes(g,C,C,N*.27,N*.04,col,12)}
 else if(kind==="runes"){g.lineWidth=3;circ(g,C,C,N*.32);ringRunes(g,C,C,N*.385,N*.075,col,24);circ(g,C,C,N*.31);g.lineWidth=5;star(g,C,C,N*.28,8,3);drawRune(g,23,C,C,N*.2,0)}
 g.shadowBlur=0;_tc[k]=c;return c}
function sealCanvas(i,N){N=N||400;const p=PLN[i],kam=KAM[KORD[i]],n=kam.length,c=mkCanvas(N),g=c.getContext("2d"),C=N/2;g.lineCap=g.lineJoin="round";g.strokeStyle=p.c;g.fillStyle=p.c;g.shadowColor=p.c;g.shadowBlur=8;g.lineWidth=3;circ(g,C,C,N*.47);g.lineWidth=1.5;circ(g,C,C,N*.44);
 const S=N*.58,x0=C-S/2,cs=S/n;g.lineWidth=1.5;g.strokeRect(x0,x0,S,S);for(let k=1;k<n;k++){g.globalAlpha=.4;g.beginPath();g.moveTo(x0+k*cs,x0);g.lineTo(x0+k*cs,x0+S);g.moveTo(x0,x0+k*cs);g.lineTo(x0+S,x0+k*cs);g.stroke();g.globalAlpha=1}
 const pos={};g.font=Math.floor(cs*.42)+"px serif";g.textAlign="center";g.textBaseline="middle";g.shadowBlur=0;g.globalAlpha=.75;kam.forEach((row,r)=>row.forEach((v,cc)=>{pos[v]=[x0+(cc+.5)*cs,x0+(r+.5)*cs];g.fillText(v,x0+(cc+.5)*cs,x0+(r+.5)*cs)}));g.globalAlpha=1;g.shadowBlur=8;g.lineWidth=3;g.beginPath();for(let v=1;v<=n*n;v++){const q=pos[v];v>1?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])}g.globalAlpha=.9;g.stroke();g.globalAlpha=1;
 g.font="bold "+Math.floor(N*.1)+"px 'Segoe UI Symbol','Noto Sans Symbols','Apple Symbols','DejaVu Sans',serif";g.shadowBlur=10;g.fillText(p.g,C,N*.085);g.fillText(p.g,C,N*.915);return c}
function canTex(c){const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
const DEC=[],SPIN=[],ORB=[],SITEPOS=[];
function decal(g,kind,r,col,y,idx){const m=new THREE.Mesh(new THREE.CircleGeometry(r,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:canTex(symCanvas(kind,idx||0,col)),transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.position.y=y==null?.1:y;m.renderOrder=2;m.userData.o=.9;g.add(m);DEC.push(m);return m}
function orbs(g,cols,n,r,h,gl){for(let i=0;i<n;i++){const col=cols[i%cols.length],s=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex(...col),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.setScalar(.9);world.add(s);ORB.push({s,cx:g.position.x,cz:g.position.z,cy:g.position.y+h,r:r*(.8+.4*hs(i,5)),a:i/n*6.28,sp:.15+hs(i,9)*.2,ph:i})}}
const hx2=c=>[(c>>16)&255,(c>>8)&255,c&255];
function stelaFace(g,canvas,x,y,z,w,h,rotY){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:canTex(canvas),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(x,y,z);m.rotation.y=rotY;g.add(m);return m}
function faceTo(a){return Math.atan2(-Math.cos(a),-Math.sin(a))}
function runeCanvas(i,col){const c=mkCanvas(128),g=c.getContext("2d");g.strokeStyle=col;g.shadowColor=col;g.shadowBlur=12;g.lineWidth=7;g.lineCap="round";g.lineJoin="round";drawRune(g,i,64,64,92,0);return c}
const SITES={};
function buildSite(p,g){const st=PM("flag",0xe8e0f0,.1,1),dk=M(0x2a2630,{roughness:.6}),gold=M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.5,metalness:.6,roughness:.35}),id=p.id,S=SITES[id];
 const glow=(c,i)=>M(c,{emissive:c,emissiveIntensity:i||1.2,flatShading:false}),flame=(x,y,z,s)=>mk(g,new THREE.ConeGeometry(.25*(s||1),.7*(s||1),6),glow(0xffa040,1.8),x,y,z,{ns:1});
 SITEPOS.push({id,x:g.position.x,z:g.position.z});if(/^dt_/.test(id)&&window.DAYT){DAYT.build(p,g,id);return}if(/^kn\d$/.test(id)){buildCommandery(p,g,id);commDecor(g,+id.slice(2));return}
 if(id==="hermes"){mk(g,new THREE.BoxGeometry(15,.5,11),st,0,.25,0);mk(g,new THREE.BoxGeometry(16.5,.3,12.5),st,0,.1,0);
  [-3.8,0,3.8].forEach(z=>[-1,1].forEach(sx=>{mk(g,new THREE.CylinderGeometry(.5,.6,5,12),st,sx*5.6,3,z);mk(g,new THREE.BoxGeometry(1.5,.4,1.5),st,sx*5.6,5.7,z)}));
  mk(g,new THREE.BoxGeometry(12.6,.7,2),st,-0,6.15,-3.8,{ns:1});mk(g,new THREE.BoxGeometry(.9,.7,10),st,-5.6,6.15,0);mk(g,new THREE.BoxGeometry(.9,.7,10),st,5.6,6.15,0);
  const pj=mk(g,new THREE.CylinderGeometry(.7,.7,.6,12),glow(0xffe0a0,.9),0,.8,0,{ns:1});flame(0,1.4,0,1.4);
  const jx=mk(g,new THREE.CylinderGeometry(.55,.62,6.2,14),M(0x14101a,{roughness:.4}),-2.4,3.6,6.6),bz=mk(g,new THREE.CylinderGeometry(.55,.62,6.2,14),M(0xeeeadc,{roughness:.4}),2.4,3.6,6.6);
  mk(g,new THREE.SphereGeometry(.7,10,8),M(0xb02a2a,{emissive:0x401010}),-2.4,7,6.6,{ns:1});mk(g,new THREE.SphereGeometry(.7,10,8),M(0xb02a2a,{emissive:0x401010}),2.4,7,6.6,{ns:1});
  const eye=mk(g,new THREE.ConeGeometry(2.2,2.2,3),gold,0,7.2,-3.8,{r:[0,Math.PI,0]});eye.scale.set(1,1,.3);
  decal(g,"tree",5.8,"#f4dc9a",.62);orbs(g,[hx2(0xffe0a0),hx2(0xc0a0ff)],8,7,2.5)}
 else if(id==="seals"){mk(g,new THREE.CylinderGeometry(9,9.5,.3,48),st,0,.1,0);decal(g,"hept",8.8,"#c0a8ff",.28);
  for(let i=0;i<7;i++){const a=i/7*6.2832,R=6.8,x=Math.cos(a)*R,z=Math.sin(a)*R,ry=faceTo(a),b=mk(g,new THREE.BoxGeometry(2.4,4.4,.5),M(0x1c1822,{roughness:.5}),x,2.4,z,{r:[0,ry,0]});
   stelaFace(g,sealCanvas(i,320),x-Math.cos(a)*.3,2.5,z-Math.sin(a)*.3,2.2,2.2,ry);const o=mk(g,new THREE.SphereGeometry(.28,10,8),glow(new THREE.Color(PLN[i].c).getHex(),1.6),x,5.1,z,{ns:1});o.userData.float2=1}
  mk(g,new THREE.CylinderGeometry(.9,1.1,.9,7),dk,0,.55,0);mk(g,new THREE.OctahedronGeometry(.45),glow(0xc0a8ff,1.8),0,1.9,0,{ns:1}).userData.spin=1;SPIN.push({o:g.children[g.children.length-1],ax:"y",sp:1.2});
  orbs(g,PLN.map(q=>hx2(parseInt(q.c.slice(1),16))),14,6,2.8)}
 else if(id==="pantheon"){mk(g,new THREE.CylinderGeometry(10,10.5,.4,40),M(0x1a1820),0,.15,0);decal(g,"gods",9.5,"#ff6a4a",.4);
  for(let i=0;i<12;i++){const a=i/12*6.2832,R=7.8,x=Math.cos(a)*R,z=Math.sin(a)*R,s=new THREE.Group();s.position.set(x,.3,z);s.rotation.y=faceTo(a);const bs=M(0x1a1820,{roughness:.55});
   mk(s,new THREE.BoxGeometry(1.4,.8,1.4),bs,0,.4,0);mk(s,new THREE.CylinderGeometry(.5,.7,2.6,8),bs,0,2.1,0);mk(s,new THREE.SphereGeometry(.38,10,8),bs,0,3.7,0);
   const eyc=glow(i===11?0x000000:0xff2a1a,2);if(i!==11){mk(s,new THREE.SphereGeometry(.06,6,5),eyc,-.14,3.75,.32,{ns:1});mk(s,new THREE.SphereGeometry(.06,6,5),eyc,.14,3.75,.32,{ns:1})}
   if(i%12===0)[-1,1].forEach(q=>mk(s,new THREE.ConeGeometry(.1,.7,5),bs,q*.28,4.2,0,{r:[0,0,-q*.5]}));
   if(i===1)[-1,1].forEach(q=>{mk(s,new THREE.CylinderGeometry(.12,.1,1.6,6),bs,q*.9,2.5,.3,{r:[0,0,q*.7]});mk(s,new THREE.CylinderGeometry(.12,.1,1.6,6),bs,q*1.2,2.7,.1,{r:[0,0,q*1.1]})});
   if(i===2){mk(s,new THREE.ConeGeometry(.2,.9,6),bs,0,3.65,.55,{r:[Math.PI/2,0,0]});[-1,1].forEach(q=>mk(s,new THREE.ConeGeometry(.12,.8,4),bs,q*.2,4.3,0))}
   if(i===3)[-1,1].forEach(q=>mk(s,new THREE.BoxGeometry(2.2,.1,1.2),bs,q*1.5,3,-.4,{r:[0,0,q*.5]}));
   if(i===4)for(let k=0;k<5;k++)mk(s,new THREE.ConeGeometry(.07,.4,4),gold,Math.cos(k*1.25)*.3,4.1+Math.sin(k*1.25)*.1,Math.sin(k*1.25)*.3);
   if(i===7)mk(s,new THREE.SphereGeometry(.07,6,5),glow(0xff2a1a,2.5),0,3.9,.35,{ns:1});
   if(i===8)mk(s,new THREE.TorusGeometry(.45,.1,6,12),bs,0,1.6,.1,{r:[1.2,0,0]});
   if(i===9)mk(s,new THREE.ConeGeometry(.15,.7,5),bs,0,3.62,.5,{r:[Math.PI/2,0,0]});
   if(i===10)[-1,1].forEach(q=>{mk(s,new THREE.CylinderGeometry(.04,.05,1,5),bs,q*.35,4.4,0,{r:[0,0,-q*.4]});mk(s,new THREE.CylinderGeometry(.03,.04,.6,5),bs,q*.6,4.8,0,{r:[0,0,q*.5]})});
   g.add(s)}
  mk(g,new THREE.CylinderGeometry(.7,.5,1,8),dk,0,.8,0);flame(0,1.6,0,1.6).material=glow(0xff3a20,2);orbs(g,[hx2(0xff6040),hx2(0xffc080)],8,8,3)}
 else if(id==="archon"){const bk=M(0x0e0c12,{roughness:.5});[-1,1].forEach(sx=>mk(g,new THREE.BoxGeometry(1.8,10,1.8),bk,sx*5,5,0));mk(g,new THREE.BoxGeometry(12.5,1.6,2),bk,0,10.6,0);mk(g,new THREE.BoxGeometry(9,.5,2.4),bk,0,.25,0);
  mk(g,new THREE.PlaneGeometry(8,9),new THREE.MeshBasicMaterial({color:0x021008,transparent:true,opacity:.85}),0,5,0,{ns:1});
  for(let i=0;i<7;i++){const t=mk(g,new THREE.TorusGeometry(.9+i*.55,.07,6,48),glow(new THREE.Color(PLN[6-i].c).getHex(),1.5),0,5.2,.05,{ns:1});SPIN.push({o:t,ax:"z",sp:(i%2?-1:1)*(.25+i*.07)})}
  const e=mk(g,new THREE.ConeGeometry(1.4,1.5,3),gold,0,12.2,0);e.scale.z=.3;mk(g,new THREE.SphereGeometry(.28,10,8),glow(0x60ff90,2),0,12,.15,{ns:1});decal(g,"rings",9,"#70ff90",.12);orbs(g,[hx2(0x70ff90),hx2(0xc0ffd0)],9,7,3)}
 else if(id==="athanor"){const clay=M(0xb06a3a,{roughness:.9,flatShading:false});mk(g,new THREE.CylinderGeometry(3,3.4,2.4,16),clay,0,1.2,0);const dm=mk(g,new THREE.SphereGeometry(3,16,10,0,6.3,0,1.57),clay,0,2.4,0);dm.scale.y=.9;mk(g,new THREE.CylinderGeometry(.6,.8,3.5,10),clay,0,5.2,0);
  mk(g,new THREE.BoxGeometry(1.4,1.6,.3),glow(0xff7a20,2.2),0,1.1,3.15,{ns:1});flame(0,6.9,0,1.8);
  const ou=mk(g,new THREE.TorusGeometry(2.2,.2,8,32),gold,0,8.5,0,{r:[Math.PI/2,0,0]});SPIN.push({o:ou,ax:"z",sp:.4});ou.userData.ouro=1;
  [[-5.5,2.4,0x40ff90],[5.5,2.4,0xff3060],[-6,-2,0x40a0ff],[6,-2,0xffe040]].forEach(([x,z,c])=>{mk(g,new THREE.BoxGeometry(1.4,1,1.4),st,x,.5,z);mk(g,new THREE.SphereGeometry(.55,10,8),M(c,{emissive:c,emissiveIntensity:.9,transparent:true,opacity:.8,flatShading:false}),x,1.5,z,{ns:1});mk(g,new THREE.CylinderGeometry(.15,.15,.6,6),M(0xc0d0e0,{transparent:true,opacity:.6}),x,2.2,z,{ns:1})});
  decal(g,"ouro",8.5,"#ffb050",.12);orbs(g,[hx2(0xffa040),hx2(0xffe080)],10,6.5,3.5)}
 else if(id==="iching"){const lac=M(0x9a2a1e,{roughness:.6}),wd2=M(0x3a2418);mk(g,new THREE.CylinderGeometry(9,9.3,.5,8),st,0,.25,0);decal(g,"bagua",8.6,"#90e0ff",.55);
  for(let i=0;i<5;i++){const w=5-i*.7,y=1.6+i*2.5;mk(g,new THREE.BoxGeometry(w,1.6,w),wd2,0,y,0);const r=mk(g,new THREE.ConeGeometry(w*.95,1,4),lac,0,y+1.3,0,{r:[0,Math.PI/4,0]});r.scale.y=.9}
  mk(g,new THREE.ConeGeometry(.25,2.2,6),gold,0,14.4,0);for(let i=0;i<8;i++){const a=i/8*6.2832,x=Math.cos(a)*7.2,z=Math.sin(a)*7.2;mk(g,new THREE.CylinderGeometry(.06,.06,2.4,5),wd2,x,1.7,z);mk(g,new THREE.SphereGeometry(.35,8,6),glow(0xff4030,1.6),x,3.1,z,{ns:1})}
  orbs(g,[hx2(0x90e0ff),hx2(0xffe0a0)],8,7,3)}
 else if(id==="ziggurat"){const br=M(0xb08a58,{roughness:.95});[[14,0],[10.5,1],[7,2],[3.8,3]].forEach(([w,k])=>mk(g,new THREE.BoxGeometry(w,1.9,w),br,0,.95+k*1.9,0));
  mk(g,new THREE.BoxGeometry(2.2,.2,8),M(0x8a6a3a),0,1.2,9.2,{r:[.9,0,0]});mk(g,new THREE.CylinderGeometry(.6,.7,.8,8),dk,0,8.1,0);flame(0,8.9,0,1.8);decal(g,"ishtar",10,"#ffc060",.1);
  for(let i=0;i<7;i++){const a=i/7*6.2832;mk(g,new THREE.SphereGeometry(.3,8,6),glow(new THREE.Color(PLN[i].c).getHex(),1.5),Math.cos(a)*5,2+i*.9,Math.sin(a)*5,{ns:1})}orbs(g,[hx2(0xffc060),hx2(0xffffff)],9,7,5)}
 else if(id==="pyramid"){const pm=mk(g,new THREE.ConeGeometry(8,10,4),M(0x16141c,{roughness:.4}),0,5,0,{r:[0,Math.PI/4,0]});mk(g,new THREE.ConeGeometry(.9,1.2,4),glow(0xffd860,1.4),0,10.4,0,{r:[0,Math.PI/4,0],ns:1});
  mk(g,new THREE.BoxGeometry(1.6,2.4,.4),new THREE.MeshBasicMaterial({color:0x000000}),0,1.3,3.9,{ns:1});[-1,1].forEach(sx=>mk(g,new THREE.CylinderGeometry(.35,.55,6,4),M(0x16141c),sx*6,3,6,{r:[0,.8,0]}));decal(g,"pyr",9.5,"#ffd860",.12);orbs(g,[hx2(0xffd860)],7,6,4)}
 else if(id==="runes"){mk(g,new THREE.CylinderGeometry(7.5,7.8,.3,24),M(0xb8d8e8,{roughness:.1,transparent:true,opacity:.8}),0,.1,0);decal(g,"runes",8,"#90d0ff",.3);
  for(let i=0;i<9;i++){const a=i/9*6.2832,R=6.4,x=Math.cos(a)*R,z=Math.sin(a)*R,ry=faceTo(a),h=3.4+hs(i,3)*1.4;mk(g,new THREE.BoxGeometry(1.3,h,.7),M(0x4a5058,{roughness:.9}),x,h/2,z,{r:[0,ry,.04*(i%3-1)]});stelaFace(g,runeCanvas(i*2+1,"#80c8ff"),x-Math.cos(a)*.38,h*.62,z-Math.sin(a)*.38,1.1,1.1,ry)}
  mk(g,new THREE.BoxGeometry(1.8,5.6,1),M(0x3a4048),0,2.8,0);stelaFace(g,runeCanvas(23,"#ffe090"),0,3.4,.52,1.6,1.6,0);orbs(g,[hx2(0x80c8ff),hx2(0xffffff)],10,6,3)}
 else if(id==="coven"){decal(g,"penta",7.5,"#c070ff",.1);for(let i=0;i<7;i++){const a=i/7*6.2832;mk(g,new THREE.BoxGeometry(.9,2+hs(i,2),.7),M(0x5a564e),Math.cos(a)*6.6,1,Math.sin(a)*6.6,{r:[0,faceTo(a),.05]})}
  for(let k=0;k<6;k++){const a=k*1.05;mk(g,new THREE.CylinderGeometry(.12,.1,1.2,5),M(0x3a2a1a),Math.cos(a)*.7,.55,Math.sin(a)*.7,{r:[Math.sin(a)*.5,0,Math.cos(a)*.5]})}
  for(let k=0;k<3;k++)mk(g,new THREE.ConeGeometry(.55-k*.12,1.6+k*.4,6),glow(k?0xffc040:0xff6a20,1.8),0,.9+k*.3,0,{ns:1});
  const sk=new THREE.Group();sk.position.set(0,0,-5);mk(sk,new THREE.BoxGeometry(2.4,1,1.2),st,0,.5,0);mk(sk,new THREE.SphereGeometry(.45,10,8),M(0xe8e0c8),0,1.5,0);mk(sk,new THREE.ConeGeometry(.2,.6,5),M(0xe8e0c8),0,1.4,.4,{r:[Math.PI/2,0,0]});[-1,1].forEach(q=>{mk(sk,new THREE.CylinderGeometry(.04,.06,1.4,5),M(0xd8d0b8),q*.4,2.3,0,{r:[0,0,-q*.4]});mk(sk,new THREE.CylinderGeometry(.03,.04,.8,5),M(0xd8d0b8),q*.8,2.8,0,{r:[0,0,-q*.8]});mk(sk,new THREE.CylinderGeometry(.03,.04,.8,5),M(0xd8d0b8),q*.6,3,0,{r:[0,0,q*.3]})});mk(sk,new THREE.SphereGeometry(.07,6,5),glow(0xff3020,2.5),-.15,1.55,.38,{ns:1});mk(sk,new THREE.SphereGeometry(.07,6,5),glow(0xff3020,2.5),.15,1.55,.38,{ns:1});g.add(sk);
  mk(g,new THREE.CylinderGeometry(.9,.7,.9,10),M(0x151515),4,.5,3);mk(g,new THREE.SphereGeometry(.7,10,8),glow(0x50ff70,1.4),4,.95,3,{ns:1});orbs(g,[hx2(0xc070ff),hx2(0xff8a40)],10,6,2.5)}
 else if(id==="cathedral"){const nv=M(0x5e5a54);[-1,1].forEach(sx=>{for(let k=0;k<5;k++){const h=7-hs(k,sx+4)*5;mk(g,new THREE.BoxGeometry(1.2,h,2.4),nv,sx*6,h/2,-8+k*3.6)}});mk(g,new THREE.BoxGeometry(13,9,1.2),nv,0,4.5,-9.4);
  for(let k=0;k<4;k++)[-1,1].forEach(sx=>mk(g,new THREE.BoxGeometry(2.4,.6,.9),M(0x3a2a1a),sx*2.2,.5,-4+k*2.4));
  mk(g,new THREE.CircleGeometry(3,24),new THREE.MeshBasicMaterial({map:canTex(symCanvas("rose",0,"#ffc080")),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,6.4,-8.75,{ns:1});
  const tw=mk(g,new THREE.BoxGeometry(3.5,13,3.5),nv,-8,6.5,-7.5);for(let k=0;k<3;k++)mk(g,new THREE.CylinderGeometry(.06,.06,.5,5),glow(0xffd090,1.6),-1.5+k*1.5,.8,-6.5);mk(g,new THREE.BoxGeometry(2.4,1.1,1.1),st,0,.55,-7.8);flame(0,1.4,-7.8,1);decal(g,"hex",6,"#ffd0a0",.1);orbs(g,[hx2(0xffd0a0),hx2(0xb0b0ff)],8,6,3)}
 }

/* ================= OCCULTICA: sites, rites, codex ================= */
let occOpen=false,occMsg="";
function occPanel(title,col){occOpen=true;$("occ").hidden=false;const b=$("occbox");b.innerHTML="";b.style.borderColor=col||"#9a5ac0";const h=el("h2",title);h.style.color=col||"#c8a0ff";b.appendChild(h);if(occMsg){b.appendChild(el("p",occMsg,"msg"));occMsg=""}return b}
function occClose(){occOpen=false;$("occ").hidden=true;hud();draw();save()}
function cvs(c,w){c.style.cssText="width:100%;max-width:"+(w||220)+"px;align-self:center;background:#0a0710;border-radius:50%";return c}
const herbCount=pl=>PLN.find(p=>p.n===pl).h.reduce((t,h)=>t+(hero.inv[h]||0),0);
function spendHerbs(pl,n){for(const h of PLN.find(p=>p.n===pl).h){while(n>0&&hero.inv[h]){hero.inv[h]--;if(!hero.inv[h])delete hero.inv[h];n--}}}
function todayPl(){return PLN.find(p=>p.d===new Date().getDay())}
function herbPlanet(p){const b=biome[p.y][p.x],w={forest:[4,5,1,6],hills:[1,3,4,1],tundra:[6,5,0],mountain:[2,0,3],swamp:[0,6,0,5],desert:[3,2,3,2]}[b];return w[Math.floor(hs(p.x*3,p.y*7)*w.length)]}
function gatherHerb(p){const o=OCCP(),pl=PLN[herbPlanet(p)],nm=pl.h[Math.floor(hs(p.y,p.x*5)*3)],today=todayPl()===pl;let n=rnd(2)+(today?rnd(2):0);if(today)n*=2;giveItem(nm,n);giveItem("Healing herb",1);o.herbs[nm]=1;
 say("You gather "+n+" "+nm+" ("+pl.n+" herb)"+(today?" on "+DAYN[pl.d]+", "+pl.n+"'s own day. Double yield!":".")+" And a sprig of healing herb.")}
function grantBook(name,from){const o=OCCP();giveItem(name);o.site["g_"+from]=1;occMsg="You find the grimoire: "+name+". Read it from your Pack.";sfx("win");const ps=POIS.find(q=>q.id===from);if(ps)openSite(ps);else{occClose()}}
function readBook(name){const o=OCCP(),B=BOOKS[name],b=occPanel(name,"#c8a0ff"),first=!o.read[name];b.appendChild(el("p",B.lore,"say"));
 if(first){o.read[name]=1;o.sp[B.sp]=1;const out=[];addXp(150,out);b.appendChild(el("p","You learn the spell "+B.sp+". "+out.join(" "),"msg"));fixStats();hud()}else b.appendChild(el("p","You know "+B.sp+" already.","sub"));
 b.appendChild(el("p",SPELLS[B.sp].d,"sub"));b.appendChild(btn("Close the book",occClose,"go"))}
function nearSite(){let b=null,bd=5.4;POIS.forEach(p=>{if(!SITES[p.id])return;const d=Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z);if(d<bd){bd=d;b=p}});return b}
function guardFight(p,key,then){occClose();const g=GUARD[key];say("Something guards the knowledge here.");setTimeout(()=>{if(C)return;startCombat(g.slice(),tierAt(p.x,p.y),won=>{if(won)then();else say("The guardian drives you out.")})},350)}
function claim(p,S){if(S.guard)guardFight(p,S.guard,()=>grantBook(S.grim,p.id));else grantBook(S.grim,p.id)}
function cool(key,n){const o=OCCP();return hero.steps-o[key]<n}
function seeGod(o,i){if(!o.gods[i]){o.gods[i]=1;return true}return false}
function castIChing(npc){const o=OCCP();if(hero.gold<5){say("The coins cost five gold.");return}hero.gold-=5;hud();
 const L=[],ch=[];for(let i=0;i<6;i++){L.push((rnd(2)+1)+(rnd(2)+1)+(rnd(2)+1))}
 const hexOf=ls=>{const bits=ls.map(v=>v===7||v===9?1:0),lo=TRIG.findIndex(t=>t[0]===bits[0]&&t[1]===bits[1]&&t[2]===bits[2]),up=TRIG.findIndex(t=>t[0]===bits[3]&&t[1]===bits[4]&&t[2]===bits[5]);return HMAP[lo*8+up]};
 const n1=hexOf(L),moving=L.some(v=>v===6||v===9),L2=L.map(v=>v===6?7:v===9?8:v),n2=moving?hexOf(L2):null;o.hex[n1]=1;if(n2)o.hex[n2]=1;
 const b=occPanel("The Book of Changes","#90e0ff"),dl=(ls,n)=>{const w=el("div",null,"hx");for(let i=5;i>=0;i--){const v=ls[i],yang=v===7||v===9,r=el("div",null,"hl"+(yang?" y":" n")+((v===6||v===9)?" mv":""));if(!yang){r.appendChild(el("i"));r.appendChild(el("i"))}else r.appendChild(el("i","", "w"));w.appendChild(r)}return w};
 b.appendChild(el("p","Six throws of three coins, bottom to top.","sub"));const row=el("div",null,"hxrow");row.appendChild(dl(L,n1));if(n2){row.appendChild(el("span","→","g2"));row.appendChild(dl(L2,n2))}b.appendChild(row);
 const t1=HEX[n1-1].split("|");b.appendChild(el("p","Hexagram "+n1+", "+t1[0]+" ("+TRIGN[HLOW[n1-1][0]]+" below, "+TRIGN[HLOW[n1-1][1]]+" above): "+t1[1],"say"));
 if(n2){const t2=HEX[n2-1].split("|");b.appendChild(el("p","Changing lines become hexagram "+n2+", "+t2[0]+": "+t2[1],"sub"))}
 const good=HEXG.includes(n1),bad=HEXB.includes(n1);let eff;const _om=window.OMEN?OMEN.iching(n1,n2):"";if(good){o.fort+=2;eff="A favourable answer. Fortune favours you in your next 2 fights (+2 to hit).";}else if(bad){eff="An ill omen. Something heard the question.";}else eff="The Changes are neither kind nor cruel today. Remember the words.";
 b.appendChild(el("p",eff+(_om?" "+_om:""),"msg"));const m=el("div",null,"menu");
 if(bad)m.appendChild(btn("Face what answers",()=>{occClose();const f=pickOne(FOES[biome[hy][hx]].filter(q=>q[8]<=tierAt(hx,hy)));setTimeout(()=>{if(!C)startCombat(f.slice(),tierAt(hx,hy))},300)},"go"));else m.appendChild(btn("Close the book",occClose,"go"));b.appendChild(m);save()}
function openSite(p){const S=SITES[p.id],o=OCCP(),b=occPanel(p.name,S.col);b.appendChild(el("p",S.lore,"sub"));
 const cv=S.cv();if(cv){b.appendChild(cvs(cv,S.cw))}
 const m=el("div",null,"menu");
 if(S.grim){if(!o.site["g_"+p.id])m.appendChild(btn("Search for hidden knowledge"+(S.guard?" (a guardian waits)":""),()=>claim(p,S)));else m.appendChild(el("p","You have taken the grimoire from here: "+S.grim+".","sub"))}
 (S.acts||[]).forEach(a=>{if(a.hide&&a.hide(p))return;const dis=a.dis&&a.dis(p);m.appendChild(btn(a.t(p),()=>a.f(p),"alt",dis))});
 m.appendChild(btn("Leave",occClose,"go"));b.appendChild(m)}
function reopen(p,msg){occMsg=msg||"";openSite(p)}
function sealList(p,fn){const o=OCCP();return PLN.map((pl,i)=>({pl,i}))}
const SD={col:"#c8a0ff"};
function mkSites(){
 SITES.hermes={col:"#e8d8a0",lore:"Hermes Trismegistus, Thrice-Great, taught that the cosmos is a single living mind. Seven principles are cut into the sanctum floor: mind, correspondence, vibration, polarity, rhythm, cause and effect, gender. Above the dais, a triangle holds an open eye.",cw:260,cv:()=>symCanvas("tree",0,"#f4dc9a"),grim:"Corpus Hermeticum",
  acts:[{t:()=>"Meditate on the Tree of Life (restores mana)",dis:()=>cool("med",30),f:p=>{const o=OCCP();o.med=hero.steps;fixStats();hero.mana=hero.maxMana;hud();reopen(p,"Ten spheres, twenty-two paths. You climb from Malkuth to Kether and fall back, whole. Mana restored.")}},
   {t:()=>"Read the Emerald Tablet inscription",f:p=>reopen(p,"That which is below is like that which is above, and that which is above is like that which is below, to accomplish the miracles of the one thing.")}]};
 SITES.seals={col:"#c0a8ff",lore:"Seven stones, seven planets, seven metals, seven days. Each stone carries a magic square whose rows, columns and diagonals sum to the same number, and a line traced through its numbers in order. These are the planetary seals.",cw:260,cv:()=>symCanvas("hept",0,"#c0a8ff"),grim:"Key of Solomon",
  acts:PLN.map((pl,i)=>({t:()=>"Seal of "+pl.n+": study"+(OCCP().seals[pl.n]?" (known)":""),f:p=>studySeal(p,i)})).concat(PLN.map((pl,i)=>({t:()=>"Craft Seal of "+pl.n+" (3 "+pl.n+" herbs, 40 gp)",dis:()=>herbCount(pl.n)<3||hero.gold<40||!!hero.inv["Seal of "+pl.n],f:p=>{spendHerbs(pl.n,3);hero.gold-=40;giveItem("Seal of "+pl.n);OCCP().seals[pl.n]=1;OCCP().gw.rub2=1;reopen(p,"You cut the seal in "+pl.m+" under the sign of "+pl.n+". It is yours: "+TALD[pl.n]+". Equip it in your Pack.")}})))};
 SITES.pantheon={col:"#ff6a4a",lore:"Twelve idols, no two of the same tradition. They are not worshipped here so much as kept. The thirteenth niche, at the north, is empty. A priest of nobody once explained that this is the most accurate image of all.",cw:240,cv:()=>symCanvas("gods",0,"#ff6a4a"),
  acts:[{t:()=>"Pray before an idol",dis:()=>cool("pray",25),f:p=>pray(p)},{t:()=>"Study the empty niche",f:p=>{const o=OCCP(),i=GODS.length-1,first=seeGod(o,i);reopen(p,GODS[i][0]+": "+GODS[i][2]+"."+(first?" (Entered in your Codex.)":""))}},{t:()=>"Pantheon known: "+Object.keys(OCCP().gods).length+"/"+GODS.length,f:p=>reopen(p,"The idols know more of you than you of them.")}]};
 SITES.archon={col:"#70ff90",lore:"The Gnostics taught that the world was made by a blind craftsman, Yaldabaoth, who believed himself the only god, and that seven Archons keep the gates of the heavens. The soul must pass each with the right word. Between the rings, a green light watches you.",cw:260,cv:()=>symCanvas("rings",0,"#70ff90"),grim:"Enochian Tablets",guard:"arch",
  acts:[{t:()=>OCCP().site.gnosis?"Gnosis: already seen":"Seek Gnosis (costs 10 HP, reveals all hidden dungeons)",dis:()=>!!OCCP().site.gnosis||!OCCP().site["g_archon"],f:p=>{const o=OCCP();o.site.gnosis=1;hero.hp=Math.max(1,hero.hp-10);POIS.forEach(q=>{if(q.hidden){found[q.id]=1}});for(let i=0;i<seen.length;i++)seen[i]=1;hud();reopen(p,"The rings stop turning. In the silence, you remember every hidden stair: all dungeons are now marked on your map. It costs you blood, and something else you cannot name.")}},
   {t:()=>"Speak the name Abraxas",f:p=>{const o=OCCP(),i=GODS.findIndex(g=>g[0]==="Abraxas");reopen(p,GODS[i][0]+": "+GODS[i][2]+"."+(seeGod(o,i)?" (Codex.)":""))}}]};
 SITES.athanor={col:"#ffa040",lore:"V.I.T.R.I.O.L.: Visita Interiora Terrae Rectificando Invenies Occultum Lapidem. The Great Work has four stages: nigredo (black), albedo (white), citrinitas (yellow), rubedo (red). Brew the elixirs of Saturn, Moon, Sun and Mars to complete it.",cw:260,cv:()=>symCanvas("ouro",0,"#ffb050"),
  acts:PLN.map(pl=>({t:()=>"Brew Elixir of "+pl.n+" (2 "+pl.n+" herbs)",dis:()=>herbCount(pl.n)<2,f:p=>brew(p,pl)})).concat([{t:()=>"The Great Work: "+GWN().join(", "),dis:()=>true,f:()=>{}}])};
 SITES.iching={col:"#90e0ff",lore:"Eight trigrams circle the floor: Heaven, Lake, Fire, Thunder, Wind, Water, Mountain, Earth. Combine two and you have a hexagram, sixty-four in all, one for each way a moment can turn. Three coins, six throws, five gold.",cw:240,cv:()=>symCanvas("bagua",0,"#90e0ff"),
  acts:[{t:()=>"Cast the coins (5 gp)",dis:()=>hero.gold<5,f:p=>{occClose();castIChing()}},{t:()=>"Hexagrams known: "+Object.keys(OCCP().hex).length+"/64",f:p=>reopen(p,"The more you ask, the better you hear.")}]};
 SITES.ziggurat={col:"#ffc060",lore:"Seven stages for seven wandering stars, as in the old cities of Mesopotamia. The astral magic of the Picatrix says that each herb, stone and metal is a thread from one planet, and the adept who gathers under the right sky doubles their harvest.",cw:240,cv:()=>symCanvas("ishtar",0,"#ffc060"),grim:"Picatrix",guard:"ush",
  acts:[{t:()=>"Read the heavens (today is "+DAYN[new Date().getDay()]+")",f:p=>{const t=todayPl();reopen(p,"Today is the day of "+t.n+": "+t.v+". Herbs of "+t.n+" ("+t.h.join(", ")+") yield double.")}},{t:()=>"Invoke "+todayPl().n+" (fortune for 3 fights)",dis:()=>cool("inv",30),f:p=>{const o=OCCP(),t=todayPl();o.inv=hero.steps;o.fort+=3;reopen(p,"You speak the hour and the name. "+t.n+" turns its face to you. Fortune favours your next 3 fights.")}}]};
 SITES.pyramid={col:"#ffd860",lore:"Basalt, gold and a door that was left ajar. Thoth, ibis-headed scribe of the gods, is said to have written the book that holds the world's language and hidden it where no hand would find it. Hands did.",cw:240,cv:()=>symCanvas("pyr",0,"#ffd860"),grim:"Emerald Tablet",guard:"ush",
  acts:[{t:()=>OCCP().site.riddle?"Riddle of the Scribe: answered":"Answer the riddle of the Scribe",dis:()=>!!OCCP().site.riddle,f:p=>riddle(p)},{t:()=>"Speak to Thoth",f:p=>{const o=OCCP(),i=GODS.findIndex(g=>g[0]==="Thoth");reopen(p,GODS[i][0]+": "+GODS[i][2]+"."+(seeGod(o,i)?" (Codex.)":""))}}]};
 SITES.runes={col:"#90d0ff",lore:"Nine menhirs and a high stone. Odin hung nine nights on the windswept tree, wounded by his own spear, until the runes rose to him. Cast three here and the Norns answer: what was, what is, what must be.",cw:240,cv:()=>symCanvas("runes",0,"#90d0ff"),grim:"Havamal Rune-Song",guard:"drg",
  acts:[{t:()=>"Cast the runes (free)",f:p=>castRunes(p)},{t:()=>"Runes known: "+Object.keys(OCCP().runes).length+"/24",f:p=>reopen(p,"Each rune is a letter, a charm, and a god's name. Learn them all.")}]};
 SITES.coven={col:"#c070ff",lore:"A circle of seven stones, a bonfire, and a stag skull on a low altar. The witches here are kin, whatever else they are. They deal in herbs and in favours, in that order. They ask that you do not step across the line of salt.",cw:240,cv:()=>symCanvas("penta",0,"#c070ff"),grim:"Grimorium Verum",guard:"cult",
  acts:[{t:()=>"Dance the sabbat",dis:()=>cool("pray",25),f:p=>sabbat(p)},{t:()=>"Honour the horned lord",f:p=>{const o=OCCP(),i=GODS.findIndex(g=>g[0]==="Cernunnos");reopen(p,GODS[i][0]+": "+GODS[i][2]+"."+(seeGod(o,i)?" (Codex.)":""))}}]};
 SITES.cathedral={col:"#ffd0a0",lore:"The nave is open to the sky. Candles still burn at the altar and no one lights them. In the crypt below, the choir sings a note that is not quite a note.",cw:240,cv:()=>symCanvas("rose",0,"#ffc080"),grim:"Sepher Raziel",guard:"lem",
  acts:[{t:()=>"Light a candle (restores health)",dis:()=>cool("med",30),f:p=>{const o=OCCP();o.med=hero.steps;fixStats();hero.hp=hero.maxHp;hud();reopen(p,"The flame stands straight though the wind moves. You are whole again.")}},{t:()=>"Kneel at the altar",f:p=>{const o=OCCP(),i=GODS.findIndex(g=>g[0]==="Michael");reopen(p,GODS[i][0]+": "+GODS[i][2]+"."+(seeGod(o,i)?" (Codex.)":""))}}]}}
function GWN(){const g=OCCP().gw;return[["Nigredo",g.nig],["Albedo",g.alb],["Citrinitas",g.cit],["Rubedo",g.rub]].map(([n,v])=>n+(v?" done":" pending"))}
function brew(p,pl){const o=OCCP();spendHerbs(pl.n,2);giveItem("Elixir of "+pl.n);const st={Saturn:"nig",Moon:"alb",Sun:"cit",Mars:"rub"}[pl.n];let msg="You brew the Elixir of "+pl.n+".";if(st&&!o.gw[st]){o.gw[st]=1;msg+=" A stage of the Great Work completes: "+{nig:"Nigredo, the blackening.",alb:"Albedo, the whitening.",cit:"Citrinitas, the yellowing.",rub:"Rubedo, the reddening."}[st]}
 if(o.gw.nig&&o.gw.alb&&o.gw.cit&&o.gw.rub&&!o.site.stone){o.site.stone=1;giveItem("Philosopher's Stone");giveItem("Book of Abramelin");msg+=" The flask clouds, clears, and blushes red. In the ash: the Philosopher's Stone, and beneath it a thin book. (Both are in your Pack.)";sfx("win")}
 reopen(p,msg)}
function pray(p){const o=OCCP();o.pray=hero.steps;const pool=[];while(pool.length<3){const i=rnd(GODS.length-1)-1;if(!pool.includes(i))pool.push(i)}
 const b=occPanel("Whose idol do you kneel before?","#ff6a4a");const m=el("div",null,"menu");pool.forEach(i=>m.appendChild(btn(GODS[i][0]+" ("+GODS[i][1]+")",()=>{const f=seeGod(o,i),r=Math.random();let msg=GODS[i][0]+": "+GODS[i][2]+". "+(f?"(Codex entry added.) ":"");
  if(r<.3){fixStats();hero.hp=hero.maxHp;msg+="The idol's eyes close. Your wounds close with them."}else if(r<.5){fixStats();hero.mana=hero.maxMana;msg+="Power pours into you like cold water."}else if(r<.7){const x=[];addXp(60,x);msg+="A vision. "+x.join(" ")}else if(r<.85){hero.gold+=40;msg+="Gold coins, warm as if just minted, rest where you knelt (+40 gp)."}
  else{occMsg=msg+"The eyes turn red. Something steps off its plinth.";occClose();setTimeout(()=>{if(!C)startCombat(pickOne([GUARD.arch.slice(),GUARD.ush.slice(),GUARD.drg.slice()]),tierAt(p.x,p.y))},500);return}
  fixStats();hud();reopen(p,msg)})));m.appendChild(btn("Rise and withdraw",()=>reopen(p,"The idols watch you go."),"alt"));b.appendChild(m)}
function sabbat(p){const o=OCCP();o.pray=hero.steps;const r=Math.random();let msg="You step into the circle and the singing swallows you. ";
 if(r<.4){fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;msg+="You wake at dawn in the same spot, rested and strangely ready."}else if(r<.7){const pl=pickOne(PLN),n=rnd(3)+1,h=pl.h[rnd(3)-1];giveItem(h,n);msg+="A witch presses "+n+" "+h+" into your hand and will not say why."}
 else{occMsg=msg+"The dance sours. A figure at the edge of the firelight is looking straight at you.";occClose();setTimeout(()=>{if(!C)startCombat(["Coven Witch",18,12,5,1,6,2,75,0,"#6a3a8a","charm"],tierAt(p.x,p.y))},500);return}
 hud();reopen(p,msg)}
function studySeal(p,i){const o=OCCP(),pl=PLN[i];o.seals[pl.n]=1;const b=occPanel("Seal of "+pl.n+" "+pl.g,pl.c);b.appendChild(cvs(sealCanvas(i,360),280));
 b.appendChild(el("p",pl.n+" governs "+pl.v+". Metal: "+pl.m+". Day: "+DAYN[pl.d]+". Herbs: "+pl.h.join(", ")+". The square of order "+KORD[i]+" sums to "+pl.k+" along every row, column and diagonal.","sub"));
 b.appendChild(el("p","A Seal of "+pl.n+": "+TALD[pl.n]+".","msg"));b.appendChild(btn("Back to the circle",()=>openSite(p),"go"))}
function riddle(p){const b=occPanel("The Scribe's riddle","#ffd860");b.appendChild(el("p","\"I am what is above and I am what is below. I am the same in the mirror and the world. Say the saying that holds the work together.\"","say"));const m=el("div",null,"menu");
 [["As above, so below.",1],["The map is the territory.",0],["Know thyself, and be known.",0]].sort(()=>Math.random()-.5).forEach(([t,ok])=>m.appendChild(btn(t,()=>{const o=OCCP();if(ok){o.site.riddle=1;const x=[];addXp(120,x);hero.gold+=50;hud();reopen(p,"The Scribe nods, once. +50 gp. "+x.join(" "))}else{hero.hp=Math.max(1,hero.hp-6);hud();reopen(p,"The ibis-head turns away. A dry hand cuffs you across the face. (-6 HP) Ask again after you have walked.")}})));b.appendChild(m)}
function castRunes(p){const o=OCCP(),pick=[];while(pick.length<3){const i=rnd(24)-1;if(!pick.includes(i))pick.push(i)}pick.forEach(i=>o.runes[i]=1);const b=occPanel("The Norns' answer","#90d0ff");const row=el("div",null,"hxrow");["What was","What is","What must be"].forEach((l,k)=>{const d=el("div",null,"rn");const c=runeCanvas(pick[k],"#a0d8ff");c.style.cssText="width:70px;height:70px;background:#0a0f1a;border-radius:6px";d.appendChild(c);d.appendChild(el("b",RUNES[pick[k]][0]));d.appendChild(el("small",l));row.appendChild(d)});b.appendChild(row);
 pick.forEach(i=>b.appendChild(el("p",RUNES[i][0]+": "+RUNES[i][1]+".","sub")));o.fort+=1;b.appendChild(el("p","The stones hum. Fortune favours your next fight.","msg"));b.appendChild(btn("Back",()=>openSite(p),"go"))}
function openCodex(){const o=OCCP(),b=occPanel("Grimoire and Codex","#c8a0ff");
 b.appendChild(el("p","Fortune: "+o.fort+" fights.   Today is "+DAYN[new Date().getDay()]+", the day of "+todayPl().n+".","sub"));
 knCodex(b);b.appendChild(el("h3","The Great Work"));b.appendChild(el("p",GWN().join("   |   "),"sub"));
 b.appendChild(el("h3","Grimoires read"));b.appendChild(el("p",Object.keys(BOOKS).map(k=>(o.read[k]?"✓ ":"· ")+k+" ("+BOOKS[k].sp+")").join("\n"),"sub")).style.whiteSpace="pre-line";
 b.appendChild(el("h3","Planetary seals"));const g=el("div",null,"sg");PLN.forEach((pl,i)=>{const d=el("div",null,"sc");if(o.seals[pl.n]){const c=sealCanvas(i,150);c.style.cssText="width:100%;border-radius:50%";d.appendChild(c)}else d.appendChild(el("div","?","q"));d.appendChild(el("small",pl.n+" "+pl.g+" "+pl.k));g.appendChild(d)});b.appendChild(g);
 b.appendChild(el("h3","Herbs found"));b.appendChild(el("p",PLN.map(pl=>pl.n+": "+pl.h.map(h=>o.herbs[h]?h:"?").join(", ")).join("\n"),"sub")).style.whiteSpace="pre-line";
 b.appendChild(el("h3","Gods and powers ("+Object.keys(o.gods).length+"/"+GODS.length+")"));b.appendChild(el("p",GODS.map((x,i)=>o.gods[i]?x[0]+" ("+x[1]+")":"?").join(", "),"sub"));
 b.appendChild(el("h3","Runes ("+Object.keys(o.runes).length+"/24)"));b.appendChild(el("p",RUNES.map((r,i)=>o.runes[i]?r[0]:"?").join(" "),"sub"));
 b.appendChild(el("h3","Hexagrams ("+Object.keys(o.hex).length+"/64)"));b.appendChild(el("p",Object.keys(o.hex).map(Number).sort((a,c)=>a-c).map(n=>n+" "+HEX[n-1].split("|")[0]).join(", ")||"None cast yet.","sub"));
 b.appendChild(btn("Close",occClose,"go"))}

/* ================= OCCULTICA: ambience, wisps, init ================= */
let siteL=null,wisps=[];
function initOcc(){siteL=new THREE.PointLight(0xc070ff,0,20);scene.add(siteL);const t=radTex(150,255,210);
 for(let i=0;i<18;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));s.scale.setScalar(.55);s.userData={a:i*1.7,r:5+hs(i,3)*16,sp:.2+hs(i,4)*.35,h:.6+hs(i,5)*1.6,ph:i};scene.add(s);wisps.push(s)}}
function occFrame(dt,cp){if(DG||!siteL)return;const night=1-todDay;
 DEC.forEach((d,i)=>{d.material.opacity=d.userData.o*(.55+.45*night)*(.88+.12*Math.sin(clock*1.6+i))});
 SPIN.forEach(s=>{s.o.rotation[s.ax]+=s.sp*dt});
 ORB.forEach(o=>{o.a+=dt*o.sp;o.s.position.set(o.cx+Math.cos(o.a)*o.r,o.cy+Math.sin(o.a*1.7+o.ph)*.5,o.cz+Math.sin(o.a)*o.r);o.s.material.opacity=.45+.4*Math.sin(clock*2+o.ph)});
 let best=null,bd=42;POIS.forEach(p=>{if(!SITES[p.id])return;const g=poiMeshes[p.id],d=Math.hypot(g.position.x-cp.x,g.position.z-cp.z);if(d<bd){bd=d;best=p}});
 if(best){const g=poiMeshes[best.id];siteL.color.set(SITES[best.id].col);siteL.position.set(g.position.x,g.position.y+3.4,g.position.z);siteL.intensity=(1.7+Math.sin(clock*3.1)*.3)*(1-bd/42)*(.7+.8*night)}else siteL.intensity=0;
 const sw=tgt.key==="swamp",vis=night>.35||sw;wisps.forEach((w,i)=>{const u=w.userData;u.a+=dt*u.sp;const x=cp.x+Math.cos(u.a+i)*u.r,z=cp.z+Math.sin(u.a*.8+i*2)*u.r;w.position.set(x,Math.max(hfn(x,z),-.4)+u.h+Math.sin(clock*1.3+u.ph)*.35,z);w.material.opacity=vis?(.25+.35*Math.sin(clock*2.2+u.ph*3)**2)*(sw?1:night):0})}
function whisper(){if(!ac||!on)return;const n=ac.createBufferSource();n.buffer=noiseBuf();const f=ac.createBiquadFilter();f.type="bandpass";f.Q.value=7;const t=ac.currentTime,d=1.4+Math.random()*1.4,f0=700+Math.random()*900;f.frequency.setValueAtTime(f0,t);f.frequency.linearRampToValueAtTime(f0*(.6+Math.random()*.8),t+d);
 const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+d*.35);g.gain.linearRampToValueAtTime(0,t+d);const p=ac.createStereoPanner?ac.createStereoPanner():null;if(p)p.pan.value=Math.random()*2-1;n.connect(f);f.connect(g);if(p){g.connect(p);p.connect(master)}else g.connect(master);n.start(t);n.stop(t+d+.1)}
function dread(){if(!ac||!on)return;const f=55+Math.random()*30;tone(f,f*.98,5,"sine",.05,0);tone(f*1.414,f*1.4,5,"sine",.025,.3)}
Object.keys(SND).forEach(k=>{const old=SND[k].ev;SND[k].ev=()=>{old();const r=Math.random();if(r<.3)whisper();else if(r<.38)dread()};SND[k].gap=[Math.min(SND[k].gap[0],4500),Math.min(SND[k].gap[1],9000)]});
mkSites();
HUM.unshift([/Witch/,{skin:0x9ab08a,cloth:0x3a2a4a,hood:1,weapon:"staff",eye:0x80ff80}],[/Cultist/,{skin:0xd8b8a0,cloth:0x1a1418,hood:1,weapon:"dagger",eye:0xff3030}],[/Magus|Mage/,{skin:0xd8b8a0,cloth:0x5a2a8a,hood:1,weapon:"staff",eye:0xc080ff}],[/Draugr/,{skin:0x8aa0a0,cloth:0x3a4a4a,helmet:1,weapon:"axe",eye:0x60e0ff}],[/Ushabti/,{skin:0xc0a050,cloth:0xc0a050,wrap:1,crown:1,eye:0xffd040}]);
SITEPOS.length=0;
POIS.forEach(p=>{if(SITE_DEFS.some(d=>d[0]===p.id))FLAT.push({x:p.x*TW+1,z:p.y*TW+1,h:hfn(p.x*TW+1,p.y*TW+1),R:12})});
function siteNear(x,z,R){return POIS.some(p=>SITE_DEFS.some(d=>d[0]===p.id)&&Math.hypot(p.x*TW+1-x,p.y*TW+1-z)<R)}


/* ================= KNIGHTHOOD: temples, trials, ranks ================= */
function symKn(kind,col){const N=512,c=mkCanvas(N),g=c.getContext("2d"),C=N/2;g.strokeStyle=col;g.fillStyle=col;g.lineWidth=4;g.shadowColor=col;g.shadowBlur=10;g.lineCap=g.lineJoin="round";circ(g,C,C,N*.47);g.lineWidth=2;circ(g,C,C,N*.455);
 if(kind==="checker"){g.save();g.beginPath();g.arc(C,C,N*.44,0,6.2832);g.clip();const s=N*.88/8,o=N*.06;g.globalAlpha=.42;g.shadowBlur=0;for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2===0)g.fillRect(o+x*s,o+y*s,s,s);g.globalAlpha=1;g.restore();g.shadowBlur=10}
 g.lineWidth=7;g.beginPath();g.moveTo(C-N*.17,C+N*.18);g.lineTo(C,C-N*.2);g.lineTo(C+N*.17,C+N*.18);g.stroke();g.beginPath();g.moveTo(C-N*.2,C-N*.02);g.lineTo(C,C+N*.2);g.lineTo(C+N*.2,C-N*.02);g.stroke();
 g.lineWidth=3;g.beginPath();g.ellipse(C,C+N*.03,N*.06,N*.032,0,0,6.28);g.stroke();circ(g,C,C+N*.03,N*.014,1);star(g,C,C-N*.3,N*.07,8,3);g.shadowBlur=0;return c}
function buildCommandery(p,g,id){const n=+id.slice(2),tone=[0xb8b0a0,0x8a8a92,0xa8c0d0,0x4a4a56][n-1],st=PM("flag",((Math.min(255,((tone>>16)&255)*1.45)<<16)|(Math.min(255,((tone>>8)&255)*1.45)<<8)|Math.min(255,(tone&255)*1.45))|0,.1,1),dk=M(0x1a1820),slate=M([0x6a2a22,0x3a3a48,0x2a3a5a,0x14141c][n-1]),glw=(c,i)=>M(c,{emissive:c,emissiveIntensity:i||1.4,flatShading:false});
 for(let i=0;i<16;i++){const a=i/16*6.2832;if(Math.abs(a-1.5708)<.4)continue;const x=Math.cos(a)*10.5,z=Math.sin(a)*10.5,ry=faceTo(a);mk(g,new THREE.BoxGeometry(4,2.6,.9),st,x,1.3,z,{r:[0,ry,0]});for(let k=-1;k<=1;k++)mk(g,new THREE.BoxGeometry(.8,.6,.9),st,x+Math.cos(ry)*k*1.3,2.9,z-Math.sin(ry)*k*1.3,{r:[0,ry,0]})}
 mk(g,new THREE.BoxGeometry(9,4.6,7),st,0,2.3,-3);mk(g,new THREE.ConeGeometry(6.6,3,4),slate,0,6.1,-3,{r:[0,Math.PI/4,0]});mk(g,new THREE.BoxGeometry(2,3.2,.2),dk,0,1.6,.58,{ns:1});[-3,3].forEach(x=>mk(g,new THREE.BoxGeometry(.9,1.2,.2),glw(0xffe0a0,1),x,2.8,.6,{ns:1}));stelaFace(g,symCanvas("sqc",0,"#ffe9a0"),0,3.9,.62,1.8,1.8,0);
 [-1,1].forEach(sx=>{mk(g,new THREE.CylinderGeometry(1.5,1.7,8,12),st,sx*8.6,4,-6);mk(g,new THREE.ConeGeometry(2,2.6,12),slate,sx*8.6,9.3,-6);mk(g,new THREE.CylinderGeometry(.58,.64,6.4,14),sx<0?M(0x14101a,{roughness:.4}):M(0xeeeadc,{roughness:.4}),sx*2.6,3.4,10.8);mk(g,new THREE.SphereGeometry(.68,10,8),M(0xb02a2a,{emissive:0x401010}),sx*2.6,6.9,10.8,{ns:1});mk(g,new THREE.ConeGeometry(.2,.6,6),glw(0xffa040,1.8),sx*3.4,1.2,10.2,{ns:1})});
 [[-5.5,6,0xe8e8f0],[5.5,6,0x2a4a9a]].forEach(([x,z,c])=>{mk(g,new THREE.CylinderGeometry(.08,.08,5.4,6),M(0x4a3a2a),x,2.7,z);mk(g,new THREE.BoxGeometry(1.3,2.4,.05),M(c,{emissive:c,emissiveIntensity:.15}),x+.7,4.2,z)});
 const sb=new THREE.Group();sb.position.set(0,0,3.6);mk(sb,new THREE.BoxGeometry(2,.9,2),st,0,.45,0);mk(sb,new THREE.CylinderGeometry(.5,.62,2.2,8),M(0x6a6a74,{metalness:.5,roughness:.5}),0,2,0);mk(sb,new THREE.SphereGeometry(.4,10,8),M(0x6a6a74,{metalness:.5}),0,3.4,0);mk(sb,new THREE.BoxGeometry(.14,3.4,.06),glw(0xc8d8ff,1.3),.9,2.4,.3,{ns:1});g.add(sb);
 decal(g,"checker",8.8,"#e8ecff",.12);orbs(g,[hx2(0xe8ecff),hx2(0xffe0a0)],8,7,3.5)}
function lessonKey(i){KN().les[i]=1}
function knTitle(){return KNR[KN().rank]}
function knCodex(b){const kn=KN();b.appendChild(el("h3","Knighthood"));b.appendChild(el("p","Rank: "+KNR[kn.rank]+(MARTIAL.includes(hero.cls)?" (martial bonus active)":"")+"\n"+KNSTAGE[Math.min(kn.rank+1,4)<=4&&kn.rank<4?kn.rank:4]+"\nSwords from the vaults: "+(Object.keys(kn.sw).length?Object.keys(kn.sw).map(n=>["Sword of the Square","Plumb-Line Sword","Compass Sword","Sword of the Blazing Star"][n-1]).join(", "):"none yet")+"\nLessons learned: "+Object.keys(kn.les).length+"/"+KNL.length+" ("+KNL.map((l,i)=>kn.les[i]?l[0]:"?").join(", ")+")","sub")).style.whiteSpace="pre-line"}
function knLessonPanel(p,idxs,done){let k=0;const show=()=>{const i=idxs[k],L=KNL[i];lessonKey(i);const b=occPanel(L[0],"#e0e4f0");b.appendChild(el("p",L[2],"say"));if(L[3]){const cv=L[3]();cv.style.cssText="width:100%;max-width:260px;align-self:center;background:#0a0710;border-radius:6px;border:1px solid #6a7090";b.appendChild(cv)};b.appendChild(el("p","Lesson "+(k+1)+" of "+idxs.length+".","sub"));b.appendChild(btn(k<idxs.length-1?"Next lesson":"Continue",()=>{if(k<idxs.length-1){k++;show()}else done()},"go"))};show()}
function knQuiz(p,count,done,retry){const idx=[];while(idx.length<count){const i=Math.floor(Math.random()*KNL.length);if(!idx.includes(i))idx.push(i)}let k=0;
 const ask=()=>{const i=idx[k],L=KNL[i],opts=[L[1]];while(opts.length<3){const o=KNL[Math.floor(Math.random()*KNL.length)][1];if(!opts.includes(o))opts.push(o)}opts.sort(()=>Math.random()-.5);
  const b=occPanel("The Questioner","#e0e4f0");b.appendChild(el("p","Question "+(k+1)+" of "+count+". \"What does "+L[0]+" teach?\"","say"));const m=el("div",null,"menu");
  opts.forEach(o=>m.appendChild(btn(o,()=>{if(o===L[1]){lessonKey(i);if(++k>=count)done();else ask()}else{occMsg="Not so. "+L[2];knLessonPanel(p,[i],()=>knQuiz(p,count,done))}})));b.appendChild(m)};ask()}
function knDuel(p,f,win){occClose();setTimeout(()=>{if(!C)startCombat(f.slice(),tierAt(p.x,p.y),won=>{if(won)win();else say("You are bested. The trial can be taken again.")})},350)}
function knRankUp(p,n){const kn=KN(),o=OCCP();kn.rank=n;const T={1:["Vow of the Order"],2:["Shield of the Order","Knight's Charge"],3:["Mercy of the Order","Templar's Smite","Pathfinder's Mark"],4:["Blazing Star"]}[n],learned=[];T.forEach(s=>{o.sp[s]=1;if(SPELLS[s].c.includes(hero.cls))learned.push(s)});
 const x=[];addXp(100*n,x);fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hud();sfx("win");reopen(p,"You are raised to "+KNR[n]+"."+(n===1?" You have learned to MEDITATE. Press M or use the Meditate button.":"")+" New: "+learned.join(", ")+". Rank bonus: +"+knB("hp")+" max HP"+(knB("ac")?", +"+knB("ac")+" AC":"")+(knB("h")?", +"+knB("h")+" to hit":"")+". "+x.join(" ")+" The vault of this hall will now open to you.")}
function knTrial(p,n){const win=()=>knRankUp(p,n);occClose();
 if(n===1)knLessonPanel(p,[0,1,2],()=>knDuel(p,["Training Knight",18,12,3,1,6,1,60,0,"#8a8f98"],win));
 else if(n===2)knQuiz(p,2,()=>knDuel(p,["Fallen Templar",34,15,6,1,10,3,120,0,"#b0b0c0"],win));
 else if(n===3)knLessonPanel(p,[5,6],()=>knDuel(p,["Shade of the Order",32,13,5,1,8,3,120,0,"#7a8aa8","drain",1],()=>{say("The vigil is not over.");setTimeout(()=>knDuel(p,["Warden of the Vault",48,16,7,1,10,4,180,0,"#c8c8d8"],win),600)}));
 else knQuiz(p,3,()=>knDuel(p,["Your Shadow",30+hero.level*10,13+(hero.level>>1),5+(hero.level>>1),1,8,2+hero.level,220,0,"#202030","drain"],win))}
function knVault(p,n){const kn=KN(),sw=["Sword of the Square","Plumb-Line Sword","Compass Sword","Sword of the Blazing Star"][n-1];kn.sw[n]=1;giveItem(sw);hero.gold+=40*n;giveItem("Healing potion");hud();sfx("win");reopen(p,"Behind a stone that was not a wall, the vault: "+sw+", "+(40*n)+" gp and a healing potion. "+ITEMS[sw].desc+" Equip it in your Pack.")}
function mkKnights(){const N=["Squire","Knight","Knight-Commander","Master"],R=["I","II","III","IV"],
 L={1:"A walled commandery of pale stone. Two pillars, one dark and one pale, flank the gate, and the courtyard floor is checkered black and white. Here the order's first charge is given: strength is not enough, and gentleness is not enough, so walk between.",2:"A fortified chapterhouse on a hilltop. A square and compass are carved above the door with an open eye between them, for the order reads the old symbols in a Gnostic way: the tools are ways of seeing, not only of building.",3:"An ice-rimed hall whose watchfires never die. Knights' banners hang frozen in still air. Those who stand the night vigil here are changed by it, whether or not they pass.",4:"A mountain chapter-house under a star of white light. The gate opens only for those who have asked in the right way. Its oldest lesson is the Blazing Star: the spark of truth in each of us, which is ours to feed."};
 [1,2,3,4].forEach(n=>{SITES["kn"+n]={col:"#e0e4f0",lore:L[n],cw:240,cv:()=>symCanvas("checker",0,"#e8ecff"),acts:[
  {t:()=>{const r=KN().rank;return r>=n?"Trial of the "+N[n-1]+": passed":(r<n-1?"Trial of the "+N[n-1]+" (requires "+KNR[n-1]+")":(hero.level<KNLV[n]?"Trial of the "+N[n-1]+" (requires level "+KNLV[n]+")":"Take the Trial of the "+N[n-1]))},dis:()=>KN().rank>=n||KN().rank<n-1||hero.level<KNLV[n],f:p=>knTrial(p,n)},
  {t:()=>KN().sw[n]?"The vault is empty":(KN().rank>=n?"Search the vault":"The vault stone is shut (requires "+KNR[n]+")"),dis:()=>KN().rank<n||!!KN().sw[n],f:p=>knVault(p,n)},
  {t:()=>"Study a lesson of the order",f:p=>{const k=KN(),i=Math.floor(Math.random()*KNL.length);lessonKey(i);const x=KNL[i];reopen(p,x[0]+": "+x[2])}},
  {t:()=>"Where does my path lead?",f:p=>reopen(p,KNSTAGE[KN().rank])},
  {t:()=>"Rest in the commandery (restore health)",dis:()=>hero.steps-KN().rest<30,f:p=>{KN().rest=hero.steps;fixStats();hero.hp=hero.maxHp;hud();reopen(p,"A bed, a hot meal and a dry cloak. You are whole.")}}]}})}
mkKnights();
HUM.unshift([/Knight|Templar|Warden/,{skin:0xd8b8a0,cloth:0xe8e8f0,helmet:1,weapon:"sword",shield:1,eye:0xffe040}]);
STOCK.Armorer=[["Longsword",60],["Warhammer",50],["Chain shirt",70],["Tower shield",60],["Healing potion",22],["Shield",30],["Mana potion",20]];

/* ================= MEDITATION, GEOMETRY, HALL DECOR ================= */
function geoFig(i){const N=260,c=mkCanvas(N),g=c.getContext("2d");g.strokeStyle="#e8ecff";g.fillStyle="#e8ecff";g.lineWidth=2.5;g.lineCap=g.lineJoin="round";g.font="14px serif";g.textAlign="center";g.shadowColor="#8090ff";g.shadowBlur=6;
 if(i===0){const y=90,x0=30,x1=230,L=x1-x0;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();[[0,"1:1"],[.25,"4:3"],[1/3,"3:2"],[.5,"2:1"],[1,""]].forEach(([f,t])=>{const x=x1-L*f;g.beginPath();g.moveTo(x,y-14);g.lineTo(x,y+14);g.stroke();if(t)g.fillText(t,x,y+32)});
  g.fillText("octave at the middle",N/2,y-34);g.fillStyle="#ffe0a0";g.fillRect(x0-8,y-20,8,40);g.fillRect(x1,y-20,8,40);g.font="12px serif";g.fillStyle="#e8ecff";g.fillText("stop the string at these points",N/2,200)}
 else if(i===1){const ox=60,oy=190,u=32;g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+4*u,oy);g.lineTo(ox,oy-3*u);g.closePath();g.stroke();g.strokeRect(ox,oy-u*.5,u*.5,u*.5);g.fillText("4",ox+2*u,oy+20);g.fillText("3",ox-14,oy-1.5*u);g.fillText("5",ox+2*u+16,oy-1.5*u-8);g.fillStyle="#ffe0a0";g.fillText("3² + 4² = 5²",N/2,40)}
 else if(i===2){const r=62,cy=120;g.beginPath();g.arc(N/2-r/2,cy,r,0,6.2832);g.stroke();g.beginPath();g.arc(N/2+r/2,cy,r,0,6.2832);g.stroke();g.globalAlpha=.25;g.beginPath();g.arc(N/2-r/2,cy,r,-1.047,1.047);g.arc(N/2+r/2,cy,r,2.094,4.19);g.fill();g.globalAlpha=1;g.beginPath();g.moveTo(N/2-r/2,cy);g.lineTo(N/2+r/2,cy);g.lineTo(N/2,cy-r*.866);g.closePath();g.stroke();g.fillText("the lens: unity bearing two",N/2,220)}
 else if(i===3){const cx=N/2,cy=125,R=84,P=[0,1,2,3,4].map(k=>[cx+Math.sin(k*1.2566)*R,cy-Math.cos(k*1.2566)*R]);g.beginPath();[0,2,4,1,3,0].forEach((k,j)=>j?g.lineTo(P[k][0],P[k][1]):g.moveTo(P[k][0],P[k][1]));g.stroke();g.beginPath();g.arc(cx,cy,R,0,6.2832);g.globalAlpha=.4;g.stroke();g.globalAlpha=1;g.fillStyle="#ffe0a0";g.fillText("φ = 1.618…",cx,238)}
 else{const s=62,cx=N/2,cy=125;g.beginPath();[[0,-s],[s*.87,-s*.5],[s*.87,s*.5],[0,s],[-s*.87,s*.5],[-s*.87,-s*.5]].forEach(([x,y],j)=>j?g.lineTo(cx+x,cy+y):g.moveTo(cx+x,cy+y));g.closePath();g.stroke();g.beginPath();g.moveTo(cx,cy);g.lineTo(cx,cy-s);g.moveTo(cx,cy);g.lineTo(cx+s*.87,cy+s*.5);g.moveTo(cx,cy);g.lineTo(cx-s*.87,cy+s*.5);g.stroke();g.fillText("6 faces · 12 edges · 8 corners",cx,228)}
 return c}
const geoDone=()=>{const k=KN();return GEOS.every((_,i)=>k.les[12+i])||k.geo};
function inTemple(){return POIS.some(p=>SITES[p.id]&&Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z)<11)}
function canMed(){return hero&&hero.kn&&hero.kn.rank>=1}
let medTimer=null,medPitch=0;
function medStop(){if(medTimer){clearInterval(medTimer);medTimer=null}const m=$("medfx");if(m)m.hidden=true}
function medGain(tmp){const k=KN();let h=2+(hero.level>>1)+k.rank+(MARTIAL.includes(hero.cls)?1:0)+(k.geo?1:0);return tmp?h*2:h}
function medStart(){
 if(!hero||C||D||DG||packOpen||occOpen)return;
 if(!canMed()){say("You do not know how to meditate yet. The knights teach it to those who pass the first trial in the Commandery of the Two Pillars.");return}
 if(hero.hp>=maxHP()&&hero.mana>=maxMP()){say("You are at full strength. Meditation can give you nothing more.");return}
 const tmp=inTemple(),col=tmp?"#ffe6a0":"#9ab4d8",k=KN();
 const b=occPanel("Meditation",col);const ring=el("div",null,"brth");ring.style.cssText="width:92px;height:92px;border-radius:50%;margin:6px auto;border:2px solid "+col+";box-shadow:0 0 24px "+col+";animation:breath 7s ease-in-out infinite";b.appendChild(ring);
 b.appendChild(el("p",tmp?"You sit within hallowed ground. The walls hold their breath with you. While you meditate here, nothing can harm you.":"You sit in the open. The ground is cold and the wild is listening. You will heal, but something may find you.","say"));
 const st=el("p","","sub");b.appendChild(st);
 const upd=()=>{st.textContent="Health "+hero.hp+"/"+maxHP()+"    "+RES[hero.cls]+" "+hero.mana+"/"+maxMP()+(tmp?"    (Sanctuary)":"    (Unguarded)")};upd();
 b.appendChild(btn("Rise from meditation",()=>{medStop();pitch=medPitch;occClose()},"go"));
 const fx=$("medfx");fx.className=tmp?"temple":"wild";fx.hidden=false;medPitch=pitch;pitch=.32;
 medStop();fx.hidden=false;
 medTimer=setInterval(()=>{
  if(!occOpen||C||!hero){medStop();return}
  const g=medGain(tmp);hero.hp=Math.min(maxHP(),hero.hp+g);hero.mana=Math.min(maxMP(),hero.mana+1+k.rank*(tmp?2:1));hud();upd();
  if(on&&ac)tone(tmp?196:147,tmp?198:149,2.2,"sine",.045,0);
  if(visionRoll(tmp))return;
  if(hero.hp>=maxHP()&&hero.mana>=maxMP()){medStop();pitch=medPitch;occMsg=tmp?"You rise renewed. The sanctuary lets you go.":"You rise renewed.";occClose();say(occMsg);occMsg="";sfx("heal");return}
  if(!tmp&&Math.abs(hx-SX)+Math.abs(hy-SY)>=6&&Math.random()<Math.max(.05,.15-.02*k.rank)){
   medStop();pitch=medPitch;occClose();say("Something finds you. Your meditation is broken.");
   const t=tierAt(hx,hy),list=FOES[biome[hy][hx]].filter(f=>f[8]<=t);startCombat(pickOne(list),t);
   if(C&&!C.busy){C.busy=true;C.lines.push("It strikes while you are unguarded!");rc();setTimeout(foeTurn,700)}}
 },1500)}
$("medb").onclick=medStart;
addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;if(e.key==="m"||e.key==="M")medStart();if(e.key==="Escape"&&medTimer){medStop();pitch=medPitch;occClose()}});
/* geometry study */
function knGeometry(p){const k=KN();
 knLessonPanel(p,[12,13,14,15,16],()=>{
  if(k.geo){reopen(p,"You review the figures. They are as true as ever.");return}
  const b=occPanel("The Master of Proportion","#e0e4f0");b.appendChild(el("p","One question before the lesson is yours. You stop a string exactly at its middle. What do you hear?","say"));
  const m=el("div",null,"menu");[["A fifth (3:2)",0],["The octave (2:1)",1],["A fourth (4:3)",0]].forEach(([t,ok])=>m.appendChild(btn(t,()=>{
   if(!ok){occMsg="Not so. Remember the monochord: the middle gives 2 to 1.";knGeometry(p);return}
   k.geo=1;let msg="Correct. You have studied the Geometry of the Order. Your meditation breathes in proportion: +1 healing per breath.";
   if(hero.cls==="Rogue"){const o=OCCP(),n=[];["Perfect Fifth","Octave Chime","Pythagorean Chord","Harmony of the Spheres"].forEach(s=>{o.sp[s]=1;n.push(s)});msg+=" As a Rogue you may turn these ratios into sound. You learned: "+n.join(", ")+". Cast them to stun foes."}
   else msg+=" Rogues of the order go further and make these ratios sing as chords, but the figures serve any who study them.";
   sfx("win");if(on&&ac)[1,1.25,1.5,2].forEach((r,i)=>tone(261.6*r,261.6*r*1.002,1.2,"triangle",.08,i*.1));reopen(p,msg)})));b.appendChild(m)})}
/* chord casting: wraps the spell engine */
const _castBase=castSpell;castSpell=function(nm,field){const r=_castBase(nm,field),s=SPELLS[nm];if(r!==false&&s&&s.mus&&on&&ac)s.mus.forEach((q,i)=>tone(261.6*q,261.6*q*1.003,1.1,"triangle",.09,i*.07));return r};
const _kc=knCodex;knCodex=function(b){_kc(b);const k=KN();b.appendChild(el("p","Meditation: "+(canMed()?"known. Press M. Sanctuary within temples; unguarded outside.":"not yet known (pass the first trial).")+"\nGeometry of the Order: "+(k.geo?"studied"+(hero.cls==="Rogue"?" (Rogue chords learned)":""):"not yet studied")+"\nFigures seen: "+GEOS.filter((_,i)=>k.les[12+i]).length+"/"+GEOS.length,"sub")).style.whiteSpace="pre-line"};
/* hall actions and decor */
function commDecor(g,n){const wd=M(0x5a3a22),gd=M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.5,metalness:.6,roughness:.35});
 for(let i=0;i<8;i++){const a=i/8*6.2832;mk(g,new THREE.CylinderGeometry(.55,.6,.22,10),M(i%2?0xe8e4d8:0x7a1e1e),Math.cos(a)*3.4,.2,Math.sin(a)*3.4+.4,{ns:1})}
 decal(g,"penta",3.3,"#ffe0a0",.17);
 mk(g,new THREE.BoxGeometry(.5,1,3.4),wd,-6.8,.6,2.4);mk(g,new THREE.BoxGeometry(.3,.3,3.8),wd,-6.8,1.2,2.4);
 for(let i=0;i<7;i++)mk(g,new THREE.CylinderGeometry(.015,.015,3.2,4),gd,-6.8+(i-3)*.05,1.37,2.4,{r:[Math.PI/2,0,0],ns:1});
 [3.2,2.4].forEach((len,j)=>{});
 mk(g,new THREE.BoxGeometry(3.2,.1,.14),gd,6.2+1.6,.22,1.2,{ns:1});mk(g,new THREE.BoxGeometry(.14,.1,2.4),gd,6.2,.22,1.2+1.2,{ns:1});
 mk(g,new THREE.BoxGeometry(4,.1,.14),gd,6.2+1.6,.22,1.2+1.2,{r:[0,.6435,0],ns:1});
 [[-1,0xffa040],[1,0xffa040]].forEach(([s])=>mk(g,new THREE.ConeGeometry(.2,.55,6),M(0xffa040,{emissive:0xff8020,emissiveIntensity:1.8}),s*3.4,1.2,3.9,{ns:1}))}
function mkHallActs(){[1,2,3,4].forEach(n=>{const S=SITES["kn"+n];S.acts.push(
 {t:()=>canMed()?"Meditate in the sanctuary (nothing can harm you)":"Meditation (requires Squire rank)",dis:()=>!canMed()||(hero.hp>=maxHP()&&hero.mana>=maxMP()),f:p=>{occClose();setTimeout(medStart,60)}},
 {t:()=>canMed()?(geoDone()?"Review the Geometry of the Order":"Study the Geometry of the Order"):"Geometry of the Order (requires Squire rank)",dis:()=>!canMed(),f:p=>knGeometry(p)},
 {t:()=>"Play the monochord (Rogue)",dis:()=>hero.cls!=="Rogue"||!canMed()||hero.steps-(KN().play||-99)<40,f:p=>{const k=KN();k.play=hero.steps;const g=5+rnd(10)+hero.level;hero.gold+=g;hero.mana=Math.min(maxMP(),hero.mana+2);hud();if(on&&ac)[1,1.5,2,1.5].forEach((r,i)=>tone(261.6*r,261.6*r*1.002,.7,"triangle",.09,i*.3));reopen(p,"You stop the string at one third, then one half. The hall goes quiet. The knights toss you "+g+" gp and you feel your "+RES[hero.cls].toLowerCase()+" settle.")}})})}
mkHallActs();

/* ================= VISIONS (meditation side quests) ================= */
const COMP=["north","northeast","east","southeast","south","southwest","west","northwest"];
function whereIs(p){const dx=p.x*TW+1-P.x,dz=p.y*TW+1-P.z,a=Math.atan2(dx,-dz),i=((Math.round(a/(Math.PI/4))%8)+8)%8;return"to the "+COMP[i]+", about "+Math.max(1,Math.round(Math.hypot(dx,dz)/TW))+" leagues"}
const readCount=()=>Object.keys(OCCP().read).filter(k=>OCCP().read[k]).length;
function needOK(n){const[k,a,c]=n;return k==="i"?(hero.inv[a]||0)>=c:k==="pl"?herbCount(a)>=c:k==="hex"?Object.keys(OCCP().hex).length>=c:readCount()>=c}
function needTxt(n){const[k,a,c]=n;return k==="i"?c+" "+a:k==="pl"?c+" herbs of "+a:k==="hex"?"knowledge of "+c+" hexagrams ("+Object.keys(OCCP().hex).length+")":"3 grimoires read ("+readCount()+")"}
const vqOK=v=>v.need.every(needOK),vqTxt=v=>v.need.map(needTxt).join(", ");
function vqSite(v){return POIS.find(p=>p.id===v.site)}
function showVision(v){const o=OCCP();o.q=o.q||{};const p=vqSite(v),S=SITES[v.site],b=occPanel("A Vision: "+v.t,"#b890ff");
 const fx=$("medfx");fx.className="vision";fx.hidden=false;setTimeout(()=>{if(fx.className==="vision")fx.hidden=true},3500);
 try{const cv=S.cv();if(cv)b.appendChild(cvs(cv,170))}catch(e){}
 b.appendChild(el("p",v.vis,"say"));b.appendChild(el("p","The place is "+(p?p.name+", "+whereIs(p):"unknown")+".\nWhat is asked: "+vqTxt(v)+".","sub")).style.whiteSpace="pre-line";
 b.appendChild(btn("Hold the vision in mind",()=>{o.q[v.id]=1;occClose();say("Vision remembered: "+v.t+". See the Codex.")},"go"));
 b.appendChild(btn("Let it fade",()=>{occClose()},"alt"));sfx("spell")}
function omen(tmp){const o=OCCP(),b=occPanel("An Omen","#b890ff");const fx=$("medfx");fx.className="vision";fx.hidden=false;setTimeout(()=>{if(fx.className==="vision")fx.hidden=true},3500);
 const hid=POIS.filter(p=>!SITES[p.id]&&!seen[p.y*W+p.x]);
 if(hid.length&&Math.random()<.6){const p=pickOne(hid);for(let y=p.y-3;y<=p.y+3;y++)for(let x=p.x-3;x<=p.x+3;x++)if(x>=0&&y>=0&&x<W&&y<H)seen[y*W+x]=1;draw();b.appendChild(el("p","Stone steps going down into dark, and a door with a mark you can almost read. When you open your eyes, you know exactly where it is: "+whereIs(p)+". Your map remembers it.","say"))}
 else{o.fort=(o.fort||0)+1;b.appendChild(el("p","A hand turns a card in front of you. The face is bright. You will be favoured in your next fight: +2 to hit.","say"))}
 b.appendChild(btn("Open your eyes",occClose,"go"));sfx("spell")}
function visionRoll(tmp){const o=OCCP(),q=o.q||(o.q={});if(Math.random()>=(o.vn?0:.55)+(tmp?.14:.07))return false;
 medStop();pitch=medPitch;const avail=VQ.filter(v=>!q[v.id]&&hero.level>=v.lv),act=VQ.filter(v=>q[v.id]===1).length;o.vn=(o.vn||0)+1;
 if(avail.length&&act<3)showVision(pickOne(avail));else omen(tmp);return true}
function vqFinish(v,p){const o=OCCP();v.need.forEach(n=>{const[k,a,c]=n;if(k==="i"){hero.inv[a]-=c;if(hero.inv[a]<=0)delete hero.inv[a]}else if(k==="pl")spendHerbs(a,c)});
 o.q[v.id]=2;const r=v.rw,out=[],x=[];if(r.gold){hero.gold+=r.gold;out.push(r.gold+" gp")}if(r.item){giveItem(r.item);out.push(r.item)}if(r.spell){o.sp[r.spell]=1;out.push("the spell "+r.spell)}if(r.xp)addXp(r.xp,x);fixStats();hud();sfx("win");
 reopen(p,v.done+" You receive: "+(out.join(", ")||"nothing but understanding")+". "+x.join(" "))}
function mkVisionActs(){VQ.forEach(v=>{const S=SITES[v.site];if(!S)return;S.acts=S.acts||[];S.acts.push({hide:()=>(OCCP().q||{})[v.id]!==1,t:()=>"Fulfil the vision: "+v.t+" (needs "+vqTxt(v)+")",dis:()=>!vqOK(v),f:p=>vqFinish(v,p)})})}
mkVisionActs();
const _kc3=knCodex;knCodex=function(b){_kc3(b);const q=OCCP().q||{},act=VQ.filter(v=>q[v.id]===1),dn=VQ.filter(v=>q[v.id]===2);
 b.appendChild(el("h3","Visions"));
 b.appendChild(el("p",(act.length?act.map(v=>{const p=vqSite(v);return"◇ "+v.t+"\n   Go to "+(p?p.name+", "+whereIs(p):"?")+".\n   Bring: "+vqTxt(v)}).join("\n"):"No visions are waiting. Meditate (key M) and the stars may send one.")+(dn.length?"\n\nFulfilled: "+dn.map(v=>v.t).join(", "):""),"sub")).style.whiteSpace="pre-line"};


/* ================= GRAPHICS 2: cinematic post-processing and planetary sky ================= */
const POST={ok:false,on:false,u:{exp:1.28,bs:.6,vig:.5,sat:1,ca:.004,night:0}};
function initPost(){try{
 const w2=renderer.capabilities.isWebGL2,half=w2&&(renderer.extensions.has("EXT_color_buffer_float")||renderer.extensions.has("EXT_color_buffer_half_float"));
 POST.type=half?THREE.HalfFloatType:THREE.UnsignedByteType;POST.w2=w2;
 POST.sc=new THREE.Scene();POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);POST.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());POST.quad.frustumCulled=false;POST.sc.add(POST.quad);
 const vs="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",SM=(fs,u)=>new THREE.ShaderMaterial({vertexShader:vs,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false});
 POST.mBright=SM("uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th+.6,l),1.);}",{t:{value:null},th:{value:1.25}});
 POST.mBlur=SM("uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*.227027;s+=(texture2D(t,vUv+d*1.384615).rgb+texture2D(t,vUv-d*1.384615).rgb)*.316216;s+=(texture2D(t,vUv+d*3.230769).rgb+texture2D(t,vUv-d*3.230769).rgb)*.070270;gl_FragColor=vec4(s,1.);}",{t:{value:null},d:{value:new THREE.Vector2()}});
 POST.mCopy=SM("uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(t,vUv).rgb,1.);}",{t:{value:null}});
 POST.mComp=SM("uniform sampler2D tS,tB1,tB2;uniform float exp,bs,vig,sat,ca,time,night,wood;uniform vec2 res;uniform float sharp;uniform vec2 tpx;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec2 uv=vUv,c=uv-.5;float r2=dot(c,c);vec2 off=c*r2*ca;vec3 col=vec3(texture2D(tS,uv+off).r,texture2D(tS,uv).g,texture2D(tS,uv-off).b);vec3 nb=(texture2D(tS,uv+vec2(tpx.x,0.)).rgb+texture2D(tS,uv-vec2(tpx.x,0.)).rgb+texture2D(tS,uv+vec2(0.,tpx.y)).rgb+texture2D(tS,uv-vec2(0.,tpx.y)).rgb)*.25;col+=clamp(col-nb,-.25,.25)*sharp;col+=(texture2D(tB1,uv).rgb*.55+texture2D(tB2,uv).rgb*.9)*bs;col*=exp;col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,sat);vec3 sh=mix(vec3(.93,.95,1.07),vec3(.9,.95,1.12),night),hl=vec3(1.03,1.0,.94);col=mix(col*sh,col*hl,smoothstep(.22,.8,l));col=mix(col,col*col*(3.-2.*col),.5);col*=1.-smoothstep(.12,.62,r2*1.8)*vig;if(wood>.5){vec2 px=1.6/res;vec3 c0=texture2D(tS,uv).rgb;float l0=dot(c0,vec3(.3,.59,.11));float la=dot(texture2D(tS,uv+vec2(px.x,0.)).rgb,vec3(.3,.59,.11)),lb=dot(texture2D(tS,uv-vec2(px.x,0.)).rgb,vec3(.3,.59,.11)),lc=dot(texture2D(tS,uv+vec2(0.,px.y)).rgb,vec3(.3,.59,.11)),ld=dot(texture2D(tS,uv-vec2(0.,px.y)).rgb,vec3(.3,.59,.11));float e=(abs(la-lb)+abs(lc-ld))/(l0+.25);float ink=smoothstep(.55,1.1,e);float L=dot(col,vec3(.299,.587,.114));float q=floor(L*4.+.5)/4.;col=mix(col,col*(q+.1)/(L+.1),.6);vec3 pal=L<.35?mix(vec3(.10,.11,.30),vec3(.75,.30,.36),L/.35):L<.7?mix(vec3(.75,.30,.36),vec3(.95,.70,.25),(L-.35)/.35):mix(vec3(.95,.70,.25),vec3(.99,.94,.80),(L-.7)/.3);col=mix(col,pal,.4);float hz=(uv.x*res.x+uv.y*res.y)/5.5;float hat=smoothstep(.55,.75,abs(fract(hz)-.5)*2.);col*=1.-hat*smoothstep(.45,.1,L)*.4;col=mix(col,vec3(.06,.05,.16),ink*.9);col*=vec3(1.05,1.0,.9);}col+=(hash(uv*900.+time)-.5)*.02;gl_FragColor=vec4(col,1.);}",{tS:{value:null},tB1:{value:null},tB2:{value:null},exp:{value:1},bs:{value:.5},vig:{value:.5},sat:{value:1},ca:{value:.01},time:{value:0},night:{value:0},wood:{value:1},res:{value:new THREE.Vector2(1000,600)},sharp:{value:.9},tpx:{value:new THREE.Vector2(1,1)}});
 POST.rt=null;POST.ok=true;postSize()}catch(e){POST.ok=false;POST.err=String(e)}}
function postSize(){if(!POST.ok)return;const v=new THREE.Vector2();renderer.getDrawingBufferSize(v);const w=Math.max(2,v.x|0),h=Math.max(2,v.y|0);if(POST.w===w&&POST.h===h&&POST.rt&&POST.sam===(qual>=2?4:0))return;POST.w=w;POST.h=h;POST.sam=qual>=2?4:0;
 ["rt","a","b","c","d"].forEach(k=>{if(POST[k])POST[k].dispose()});
 const o={type:POST.type,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true};
 POST.rt=(POST.w2&&POST.sam)?new THREE.WebGLMultisampleRenderTarget(w,h,o):new THREE.WebGLRenderTarget(w,h,o);if(POST.rt.samples!==undefined&&POST.sam)POST.rt.samples=POST.sam;
 const bo={type:POST.type,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
 POST.a=new THREE.WebGLRenderTarget(w>>1,h>>1,bo);POST.b=new THREE.WebGLRenderTarget(w>>1,h>>1,bo);POST.c=new THREE.WebGLRenderTarget(w>>2,h>>2,bo);POST.d=new THREE.WebGLRenderTarget(w>>2,h>>2,bo)}
function postPass(mat,target){POST.quad.material=mat;renderer.setRenderTarget(target);renderer.render(POST.sc,POST.cam)}
function postBlur(src,tmp,w,h,rad){const m=POST.mBlur;m.uniforms.t.value=src.texture;m.uniforms.d.value.set(rad/w,0);postPass(m,tmp);m.uniforms.t.value=tmp.texture;m.uniforms.d.value.set(0,rad/h);postPass(m,src)}
function setPost(on){on=!!on&&POST.ok;if(on===POST.on)return;POST.on=on;renderer.toneMapping=on?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;if(!on)renderer.setRenderTarget(null)}
function postRender(t){postSize();const U=POST.u,n=1-todDay;
 U.night=n;U.bs=(DG?.8:.22+.5*n)*(qual>=3?1.15:1);U.vig=DG?.7:.42+.22*n;U.sat=DG?.95:1.22-.14*n;U.exp=DG?1.5:1.0+.05*todDay;
 renderer.setRenderTarget(POST.rt);renderer.clear();renderer.render(scene,camera);
 if(vmG&&vmG.visible){vmCam.aspect=camera.aspect;vmCam.updateProjectionMatrix();renderer.clearDepth();renderer.render(vmScene,vmCam)}
 POST.mBright.uniforms.t.value=POST.rt.texture;postPass(POST.mBright,POST.a);
 postBlur(POST.a,POST.b,POST.w>>1,POST.h>>1,1.4);
 POST.mCopy.uniforms.t.value=POST.a.texture;postPass(POST.mCopy,POST.c);postBlur(POST.c,POST.d,POST.w>>2,POST.h>>2,1.6);postBlur(POST.c,POST.d,POST.w>>2,POST.h>>2,2.6);
 const m=POST.mComp,u=m.uniforms;u.tS.value=POST.rt.texture;u.tB1.value=POST.a.texture;u.tB2.value=POST.c.texture;u.exp.value=U.exp;u.bs.value=U.bs;u.vig.value=U.vig;u.sat.value=U.sat;u.ca.value=U.ca;u.night.value=U.night;u.time.value=(t*.001)%10;u.res.value.set(POST.w,POST.h);u.tpx.value.set(1/POST.w,1/POST.h);u.wood.value=(typeof occOpen!=="undefined"&&occOpen)?1:0;
 renderer.setRenderTarget(null);renderer.clear();postPass(m,null)}
/* ---- planetary sky: ringed giant, zodiac ring, wandering planets ---- */
let ORR=null;
const ZP={
 "♈":g=>{g.beginPath();g.moveTo(64,100);g.lineTo(64,50);g.moveTo(64,50);g.bezierCurveTo(64,20,28,16,28,44);g.moveTo(64,50);g.bezierCurveTo(64,20,100,16,100,44);g.stroke()},
 "♉":g=>{g.beginPath();g.arc(64,74,22,0,6.283);g.moveTo(34,30);g.bezierCurveTo(40,60,88,60,94,30);g.stroke()},
 "♊":g=>{g.beginPath();g.moveTo(34,30);g.quadraticCurveTo(64,42,94,30);g.moveTo(34,98);g.quadraticCurveTo(64,86,94,98);g.moveTo(50,38);g.lineTo(50,92);g.moveTo(78,38);g.lineTo(78,92);g.stroke()},
 "♋":g=>{g.beginPath();g.arc(48,50,12,0,6.283);g.moveTo(26,60);g.bezierCurveTo(30,34,80,28,100,44);g.moveTo(80,78);g.arc(80,78,12,0,6.283);g.moveTo(102,68);g.bezierCurveTo(98,94,48,100,28,84);g.stroke()},
 "♌":g=>{g.beginPath();g.arc(44,56,14,0,6.283);g.moveTo(58,56);g.bezierCurveTo(60,24,100,24,96,52);g.bezierCurveTo(92,80,70,88,80,104);g.stroke()},
 "♍":g=>{g.beginPath();g.moveTo(26,36);g.lineTo(26,96);g.moveTo(26,50);g.quadraticCurveTo(46,26,50,50);g.lineTo(50,96);g.moveTo(50,50);g.quadraticCurveTo(70,26,74,50);g.lineTo(74,92);g.quadraticCurveTo(80,104,100,86);g.stroke()},
 "♎":g=>{g.beginPath();g.moveTo(26,98);g.lineTo(102,98);g.moveTo(26,80);g.lineTo(46,80);g.arc(64,68,20,3.14,6.283);g.lineTo(102,80);g.stroke()},
 "♏":g=>{g.beginPath();g.moveTo(24,36);g.lineTo(24,96);g.moveTo(24,50);g.quadraticCurveTo(44,26,48,50);g.lineTo(48,96);g.moveTo(48,50);g.quadraticCurveTo(68,26,72,50);g.lineTo(72,92);g.lineTo(96,92);g.moveTo(88,84);g.lineTo(98,92);g.lineTo(88,102);g.stroke()},
 "♐":g=>{g.beginPath();g.moveTo(30,100);g.lineTo(98,30);g.moveTo(70,30);g.lineTo(98,30);g.lineTo(98,58);g.moveTo(44,64);g.lineTo(66,86);g.stroke()},
 "♑":g=>{g.beginPath();g.moveTo(24,36);g.quadraticCurveTo(44,70,56,44);g.lineTo(56,90);g.bezierCurveTo(60,40,100,36,100,64);g.arc(84,86,16,0,6.283);g.stroke()},
 "♒":g=>{g.beginPath();g.moveTo(24,52);g.lineTo(44,40);g.lineTo(64,52);g.lineTo(84,40);g.lineTo(104,52);g.moveTo(24,84);g.lineTo(44,72);g.lineTo(64,84);g.lineTo(84,72);g.lineTo(104,84);g.stroke()},
 "♓":g=>{g.beginPath();g.moveTo(34,24);g.quadraticCurveTo(64,64,34,104);g.moveTo(94,24);g.quadraticCurveTo(64,64,94,104);g.moveTo(30,64);g.lineTo(98,64);g.stroke()},
 "☿":g=>{g.beginPath();g.arc(64,66,18,0,6.283);g.moveTo(64,84);g.lineTo(64,112);g.moveTo(50,100);g.lineTo(78,100);g.moveTo(46,28);g.quadraticCurveTo(64,52,82,28);g.stroke()},
 "♀":g=>{g.beginPath();g.arc(64,50,22,0,6.283);g.moveTo(64,72);g.lineTo(64,110);g.moveTo(46,92);g.lineTo(82,92);g.stroke()},
 "♂":g=>{g.beginPath();g.arc(52,78,24,0,6.283);g.moveTo(70,60);g.lineTo(98,32);g.moveTo(76,32);g.lineTo(98,32);g.lineTo(98,54);g.stroke()},
 "♃":g=>{g.beginPath();g.moveTo(34,40);g.quadraticCurveTo(52,16,70,40);g.quadraticCurveTo(70,62,34,76);g.lineTo(100,76);g.moveTo(82,52);g.lineTo(82,108);g.stroke()}};
function glyphTex(ch,col,sz){const c=mkCanvas(128),g=c.getContext("2d");g.strokeStyle=col;g.lineWidth=7;g.lineCap=g.lineJoin="round";g.shadowColor=col;g.shadowBlur=14;(ZP[ch]||(()=>{}))(g);g.shadowBlur=4;g.lineWidth=4;(ZP[ch]||(()=>{}))(g);return new THREE.CanvasTexture(c)}
function bandTex(cols){const c=mkCanvas(256),g=c.getContext("2d");const gr=g.createLinearGradient(0,0,0,256);cols.forEach((q,i)=>gr.addColorStop(i/(cols.length-1),q));g.fillStyle=gr;g.fillRect(0,0,256,256);for(let i=0;i<60;i++){g.fillStyle="rgba(255,255,255,"+(Math.random()*.07)+")";g.fillRect(0,Math.random()*256,256,1+Math.random()*3)}return new THREE.CanvasTexture(c)}
function ringTex(){const c=mkCanvas(512),g=c.getContext("2d");const gr=g.createRadialGradient(256,256,0,256,256,256);[[.55,"rgba(0,0,0,0)"],[.58,"rgba(210,190,150,.5)"],[.66,"rgba(230,210,170,.85)"],[.7,"rgba(40,30,20,.1)"],[.73,"rgba(220,200,160,.7)"],[.86,"rgba(190,170,130,.55)"],[.95,"rgba(190,170,130,.1)"],[1,"rgba(0,0,0,0)"]].forEach(([s,col])=>gr.addColorStop(s,col));g.fillStyle=gr;g.fillRect(0,0,512,512);return new THREE.CanvasTexture(c)}
function initOrrery(){const G=new THREE.Group(),bm={fog:false,depthWrite:false,transparent:true};
 const sat=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(14,28,20),new THREE.MeshBasicMaterial(Object.assign({map:bandTex(["#3a3040","#8a7a68","#b8a078","#6a5a50","#a89070","#4a4050"])},bm)));
 const ring=new THREE.Mesh(new THREE.RingGeometry(1,1,2),null);ring.geometry.dispose();const rg=new THREE.PlaneGeometry(76,76),rm=new THREE.MeshBasicMaterial(Object.assign({map:ringTex(),side:THREE.DoubleSide},bm)),rr=new THREE.Mesh(rg,rm);rr.rotation.x=-Math.PI/2;
 const halo=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:radTex(150,120,200),blending:THREE.AdditiveBlending},bm)));halo.scale.set(150,150,1);
 sat.add(halo,body,rr);sat.rotation.set(.0,0,.5);sat.position.set(-120,70,-205);ORR={G,sat,body,rr,halo,zod:[],pl:[]};G.add(sat);
 const zg=new THREE.Group(),ZS="♈♉♊♋♌♍♎♏♐♑♒♓".split("");ZS.forEach((z,i)=>{const a=i/12*6.2832,s=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:glyphTex(z,"#ffd890"),blending:THREE.AdditiveBlending},bm)));s.scale.set(15,15,1);s.position.set(Math.cos(a)*262,0,Math.sin(a)*262);zg.add(s);ORR.zod.push(s)});
 const lp=[];for(let i=0;i<=128;i++){const a=i/128*6.2832;lp.push(new THREE.Vector3(Math.cos(a)*262,0,Math.sin(a)*262))}
 const ln=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(lp),new THREE.LineBasicMaterial({color:0xc8a860,transparent:true,opacity:.25,fog:false,depthWrite:false}));zg.add(ln);ORR.ln=ln;
 zg.rotation.set(.42,0,.2);G.add(zg);ORR.zg=zg;
 [["☿","#e8903a",.017,0],["♀","#7affb8",.011,2],["♂","#ff6a50",.0075,4],["♃","#80a8ff",.0048,1]].forEach(([ch,col,sp,ph])=>{const s=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({map:glyphTex(ch,col,64),blending:THREE.AdditiveBlending},bm)));s.scale.set(18,18,1);G.add(s);ORR.pl.push({s,sp,ph})});
 G.renderOrder=-5;G.traverse(o=>{o.renderOrder=-5;o.frustumCulled=false});scene.add(G)}
function orreryUpdate(cp,dt){if(!ORR)return;const vis=!DG;ORR.G.visible=vis;if(!vis)return;ORR.G.position.copy(cp);const n=1-todDay,k=.1+.9*n;
 ORR.body.material.opacity=ORR.rr.material.opacity=.18+.82*n;ORR.halo.material.opacity=.15+.5*n;ORR.sat.rotation.y+=dt*.01;ORR.body.rotation.y+=dt*.05;
 ORR.zg.rotation.y=clock*.004;ORR.zod.forEach(s=>s.material.opacity=.08+.8*n);ORR.ln.material.opacity=.05+.25*n;
 ORR.pl.forEach((p,i)=>{const a=p.ph+clock*p.sp,R=262,tilt=.42;const x=Math.cos(a)*R,z=Math.sin(a)*R;p.s.position.set(x,Math.sin(a)*R*Math.sin(tilt)*.6+10,z*Math.cos(tilt));p.s.material.opacity=(.1+.9*n)*(.8+.2*Math.sin(clock*2.3+i*2))})}


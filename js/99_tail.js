(function(){const btn=(t,f,c)=>{const b=document.createElement("button");b.className=c||"alt";b.textContent=t;b.onclick=f;return b};

const $=id=>document.getElementById(id);
const rnd=n=>Math.floor(Math.random()*n)+1;
const ATTR=["STR","DEX","CON","INT","WIS","CHA"];
const ANAME={STR:"Strength",DEX:"Dexterity",CON:"Constitution",INT:"Intelligence",WIS:"Wisdom",CHA:"Charisma"};
const RACES={
 Human:{d:"Adaptable. +1 to every attribute.",b:{STR:1,DEX:1,CON:1,INT:1,WIS:1,CHA:1}},
 Dwarf:{d:"Stout and stubborn. +2 CON, +1 STR, -1 CHA.",b:{CON:2,STR:1,CHA:-1}},
 Elf:{d:"Keen and graceful. +2 DEX, +1 INT, -1 CON.",b:{DEX:2,INT:1,CON:-1}},
 Halfling:{d:"Small and lucky. +2 DEX, +1 CHA, -1 STR.",b:{DEX:2,CHA:1,STR:-1}},
 "Half-Orc":{d:"Fierce. +2 STR, +1 CON, -1 INT.",b:{STR:2,CON:1,INT:-1}}
};
const CLASSES={
 Fighter:{hd:10,ac:4,d:"Steel and discipline. d10 hit die, heavy armor.",kit:["Longsword","Chain shirt","Shield","Healing herb x2"]},
 Paladin:{hd:10,ac:4,d:"Sworn to a holy oath. d10, heals by touch.",kit:["Warhammer","Chain shirt","Holy symbol","Healing herb x1"]},
 Cleric:{hd:8,ac:3,d:"Voice of the gods. d8, healing and wards.",kit:["Mace","Scale vest","Holy symbol","Healing herb x3"]},
 Rogue:{hd:8,ac:2,d:"Knives, locks and shadows. d8, sneak attacks.",kit:["Dagger x2","Leather armor","Lockpicks","Smoke vial"]},
 Magician:{hd:6,ac:0,d:"Bends the weave. d6, spells, fragile.",kit:["Quarterstaff","Spellbook","Ember wand","Mana potion x1"]},
 Ranger:{hd:10,ac:2,d:"Warden of the wild. d10, bow and tracking.",kit:["Shortbow","Leather armor","Hunting knife","Herb pouch x2"]}
};
const TEMPER=[
 ["Hot-headed","Strikes first. +1 to initiative, -1 to parley."],
 ["Stoic","Unshaken. Resists fear and charm."],
 ["Cunning","Always a trick. +1 to traps and locks."],
 ["Reckless","Glory over safety. +2 damage when below half HP."],
 ["Gentle","Beasts trust you. Calm animals more easily."],
 ["Brooding","Dark patience. Resists curses."],
 ["Jovial","Lifts spirits. Allies recover morale faster."],
 ["Suspicious","Sees ambushes coming. +1 to notice danger."],
 ["Noble","Born to lead. +1 to parley with nobles."],
 ["Greedy","Loot-eyed. Finds extra coin, but haggles badly."],
 ["Devout","Faith steadies the hand. +1 to blessings."],
 ["Wry","Sharp tongue. Can goad enemies into mistakes."]
];
const SKILLS=["Lockpicking","Herb lore","Trap sense","Tracking","Swordplay","Archery","Arcane lore","Persuasion","Stealth","Climbing","Swimming","Blacksmithing","First aid","Beast speech","Gem appraisal","Ancient tongues","Alchemy","Intimidation","Dungeon lore","Dowsing"];
const NAMES=["Aldric","Brenna","Cador","Dagna","Eowyn","Fenwick","Garrick","Hild","Isolde","Jorund","Kaelen","Lysa","Morrigan","Nyx","Orsin","Perrin","Quill","Rhea","Soren","Thalia","Ulric","Vesna","Wyn","Yara","Zephyr"];
let st={race:null,cls:null,rolls:null,rerolls:1,fate:null};
const mod=s=>Math.floor((s-10)/2);
const sg=n=>(n>=0?"+":"")+n;

function pickGrid(el,obj,key){
 el.innerHTML="";
 Object.keys(obj).forEach(k=>{
  const b=document.createElement("button");b.className="pick";b.setAttribute("aria-pressed","false");
  b.innerHTML="<b></b><small></small>";b.firstChild.textContent=k;b.lastChild.textContent=obj[k].d;
  b.onclick=()=>{st[key]=k;[...el.children].forEach(c=>c.setAttribute("aria-pressed",c===b));$("to2").disabled=!(st.race&&st.cls)};
  el.appendChild(b);
 });
}
pickGrid($("races"),RACES,"race");pickGrid($("classes"),CLASSES,"cls");

function roll4(){const d=[rnd(6),rnd(6),rnd(6),rnd(6)];const lo=d.indexOf(Math.min(...d));return{d,lo,t:d.reduce((a,b)=>a+b)-d[lo]}}
function renderStats(anim){
 const box=$("stats");box.innerHTML="";
 ATTR.forEach((a,i)=>{
  const r=st.rolls&&st.rolls[a];const bonus=(RACES[st.race].b[a]||0);
  const el=document.createElement("div");el.className="stat";
  const dice=(r?r.d:[0,0,0,0]).map((v,j)=>`<span class="die${r&&j===r.lo?" drop":""}">${r?v:"?"}</span>`).join("");
  const fin=r?r.t+bonus:null;
  el.innerHTML=`<span class="nm">${ANAME[a]}</span><div class="dice">${dice}</div><div class="tot">${r?fin:"-"}<small>${r?(bonus?`${r.t}${sg(bonus)} race, `:"")+"mod "+sg(mod(fin)):""}</small></div>`;
  box.appendChild(el);
 });
}
function final(a){return st.rolls[a].t+(RACES[st.race].b[a]||0)}
function doRoll(){
 const next={};ATTR.forEach(a=>next[a]=roll4());
 $("rollAll").disabled=true;$("reroll").disabled=true;
 let n=0;const iv=setInterval(()=>{
  st.rolls={};ATTR.forEach(a=>st.rolls[a]=roll4());renderStats();
  if(++n>=8){clearInterval(iv);st.rolls=next;renderStats();
   $("rollAll").hidden=true;$("to3").hidden=false;$("reroll").disabled=false;
   $("reroll").hidden=st.rerolls<=0;$("rollAll").disabled=false}
 },70);
}
function quickHero(){if(!(st.race&&st.cls))return;st.rolls={};ATTR.forEach(a=>st.rolls[a]=roll4());
 const cls=CLASSES[st.cls];const hpRoll=rnd(cls.hd);let s1=rnd(20)-1,s2=rnd(20)-1;while(s2===s1)s2=rnd(20)-1;
 st.fate={temp:TEMPER[rnd(12)-1],skills:[SKILLS[s1],SKILLS[s2]],hpRoll,hp:Math.max(1,hpRoll+mod(final("CON"))+cls.hd),ac:10+mod(final("DEX"))+cls.ac,gold:(rnd(6)+rnd(6)+rnd(6))*10};
 $("s2").hidden=true;$("s3").hidden=true;$("s4").hidden=false;if(!$("nm").value)$("nm").value=NAMES[rnd(NAMES.length)-1];renderSheet();$("s4").scrollIntoView({behavior:"smooth"})}
$("to2").onclick=()=>{st.rerolls=1;$("rr").hidden=false;$("rr").disabled=false;$("rr").textContent="Roll again (1 left)";quickHero()};
$("rr").onclick=()=>{if(st.rerolls<=0)return;st.rerolls--;$("rr").textContent="Roll again ("+st.rerolls+" left)";if(st.rerolls<=0)$("rr").disabled=true;quickHero()};
$("rollAll").onclick=doRoll;
$("reroll").onclick=()=>{st.rerolls--;$("reroll").textContent="Re-roll all (0 left)";doRoll()};
$("to3").onclick=()=>{$("reroll").hidden=true;$("to3").hidden=true;$("s3").hidden=false;renderFate();$("s3").scrollIntoView({behavior:"smooth"})};

function renderFate(){
 const f=st.fate,cls=CLASSES[st.cls];
 const cards=[
  ["Temperament",f?f.temp[0]:"?",f?f.temp[1]:"Rolled on a d12."],
  ["Special talents",f?f.skills.join(", "):"?",f?"Two talents rolled on a d20 each.":"Two rolls on a d20."],
  ["Hit points",f?f.hp:"?",f?`${cls.hd} base + d${cls.hd} roll (${f.hpRoll}) + CON mod ${sg(mod(final("CON")))}`:`Rolled on a d${cls.hd}.`],
  ["Armor class",f?f.ac:"?",f?`10 + DEX mod ${sg(mod(final("DEX")))} + armor ${cls.ac}`:"Higher is harder to hit."],
  ["Starting gold",f?f.gold+" gp":"?",f?"3d6 x 10 gold pieces.":"3d6 x 10."]
 ];
 $("fate").innerHTML=cards.map(c=>`<div class="card"><span class="k">${c[0]}</span><span class="v"></span><p></p></div>`).join("");
 [...$("fate").children].forEach((e,i)=>{e.children[1].textContent=cards[i][1];e.children[2].textContent=cards[i][2]});
}
$("rollFate").onclick=()=>{
 const cls=CLASSES[st.cls];
 const hpRoll=rnd(cls.hd);let s1=rnd(20)-1,s2=rnd(20)-1;while(s2===s1)s2=rnd(20)-1;
 st.fate={temp:TEMPER[rnd(12)-1],skills:[SKILLS[s1],SKILLS[s2]],hpRoll,hp:Math.max(1,hpRoll+mod(final("CON"))+cls.hd),ac:10+mod(final("DEX"))+cls.ac,gold:(rnd(6)+rnd(6)+rnd(6))*10};
 renderFate();$("rollFate").hidden=true;$("to4").hidden=false;
};
$("to4").onclick=()=>{$("to4").hidden=true;$("s4").hidden=false;$("nm").value=NAMES[rnd(NAMES.length)-1];renderSheet();$("s4").scrollIntoView({behavior:"smooth"})};
$("rndName").onclick=()=>{$("nm").value=NAMES[rnd(NAMES.length)-1];renderSheet()};
$("nm").oninput=renderSheet;

function hero(){
 const attrs={};ATTR.forEach(a=>attrs[a]=final(a));
 return{name:$("nm").value.trim()||"Nameless",race:st.race,cls:st.cls,level:1,xp:0,attrs,hp:st.fate.hp,maxHp:st.fate.hp,ac:st.fate.ac,gold:st.fate.gold,temperament:st.fate.temp[0],skills:st.fate.skills,kit:CLASSES[st.cls].kit,created:Date.now()};
}
function renderSheet(){
 const h=hero();const s=$("sheet");s.innerHTML="";
 const t=document.createElement("h3");t.textContent=`${h.name}, ${h.race} ${h.cls}`;s.appendChild(t);
 const info=document.createElement("p");info.className="sub";info.textContent=`Level 1 | HP ${h.hp} | AC ${h.ac} | ${h.gold} gp | ${h.temperament}`;s.appendChild(info);
 const g=document.createElement("div");g.className="stats";
 ATTR.forEach(a=>{const d=document.createElement("div");d.className="stat";d.innerHTML=`<span class="nm">${ANAME[a]}</span><span class="tot">${h.attrs[a]}<small>${sg(mod(h.attrs[a]))}</small></span>`;g.appendChild(d)});
 s.appendChild(g);
 const p=document.createElement("p");p.textContent="Talents: "+h.skills.join(", ");s.appendChild(p);
 const k=document.createElement("p");k.textContent="Carrying: "+h.kit.join(", ");s.appendChild(k);
}
function load(){try{return JSON.parse(localStorage.getItem("hollowmere.heroes")||"[]")}catch(e){return[]}}
function listSaved(){
 const box=$("saved");box.innerHTML="";const hs=load();
 if(!hs.length)return;
 const t=document.createElement("h2");t.textContent="Your heroes";box.appendChild(t);
 const ul=document.createElement("ul");ul.className="l";
 hs.forEach(h=>{const li=document.createElement("li");li.textContent=`${h.name}, level ${h.level} ${h.race} ${h.cls} (HP ${h.maxHp}, AC ${h.ac}) `;li.appendChild(btn("Play",()=>loadHero(h),"go"));ul.appendChild(li)});
 box.appendChild(ul);
}
$("save").onclick=()=>{
 const h=hero();let ok=true;
 try{const hs=load();hs.push(h);localStorage.setItem("hollowmere.heroes",JSON.stringify(hs))}catch(e){ok=false}
 const code=btoa(unescape(encodeURIComponent(JSON.stringify(h))));
 $("msg").textContent=ok?`${h.name} is written into the roster.`:"This browser blocked saving. Copy the hero code below to keep your hero.";
 let ta=$("hcode");if(!ta){ta=document.createElement("textarea");ta.id="hcode";ta.readOnly=true;ta.setAttribute("aria-label","Hero code");$("msg").after(ta)}
 ta.value=code;listSaved();
};
$("again").onclick=()=>{st={race:null,cls:null,rolls:null,rerolls:1,fate:null};
 ["races","classes"].forEach(i=>[...$(i).children].forEach(c=>c.setAttribute("aria-pressed","false")));
 $("to2").disabled=true;$("rr").hidden=true;$("s2").hidden=$("s3").hidden=$("s4").hidden=true;
 $("rollAll").hidden=false;$("to3").hidden=true;$("reroll").hidden=true;$("reroll").textContent="Re-roll all (1 left)";
 $("rollFate").hidden=false;$("to4").hidden=true;$("msg").textContent="";const c=$("hcode");if(c)c.remove();
 window.scrollTo({top:0,behavior:"smooth"})};
listSaved();

$("playBtn").onclick=()=>{$("save").onclick();loadHero(hero())};
})();
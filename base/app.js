// app.js — Interfaz: cuestionario, resultados, figuras y eventos. Es la parte que se rediseña.

const $=s=>document.querySelector(s);
const KEY='mapa-personalidad-v2';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let CUR=null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.ans&&Array.isArray(d.seq)&&typeof d.i==='number')return d}catch(e){}return null};

const mini=(()=>{const P=t=>{const a=(t*40-90)*Math.PI/180;return f1(14+11*Math.cos(a))+' '+f1(14+11*Math.sin(a))};return`<circle cx="14" cy="14" r="11" class="e"/><path class="e" d="M${P(3)}L${P(6)}L${P(9)}Z M${P(1)}L${P(4)}L${P(2)}L${P(8)}L${P(5)}L${P(7)}Z"/>`})();
const GLYPH={
mbti:'<svg class="gl" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2a12 12 0 0 0 0 24z" class="fb"/><path d="M14 2a12 12 0 0 1 0 24z" class="fp"/></svg>',
enea:`<svg class="gl" viewBox="0 0 28 28" aria-hidden="true">${mini}</svg>`,
inst:'<svg class="gl" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="9.5" r="7" class="fp ink"/><circle cx="9.5" cy="17.5" r="7" class="fy ink"/><circle cx="18.5" cy="17.5" r="7" class="fb ink"/></svg>'};

// ======= Cuestionario =======
function rail(){
  const cur=item(S.seq[S.i]);
  $('#rail').innerHTML=Object.keys(PARTN).map(p=>{const ids=S.seq.filter(id=>id[0]!=='#'&&item(id).part===p),n=ids.filter(id=>S.ans[id]!==undefined).length;return`<li style="flex-grow:${ids.length}"${cur&&cur.part===p&&S.view==='quiz'?' class="on"':''}><span class="rn">${PARTN[p]}</span><span class="rc">${n} de ${ids.length}</span><span class="trk"><i class="fil" style="width:${f1(ids.length?n/ids.length*100:0)}%"></i></span></li>`}).join('');
}
function renderQ(){
  const id=S.seq[S.i],it=item(id),p=it.part,ids=S.seq.filter(x=>x[0]!=='#'&&item(x).part===p),u=firstUn();
  let nav=`<button class="btn bk" data-act="back" aria-label="Atrás"${S.i?'':' disabled'}><span aria-hidden="true">←</span><span class="bkt">Atrás</span></button>`;
  if(u<0)nav+='<button class="btn go" data-act="res">Ver resultados →</button>';
  else if(u>S.i+1)nav+='<button class="btn" data-act="jump">Seguir donde iba →</button>';
  $('#card').innerHTML=`<div class="body"><div class="qh"><div class="qm">${GLYPH[p]}<span><b>${PARTN[p]}</b> <span class="qn">${ids.indexOf(id)+1} de ${ids.length}</span></span></div><div class="nav">${nav}</div></div><p class="inst">${instr(it)}</p><p class="stmt" id="qs">${it.q}</p><div class="opts" role="group" aria-labelledby="qs">${it.o.map((o,i)=>`<button class="op" data-i="${i}"><span class="lt2" aria-hidden="true">${'ABCD'[i]}</span><span class="ot">${o[0]}</span><span class="tg"></span></button>`).join('')}</div><div class="qfoot"><button class="btn na" data-act="na">No me ha pasado</button><button class="btn go nx" data-act="next">Siguiente →</button></div><p class="keys">Toca la que más se parezca a ti; si otra también va contigo, tócala después y contará la mitad. <span class="kb">Teclas: 1 a ${it.o.length} para elegir, Intro para seguir, ← para volver.</span></p></div>`;
  paint();rail();
}
function paint(){
  const a=S.ans[S.seq[S.i]];
  document.querySelectorAll('#card .op').forEach(b=>{const i=+b.dataset.i,pos=Array.isArray(a)?a.indexOf(i):-1;b.dataset.s=pos<0?'':pos===0?'1':'2';b.setAttribute('aria-pressed',String(pos>=0));b.querySelector('.tg').textContent=pos===1?'También':pos===0&&a.length>1?'Principal':''});
  const nb=$('#card .nx');if(nb)nb.disabled=a===undefined;
  const na=$('#card .na');if(na)na.setAttribute('aria-pressed',String(Array.isArray(a)&&!a.length));
}
function pick(i){
  const id=S.seq[S.i],it=item(id);if(i>=it.o.length)return;
  let a=Array.isArray(S.ans[id])?S.ans[id].slice():[];const pos=a.indexOf(i);
  if(pos===0)a=a.slice(1);else if(pos===1)a=[a[0]];else if(!a.length)a=[i];else a=[a[0],i];
  if(a.length)S.ans[id]=a;else delete S.ans[id];
  save();paint();rail();
}
function focusCard(){const c=$('#card');c.focus({preventScroll:true});if(c.getBoundingClientRect().top<0)c.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'})}
function next(){
  if(S.ans[S.seq[S.i]]===undefined)return;
  S.i++;settle();
  if(S.i>=S.seq.length){S.i=S.seq.length-1;showRes();return}
  save();renderQ();focusCard();
}
function back(){if(S.i>0){S.i--;save();renderQ()}}
function jump(){const u=firstUn();if(u>=0){S.i=u;settle();if(S.i>=S.seq.length){S.i=S.seq.length-1;showRes();return}save();renderQ()}}

// ======= Resultados (pintado) =======
const bars=(rows,cls)=>`<div class="pbs${cls?' '+cls:''}">${rows.map(([k,v,on])=>`<div class="pb${on?' on':''}"><span class="k">${k}</span><span class="t"><i style="width:${Math.max(1,pc(v))}%"></i></span><span class="v">${pc(v)} %</span></div>`).join('')}</div>`;
function renderRes(){
  const R=CUR=compute(),[mt,mp]=R.PM[0],[mt2,mp2]=R.PM[1],T=T16[mt],E=E9[R.core],wk=R.core+'w'+R.wing,st=R.stack.slice(0,2).join('/'),sb=SUB[R.core][R.stack[0]],tk=TRI[R.triKey],ti=tk.indexOf(':'),pe=R.PE[0][1],[e2,pe2]=R.PE[1],ps=R.PI[0][1];
  $('#rsum').textContent=`Lo más probable con tus respuestas: ${mt}, eneatipo ${R.core} e instintos ${st}. Los porcentajes dicen cuánto fiarte de cada resultado; si el segundo queda cerca, léelo también.`;
  $('#codes').innerHTML=[['MBTI',mt,`${T.n} · ${pc(mp)} %`,`o ${mt2} (${pc(mp2)} %)`],['Eneagrama',wk,`${E.n.slice(3)} · ${pc(pe)} %`,`o ${e2} (${pc(pe2)} %)`],['Instintos',st,`${pc(ps)} % · subtipo ${R.core} ${R.stack[0]}`,`dominante ${INSN[R.stack[0]]}: ${pc(R.dom[R.stack[0]])} %`],['Tritipo',R.tri.map(x=>x.t).join(''),tk.slice(0,ti),'']].map(([l,c,cp,cp2])=>`<div class="cell"><span class="lb">${l}</span><span class="big">${c}</span><span class="cp">${cp}</span>${cp2?`<span class="cp2">${cp2}</span>`:''}</div>`).join('');
  // MBTI
  $('#mbL').innerHTML=mt.split('').map(L=>`<div class="lt"><span class="L">${L}</span><span class="ln">${AXN[L]}</span></div>`).join('');
  const myF=T16K[mt];
  $('#mbP').innerHTML=`<div class="blk"><h3>Probabilidad por tipo</h3>${bars(R.PM.slice(0,5).map(([k,p],i)=>[k,p,i===0]))}</div><div class="two"><div class="blk"><h3>Cómo decides</h3>${bars(JF.map(f=>[f,R.fs[f]/(R.ns.J||1),myF.includes(f)]))}</div><div class="blk"><h3>Cómo percibes</h3>${bars(PF.map(f=>[f,R.fs[f]/(R.ns.P||1),myF.includes(f)]))}</div></div><p class="sm">Porcentaje de veces que elegiste cada función. Energía: ${pc(R.eShare)} % de respuestas de extraversión.</p>`;
  const tm=mt[1]==='N'?'N'+mt[2]:'S'+mt[3];
  $('#mbT').innerHTML=`<h2>Tu tipo MBTI más probable es ${mt}: ${T.n.toLowerCase()}</h2><p class="sub2">Temperamento ${TEMP[tm]} (${tm}) · ${pc(mp)} % de probabilidad</p><p>${T.d}</p><h3>Tus funciones cognitivas</h3><ol class="fn">${T.f.map((f,i)=>`<li><span>${FPOS[i]}</span><b>${f}</b><span>${FN[f]}</span></li>`).join('')}</ol><div class="two"><div><h3>Fortalezas</h3><ul>${T.s.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><h3>Tus retos</h3><ul>${T.c.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>${mp<.5?`<p class="note">El resultado no es concluyente: el segundo tipo, ${mt2} (${T16[mt2].n.toLowerCase()}), tiene un ${pc(mp2)} %. Lee los dos y quédate con el que describa mejor lo que haces cuando nadie te mira.</p>`:''}`;
  // Eneagrama
  $('#enLeg').innerHTML=`<span><i></i>Crecimiento: hacia el ${E.g}</span><span class="s"><i></i>Estrés: hacia el ${E.s}</span>`;
  const gprof=DIML.map((ls,d)=>{const tot=ls.reduce((s,l)=>s+(R.gp[d][l]||0),0)||1;return`<li><b>${DIMN[d]}</b><span>${ls.slice().sort((x,y)=>(R.gp[d][y]||0)-(R.gp[d][x]||0)).map(l=>`${GRN[l]} ${pc((R.gp[d][l]||0)/tot)} %`).join(' · ')}</span></li>`}).join('');
  $('#enT').innerHTML=`<h2>Tu eneatipo más probable es el ${wk}: ${E.n.toLowerCase()} con ala ${R.wing}</h2><p>${E.d}</p><p>Tu ala ${R.wing} le añade ${WING[wk]}.</p><div class="blk"><h3>Probabilidad por tipo</h3>${bars(R.PE.map(([k,p],i)=>[`${k} · ${E9[k].n.slice(3)}`,p,i===0]),'w')}</div>${pe<.5?`<p class="note">No es concluyente: el ${e2} (${E9[e2].n.slice(3).toLowerCase()}) tiene un ${pc(pe2)} %. Lo que define el eneatipo es la motivación de fondo, no la conducta: lee los dos.</p>`:''}<div class="blk"><h3>Tu perfil por grupos</h3><ul class="gpr">${gprof}</ul></div><dl class="facts">${[['Deseo básico',E.de],['Miedo básico',E.mi],['Pasión',E.pa],['Virtud',E.vi],['Tu reto',E.re],['Centro',`${E.c} (${CENTN[Object.keys(CENT).find(c=>CENT[c].includes(R.core))].toLowerCase()})`],['En crecimiento',`Hacia el ${E.g}: ${E.gt}`],['En estrés',`Hacia el ${E.s}: ${E.st}`]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>`;
  // Instintos
  $('#inT').innerHTML=`<h2>Tu orden de instintos más probable es ${st}</h2><p>${STACK[st]}</p><div class="blk"><h3>Probabilidad por orden</h3>${bars(R.PI.map(([k,p],i)=>[k,p,i===0]))}<p class="sm">Los círculos y el «elegido» cuentan solo las preguntas de preferencia; el orden final suma también las de punto ciego.</p></div><ol class="stk">${R.stack.map((n,i)=>`<li><span class="rk"><span>${['Dominante','Secundario','Punto ciego'][i]}</span><span>elegido ${pc(R.ipShare[n])} %</span></span><b>${INS[n].n}</b><span>${[INS[n].d,SEC[n],BLIND[n]][i]}</span></li>`).join('')}</ol><div class="subt"><h3>Tu subtipo es ${R.core} ${R.stack[0]}: ${sb[0].toLowerCase()}${sb[2]?' <span class="tag">contratipo</span>':''}</h3><p>${sb[1]}</p>${sb[2]?'<p class="sm">Un contratipo va a contracorriente de la pasión de su tipo, por eso a veces cuesta reconocerse en la descripción general.</p>':''}<p class="sm">Nombres de subtipos según Claudio Naranjo.</p></div>`;
  // Tritipo
  $('#trT').innerHTML=`<h2>Tu tritipo es ${R.tri.map(x=>x.t).join('')}</h2><p><b>${tk.slice(0,ti)}:</b>${tk.slice(ti+1)}</p><ol class="stk">${R.tri.map((x,i)=>`<li><span class="rk"><span>${['Núcleo','Segundo','Tercero'][i]} · ${CENTN[x.c]}</span><span>${x.t===R.core&&i===0?'tu eneatipo':`elegido ${pc(x.share)} %`}</span></span><b>${x.t} · ${E9[x.t].n}</b><span>${ROLE[x.t]}</span></li>`).join('')}</ol><p class="sm">El tritipo junta tu tipo más fuerte de cada centro (corazón, cabeza e instinto). El primero es tu eneatipo; los otros dos, ordenados por lo claros que han salido en las preguntas de motivación.</p>`;
}

// ======= Figuras =======
const EDGES=[[3,6],[6,9],[9,3],[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]];
const geo=(W,H,k)=>{const m=Math.min(W,H)/2,R=(m-30)/(1+k),cx=W/2,cy=H/2,P=(t,r=R)=>{const a=(t*40-90)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]};return{R,cx,cy,P}};
const base=({R,cx,cy,P})=>`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" class="ring"/>`+EDGES.map(([a,b])=>{const[x1,y1]=P(a),[x2,y2]=P(b);return`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="edge"/>`}).join('');
const mkr=(id,c)=>`<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0 0L10 5L0 10z" class="${c}"/></marker>`;
function drawE(){
  const s=$('#fgE'),W=s.clientWidth,H=s.clientHeight;if(!CUR||W<60||H<60)return;
  const C=CUR,g=geo(W,H,.16),{R,P}=g,E=E9[C.core],pr={};C.PE.forEach(([k,p])=>{pr[k]=p});const pm=C.PE[0][1]||1,rr=t=>6+R*.16*Math.sqrt(pr[t]/pm);
  const ar=(a,b,c,m)=>{const[x1,y1]=P(a),[x2,y2]=P(b),dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy),ra=rr(a)+3,rb=rr(b)+7;return`<line x1="${f1(x1+dx/d*ra)}" y1="${f1(y1+dy/d*ra)}" x2="${f1(x2-dx/d*rb)}" y2="${f1(y2-dy/d*rb)}" class="${c}" marker-end="url(#${m})"/>`};
  let h=`<defs>${mkr('mg','mkg')}${mkr('ms','mks')}</defs>`+base(g)+ar(C.core,E.g,'grow','mg')+ar(C.core,E.s,'stress','ms');
  for(let t=1;t<=9;t++){const[x,y]=P(t),[lx,ly]=P(t,R*1.16+18);h+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(t))}" class="pt${t===C.core?' core':t===C.wing?' wing':''}"/><text x="${f1(lx)}" y="${f1(ly)}" text-anchor="middle" dominant-baseline="central"${t===C.core?' class="hi"':''}>${t}</text>`}
  s.innerHTML=h;
}
function drawT(){
  const s=$('#fgT'),W=s.clientWidth,H=s.clientHeight;if(!CUR||W<60||H<60)return;
  const C=CUR,g=geo(W,H,.12),{R,P}=g,ts=C.tri.map(x=>x.t);
  let h=base(g)+`<polygon points="${ts.map(t=>P(t).map(f1).join(',')).join(' ')}" class="trig ink"/>`;
  for(let t=1;t<=9;t++){const on=ts.includes(t),[x,y]=P(t),[lx,ly]=P(t,R*1.12+18);h+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(on?6+R*.12:6)}" class="pt ${on?CC[t]:'dim'}"/><text x="${f1(lx)}" y="${f1(ly)}" text-anchor="middle" dominant-baseline="central" class="${on?'hi':'lo'}">${t}</text>`}
  s.innerHTML=h;
}
function drawI(){
  const s=$('#fgI'),W=s.clientWidth,H=s.clientHeight;if(!CUR||W<60||H<60)return;
  const C=CUR,m=Math.min(W,H),cx=W/2,cy=H/2+m*.02,d=m*.19,mx=Math.max(C.ipShare.sp,C.ipShare.so,C.ipShare.sx)||1,rr=n=>m*(.13+.15*C.ipShare[n]/mx);
  const pos={sx:[cx,cy-d],sp:[cx-d*.95,cy+d*.6],so:[cx+d*.95,cy+d*.6]},off={sx:[0,-.45],sp:[-.4,.25],so:[.4,.25]},fill={sp:'fy',so:'fb',sx:'fp'};
  let h='';
  C.stack.slice().reverse().forEach(n=>{const[x,y]=pos[n];h+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(n))}" class="${fill[n]} ink"/>`});
  const[dx,dy]=pos[C.stack[0]];h+=`<circle cx="${f1(dx)}" cy="${f1(dy)}" r="${f1(rr(C.stack[0]))}" class="dom"/>`;
  C.stack.forEach(n=>{const[x,y]=pos[n],r=rr(n),[ox,oy]=off[n],tx=f1(x+ox*r);h+=`<text x="${tx}" y="${f1(y+oy*r)}" text-anchor="middle"><tspan class="tb">${n}</tspan><tspan x="${tx}" dy="1.25em" class="sm2">${pc(C.ipShare[n])}%</tspan></text>`});
  s.innerHTML=h;
}
const ro=new ResizeObserver(()=>{drawE();drawI();drawT()});
['#fgE','#fgI','#fgT'].forEach(q=>ro.observe($(q)));

// ======= Vistas y eventos =======
function showRes(quiet){
  S.view='res';save();
  $('#qtop').hidden=true;$('#quiz').hidden=true;$('#res').hidden=false;$('#cf').hidden=true;$('#copyta').hidden=true;
  renderRes();drawE();drawI();drawT();
  if(!quiet)window.scrollTo(0,0);
}
function showQuiz(){S.view='quiz';save();$('#res').hidden=true;$('#qtop').hidden=false;$('#quiz').hidden=false;settle();renderQ()}
const flash=(b,m)=>{const o=b.dataset.l||b.textContent;b.dataset.l=o;b.textContent=m;setTimeout(()=>{b.textContent=o},1800)};
async function copy(b){
  const t=txt(compute());
  try{await navigator.clipboard.writeText(t);flash(b,'Copiado')}
  catch(e){const ta=$('#copyta');ta.hidden=false;ta.value=t;ta.focus();ta.select();flash(b,'Cópialo del recuadro')}
}
$('#card').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.i!==undefined)pick(+b.dataset.i);
  else{const a=b.dataset.act;if(a==='next')next();else if(a==='na'){S.ans[S.seq[S.i]]=[];save();next()}else if(a==='back')back();else if(a==='jump')jump();else if(a==='res')showRes()}
});
$('#res').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.act;
  if(a==='copy')copy(b);
  else if(a==='again'){$('#cf').hidden=false;window.scrollTo({top:0,behavior:RM?'auto':'smooth'})}
  else if(a==='no')$('#cf').hidden=true;
  else if(a==='wipe'){S=fresh();save();showQuiz();window.scrollTo(0,0)}
  else if(a==='review'){S.i=0;showQuiz();window.scrollTo(0,0)}
});
document.addEventListener('keydown',e=>{
  if(S.view!=='quiz'||e.metaKey||e.ctrlKey||e.altKey)return;
  const t=e.target;if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName))return;
  if(/^[1-4]$/.test(e.key)){e.preventDefault();pick(+e.key-1)}
  else if(e.key==='Enter'&&!(t&&t.tagName==='BUTTON')){e.preventDefault();next()}
  else if(e.key==='ArrowLeft'){e.preventDefault();back()}
});
function start(d){
  const x=d&&d.ans&&Array.isArray(d.seq)?d:load();
  if(x){S={ans:x.ans||{},seq:x.seq.filter(id=>id[0]==='#'||ITEMS[id]||(x.gen&&x.gen[id])),gen:x.gen||{},i:0,view:x.view==='res'?'res':'quiz'};S.i=Math.min(Math.max(0,x.i|0),S.seq.length-1)}
  if(S.view==='res'&&firstUn()>=0)S.view='quiz';
  window.claude?.hot?.snapshot?.(()=>S);
  if(S.view==='res')showRes(1);else showQuiz();
}
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});

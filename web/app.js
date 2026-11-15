// app.js — Interfaz: entrada, preguntas, transiciones, ayuda, revisión y resultados.
// El cálculo vive en model.js (estado global S) y no se toca desde aquí salvo a través de su API.

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const KEY='mapa-personalidad-v2';
const AUTO_MS=1200;
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const T=TEXTOS;
const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>k in o?o[k]:m);
const TIE=['TBF','TBEI','TBE','TBI'];
const PREF=['IB','WG',...TIE];   // bloques con «Ninguna encaja»
const PARTS=['mbti','enea','inst'];

// ======= Iconos y emblemas =======
const svg=(cls,body,extra='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
const EMB={
  mbti:'<circle cx="12" cy="12" r="9"/><path class="t" d="M12 3a9 9 0 0 0 0 18z"/><path d="M12 3v18"/>',
  enea:'<circle cx="12" cy="12" r="9"/><path d="M12 3 19.8 16.5H4.2Z"/><path d="M17.8 5.1 6.2 18.9 20.9 13.6 3.1 13.6 17.8 18.9 6.2 5.1Z" stroke-width="1"/>',
  inst:'<circle cx="12" cy="8" r="5"/><circle cx="8.2" cy="14.6" r="5"/><circle cx="15.8" cy="14.6" r="5"/>',
  IB:'<circle cx="12" cy="8" r="5"/><circle cx="8.2" cy="14.6" r="5"/><circle cx="15.8" cy="14.6" r="5" stroke-dasharray="1.6 1.4"/>'
};
const ICO={
  back:'<path d="M15 5l-7 7 7 7"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.3 2-2.3 3.5"/><path d="M12 17.2v.1"/>',
  warn:'<path d="M12 4 21 19H3Z"/><path d="M12 10v4"/><path d="M12 16.8v.1"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};
const aviso=html=>`<div class="aviso">${svg('',ICO.warn)}<span>${html}</span></div>`;

// ======= Estado y guardado =======
let CAN_SAVE=true;
const probe=()=>{try{const k=KEY+'-prueba';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.ans&&Array.isArray(d.seq)&&typeof d.i==='number')return d}catch(e){}return null};
// Rellena los campos nuevos (todos opcionales) para que un estado de la versión anterior siga valiendo.
function adopt(x,prefs){
  const p=Object.assign({auto:true,keys:true},prefs||{},x.prefs||{});
  S={ans:x.ans||{},seq:x.seq.filter(id=>id[0]==='#'||ITEMS[id]||(x.gen&&x.gen[id])),gen:x.gen||{},i:0,view:x.view==='res'?'res':'quiz',
     prefs:{auto:p.auto!==false,keys:p.keys!==false},seen:x.seen&&typeof x.seen==='object'?x.seen:null,
     choice:x.choice&&typeof x.choice==='object'?x.choice:{},pace:Array.isArray(x.pace)?x.pace.filter(n=>typeof n==='number').slice(-10):[]};
  if(x.doneAt)S.doneAt=x.doneAt;
  S.i=Math.min(Math.max(0,x.i|0),S.seq.length-1);
  if(!S.seen){   // estado antiguo: lo que ya quedó atrás no vuelve a presentarse
    S.seen={};const u=firstUn(),lim=u<0?S.seq.length:u;
    for(let j=0;j<lim;j++){const k=transKey(j);if(k)S.seen[k]=1}
  }
}
const blank=()=>{adopt(fresh(),S&&S.prefs);S.seen={}};

// ======= Recuentos =======
const real=id=>id[0]!=='#';
const partIds=p=>S.seq.filter(id=>real(id)&&item(id).part===p);
const wingPending=()=>S.seq.includes('#wing')?3:0;
const partTotal=p=>partIds(p).length+(p==='enea'?wingPending():0);
const answeredN=()=>S.seq.filter(id=>real(id)&&S.ans[id]!==undefined).length;
const totalN=()=>S.seq.filter(real).length+wingPending();
function pace(){
  if(S.pace.length<5)return 20;
  const a=S.pace.slice(-10).sort((x,y)=>x-y),m=a.length>>1,med=a.length%2?a[m]:(a[m-1]+a[m])/2;
  return Math.min(40,Math.max(8,med));
}
const leftSec=()=>(S.seq.filter(id=>real(id)&&S.ans[id]===undefined).length+wingPending())*pace();
function leftText(){const s=leftSec();return s<=60?T.pregunta.quedaPoco:fill(T.pregunta.quedan,{min:Math.round(s/60)})}

// ======= Transiciones =======
// Qué pantalla de paso toca antes de la pregunta j: el comienzo de cada parte, los bloques C e IB,
// el primer desempate de cada parte y el ala. Devuelve su clave en S.seen o null.
function transKey(j){
  const id=S.seq[j];if(!id||!real(id))return null;
  const it=item(id);let k=j-1;while(k>=0&&!real(S.seq[k]))k--;
  const pv=k>=0?item(S.seq[k]):null;
  if(!pv||pv.part!==it.part)return it.part;
  if(it.blk===pv.blk)return null;
  if(it.blk==='C'||it.blk==='IB')return it.blk;
  if(TIE.includes(it.blk)&&!TIE.includes(pv.blk))return 'tb_'+it.part;
  if(it.blk==='WG')return 'WG';
  return null;
}
function transData(key){
  const tr=T.transiciones;
  if(PARTS.includes(key))return{d:tr[key],emb:EMB[key],yel:false,btn:tr.seguir};
  if(key==='C')return{d:tr.C,emb:EMB.mbti,yel:true,btn:tr.entendido};
  if(key==='IB')return{d:tr.IB,emb:EMB.IB,yel:true,btn:tr.entendido};
  if(key==='WG')return{d:tr.ala,emb:EMB.enea,yel:true,btn:tr.entendido};
  const p=key.slice(3),n=S.seq.filter(id=>real(id)&&TIE.includes(item(id).blk)&&item(id).part===p).length;
  return{d:Object.assign({},tr.desempate,{meta:fill(tr.desempate.meta,{n,min:Math.max(1,Math.round(n*pace()/60))})}),emb:EMB[p],yel:true,btn:tr.entendido};
}
function avisoFor(it){
  const tr=T.transiciones;
  if(it.blk==='C')return tr.C.aviso;
  if(it.blk==='IB')return tr.IB.aviso.replace('menos','<b>menos</b>');
  if(it.blk==='WG')return tr.ala.aviso;
  if(TIE.includes(it.blk))return tr.desempate.aviso;
  return null;
}

// ======= Anuncios y foco =======
let srT=0;
function say(msg){const r=$('#sr');clearTimeout(srT);r.textContent='';srT=setTimeout(()=>{r.textContent=msg},60)}
function focusTop(el){window.scrollTo(0,0);if(el)el.focus({preventScroll:true})}

// ======= Vistas =======
let VIEW='',REV=false,NOTE='',AUTO_OK=false,WAS_NEW=false,QSTART=0,TIMER=0;
const app=$('#app');
function setView(v,html){VIEW=v;cancelAuto();app.innerHTML=html;app.dataset.view=v}

// ----- Entrada -----
function showEntrada(focus){
  const E=T.entrada,started=answeredN()>0;
  const parts=PARTS.map(p=>{const x=E.partes[p];return`<li>${svg('em',EMB[p])}<span><b>${x.nombre}</b><small>${x.que}</small></span><span class="n">${fill(E.preguntas,{n:x.preguntas})}<br>${fill(E.minutos,{n:x.min})}</span></li>`}).join('');
  setView('entrada',`<div class="in enter">
    <h1 class="disp" tabindex="-1">${T.titulo}</h1>
    <p class="lede">${E.lede}</p>
    ${CAN_SAVE?'':aviso(T.pregunta.sinGuardar)}
    <section aria-labelledby="hPartes"><h2 class="sr" id="hPartes">${E.partesTitulo}</h2><ul class="parts">${parts}</ul>
    <p class="small" style="margin-top:8px">${E.partesTotal}. ${E.partesNota}</p></section>
    <section aria-labelledby="hComo"><h2 class="h3" id="hComo">${E.comoTitulo}</h2><ol class="how">${E.como.map(x=>`<li>${x}</li>`).join('')}</ol></section>
    <label class="tog"><span><b>${E.auto}</b><small>${E.autoAyuda}</small></span><input type="checkbox" role="switch" class="sw" data-pref="auto"${S.prefs.auto?' checked':''}></label>
    <p class="priv">${svg('',ICO.lock)}${E.privacidad}</p>
    <div class="go">${started?`<button class="btn pri full" data-act="start">${fill(E.continuar,{n:answeredN()+1})}</button>
      <p class="small" style="text-align:center">${fill(E.continuarAyuda,{n:answeredN(),m:totalN()})}</p>
      <button class="btn full" data-act="wipe">${E.deCero}</button>`:`<button class="btn pri full" data-act="start">${E.empezar}</button>`}</div>
    <p style="text-align:center"><button class="linkbtn" data-act="metodo">${E.queEs}</button></p>
  </div>`);
  if(focus)focusTop($('#app h1'));else window.scrollTo(0,0);
}

// ----- Cabecera común de pregunta y transición -----
function topBar(it){
  const p=it.part,ids=partIds(p),n=ids.indexOf(it.id)+1,m=partTotal(p);
  const segs=PARTS.map(q=>{const tot=partTotal(q),done=partIds(q).filter(id=>S.ans[id]!==undefined).length;return`<i style="flex:${tot}"><b style="width:${tot?(done/tot*100).toFixed(1):0}%"></b></i>`}).join('');
  return`<h1 class="sr">${T.titulo}</h1><div class="top"><div class="appbar">
    <button class="ib" data-act="back" aria-label="${T.pregunta.atras}"${S.i>0?'':' disabled'}>${svg('',ICO.back)}</button>
    <div class="where">${svg('em',EMB[p])}<b>${PARTN[p]}</b><span>${fill(REV?T.pregunta.contadorRevision:T.pregunta.contador,{n,m})}</span></div>
    <button class="ib" data-act="help" aria-label="${T.pregunta.ayuda}" aria-haspopup="dialog">${svg('',ICO.help)}</button></div>
    <div class="prog" role="img" aria-label="${fill(T.pregunta.progreso,{n:answeredN(),m:totalN()})}">${segs}</div>
    ${REV?'':`<p class="left">${leftText()}</p>`}</div>`;
}

// ----- Pregunta -----
function showQ(){
  const id=S.seq[S.i],it=item(id),a=S.ans[id];
  WAS_NEW=a===undefined;AUTO_OK=!REV&&WAS_NEW;QSTART=performance.now();
  const av=avisoFor(it),skip=PREF.includes(it.blk)?T.pregunta.saltarPreferencia:T.pregunta.saltar,L=it.o.length;
  const keys=`Teclas: <kbd>A</kbd>–<kbd>${'ABCD'[L-1]}</kbd> o <kbd>1</kbd>–<kbd>${L}</kbd> elegir · <kbd>Intro</kbd> siguiente · <kbd>←</kbd> atrás · <kbd>?</kbd> ayuda`;
  setView('pregunta',`<div class="qv">${topBar(it)}
    <div class="q">
      <div class="qc enter">
        ${REV?`<div class="rev"><span>${T.pregunta.revisando}</span><button class="btn sm" data-act="endrev">${T.pregunta.verResultados}</button></div>`:''}
        ${CAN_SAVE?'':aviso(T.pregunta.sinGuardar)}
        ${NOTE?aviso(NOTE):''}
        ${av?aviso(av):`<p class="ctx">${instr(it)}</p>`}
        <h2 class="stmt" id="qs" tabindex="-1">${it.q}</h2>
        <div class="opts" role="group" aria-labelledby="qs">${it.o.map((o,i)=>`<button class="op" data-i="${i}" aria-pressed="false"><span class="lt" aria-hidden="true">${'ABCD'[i]}</span><span class="ot">${o[0]}</span><span class="chip"></span></button>`).join('')}</div>
      </div>
      <div class="bar"><button class="btn ghost" data-act="skip" aria-pressed="false">${skip}</button><button class="btn pri" data-act="next">${T.pregunta.siguiente} <span aria-hidden="true">→</span></button></div>
      ${S.prefs.keys?`<p class="keys">${keys}</p>`:''}
    </div></div>`);
  NOTE='';
  paint();
  focusTop($('#qs'));
  say(fill(T.pregunta.anuncio,{n:partIds(it.part).indexOf(id)+1,m:partTotal(it.part),texto:it.q}));
}
function paint(){
  const a=S.ans[S.seq[S.i]];
  $$('#app .op').forEach(b=>{
    const i=+b.dataset.i,pos=Array.isArray(a)?a.indexOf(i):-1;
    b.dataset.s=pos<0?'':pos===0?'1':'2';
    b.setAttribute('aria-pressed',String(pos>=0));
    b.querySelector('.lt').innerHTML=pos===0?svg('',ICO.check):'ABCD'[i];
    b.querySelector('.chip').textContent=pos===1?T.pregunta.tambien:pos===0&&a.length>1?T.pregunta.principal:'';
    const tm=b.querySelector('.timer');if(tm)tm.remove();
    if(pos===0&&TIMER){const s=document.createElement('span');s.className='timer';s.setAttribute('aria-hidden','true');s.style.setProperty('--auto-ms',AUTO_MS+'ms');b.append(s)}
  });
  const nb=$('#app [data-act=next]');if(nb)nb.disabled=a===undefined;
  const sk=$('#app [data-act=skip]');if(sk)sk.setAttribute('aria-pressed',String(Array.isArray(a)&&!a.length));
}
// Lógica de elección: vacía → principal; otra → también; tocar la principal la quita (la también sube); tocar la también la quita.
function pick(i){
  const id=S.seq[S.i],it=item(id);if(VIEW!=='pregunta'||i>=it.o.length)return;
  let a=Array.isArray(S.ans[id])?S.ans[id].slice():[];const pos=a.indexOf(i);
  if(pos===0)a=a.slice(1);else if(pos===1)a=[a[0]];else if(!a.length)a=[i];else a=[a[0],i];
  if(a.length)S.ans[id]=a;else delete S.ans[id];
  save();
  const now=a.indexOf(i),txt=it.o[i][0];
  say(fill(now===0?T.pregunta.anuncioPrincipal:now===1?T.pregunta.anuncioTambien:T.pregunta.anuncioQuitada,{texto:txt}));
  if(AUTO_OK&&S.prefs.auto&&a.length)startAuto();else cancelAuto();
  paint();
}

// ----- Avance automático -----
function startAuto(){clearTimeout(TIMER);TIMER=setTimeout(()=>{TIMER=0;next()},AUTO_MS)}
function cancelAuto(){if(!TIMER)return;clearTimeout(TIMER);TIMER=0;const tm=$('#app .timer');if(tm)tm.remove()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAuto()});

// ----- Navegación -----
function next(){
  if(VIEW!=='pregunta')return;
  const id=S.seq[S.i];if(S.ans[id]===undefined)return;
  cancelAuto();
  if(WAS_NEW&&!REV){S.pace=S.pace.concat(Math.round((performance.now()-QSTART)/100)/10).slice(-10)}
  if(REV){S.i++;if(S.i>=S.seq.length){endReview();return}save();showQ();return}
  // Tras contestar una pregunta nueva se va a la primera pendiente; tras cambiar una antigua, a la siguiente.
  const u=firstUn();
  if(WAS_NEW){if(u<0){finish();return}S.i=u}else S.i++;
  arrive();
}
function arrive(){
  settle();
  if(S.i>=S.seq.length){if(firstUn()<0){finish();return}S.i=firstUn();settle()}
  save();
  const k=transKey(S.i);
  if(!REV&&k&&!S.seen[k])showTrans(k);else showQ();
}
function back(){
  if(S.i<=0)return;
  cancelAuto();S.i--;
  while(S.i>0&&!real(S.seq[S.i]))S.i--;
  save();showQ();
}
function skip(){if(VIEW!=='pregunta')return;S.ans[S.seq[S.i]]=[];save();paint();next()}

// ----- Transición -----
let TKEY='';
function showTrans(key){
  TKEY=key;const it=item(S.seq[S.i]),{d,emb,yel,btn}=transData(key);
  setView('transicion',`<div class="qv">${topBar(it)}
    <div class="tr enter">
      ${svg('big',emb)}
      <span class="badge ${yel?'yel':'ink'}">${d.insignia}</span>
      <h2 class="disp" id="trt" tabindex="-1">${d.titulo}</h2>
      ${NOTE?aviso(NOTE):''}
      <p>${d.texto}</p>
      <p class="m">${d.meta}</p>
      <div class="bar"><span></span><button class="btn pri" data-act="cont">${btn}</button></div>
    </div></div>`);
  NOTE='';
  focusTop($('#trt'));
  say(`${d.insignia}. ${d.titulo}`);
}
function contTrans(){if(VIEW!=='transicion')return;S.seen[TKEY]=1;save();showQ()}

// ----- Revisión -----
function startReview(){REV=true;S.view='quiz';S.i=0;save();showQ()}
// Al salir de la revisión se rehacen desempates y ala si los cambios lo piden (reconcile) y se llevan las preguntas nuevas.
function endReview(){
  REV=false;cancelAuto();
  reconcile();
  const u=firstUn();
  if(u<0){finish();return}
  S.i=u;settle();
  if(S.i>=S.seq.length||firstUn()<0){finish();return}
  const k=transKey(S.i);if(k&&(k.startsWith('tb_')||k==='WG'))delete S.seen[k];
  NOTE=T.revision.nuevas;
  arrive();
}
function finish(){
  S.i=Math.max(0,S.seq.length-1);S.view='res';
  if(!S.doneAt)S.doneAt=new Date().toISOString();
  save();showRes(true);
}

// ======= Diálogos =======
let OPENER=null;
function openDlg(id,html){
  cancelAuto();OPENER=document.activeElement;
  const d=$('#'+id);d.innerHTML=`<div class="dlg">${html}</div>`;d.showModal();
  const f=d.querySelector('[autofocus]')||d.querySelector('h2');if(f){if(f.tagName==='H2')f.tabIndex=-1;f.focus()}
}
$$('dialog').forEach(d=>{
  d.addEventListener('close',()=>{if(OPENER&&document.contains(OPENER))OPENER.focus({preventScroll:true});OPENER=null});
  d.addEventListener('click',e=>{if(e.target===d)d.close()});   // tocar fuera cierra
});
function openHelp(){
  const A=T.ayuda;
  openDlg('dlgAyuda',`<h2 class="disp" id="dlgAyudaT">${A.titulo}</h2>
    <ul>${A.puntos.map(x=>`<li>${x}</li>`).join('')}</ul>
    <label class="tog"><span><b>${A.auto}</b><small>${A.autoAyuda}</small></span><input type="checkbox" role="switch" class="sw" data-pref="auto"${S.prefs.auto?' checked':''}></label>
    <label class="tog"><span><b>${A.teclas}</b><small>${A.teclasAyuda}</small></span><input type="checkbox" role="switch" class="sw" data-pref="keys"${S.prefs.keys?' checked':''}></label>
    <p class="small">${T.pregunta.teclas}</p>
    <div class="acts"><button class="btn pri" data-close autofocus>${A.cerrar}</button></div>`);
}
function confirmDlg(q,yes,fn){
  CONFIRM=fn;
  openDlg('dlgConfirmar',`<h2 class="disp" id="dlgConfirmarT">${q}</h2>
    <div class="acts"><button class="btn" data-close autofocus>${T.entrada.cancelar}</button><button class="btn pri" data-act="yes">${yes}</button></div>`);
}
let CONFIRM=null;
function openMetodo(){
  const M=T.metodo;
  openDlg('dlgMetodo',`<h2 class="disp" id="dlgMetodoT">${M.titulo}</h2>${M.parrafos.map(p=>`<p>${p}</p>`).join('')}
    <div class="acts"><button class="btn pri" data-close autofocus>${T.entrada.cerrar}</button></div>`);
}
function onPref(e){
  const t=e.target;if(!t.matches||!t.matches('input[data-pref]'))return;
  S.prefs[t.dataset.pref]=t.checked;save();
  if(t.dataset.pref==='auto'&&!t.checked)cancelAuto();
  if(t.dataset.pref==='keys'&&VIEW==='pregunta'){const k=$('#app .keys');if(k)k.hidden=!t.checked}
}
document.addEventListener('change',onPref);

// ======= Resultados (provisionales: se rehacen en la prioridad 2) =======
const bars=(rows,cls)=>`<div class="pbs${cls?' '+cls:''}">${rows.map(([k,v,on])=>`<div class="pb${on?' on':''}"><span class="k">${k}</span><span class="t"><i style="width:${Math.max(1,pc(v))}%"></i></span><span class="v">${pc(v)} %</span></div>`).join('')}</div>`;
const fecha=iso=>new Date(iso).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
function codes(R){return`${R.mbti} · ${R.core}w${R.wing} · ${R.stack.slice(0,2).join('/')} · ${R.tri.map(x=>x.t).join('')}`}
function showRes(){
  REV=false;
  const R=compute(),RS=T.resultados,[mt,mp]=R.PM[0],[mt2,mp2]=R.PM[1],TT=T16[mt],E=E9[R.core],wk=R.core+'w'+R.wing,st=R.stack.slice(0,2).join('/');
  const sb=SUB[R.core][R.stack[0]],tk=TRI[R.triKey],ti=tk.indexOf(':'),[,pe]=R.PE[0],[e2,pe2]=R.PE[1],[,ps]=R.PI[0],[s2,ps2]=R.PI[1];
  const conf=p=>`${RS.confianza[confidence(p)]} · ${pc(p)} %`;
  const cell=(l,c,n,cf,alt)=>`<div class="cell"><span class="k">${l}</span><span class="disp code">${c}</span><span class="nm">${n}</span>${cf?`<span class="nm"><b>${cf}</b></span>`:''}${alt?`<span class="nm">${alt}</span>`:''}</div>`;
  const myF=T16K[mt];
  setView('res',`<div class="res">
  <header class="field"><div class="w">
    <h1 class="disp" tabindex="-1">${T.titulo}</h1>
    ${S.doneAt?`<p class="k">${fill(RS.fecha,{fecha:fecha(S.doneAt)})}</p>`:''}
    <div class="cells">
      ${cell('MBTI',mt,TT.n,conf(mp),fill(RS.o,{tipo:mt2,p:pc(mp2)}))}
      ${cell('Eneagrama',wk,`${E.n.slice(3)}, ala ${R.wing}`,conf(pe),fill(RS.o,{tipo:e2,p:pc(pe2)}))}
      ${cell('Instintos',st,`Subtipo ${R.core} ${INSN[R.stack[0]].split(' ')[0]}`,conf(ps),fill(RS.o,{tipo:s2,p:pc(ps2)}))}
      ${cell('Tritipo',R.tri.map(x=>x.t).join(''),tk.slice(0,ti),'','')}
    </div>
    <div class="acts"><button class="btn w" data-act="copy">${RS.acciones.copiar}</button><button class="btn" data-act="review">${RS.acciones.revisar}</button><button class="btn" data-act="again">${RS.acciones.repetir}</button></div>
    <textarea id="copyta" rows="8" readonly hidden aria-label="${RS.acciones.copiar}"></textarea>
  </div></header>
  <section class="sec" aria-labelledby="hM"><h2 class="disp" id="hM">${fill(RS.titulos.mbti,{tipo:mt,nombre:TT.n.toLowerCase()})}</h2>
    <p>${TT.d}</p>
    <h3>Probabilidad por tipo</h3>${bars(R.PM.slice(0,5).map(([k,p],i)=>[k,p,i===0]))}
    <h3>Cómo decides</h3>${bars(JF.map(f=>[f,R.fs[f]/(R.ns.J||1),myF.includes(f)]))}
    <h3>Cómo percibes</h3>${bars(PF.map(f=>[f,R.fs[f]/(R.ns.P||1),myF.includes(f)]))}
    <h3>Tus funciones cognitivas</h3><ol>${TT.f.map((f,i)=>`<li><b>${FPOS[i]}: ${f}</b> · ${FN[f]}</li>`).join('')}</ol>
    <h3>Fortalezas</h3><ul>${TT.s.map(x=>`<li>${x}</li>`).join('')}</ul>
    <h3>Tus retos</h3><ul>${TT.c.map(x=>`<li>${x}</li>`).join('')}</ul></section>
  <section class="sec" aria-labelledby="hE"><h2 class="disp" id="hE">${fill(RS.titulos.enea,{tipo:wk,nombre:E.n.slice(3).toLowerCase()})}</h2>
    <p>${E.d}</p><p>Tu ala ${R.wing} le añade ${WING[wk]}.</p>
    <h3>Probabilidad por tipo</h3>${bars(R.PE.map(([k,p],i)=>[`${k} · ${E9[k].n.slice(3)}`,p,i===0]),'w')}
    <dl class="facts">${[['Deseo básico',E.de],['Miedo básico',E.mi],['Pasión',E.pa],['Virtud',E.vi],['Tu reto',E.re],['En crecimiento',`Hacia el ${E.g}: ${E.gt}`],['En estrés',`Hacia el ${E.s}: ${E.st}`]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl></section>
  <section class="sec" aria-labelledby="hI"><h2 class="disp" id="hI">${fill(RS.titulos.inst,{tipo:st})}</h2>
    <p>${STACK[st]}</p>
    <h3>Probabilidad por orden</h3>${bars(R.PI.map(([k,p],i)=>[k,p,i===0]))}
    <dl class="facts">${R.stack.map((n,i)=>`<div><dt>${['Dominante','Secundario','Punto ciego'][i]} · ${fill(RS.instDominante,{p:pc(R.dom[n])})}</dt><dd><b>${INS[n].n}.</b> ${[INS[n].d,SEC[n],BLIND[n]][i]}</dd></div>`).join('')}</dl>
    <h3>Tu subtipo es ${R.core} ${R.stack[0]}: ${sb[0].toLowerCase()}${sb[2]?' (contratipo)':''}</h3><p>${sb[1]}</p></section>
  <section class="sec" aria-labelledby="hT"><h2 class="disp" id="hT">${fill(RS.titulos.tri,{tipo:R.tri.map(x=>x.t).join('')})}</h2>
    <p><b>${tk.slice(0,ti)}:</b>${tk.slice(ti+1)}</p>
    <dl class="facts">${R.tri.map((x,i)=>`<div><dt>${['Núcleo','Segundo','Tercero'][i]} · ${CENTN[x.c]}</dt><dd><b>${x.t} · ${E9[x.t].n}.</b> ${ROLE[x.t]}</dd></div>`).join('')}</dl></section>
  <section class="foot" aria-labelledby="hC"><h2 class="h3" id="hC">${T.metodo.titulo}</h2>${T.metodo.parrafos.map(p=>`<p>${p}</p>`).join('')}</section>
  </div>`);
  focusTop($('#app h1'));
  say(`${T.titulo}: ${codes(R)}`);
}
const flash=(b,m)=>{const o=b.dataset.l||b.textContent;b.dataset.l=o;b.textContent=m;setTimeout(()=>{b.textContent=o},1800)};
async function copy(b){
  const R=compute(),t=[codes(R),S.doneAt?fill(T.resultados.fecha,{fecha:fecha(S.doneAt)}):'','',txt(R)].filter((x,i)=>x||i===2).join('\n');
  try{await navigator.clipboard.writeText(t);flash(b,T.resultados.acciones.copiado)}
  catch(e){const ta=$('#copyta');ta.hidden=false;ta.value=t;ta.focus();ta.select();flash(b,T.resultados.acciones.copiaManual)}
}

// ======= Eventos =======
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-close')){b.closest('dialog').close();return}
  if(b.classList.contains('op')){pick(+b.dataset.i);return}
  const a=b.dataset.act;
  if(a==='next')next();
  else if(a==='skip')skip();
  else if(a==='back')back();
  else if(a==='help')openHelp();
  else if(a==='cont')contTrans();
  else if(a==='endrev')endReview();
  else if(a==='start'){REV=false;S.view='quiz';const u=firstUn();S.i=u<0?S.seq.length-1:u;arrive()}
  else if(a==='metodo')openMetodo();
  else if(a==='wipe')confirmDlg(T.entrada.deCeroPregunta,T.entrada.deCeroSi,()=>{blank();save();showEntrada(true)});
  else if(a==='yes'){const f=CONFIRM;CONFIRM=null;OPENER=null;b.closest('dialog').close();if(f)f()}
  else if(a==='copy')copy(b);
  else if(a==='review')startReview();
  else if(a==='again')confirmDlg(T.entrada.deCeroPregunta,T.resultados.repetirSi,()=>{blank();save();showEntrada(true)});
});
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;
  if(document.querySelector('dialog[open]'))return;   // Esc y Tab los gestiona el diálogo
  if(VIEW!=='pregunta'&&VIEW!=='transicion')return;
  const t=e.target,typing=t&&(/^(TEXTAREA|SELECT)$/.test(t.tagName)||(t.tagName==='INPUT'&&!/checkbox|radio/.test(t.type))||t.isContentEditable);
  if(typing)return;
  const isBtn=t&&(t.tagName==='BUTTON'||t.tagName==='A'||t.tagName==='INPUT');
  if(e.key==='Enter'){
    if(VIEW==='transicion'){if(!isBtn){e.preventDefault();contTrans()}return}
    const op=t.closest&&t.closest('.op');
    if(op){e.preventDefault();if(!op.dataset.s)pick(+op.dataset.i);else next();return}   // Intro nunca desmarca
    if(!isBtn){e.preventDefault();next()}
    return;
  }
  if(!S.prefs.keys||e.repeat&&e.key!=='ArrowLeft')return;
  if(e.key==='ArrowLeft'){e.preventDefault();back();return}
  if(e.key==='?'){e.preventDefault();openHelp();return}
  if(VIEW==='pregunta'){
    const k=e.key.toLowerCase(),i='1234'.includes(k)&&k.length===1?+k-1:'abcd'.includes(k)&&k.length===1?'abcd'.indexOf(k):-1;
    if(i>=0){e.preventDefault();pick(i)}
  }
});

// ======= Arranque =======
function start(d){
  CAN_SAVE=probe();
  S.prefs={auto:true,keys:true};
  const x=d&&d.ans&&Array.isArray(d.seq)?d:load();
  if(x)adopt(x);else blank();
  if(S.view==='res'&&firstUn()>=0)S.view='quiz';
  window.claude?.hot?.snapshot?.(()=>S);
  if(S.view==='res')showRes();else showEntrada();
}
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});

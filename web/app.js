// app.js — Interfaz: entrada, preguntas, transiciones, resultado por partes, mapa completo, revisión, glosario y compartir.
// El cálculo vive en model.js (estado global S) y no se toca desde aquí salvo a través de su API.

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const KEY='mapa-personalidad-v2',HKEY='mapa-personalidad-historial';
const AUTO_MS=1200;
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const T=TEXTOS;
const NB=' ';
// Rellena los huecos {x}. «30 %» siempre con un espacio que no se parte.
const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>k in o?o[k]:m).replace(/(\d) %/g,'$1'+NB+'%');
const pct=p=>pc(p)+NB+'%';
const lc=s=>s[0]+s.slice(1).toLowerCase();   // «El Leal» → «El leal»
const eName=t=>lc(E9[t].n);
const TIE=['TBF','TBEI','TBE','TBI'];
const PREF=['IB','WG',...TIE];   // bloques con «Ninguna encaja»
const PARTS=['mbti','enea','inst'];

// ======= Iconos y emblemas =======
const svg=(cls,body)=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
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
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  arrow:'<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'
};
const aviso=html=>`<div class="aviso">${svg('',ICO.warn)}<span>${html}</span></div>`;

// ======= Glosario =======
// [[texto|Término]] o [[Término]] marcan un término de GLOSARIO: se pinta como botón que abre su definición.
const G=(term,label)=>GLOSARIO[term]?`<button type="button" class="term" data-term="${term}" aria-haspopup="dialog" aria-expanded="false">${label||term}</button>`:(label||term);
const marks=(s,plain)=>s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(m,a,b)=>plain?a:G(b||a,a));

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
    for(let j=0;j<lim;j++){const k=transKey(j),q=partKey(j);if(k)S.seen[k]=1;if(q)S.seen[q]=1}
  }
}
const blank=()=>{adopt(fresh(),S&&S.prefs);S.seen={}};
function saveHist(){   // al repetir: el resultado anterior pasa al historial
  try{
    const R=compute(),h=JSON.parse(localStorage.getItem(HKEY)||'[]');
    h.push({fecha:S.doneAt||new Date().toISOString(),mbti:R.mbti,enea:`${R.core}w${R.wing}`,inst:R.stack.slice(0,2).join('/'),tri:R.tri.map(x=>x.t).join('')});
    localStorage.setItem(HKEY,JSON.stringify(h.slice(-20)));
  }catch(e){}
}

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

// ======= Transiciones y resultados parciales =======
function prevReal(j){let k=j-1;while(k>=0&&!real(S.seq[k]))k--;return k>=0?item(S.seq[k]):null}
// Qué pantalla de paso toca antes de la pregunta j: el comienzo de cada parte, los bloques C e IB,
// el primer desempate de cada parte y el ala. Devuelve su clave en S.seen o null.
function transKey(j){
  const id=S.seq[j];if(!id||!real(id))return null;
  const it=item(id),pv=prevReal(j);
  if(!pv||pv.part!==it.part)return it.part;
  if(it.blk===pv.blk)return null;
  if(it.blk==='C'||it.blk==='IB')return it.blk;
  if(TIE.includes(it.blk)&&!TIE.includes(pv.blk))return 'tb_'+it.part;
  if(it.blk==='WG')return 'WG';
  return null;
}
// Resultado al terminar una parte: al pasar del MBTI al eneagrama y del eneagrama a los instintos.
function partKey(j){
  const id=S.seq[j];if(!id||!real(id))return null;
  const pv=prevReal(j);
  return pv&&pv.part!==item(id).part&&pv.part!=='inst'?'p_'+pv.part:null;
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
function setView(v,html){VIEW=v;cancelAuto();closeBub(false);app.innerHTML=html;app.dataset.view=v}

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
  const P=T.pregunta,p=it.part,ids=partIds(p),n=ids.indexOf(it.id)+1,m=partTotal(p);
  const segs=PARTS.map(q=>{const tot=partTotal(q),done=partIds(q).filter(id=>S.ans[id]!==undefined).length;return`<i style="flex:${tot}"><b style="width:${tot?(done/tot*100).toFixed(1):0}%"></b></i>`}).join('');
  return`<h1 class="sr">${T.titulo}</h1><div class="top"><div class="appbar">
    <button class="ib" data-act="back" aria-label="${REV?P.volverLista:P.atras}"${S.i>0||REV?'':' disabled'}>${svg('',ICO.back)}</button>
    <div class="where">${svg('em',EMB[p])}<b>${PARTN[p]}</b><span>${fill(REV?P.contadorRevision:P.contador,{n,m})}</span></div>
    <button class="ib" data-act="help" aria-label="${P.ayuda}" aria-haspopup="dialog">${svg('',ICO.help)}</button></div>
    <div class="prog" role="img" aria-label="${fill(P.progreso,{n:answeredN(),m:totalN()})}">${segs}</div>
    ${REV?'':`<p class="left">${leftText()}</p>`}</div>`;
}

// ----- Pregunta -----
function showQ(){
  const id=S.seq[S.i],it=item(id),a=S.ans[id],P=T.pregunta;
  WAS_NEW=a===undefined;AUTO_OK=!REV&&WAS_NEW;QSTART=performance.now();
  const av=avisoFor(it),skip=PREF.includes(it.blk)?P.saltarPreferencia:P.saltar,L=it.o.length;
  const keys=`Teclas: <kbd>A</kbd>–<kbd>${'ABCD'[L-1]}</kbd> o <kbd>1</kbd>–<kbd>${L}</kbd> elegir · <kbd>Intro</kbd> siguiente · <kbd>←</kbd> atrás · <kbd>?</kbd> ayuda`;
  const go=REV?`<button class="btn pri" data-act="tolist">${P.volverLista}</button>`:`<button class="btn pri" data-act="next">${P.siguiente} ${svg('ar',ICO.arrow)}</button>`;
  setView('pregunta',`<div class="qv">${topBar(it)}
    <div class="q">
      <div class="qc enter">
        ${CAN_SAVE?'':aviso(P.sinGuardar)}
        ${NOTE?aviso(NOTE):''}
        ${av?aviso(av):`<p class="ctx">${instr(it)}</p>`}
        <h2 class="stmt" id="qs" tabindex="-1">${it.q}</h2>
        <div class="opts" role="group" aria-labelledby="qs">${it.o.map((o,i)=>`<button class="op" data-i="${i}" aria-pressed="false"><span class="lt" aria-hidden="true">${'ABCD'[i]}</span><span class="ot">${o[0]}</span><span class="chip"></span></button>`).join('')}</div>
      </div>
      <div class="bar"><button class="btn ghost" data-act="skip" aria-pressed="false">${skip}</button>${go}</div>
      ${S.prefs.keys?`<p class="keys">${keys}</p>`:''}
    </div></div>`);
  NOTE='';
  paint();
  focusTop($('#qs'));
  say(fill(P.anuncio,{n:partIds(it.part).indexOf(id)+1,m:partTotal(it.part),texto:it.q}));
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
  if(REV){toList();return}
  const id=S.seq[S.i];if(S.ans[id]===undefined)return;
  cancelAuto();
  if(WAS_NEW)S.pace=S.pace.concat(Math.round((performance.now()-QSTART)/100)/10).slice(-10);
  // Tras contestar una pregunta nueva se va a la primera pendiente; tras cambiar una antigua, a la siguiente.
  const u=firstUn();
  if(WAS_NEW){if(u<0){finish();return}S.i=u}else S.i++;
  arrive();
}
function arrive(){
  settle();
  if(S.i>=S.seq.length){const u=firstUn();if(u<0){finish();return}S.i=u;settle();if(S.i>=S.seq.length){finish();return}}
  save();
  if(!REV){
    const pk=partKey(S.i);if(pk&&!S.seen[pk]){showPartial(pk.slice(2));return}
    const k=transKey(S.i);if(k&&!S.seen[k]){showTrans(k);return}
  }
  showQ();
}
function back(){
  if(REV){toList();return}
  if(S.i<=0)return;
  cancelAuto();S.i--;
  while(S.i>0&&!real(S.seq[S.i]))S.i--;
  save();showQ();
}
function skip(){if(VIEW!=='pregunta')return;S.ans[S.seq[S.i]]=[];save();paint();next()}
function finish(){
  REV=false;S.i=Math.max(0,S.seq.length-1);S.view='res';
  if(!S.doneAt)S.doneAt=new Date().toISOString();
  save();showRes();
}

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

// ----- Resultado al terminar una parte -----
let PKEY='';
function showPartial(p){
  PKEY='p_'+p;
  const R=compute(),X=T.parcial,mb=p==='mbti',P=mb?R.PM:R.PE,n=PARTS.indexOf(p)+1,k=mb?R.mbti:R.core;
  const code=mb?R.mbti:`${R.core}w${R.wing}`,name=mb?T16[R.mbti].n:`${eName(R.core)}, ala ${R.wing}`;
  const top=probOf(P,k),alt=P.find(x=>String(x[0])!==String(k)),conf=fill(X.confianza,{nivel:T.resultados.confianza[confidence(top)].toLowerCase(),p:pc(top)});
  const body=mb?letters(R)+`<p>${T16[R.mbti].d}</p>`:`<p>${E9[R.core].d}</p><p class="small">${X.luego}</p>`;
  setView('parcial',`<div class="pv">
    <h1 class="sr">${T.titulo}</h1>
    <header class="field part"><div class="w enter">
      <p class="k">${fill(X.hecho,{n})}</p>
      <h2 class="disp code xl" id="pvT" tabindex="-1"><span class="sr">${X.tipo[p]}: </span>${code}</h2>
      <p class="nm">${name}</p>
      <span class="cchip"><i aria-hidden="true"></i>${conf}</span>
      <p class="alt">${fill(X.segundo,{tipo:mb?alt[0]:'el '+alt[0],p:pc(alt[1])})}</p>
    </div></header>
    <div class="psec">${body}</div>
    <div class="bar col"><button class="btn pri full" data-act="pcont">${X.seguir[p]}</button><button class="btn ghost" data-act="pstop">${X.parar}</button><p class="small pmsg" id="pmsg" role="status"></p></div>
  </div>`);
  focusTop($('#pvT'));
  say(`${fill(X.hecho,{n})}. ${X.tipo[p]}: ${code}, ${name}. ${conf}.`);
}
function contPartial(){if(VIEW!=='parcial')return;S.seen[PKEY]=1;save();arrive()}
function stopPartial(){save();$('#pmsg').textContent=CAN_SAVE?T.parcial.parado:T.pregunta.sinGuardar}

// ----- Revisión: lista por partes y edición de una pregunta -----
let LIST_Y=0;
function showList(focusJ){
  REV=false;
  const X=T.revision,num={};let n=0;S.seq.forEach((id,j)=>{if(real(id))num[j]=++n});
  const parts=PARTS.map(p=>{
    const rows=S.seq.map((id,j)=>[id,j]).filter(([id])=>real(id)&&item(id).part===p).map(([id,j])=>{
      const it=item(id),a=S.ans[id],tag=S.gen[id]?X.generada[it.blk]:'';
      const ans=a===undefined?`<span class="ra none">${X.sin}</span>`
        :!a.length?`<span class="ra">${PREF.includes(it.blk)?T.pregunta.saltarPreferencia:T.pregunta.saltar}</span>`
        :`<span class="ra"><b>${'ABCD'[a[0]]}</b> · ${it.o[a[0]][0]}</span>${a.length>1?`<span class="ra2">${fill(X.tambien,{l:'ABCD'[a[1]]})}</span>`:''}`;
      return`<li><button class="row" data-act="edit" data-j="${j}"><span class="num">${num[j]}</span><span class="rb"><span class="rq">${it.q}</span>${ans}</span>${tag?`<span class="tag">${tag}</span>`:''}</button></li>`}).join('');
    return`<section aria-labelledby="rv-${p}"><h2 class="rvh" id="rv-${p}">${svg('em',EMB[p])}${PARTN[p]}</h2><ol class="rows">${rows}</ol></section>`}).join('');
  setView('lista',`<div class="lv"><header class="lh enter"><h1 class="disp" tabindex="-1">${X.titulo}</h1><p class="small">${X.ayuda}</p></header>${parts}
    <div class="bar"><span></span><button class="btn pri" data-act="endrev">${X.verResultados}</button></div></div>`);
  const b=focusJ!=null&&$(`.row[data-j="${focusJ}"]`);
  if(b){window.scrollTo(0,LIST_Y);const r=b.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)b.scrollIntoView({block:'center'});b.focus({preventScroll:true})}
  else focusTop($('#app h1'));
}
function edit(j){LIST_Y=scrollY;REV=true;S.i=j;showQ()}
function toList(){const j=S.i;cancelAuto();save();showList(j)}
// Al salir de la revisión se rehacen desempates y ala si los cambios lo piden (reconcile) y se llevan las preguntas nuevas.
function endReview(){
  REV=false;cancelAuto();
  const added=reconcile(),u=firstUn();
  if(u<0){finish();return}
  S.view='quiz';S.i=u;settle();
  if(S.i>=S.seq.length||firstUn()<0){finish();return}
  const k=transKey(S.i);if(k&&(k.startsWith('tb_')||k==='WG'))delete S.seen[k];
  NOTE=added.length?T.revision.nuevas:T.revision.pendientes;
  arrive();
}

// ======= Diálogos =======
let OPENER=null,CONFIRM=null;
function openDlg(id,html){
  cancelAuto();closeBub(false);OPENER=document.activeElement;
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
function openMetodo(){
  const M=T.metodo;
  openDlg('dlgMetodo',`<h2 class="disp" id="dlgMetodoT">${M.titulo}</h2>${M.parrafos.map(p=>`<p>${marks(p,true)}</p>`).join('')}
    <div class="acts"><button class="btn pri" data-close autofocus>${T.entrada.cerrar}</button></div>`);
}
document.addEventListener('change',e=>{
  const t=e.target;if(!t.matches||!t.matches('input[data-pref]'))return;
  S.prefs[t.dataset.pref]=t.checked;save();
  if(t.dataset.pref==='auto'&&!t.checked)cancelAuto();
  if(t.dataset.pref==='keys'&&VIEW==='pregunta'){const k=$('#app .keys');if(k)k.hidden=!t.checked}
});

// ======= Resultados =======
const TABS=[['mbti','mbti'],['enea','eneagrama'],['inst','instintos'],['tri','tritipo']];   // [clave, enlace]
const hashOf=k=>TABS.find(t=>t[0]===k)[1];
const tabOf=h=>{const t=TABS.find(t=>t[1]===String(h||'').replace('#',''));return t?t[0]:null};
let TAB='mbti';
const fecha=iso=>new Date(iso).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
const codes=R=>`${R.mbti} · ${R.core}w${R.wing} · ${R.stack.slice(0,2).join('/')} · ${R.tri.map(x=>x.t).join('')}`;
const probOf=(P,k)=>{const r=P.find(x=>String(x[0])===String(k));return r?r[1]:0};
const bars=(rows,cls)=>`<ul class="pbs${cls?' '+cls:''}">${rows.map(([k,v,on])=>`<li class="pb${on?' on':''}"><span class="k">${k}</span><span class="t" aria-hidden="true"><i style="width:${Math.max(1,pc(v))}%"></i></span><span class="v">${pct(v)}</span></li>`).join('')}</ul>`;
const cchip=p=>`<span class="cchip"><i aria-hidden="true"></i>${T.resultados.confianza[confidence(p)]} · ${pct(p)}</span>`;
const pickChip=()=>`<span class="cchip">${svg('ck',ICO.check)}${T.resultados.elegidoPorTi}</span>`;

// Una elección propia solo vale mientras haya empate y el tipo elegido sea uno de los dos primeros del test.
function cleanChoice(R0){
  const c=Object.assign({},S.choice),ok=(P,v)=>unsure(P)&&P.slice(0,2).some(x=>String(x[0])===String(v));
  if(c.mbti!=null&&!ok(R0.PM,c.mbti))delete c.mbti;
  if(c.enea!=null&&!ok(R0.PE,c.enea))delete c.enea;
  if(c.inst!=null&&!ok(R0.PI,c.inst))delete c.inst;
  S.choice=c;
}
function showRes(o={}){
  REV=false;S.view='res';
  const R0=compute({});cleanChoice(R0);
  const R=compute(),RS=T.resultados;
  save();
  if(!o.keep)TAB=tabOf(location.hash)||TAB;
  setView('res',`<div class="res">
    ${posterHTML(R,R0)}
    <div class="tabs" role="tablist" aria-label="${RS.pestanasNombre}">${TABS.map(([k,h])=>`<button type="button" role="tab" id="tab-${k}" data-tab="${k}" aria-controls="${h}" aria-selected="false" tabindex="-1">${RS.pestanas[k]}</button>`).join('')}</div>
    ${panel('mbti',panelMbti(R,R0))}${panel('enea',panelEnea(R,R0))}${panel('inst',panelInst(R,R0))}${panel('tri',panelTri(R))}
    <section class="metodo" id="como-se-calcula" aria-labelledby="hMet"><h2 class="disp" id="hMet" tabindex="-1">${T.metodo.titulo}</h2>${T.metodo.parrafos.map(x=>`<p>${marks(x)}</p>`).join('')}</section>
    <footer class="rfoot"><button class="btn" data-act="again">${RS.acciones.repetir}</button></footer>
  </div>`);
  selectTab(TAB,{hash:false});
  if(!o.keep){focusTop($('#app h1'));say(`${T.titulo}: ${codes(R)}`)}
}
const panel=(k,html)=>`<section class="panel" role="tabpanel" id="${hashOf(k)}" aria-labelledby="tab-${k}" hidden>${html}</section>`;
function selectTab(k,o={}){
  TAB=k;
  TABS.forEach(([t,h])=>{const b=$('#tab-'+t),p=$('#'+h),on=t===k;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;p.hidden=!on});
  if(o.hash!==false)try{history.replaceState(null,'','#'+hashOf(k))}catch(e){}
  if(o.focus)$('#tab-'+k).focus();
  if(o.scroll){const y=$('#poster').offsetHeight;if(scrollY>y)window.scrollTo(0,y)}
}

// ----- Póster -----
function posterHTML(R,R0){
  const RS=T.resultados,A=RS.acciones,N=RS.pestanas;
  const cell=(sys,code,name,P,test)=>`<li class="cell"><span class="k">${N[sys]}</span><span class="disp code">${code}</span><span class="nm">${name}</span>${
    !P?'':R.chosen[sys]?`${pickChip()}<span class="alt">${fill(RS.elRestoDelTest,{tipo:test,p:pc(P[0][1])})}</span>`
      :`${cchip(P[0][1])}<span class="alt">${fill(RS.o,{tipo:P[1][0],p:pc(P[1][1])})}</span>`}</li>`;
  const tk=TRI[R.triKey];
  return`<header class="field poster" id="poster"><div class="w">
    <h1 class="disp" tabindex="-1">${T.titulo}</h1>
    ${S.doneAt?`<p class="date">${fill(RS.fecha,{fecha:fecha(S.doneAt)})}</p>`:''}
    <ul class="cells">
      ${cell('mbti',R.mbti,T16[R.mbti].n,R0.PM,R0.mbti)}
      ${cell('enea',`${R.core}w${R.wing}`,`${eName(R.core)}, ala ${R.wing}`,R0.PE,`${R0.core}w${R0.wing}`)}
      ${cell('inst',R.stack.slice(0,2).join('/'),`Subtipo ${R.core} ${INSN[R.stack[0]].split(' ')[0]}`,R0.PI,R0.stack.slice(0,2).join('/'))}
      ${cell('tri',R.tri.map(x=>x.t).join(''),tk.slice(0,tk.indexOf(':')),null)}
    </ul>
    <div class="acts"><button class="btn w" data-act="share">${A.compartir}</button><button class="btn" data-act="copy">${A.copiar}</button><button class="btn" data-act="review">${A.revisar}</button></div>
    <a class="howlink" href="#como-se-calcula" data-act="how">${A.comoSeCalcula}</a>
    <textarea id="copyta" rows="8" readonly hidden aria-label="${A.copiar}"></textarea>
  </div></header>`;
}

// ----- Cabecera de cada panel: conclusión, subtítulo y confianza -----
function head(sys,title,sub,P,test){
  const RS=T.resultados,mine=S.choice[sys]!=null&&String(S.choice[sys])!==String(P&&P[0][0]);
  const conf=!P?'':mine?`<p class="confl">${pickChip()} ${fill(RS.elRestoDelTest,{tipo:test,p:pc(P[0][1])})}</p>`
    :`<p class="confl">${cchip(P[0][1])} <span>${RS.confianzaAyuda[confidence(P[0][1])]}</span></p>`;
  return`<div class="ph"><h2 class="disp">${title}</h2>${sub?`<p class="sub">${sub}</p>`:''}${conf}</div>`;
}

// ----- Letras del MBTI -----
function letters(R){
  const RS=T.resultados,LP=letterProbs(R.PM),t=R.mbti,ps=t.split('').map((L,i)=>LP[i][L]||0),notes=[];
  const other=(i,L)=>Object.keys(LP[i]).find(k=>k!==L);
  t.split('').forEach((L,i)=>{if(ps[i]<=.5){const o=other(i,L);notes.push(fill(RS.letraDudosa,{otra:o,p:pc(LP[i][o])}))}});
  if(ps.every(p=>p>.7)&&probOf(R.PM,t)<=.7){const i=ps.indexOf(Math.min(...ps));notes.push(fill(RS.letrasClarasEntre,{a:t[i],b:other(i,t[i])}))}
  return`<h3>${RS.letras}</h3><ul class="lets">${t.split('').map((L,i)=>`<li class="let${ps[i]<=.5?' dud':''}"><b class="disp" aria-hidden="true">${L}</b><span class="sr">${AXN[L]}: </span><span class="mini" aria-hidden="true"><i style="width:${pc(ps[i])}%"></i></span><small>${pct(ps[i])}</small></li>`).join('')}</ul>${notes.map(x=>`<p class="small">${x}</p>`).join('')}`;
}

// ----- Panel MBTI -----
function panelMbti(R,R0){
  const RS=T.resultados,H=RS.h3,t=R.mbti,TT=T16[t],[d,a]=T16K[t],tm=t[1]==='N'?'N'+t[2]:'S'+t[3],P=R0.PM;
  const fb=fs=>bars(fs.map(f=>[G(f),R.fs[f]/((JF.includes(f)?R.ns.J:R.ns.P)||1),T16K[t].includes(f)]),'fx');
  return head('mbti',fill(S.choice.mbti!=null?RS.titulos.mbtiElegido:RS.titulos.mbti,{tipo:t,nombre:TT.n.toLowerCase()}),
      `${G('Temperamento')} ${TEMP[tm]} (${tm}) · ${G(d)} dominante y ${G(a)} auxiliar`,P,P[0][0])
    +(unsure(P)?tieView('mbti',P):'')
    +`<div class="pg"><div class="fcol">${letters(R)}
        <h3>${H.tipos}</h3>${bars(P.slice(0,5).map(([k,p])=>[k,p,k===t]))}
        <h3>${H.decides}</h3>${fb(JF)}<h3>${H.percibes}</h3>${fb(PF)}
        <p class="small">${fill(RS.funcionesUso,{p:pc(R.eShare)})}</p></div>
      <div class="tcol"><h3>${H.funciones}</h3><p class="small">${marks(RS.funcionesAyuda)}</p>
        <ol class="fns">${TT.f.map((f,i)=>`<li><span class="fp">${G(FPOS[i])}</span><b>${G(f)}</b><span>${FN[f]}</span></li>`).join('')}</ol>
        <h3>${H.tipo}</h3><p>${TT.d}</p>
        <h3>${H.fortalezas}</h3><ul>${TT.s.map(x=>`<li>${x}</li>`).join('')}</ul>
        <h3>${H.retos}</h3><ul>${TT.c.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
}

// ----- Panel Eneagrama -----
function panelEnea(R,R0){
  const RS=T.resultados,H=RS.h3,D=RS.datos,c=R.core,E=E9[c],wk=c+'w'+R.wing,P=R0.PE,cen=Object.keys(CENT).find(k=>CENT[k].includes(c));
  const gp=DIML.map((ls,d)=>{const tot=ls.reduce((s,l)=>s+(R.gp[d][l]||0),0)||1,mine=EGRP[c][d];
    return`<li><span class="gk">${DIMN[d]}</span>${bars(ls.map(l=>[GRN[l],(R.gp[d][l]||0)/tot,l===mine]),'m3')}</li>`}).join('');
  const facts=[[D.deseo,E.de],[D.miedo,E.mi],[D.pasion,E.pa],[D.virtud,E.vi],[D.reto,E.re],[marks(D.centro),`${E.c} (${CENTN[cen].toLowerCase()})`],
    [marks(D.crecimiento),fill(D.hacia,{t:E.g,texto:E.gt})],[marks(D.estres),fill(D.hacia,{t:E.s,texto:E.st})]];
  return head('enea',fill(S.choice.enea!=null?RS.titulos.eneaElegido:RS.titulos.enea,{tipo:wk,nombre:eName(c).toLowerCase()}),
      `${G('Eneatipo')} ${c} con ${G('Ala','ala')} ${R.wing} · ${G('Centro','centro')} ${CENTN[cen].toLowerCase()}`,P,`${R0.core}w${R0.wing}`)
    +(unsure(P)?tieView('enea',P):'')
    +`<div class="pg"><div class="fcol">${star(R,P)}<h3>${H.eneatipos}</h3>${bars(P.map(([k,p])=>[`${k} · ${E9[k].n.slice(3)}`,p,+k===c]),'w')}</div>
      <div class="tcol"><p>${E.d}</p><p>${marks(fill(RS.ala,{w:R.wing,texto:WING[wk]}))}</p>
        <h3>${H.grupos}</h3><p class="small">${RS.gruposAyuda}</p><ul class="grps">${gp}</ul>
        <dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div></div>`;
}

// ----- Panel Instintos -----
function panelInst(R,R0){
  const RS=T.resultados,H=RS.h3,st=R.stack.slice(0,2).join('/'),P=R0.PI,c=R.core,n=R.stack[0],sb=SUB[c][n];
  const cards=R.stack.map((x,i)=>`<li class="card"><p class="kk">${marks(RS.instCartas[i])} · ${G(x)}</p><p class="cn">${INS[x].n}</p><p>${[INS[x].d,SEC[x],BLIND[x]][i]}</p><p class="meta">${fill(RS.instDominante,{p:pc(R.dom[x])})}</p></li>`).join('');
  const sub=`<div class="card pk"><p class="kk">${marks(RS.subtipo)}${sb[2]?` <span class="tag ink">${marks(RS.contratipo)}</span>`:''}</p>
    <p class="cn">${fill(RS.subtipoTitulo,{tipo:`${c} ${INSN[n].split(' ')[0]}`,nombre:sb[0].toLowerCase()})}</p><p>${sb[1]}</p>
    ${sb[2]?`<p class="small">${RS.contratipoNota}</p>`:''}<p class="small">${RS.naranjo}</p></div>`;
  return head('inst',fill(S.choice.inst!=null?RS.titulos.instElegido:RS.titulos.inst,{tipo:st}),
      `${G('Orden de instintos')}: ${R.stack.map((x,i)=>`${i+1}.º ${G(x)}`).join(' · ')}`,P,R0.stack.slice(0,2).join('/'))
    +(unsure(P)?tieView('inst',P):'')
    +`<div class="pg"><div class="fcol">${circles(R)}<h3>${H.ordenes}</h3>${bars(P.map(([k,p])=>[k,p,k===st]))}</div>
      <div class="tcol"><p>${STACK[st]}</p><ul class="cards">${cards}</ul>${sub}</div></div>`;
}

// ----- Panel Tritipo -----
function panelTri(R){
  const RS=T.resultados,code=R.tri.map(x=>x.t).join(''),tk=TRI[R.triKey],ti=tk.indexOf(':');
  const cards=R.tri.map((x,i)=>`<li class="card${i===0?' pk':''}"><p class="kk">${RS.triCartas[i]} · ${CENTN[x.c]}</p><p class="cn">${x.t} · ${eName(x.t)}</p><p>${ROLE[x.t]}</p><p class="meta">${i===0?RS.tuEneatipo:fill(RS.elegidoPct,{p:pc(x.share)})}</p></li>`).join('');
  return head('tri',fill(RS.titulos.tri,{tipo:code}),`<b>${tk.slice(0,ti)}:</b>${tk.slice(ti+1)}`,null)
    +`<div class="pg"><div class="fcol">${triFig(R)}</div><div class="tcol"><ul class="cards">${cards}</ul><p class="small">${marks(RS.triExplica)}</p></div></div>`;
}

// ----- Vista de empate -----
function tieView(sys,P){
  const E=T.resultados.empate,F=E.filas,D=T.resultados.datos,ch=S.choice[sys],cands=P.slice(0,2);
  const rows=k=>{
    if(sys==='mbti'){const[d,a]=T16K[k];return[[fill(F.dominante,{f:d}),FN[d]],[fill(F.auxiliar,{f:a}),FN[a]],[F.como,T16[k].d]]}
    if(sys==='enea'){const e=E9[k];return[[D.deseo,e.de],[D.miedo,e.mi],[D.pasion,e.pa]]}
    const s2=k.split('/')[1],b=['sp','so','sx'].find(x=>!k.includes(x));
    return[[fill(F.segundo,{x:INSN[s2].split(' ')[0]}),SEC[s2]],[fill(F.ciego,{x:E.ciego[b]}),BLIND[b]]];
  };
  const d0=String(cands[0][0]).slice(0,2),extra=sys==='inst'&&d0===String(cands[1][0]).slice(0,2)?fill(E.mismoDominante,{ins:INSN[d0].split(' ')[0]})+' ':'';
  const same=v=>ch!=null&&String(ch)===String(v);
  return`<div class="tie"><header><h3 class="tt" id="tie-${sys}" tabindex="-1">${E.titulo[sys]}</h3><p class="small">${extra}${E.texto}</p></header>
    <div class="tcols">${cands.map(([k,p],i)=>`<div class="tcand">
      ${i===0?`<span class="mark">${E.masProbable}</span>`:'<span class="mark ph" aria-hidden="true">·</span>'}
      <b class="disp tcode">${k}</b><span class="pp">${pct(p)}</span>
      ${rows(k).map(([l,v])=>`<p class="rw"><small>${l}</small>${v}</p>`).join('')}
      ${same(k)?`<span class="mark pick">${svg('ck',ICO.check)}${E.elegido}</span>`:`<button type="button" class="btn sm" data-act="choose" data-sys="${sys}" data-v="${k}">${E.elegir}<span class="sr"> (${k})</span></button>`}
    </div>`).join('')}</div>
    <div class="tfoot"><p class="small">${E.nota}</p>${ch!=null?`<button type="button" class="btn sm" data-act="unchoose" data-sys="${sys}">${T.resultados.deshacer}</button>`:''}</div></div>`;
}
function rerender(after){const y=scrollY;showRes({keep:true});window.scrollTo(0,y);if(after)after()}
function choose(sys,v){
  S.choice=Object.assign({},S.choice,{[sys]:sys==='enea'?+v:v});save();
  rerender(()=>{const b=$(`#${hashOf(sys)} [data-act=unchoose]`);if(b)b.focus({preventScroll:true})});
  say(fill(T.resultados.anuncioElegido,{tipo:v}));
}
function unchoose(sys){
  delete S.choice[sys];save();
  const R0=compute({});
  rerender(()=>{const h=$('#tie-'+sys);if(h)h.focus({preventScroll:true})});
  say(fill(T.resultados.anuncioDeshecho,{tipo:sys==='mbti'?R0.mbti:sys==='enea'?`${R0.core}w${R0.wing}`:R0.stack.slice(0,2).join('/')}));
}

// ----- Figuras (SVG con viewBox fijo: se escalan solas) -----
const EDGES=[[3,6],[6,9],[9,3],[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]];
const at=(t,r)=>{const a=(t*40-90)*Math.PI/180;return[160+r*Math.cos(a),160+r*Math.sin(a)]};
const ring=Rr=>`<circle cx="160" cy="160" r="${Rr}" class="ring"/>`+EDGES.map(([a,b])=>{const[x1,y1]=at(a,Rr),[x2,y2]=at(b,Rr);return`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="edge"/>`}).join('');
const sample=dash=>`<svg class="sv lg" viewBox="0 0 28 10" aria-hidden="true" focusable="false"><line x1="1" y1="5" x2="27" y2="5" class="arr${dash?' st':''}"/></svg>`;
// Estrella: el área de cada punto es proporcional a su probabilidad; tu eneatipo en rosa y el ala con borde grueso.
function star(R,P){
  const Rr=112,c=R.core,E=E9[c],pr={};P.forEach(([k,p])=>{pr[+k]=p});
  const pm=P[0][1]||1,rad=t=>Math.max(5,24*Math.sqrt(pr[t]/pm));
  const arrow=(b,dash)=>{const[x1,y1]=at(c,Rr),[x2,y2]=at(b,Rr),dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy),s=rad(c)+4,e=rad(b)+5;
    return`<line x1="${f1(x1+dx/d*s)}" y1="${f1(y1+dy/d*s)}" x2="${f1(x2-dx/d*e)}" y2="${f1(y2-dy/d*e)}" class="arr${dash?' st':''}" marker-end="url(#mk-ah)"/>`};
  let h=`<defs><marker id="mk-ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>`
    +ring(Rr)+arrow(E.g,false)+arrow(E.s,true);
  for(let t=1;t<=9;t++){const[x,y]=at(t,Rr),[lx,ly]=at(t,Rr+38);
    h+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad(t))}" class="pt${t===c?' core':t===R.wing?' wing':''}"/><text x="${f1(lx)}" y="${f1(ly)}" text-anchor="middle" dominant-baseline="central"${t===c||t===R.wing?' class="hi"':''}>${t}</text>`}
  const L=T.resultados.leyenda,lab=`Eneagrama: ${P.map(([k,p])=>`${k}, ${pct(p)}`).join('; ')}. Tu eneatipo es el ${c}, con ala ${R.wing}; en crecimiento va hacia el ${E.g} y en estrés, hacia el ${E.s}.`;
  return`<figure class="fig"><svg class="sv" viewBox="0 0 320 320" role="img" aria-label="${lab}">${h}</svg>
    <figcaption class="legend"><span>${sample(false)}<span>${marks(fill(L.crecimiento,{t:E.g}))}</span></span><span>${sample(true)}<span>${marks(fill(L.estres,{t:E.s}))}</span></span></figcaption></figure>`;
}
// Instintos según el orden final: dominante grande y rosa, segundo mediano, punto ciego pequeño y discontinuo.
function circles(R){
  const st=R.stack,r=[78,54,36],x=[80,200,280],fs=[30,22,16],dy=[24,20,16],cls=['c1','c2','c3'];
  let h=[2,1,0].map(i=>`<circle cx="${x[i]}" cy="100" r="${r[i]}" class="${cls[i]}"/>`).join('');
  st.forEach((n,i)=>{h+=`<text x="${x[i]}" y="102" text-anchor="middle" class="ct${i?'':' on'}" style="font-size:${fs[i]}px">${n}</text><text x="${x[i]}" y="${102+dy[i]}" text-anchor="middle" class="cr${i?'':' on'}">${i+1}.º</text>`});
  const lab=`Tus instintos, de mayor a menor: 1.º ${st[0]} (${INSN[st[0]]}), 2.º ${st[1]} (${INSN[st[1]]}) y 3.º ${st[2]} (${INSN[st[2]]}), tu punto ciego.`;
  return`<figure class="fig"><svg class="sv" viewBox="0 0 320 200" role="img" aria-label="${lab}">${h}</svg><figcaption class="small">${marks(T.resultados.instFigura)}</figcaption></figure>`;
}
// Tritipo: triángulo rosa claro con borde de tinta; tu eneatipo en rosa, los otros dos con borde grueso y el resto en gris.
function triFig(R){
  const Rr=112,ts=R.tri.map(x=>x.t),c=R.core;
  let h=ring(Rr)+`<polygon points="${ts.map(t=>at(t,Rr).map(f1).join(',')).join(' ')}" class="tri"/>`;
  for(let t=1;t<=9;t++){const on=ts.includes(t),[x,y]=at(t,Rr),[lx,ly]=at(t,Rr+30);
    h+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${t===c?13:on?10:4.5}" class="pt${t===c?' core':on?' mid':''}"/><text x="${f1(lx)}" y="${f1(ly)}" text-anchor="middle" dominant-baseline="central"${on?' class="hi"':''}>${t}</text>`}
  const lab=`Tritipo ${ts.join('')}: ${R.tri.map((x,i)=>`${T.resultados.triCartas[i].toLowerCase()}, ${x.t} (${CENTN[x.c].toLowerCase()})`).join('; ')}.`;
  return`<figure class="fig"><svg class="sv" viewBox="0 0 320 320" role="img" aria-label="${lab}">${h}</svg></figure>`;
}

// ----- Copiar y compartir -----
const flash=(b,m)=>{const o=b.dataset.l||b.textContent;b.dataset.l=o;b.textContent=m;setTimeout(()=>{b.textContent=o},1800)};
async function copy(b){
  const R=compute(),t=[codes(R),S.doneAt?fill(T.resultados.fecha,{fecha:fecha(S.doneAt)}).replace(/ /g,' '):'','',txt(R)].filter((x,i)=>x||i===2).join('\n');
  try{await navigator.clipboard.writeText(t);flash(b,T.resultados.acciones.copiado)}
  catch(e){const ta=$('#copyta');ta.hidden=false;ta.value=t;ta.focus();ta.select();flash(b,T.resultados.acciones.copiaManual)}
}
// Imagen de 1080×1350 con el póster. Se comparte si el navegador puede; si no, se descarga.
async function share(b){
  const C=T.compartir;b.disabled=true;
  try{
    const blob=await posterPNG(),file=new File([blob],C.archivo,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:T.titulo})}catch(e){if(e.name!=='AbortError'){download(blob);flash(b,C.descargada)}}
    }else{download(blob);flash(b,C.descargada)}
  }catch(e){flash(b,C.error)}
  finally{b.disabled=false}
}
function download(blob){
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=T.compartir.archivo;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
async function posterPNG(){
  try{await document.fonts.load('850 120px Archivo');await document.fonts.load('500 34px Archivo')}catch(e){}
  const R=compute(),R0=compute({}),RS=T.resultados,W=1080,H=1350,M=80,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const x=cv.getContext('2d'),INK='#1b1f3b',PINK='#f23d9f',FF='Archivo, system-ui, sans-serif';
  const font=(w,s,wide)=>{x.font=`${w} ${s}px ${FF}`;if('fontStretch' in x)x.fontStretch=wide?'expanded':'normal'};
  const wrap=(t,mw)=>{const out=[];let l='';for(const w of t.split(' ')){const s=l?l+' '+w:w;if(l&&x.measureText(s).width>mw){out.push(l);l=w}else l=s}if(l)out.push(l);return out};
  const rr=(px,py,w,h,r)=>{x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath()};
  x.fillStyle='#0067a8';x.fillRect(0,0,W,H);x.textBaseline='alphabetic';
  // Título y fecha
  x.fillStyle='#fff';font(850,84,true);let y=M+70;
  for(const l of wrap(T.titulo,W-2*M)){x.fillText(l,M,y);y+=88}
  font(500,34,false);if(S.doneAt){x.fillText(fill(RS.fecha,{fecha:fecha(S.doneAt)}).replace(/ /g,' '),M,y+4);y+=34}
  y+=34;x.fillStyle='rgba(255,255,255,.55)';x.fillRect(M,y,W-2*M,3);y+=56;
  // Cuatro celdas en dos filas
  const cw=(W-2*M-60)/2,tk=TRI[R.triKey];
  const cells=[
    ['mbti',R.mbti,T16[R.mbti].n,R0.PM],
    ['enea',`${R.core}w${R.wing}`,`${eName(R.core)}, ala ${R.wing}`,R0.PE],
    ['inst',R.stack.slice(0,2).join('/'),`Subtipo ${R.core} ${INSN[R.stack[0]].split(' ')[0]}`,R0.PI],
    ['tri',R.tri.map(t=>t.t).join(''),tk.slice(0,tk.indexOf(':')),null]];
  const rowH=[0,0];
  cells.forEach(([sys,code,name,P],i)=>{
    const cx=M+(i%2)*(cw+60);let cy=y+(i>1?rowH[0]+56:0);const y0=cy;
    x.fillStyle='#fff';font(500,32,false);cy+=32;x.fillText(RS.pestanas[sys],cx,cy);
    let s=140;font(850,s,true);while(x.measureText(code).width>cw-8&&s>56){s-=4;font(850,s,true)}
    cy+=s*.95;x.fillStyle=PINK;x.fillText(code,cx+s*.05,cy+s*.045);x.fillStyle='#fff';x.fillText(code,cx,cy);
    font(500,34,false);cy+=20;for(const l of wrap(name,cw).slice(0,2)){cy+=42;x.fillText(l,cx,cy)}
    if(P){
      const lab=R.chosen[sys]?RS.elegidoPorTi:`${RS.confianza[confidence(P[0][1])]} · ${pc(P[0][1])} %`;
      font(700,30,false);const tw=x.measureText(lab).width,ch=54;cy+=26;
      x.fillStyle='#fff';rr(cx,cy,tw+70,ch,ch/2);x.fill();
      x.fillStyle=PINK;x.beginPath();x.arc(cx+28,cy+ch/2,9,0,Math.PI*2);x.fill();
      x.fillStyle=INK;x.fillText(lab,cx+48,cy+ch/2+11);cy+=ch;
    }
    rowH[i>1?1:0]=Math.max(rowH[i>1?1:0],cy-y0);
  });
  // Pie
  x.fillStyle='rgba(255,255,255,.55)';x.fillRect(M,H-M-64,W-2*M,3);
  x.fillStyle='#fff';font(700,32,true);x.fillText(T.compartir.pie,M,H-M);
  return new Promise((ok,ko)=>cv.toBlob(b=>b?ok(b):ko(new Error('toBlob')),'image/png'));
}

// ======= Burbuja del glosario =======
let BUB_OPENER=null;
function openTerm(btn){
  const b=$('#bub');
  if(!b.hidden&&BUB_OPENER===btn){closeBub(true);return}
  closeBub(false);
  BUB_OPENER=btn;btn.setAttribute('aria-expanded','true');
  const term=btn.dataset.term;
  $('#bubT').textContent=term;$('#bubD').textContent=GLOSARIO[term];
  const sheet=matchMedia('(max-width: 599px)').matches;
  b.classList.toggle('sheet',sheet);b.hidden=false;
  if(sheet){b.style.left=b.style.top=b.style.width=''}
  else{
    const r=btn.getBoundingClientRect(),w=Math.min(340,innerWidth-32);b.style.width=w+'px';
    const left=Math.min(Math.max(16,r.left-16),innerWidth-w-16);
    let top=r.bottom+8;if(top+b.offsetHeight>innerHeight-8&&r.top-8-b.offsetHeight>8)top=r.top-8-b.offsetHeight;
    b.style.left=(left+scrollX)+'px';b.style.top=(top+scrollY)+'px';
  }
  b.focus({preventScroll:true});
}
function closeBub(restore){
  const b=$('#bub');if(!b||b.hidden)return;
  b.hidden=true;const o=BUB_OPENER;BUB_OPENER=null;
  if(o){o.setAttribute('aria-expanded','false');if(restore&&document.contains(o))o.focus({preventScroll:true})}
}
document.addEventListener('pointerdown',e=>{const b=$('#bub');if(!b.hidden&&!b.contains(e.target)&&!e.target.closest('.term'))closeBub(false)});
$('#bub').addEventListener('focusout',e=>{const b=$('#bub');if(!b.hidden&&e.relatedTarget&&!b.contains(e.relatedTarget)&&e.relatedTarget!==BUB_OPENER)closeBub(false)});

// ======= Eventos =======
document.addEventListener('click',e=>{
  const ln=e.target.closest('a[data-act]');
  if(ln){e.preventDefault();if(ln.dataset.act==='how'){const h=$('#hMet');h.scrollIntoView({block:'start',behavior:RM.matches?'auto':'smooth'});h.focus({preventScroll:true})}return}
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.classList.contains('term')){openTerm(b);return}
  if(b.hasAttribute('data-close')){b.closest('dialog').close();return}
  if(b.classList.contains('op')){pick(+b.dataset.i);return}
  if(b.dataset.tab){selectTab(b.dataset.tab,{scroll:true});return}
  const a=b.dataset.act;
  if(a==='next')next();
  else if(a==='skip')skip();
  else if(a==='back')back();
  else if(a==='help')openHelp();
  else if(a==='cont')contTrans();
  else if(a==='pcont')contPartial();
  else if(a==='pstop')stopPartial();
  else if(a==='tolist')toList();
  else if(a==='edit')edit(+b.dataset.j);
  else if(a==='endrev')endReview();
  else if(a==='start'){REV=false;S.view='quiz';const u=firstUn();S.i=u<0?S.seq.length-1:u;arrive()}
  else if(a==='metodo')openMetodo();
  else if(a==='wipe')confirmDlg(T.entrada.deCeroPregunta,T.entrada.deCeroSi,()=>{blank();save();showEntrada(true)});
  else if(a==='yes'){const f=CONFIRM;CONFIRM=null;OPENER=null;b.closest('dialog').close();if(f)f()}
  else if(a==='copy')copy(b);
  else if(a==='share')share(b);
  else if(a==='review')showList();
  else if(a==='choose')choose(b.dataset.sys,b.dataset.v);
  else if(a==='unchoose')unchoose(b.dataset.sys);
  else if(a==='bubclose')closeBub(true);
  else if(a==='again')confirmDlg(T.resultados.repetirPregunta,T.resultados.repetirSi,()=>{
    if(firstUn()<0)saveHist();
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
    blank();save();showEntrada(true)});
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('#bub').hidden){e.preventDefault();closeBub(true);return}
  if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;
  if(document.querySelector('dialog[open]'))return;   // Esc y Tab los gestiona el diálogo
  const t=e.target;
  if(t&&t.getAttribute&&t.getAttribute('role')==='tab'){   // pestañas: flechas, Inicio y Fin
    const i=TABS.findIndex(x=>x[0]===t.dataset.tab),j={ArrowRight:(i+1)%4,ArrowLeft:(i+3)%4,Home:0,End:3}[e.key];
    if(j!==undefined){e.preventDefault();selectTab(TABS[j][0],{focus:true,scroll:true})}
    return;
  }
  if(VIEW!=='pregunta'&&VIEW!=='transicion')return;
  const typing=t&&(/^(TEXTAREA|SELECT)$/.test(t.tagName)||(t.tagName==='INPUT'&&!/checkbox|radio/.test(t.type))||t.isContentEditable);
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
    const k=e.key.toLowerCase(),i=k.length!==1?-1:'1234'.includes(k)?+k-1:'abcd'.indexOf(k);
    if(i>=0){e.preventDefault();pick(i)}
  }
});
window.addEventListener('hashchange',()=>{if(VIEW!=='res')return;const k=tabOf(location.hash);if(k&&k!==TAB)selectTab(k,{hash:false,scroll:true})});

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

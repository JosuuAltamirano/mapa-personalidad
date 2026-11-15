// model.js — Cálculo de resultados y preguntas adaptativas. Sin DOM.
// Trabaja sobre el estado global S: {ans, i, view, seq, gen}. Validado con simulaciones: no cambies probabilidades ni temperaturas.

// ======= Estado =======
const fresh=()=>({ans:{},i:0,view:'quiz',seq:BASE.slice(),gen:{}});
let S=fresh();
const item=id=>ITEMS[id]||S.gen[id];
const W=a=>!Array.isArray(a)||!a.length?[]:a.length===1?[[a[0],1]]:[[a[0],2/3],[a[1],1/3]];
const answered=part=>S.seq.filter(id=>id[0]!=='#'&&item(id)&&item(id).part===part&&S.ans[id]);
const firstUn=()=>S.seq.findIndex(id=>id[0]==='#'||S.ans[id]===undefined);
const post=(L,tau)=>{const v=Object.values(L),m=Math.max(...v),w=Object.entries(L).map(([k,x])=>[k,Math.exp(tau*(x-m))]),z=w.reduce((s,x)=>s+x[1],0);return w.map(([k,x])=>[k,x/z]).sort((a,b)=>b[1]-a[1])};
const unsure=P=>P[0][1]<.6||P[0][1]<2*P[1][1];

// ======= Modelos =======
function famP(T,f){const[d,a]=T16K[T],fam=JF.includes(f)?JF:PF,pref=fam.includes(d)?d:a,p=pref===d?.55:.45;return f===pref?p:f===twin(pref)?.2:(1-p-.2)/2}
function prefOf(T,f){const[d,a]=T16K[T];return(JF.includes(f)?JF:PF).includes(d)?d:a}
function mbtiLL(){
  const L={};
  for(const T in T16K){
    const d=T16K[T][0],isE=d[1]==='e',inf=inferior(d);let s=0;
    for(const id of answered('mbti')){const it=item(id);
      for(const[oi,w]of W(S.ans[id])){const k=it.o[oi][1];
        if(it.blk==='A'||it.blk==='B')s+=w*Math.log(famP(T,k));
        else if(it.blk==='C')s+=w*Math.log(k===inf?.4:.2)/3;
        else if(it.blk==='D'||it.blk==='TBEI')s+=w*Math.log((k==='E')===isE?.7:.3);
        else if(it.blk==='TBF'){const other=it.o[1-oi][1],pr=prefOf(T,k);s+=w*Math.log(k===pr?.7:other===pr?.3:.5)}}}
    L[T]=s}
  return L}
function eneaLL(){
  const L={};
  for(let T=1;T<=9;T++){
    const cT=Object.keys(CENT).find(c=>CENT[c].includes(T));let s=0;
    for(const id of answered('enea')){const it=item(id);
      for(const[oi,w]of W(S.ans[id])){const k=it.o[oi][1];
        if(it.blk==='EG')s+=w*Math.log(k===EGRP[T][it.d]?.6:.2);
        else if(it.blk==='E5')s+=w*Math.log(it.c===cT?(k===T?.6:.2):1/3);
        else{const other=it.o[1-oi][1];s+=w*Math.log(k===T?.7:other===T?.3:.5)}}}
    L[T]=s}
  return L}
function instLL(){
  const L={};
  for(const st of STK){
    const[d,s,b]=st,P={[d]:.55,[s]:.3,[b]:.15},Q={[b]:.55,[s]:.3,[d]:.15};let ll=0;
    for(const id of answered('inst')){const it=item(id);
      for(const[oi,w]of W(S.ans[id])){const k=it.o[oi][1];
        if(it.blk==='IP')ll+=w*Math.log(P[k]);
        else if(it.blk==='IB')ll+=w*Math.log(Q[k]);
        else{const other=it.o[1-oi][1];ll+=w*Math.log(st.indexOf(k)<st.indexOf(other)?.7:.3)}}}
    L[d+'/'+s]=ll}
  return L}

// ======= Preguntas adaptativas =======
const pairIt=(id,part,blk,q,o)=>({id,part,blk,q,o:hash(id+o[0][0])%2?[o[1],o[0]]:o});
function genMbti(A,B){
  const fa=T16K[A],fb=T16K[B],ja=fa.find(f=>JF.includes(f)),pa=fa.find(f=>PF.includes(f)),jb=fb.find(f=>JF.includes(f)),pb=fb.find(f=>PF.includes(f));
  if(ja===jb&&pa===pb)return EIBANK.map((x,i)=>pairIt('tm'+(i+1),'mbti','TBEI',x.q,[[x.E,'E'],[x.I,'I']]));
  const pairs=[];if(ja!==jb)pairs.push([ja,jb]);if(pa!==pb)pairs.push([pa,pb]);
  return FBANK.map((x,i)=>{const[p,q]=pairs[i%pairs.length];return pairIt('tm'+(i+1),'mbti','TBF',x.q,[[x.t[p],p],[x.t[q],q]])})}
const genEnea=(a,b)=>EBANK.map((x,i)=>pairIt('te'+(i+1),'enea','TBE',x.q,[[x.t[a],a],[x.t[b],b]]));
function genWing(core){const l=core===1?9:core-1,r=core===9?1:core+1;return[1,3,4].map((s,i)=>pairIt('tw'+(i+1),'enea','WG',EBANK[s].q,[[EBANK[s].t[l],l],[EBANK[s].t[r],r]]))}
function genInst(A,B){
  const sa=A.split('/'),sb=B.split('/');const[x,y]=sa[0]!==sb[0]?[sa[0],sb[0]]:[sa[1],sb[1]];
  return IBANK.map((b,i)=>pairIt('ti'+(i+1),'inst','TBI',b.q,[[b.t[x],x],[b.t[y],y]]))}
function resolve(m){
  let gen=[];
  if(m==='#mbti'){const P=post(mbtiLL(),TAU.mbti);if(unsure(P))gen=genMbti(P[0][0],P[1][0])}
  else if(m==='#enea'){const P=post(eneaLL(),TAU.enea);if(unsure(P))gen=genEnea(+P[0][0],+P[1][0])}
  else if(m==='#wing')gen=genWing(+post(eneaLL(),TAU.enea)[0][0]);
  else if(m==='#inst'){const P=post(instLL(),TAU.inst);if(unsure(P))gen=genInst(P[0][0],P[1][0])}
  gen.forEach(g=>{S.gen[g.id]=g});
  S.seq.splice(S.i,1,...gen.map(g=>g.id));
}
function settle(){while(S.i<S.seq.length&&S.seq[S.i][0]==='#')resolve(S.seq[S.i])}

// ======= Revisión de respuestas =======
// Si alguien cambia respuestas después de pasar un marcador (#mbti, #enea, #wing, #inst), las preguntas que se
// generaron allí (desempates y ala) pueden haberse quedado viejas. reconcile() repite cada decisión con la misma
// regla que resolve() y con las respuestas que habría habido en ese momento:
//  · si saldrían las mismas preguntas, las conserva con sus respuestas;
//  · si no, las quita con sus respuestas y, si hacen falta otras, vuelve a poner el marcador en su sitio para que
//    settle() las genere cuando la persona llegue (firstUn() lo encuentra).
// Llámala al salir de la revisión, no tras cada toque. No mueve S.i. Devuelve los marcadores que ha vuelto a poner.
const sigIds=ids=>ids.map(id=>item(id).o.map(o=>o[1]).sort().join('|')).join(',');
const sigGen=list=>list.map(g=>g.o.map(o=>o[1]).sort().join('|')).join(',');
function reconcile(){
  const out=[],has=m=>S.seq.includes(m),gen=p=>S.seq.filter(id=>id.startsWith(p));
  const lastOf=f=>{let k=-1;S.seq.forEach((id,i)=>{if(f(id))k=i});return k};
  const baseOf=p=>id=>!!ITEMS[id]&&ITEMS[id].part===p;
  const without=(pres,fn)=>{const s0=S;S=Object.assign({},s0,{seq:s0.seq.filter(id=>!pres.some(p=>id.startsWith(p)))});try{return fn()}finally{S=s0}};
  const drop=pre=>{const old=gen(pre),at=old.length?S.seq.indexOf(old[0]):-1;S.seq=S.seq.filter(id=>!id.startsWith(pre));old.forEach(id=>{delete S.gen[id];delete S.ans[id]});return at};
  const redo=(pre,marker,want,after)=>{
    if(sigIds(gen(pre))===sigGen(want))return;
    let at=drop(pre);if(at<0)at=lastOf(after)+1;
    if(want.length){S.seq.splice(at,0,marker);out.push(marker)}};
  const tie=(P,g)=>unsure(P)?g(P[0][0],P[1][0]):[];
  if(!has('#mbti'))redo('tm','#mbti',tie(without(['tm'],()=>post(mbtiLL(),TAU.mbti)),genMbti),baseOf('mbti'));
  if(!has('#enea')){
    redo('te','#enea',tie(without(['te','tw'],()=>post(eneaLL(),TAU.enea)),(a,b)=>genEnea(+a,+b)),baseOf('enea'));
    if(!has('#wing')){
      if(has('#enea')){drop('tw');S.seq.splice(S.seq.indexOf('#enea')+1,0,'#wing');out.push('#wing')}   // el ala se decide tras el nuevo desempate
      else redo('tw','#wing',genWing(+without(['tw'],()=>post(eneaLL(),TAU.enea))[0][0]),id=>baseOf('enea')(id)||id.startsWith('te'));
    }
  }
  if(!has('#inst'))redo('ti','#inst',tie(without(['ti'],()=>post(instLL(),TAU.inst)),genInst),baseOf('inst'));
  return out;
}

// ======= Resultados =======
// compute(ch): ch (o S.choice) = {mbti:'INTP', enea:6, inst:'so/sp'}, todo opcional: el tipo que la persona dice
// reconocer como suyo en la vista de empate. No cambia ninguna probabilidad; solo qué tipo se toma como el suyo
// (y con él el ala, el subtipo y el tritipo). Sin elección, el resultado es exactamente el del cálculo.
function compute(ch){
  ch=ch||S.choice||{};
  const PM=post(mbtiLL(),TAU.mbti),LE=eneaLL(),PE=post(LE,TAU.enea),core=ch.enea?+ch.enea:+PE[0][0],wl=core===1?9:core-1,wr=core===9?1:core+1,wing=LE[wl]>=LE[wr]?wl:wr;
  const PI=post(instLL(),TAU.inst),stack=(ch.inst||PI[0][0]).split('/');stack.push(['sp','so','sx'].find(x=>!stack.includes(x)));
  const mbti=ch.mbti||PM[0][0],chosen={mbti:mbti!==PM[0][0],enea:core!==+PE[0][0],inst:stack.slice(0,2).join('/')!==PI[0][0]};
  const dom={sp:0,so:0,sx:0};PI.forEach(([k,p])=>{dom[k.slice(0,2)]+=p});
  const fs={},ns={J:0,P:0};[...JF,...PF].forEach(f=>{fs[f]=0});let eS=0,eN=0;
  const gp=[{},{},{},{}],cw={I:{},H:{},M:{}},ipw={sp:0,so:0,sx:0},ibw={sp:0,so:0,sx:0};
  for(const id of S.seq){const it=item(id);if(!it||!S.ans[id])continue;
    for(const[oi,w]of W(S.ans[id])){const k=it.o[oi][1];
      if(it.blk==='A'){fs[k]+=w;ns.J+=w}else if(it.blk==='B'){fs[k]+=w;ns.P+=w}
      else if(it.blk==='D'){eN+=w;if(k==='E')eS+=w}
      else if(it.blk==='EG')gp[it.d][k]=(gp[it.d][k]||0)+w;
      else if(it.blk==='E5')cw[it.c][k]=(cw[it.c][k]||0)+w;
      else if(it.blk==='IP')ipw[k]+=w;else if(it.blk==='IB')ibw[k]+=w}}
  const rankE=PE.map(x=>+x[0]);
  const tri=Object.keys(CENT).map(c=>{const ts=CENT[c],w=cw[c],tot=ts.reduce((s,t)=>s+(w[t]||0),0);
    const fix=ts.includes(core)?core:ts.slice().sort((x,y)=>(w[y]||0)-(w[x]||0)||rankE.indexOf(x)-rankE.indexOf(y))[0];
    return{t:fix,c,share:tot?(w[fix]||0)/tot:0}}).sort((x,y)=>(y.t===core)-(x.t===core)||y.share-x.share);
  const ipT=ipw.sp+ipw.so+ipw.sx||1;
  return{PM,PE,LE,core,wing,PI,stack,dom,fs,ns,eShare:eN?eS/eN:.5,gp,tri,triKey:tri.map(x=>x.t).sort((a,b)=>a-b).join(''),ipShare:{sp:ipw.sp/ipT,so:ipw.so/ipT,sx:ipw.sx/ipT},ibw,mbti,chosen};
}
// Probabilidad de cada letra del MBTI (suma de los tipos que la llevan): [{E,I},{N,S},{T,F},{J,P}].
// Puede pasar que la letra del tipo más probable no sea la más probable por separado: dilo como «letra dudosa».
function letterProbs(PM){const L=[{},{},{},{}];PM.forEach(([t,p])=>t.split('').forEach((c,i)=>{L[i][c]=(L[i][c]||0)+p}));return L}
// Confianza en palabras para una probabilidad calibrada.
const confidence=p=>p>=.7?'alta':p>=.5?'media':'baja';
function txt(R){
  const top=(P,n)=>P.slice(0,n).map(([k,p])=>`${k} ${pc(p)} %`).join(', ');
  return['Mis resultados en «Tu mapa de personalidad»',
  `MBTI: ${top(R.PM,3)}`,
  `Funciones: ${[...JF,...PF].map(f=>`${f} ${pc(R.fs[f]/(JF.includes(f)?R.ns.J||1:R.ns.P||1))} %`).join(', ')}`,
  `Eneagrama: ${R.core}w${R.wing} (${R.PE.slice(0,3).map(([k,p])=>`${k}: ${pc(p)} %`).join(', ')})`,
  `Instintos: ${top(R.PI,3)}`,
  `Subtipo: ${R.core} ${R.stack[0]} (${SUB[R.core][R.stack[0]][0].toLowerCase()})`,
  `Tritipo: ${R.tri.map(x=>x.t).join('')} (${R.tri.map(x=>`${CENTN[x.c].toLowerCase()} ${x.t} ${pc(x.share)} %`).join(', ')})`].join('\n');
}

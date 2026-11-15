// Pruebas del cálculo. Uso, desde la carpeta del kit:  node tests/run.mjs
// (con --generar se reescriben los resultados esperados: solo si cambias el modelo a propósito)
//
// 1. Regresión: 24 personas virtuales y un estado guardado deben dar exactamente los mismos resultados.
// 2. reconcile(): sin cambios no toca nada; tras cambiar respuestas, deja lo mismo que una pasada desde cero.
// 3. compute(elección): sin elección no cambia nada; con elección cambia el tipo, el ala, el subtipo y el tritipo.
// 4. Ayudantes: letterProbs() y confidence().
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_DIR || path.join(here, '..', 'base');
const code = ['data.js', 'model.js'].map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n;\n');
const VEC = path.join(here, 'vectors.json');

function load() {
  const ctx = vm.createContext({console});
  vm.runInContext(code + `
;this.M={get S(){return S},set S(v){S=v},BASE,ITEMS,item,settle,firstUn,compute,txt,post,unsure,TAU,T16K,EGRP,inferior,
  reconcile:typeof reconcile==='function'?reconcile:null,
  letterProbs:typeof letterProbs==='function'?letterProbs:null,
  confidence:typeof confidence==='function'?confidence:null};`, ctx);
  return ctx.M;
}

// ---------- utilidades ----------
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hstr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clone = x => JSON.parse(JSON.stringify(x));
const r4 = x => Math.round(x * 1e4) / 1e4;
const sig = it => it.o.map(o => o[1]).sort().join('|');
const STK = [['sp','so','sx'],['sp','sx','so'],['so','sp','sx'],['so','sx','sp'],['sx','sp','so'],['sx','so','sp']];
let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('  ✗ ' + msg); } };

// ---------- personas virtuales ----------
function persona(seed, M) {
  const r = mulberry(seed), types = Object.keys(M.T16K);
  const T = types[Math.floor(r() * 16)], E = 1 + Math.floor(r() * 9), st = STK[Math.floor(r() * 6)];
  const l = E === 1 ? 9 : E - 1, rr = E === 9 ? 1 : E + 1;
  return {T, E, wing: r() < .5 ? l : rr, st, clar: .4 + r() * .45};
}
function preferred(M, P, it) {
  const keys = it.o.map(o => o[1]), f = M.T16K[P.T], ei = P.T[0];
  const want = {A: k => f.includes(k), B: k => f.includes(k), TBF: k => f.includes(k), D: k => k === ei, TBEI: k => k === ei,
    C: k => k === M.inferior(f[0]), EG: k => k === M.EGRP[P.E][it.d], E5: k => k === P.E, TBE: k => k === P.E,
    WG: k => k === P.wing, IP: k => k === P.st[0], IB: k => k === P.st[2],
    TBI: k => P.st.indexOf(k) === Math.min(...keys.map(x => P.st.indexOf(x)))}[it.blk];
  return keys.map((k, i) => want && want(k) ? i : -1).filter(i => i >= 0);
}
function answer(M, P, id, rnd) {
  const it = M.item(id), k = it.o.length, pref = preferred(M, P, it);
  if (M.ITEMS[id]) {                       // preguntas fijas: al azar con sesgo hacia la persona
    if (rnd() < .05) return [];
    const a = pref.length && rnd() < P.clar ? pref[Math.floor(rnd() * pref.length)] : Math.floor(rnd() * k);
    if (rnd() < .15) return [a, (a + 1 + Math.floor(rnd() * (k - 1))) % k];
    return [a];
  }
  // generadas: deterministas y por clave (no por posición), porque el orden de las opciones depende del par
  const h = hstr(id + '|' + sig(it) + '|' + P.T + P.E + P.st.join('')), keys = it.o.map(o => o[1]);
  const key = pref.length && (h % 100) / 100 < P.clar ? keys[pref[0]] : [...keys].sort()[(h >>> 7) % k];
  return [keys.indexOf(key)];
}
function simulate(M, P, rnd, fixed) {
  M.S = {ans: {}, i: 0, view: 'quiz', seq: M.BASE.slice(), gen: {}};
  M.settle();
  while (M.S.i < M.S.seq.length) {
    const id = M.S.seq[M.S.i];
    M.S.ans[id] = fixed && M.ITEMS[id] ? clone(fixed[id]) : answer(M, P, id, rnd);
    M.S.i++; M.settle();
  }
  M.S.i = M.S.seq.length - 1; M.S.view = 'res';
}
function summary(M, ch) {
  const R = M.compute(ch);
  return {mbti: R.PM.slice(0, 3).map(([k, p]) => [k, r4(p)]), enea: R.PE.slice(0, 3).map(([k, p]) => [+k, r4(p)]), core: R.core, wing: R.wing,
    inst: R.PI.slice(0, 3).map(([k, p]) => [k, r4(p)]), stack: R.stack.join('/'), tri: R.tri.map(x => x.t).join(''),
    gen: M.S.seq.filter(id => !M.ITEMS[id]).join(' ')};
}

// ---------- 1. regresión ----------
const M = load();
const SEEDS = Array.from({length: 24}, (_, i) => 101 + i * 7);
if (process.argv.includes('--generar')) {
  const user = JSON.parse(fs.readFileSync(path.join(here, 'estado-guardado.json'), 'utf8'));
  const out = {nota: 'Resultados esperados. Generado con el modelo validado; no editar a mano.', personas: [], real: null};
  for (const s of SEEDS) { const P = persona(s, M); simulate(M, P, mulberry(s * 13)); out.personas.push({semilla: s, esperado: summary(M)}); }
  M.S = clone(user); out.real = summary(M);
  fs.writeFileSync(VEC, JSON.stringify(out, null, 1));
  console.log('vectors.json generado:', out.personas.length, 'personas + estado guardado');
  process.exit(0);
}
const V = JSON.parse(fs.readFileSync(VEC, 'utf8'));
console.log('1. Regresión');
for (const v of V.personas) { const P = persona(v.semilla, M); simulate(M, P, mulberry(v.semilla * 13)); ok(JSON.stringify(summary(M)) === JSON.stringify(v.esperado), `persona ${v.semilla} da resultados distintos`); }
M.S = clone(JSON.parse(fs.readFileSync(path.join(here, 'estado-guardado.json'), 'utf8')));
ok(JSON.stringify(summary(M)) === JSON.stringify(V.real), 'el estado guardado da resultados distintos');
const gens = V.personas.map(v => v.esperado.gen);
console.log(`   ${V.personas.length + 1} casos · con desempate de MBTI ${gens.filter(g => g.includes('tm')).length}, de eneagrama ${gens.filter(g => g.includes('te')).length}, de instintos ${gens.filter(g => g.includes('ti')).length}`);

// ---------- 2. reconcile ----------
console.log('2. reconcile()');
if (!M.reconcile) ok(false, 'falta reconcile() en model.js');
else {
  let changedCases = 0, markers = 0;
  for (const s of SEEDS) {
    const P = persona(s, M);
    simulate(M, P, mulberry(s * 13));
    const before = JSON.stringify(M.S), r0 = M.reconcile();
    ok(r0.length === 0 && JSON.stringify(M.S) === before, `persona ${s}: reconcile() cambió algo sin cambios de respuestas`);
    for (const frac of [.15, .35, .6]) {                 // cambiar parte de las respuestas fijas
      simulate(M, P, mulberry(s * 13));
      const rp = mulberry(s * 31 + Math.round(frac * 100)), P2 = persona(s + 5000 + Math.round(frac * 100), M);
      for (const id of M.S.seq) if (M.ITEMS[id] && rp() < frac) M.S.ans[id] = answer(M, P2, id, rp);
      const genBefore = M.S.seq.filter(id => !M.ITEMS[id]).join(' ');
      const ins = M.reconcile(); markers += ins.length;
      for (let u = M.firstUn(), guard = 0; u >= 0 && guard < 300; u = M.firstUn(), guard++) {   // terminar como haría la interfaz
        M.S.i = u; M.settle();
        if (M.S.i >= M.S.seq.length) break;
        const id = M.S.seq[M.S.i]; if (M.S.ans[id] === undefined) M.S.ans[id] = answer(M, P, id, rp);
      }
      const Sr = clone(M.S), sr = summary(M);
      if (Sr.seq.filter(id => !M.ITEMS[id]).join(' ') !== genBefore) changedCases++;
      const fixed = {}; for (const id of Sr.seq) if (M.ITEMS[id]) fixed[id] = Sr.ans[id];
      simulate(M, P, mulberry(1), fixed);               // pasada desde cero con las respuestas nuevas
      ok(JSON.stringify(Sr.seq) === JSON.stringify(M.S.seq), `persona ${s} (${frac}): la secuencia no coincide con una pasada desde cero`);
      ok(Sr.seq.every(id => M.ITEMS[id] || sig(Sr.gen[id]) === sig(M.S.gen[id])), `persona ${s} (${frac}): preguntas generadas distintas`);
      ok(JSON.stringify(sr) === JSON.stringify(summary(M)), `persona ${s} (${frac}): resultados distintos de una pasada desde cero`);
    }
  }
  console.log(`   ${SEEDS.length * 3} revisiones simuladas · en ${changedCases} cambiaron los desempates o el ala · ${markers} marcadores reinsertados`);
}

// ---------- 3. elección propia ----------
console.log('3. compute(elección)');
for (const s of SEEDS.slice(0, 12)) {
  simulate(M, persona(s, M), mulberry(s * 13));
  const a = summary(M), b = summary(M, {});
  ok(JSON.stringify(a) === JSON.stringify(b), `persona ${s}: compute({}) no coincide con compute()`);
  const R0 = M.compute(), e2 = +R0.PE[1][0], m2 = R0.PM[1][0], i2 = R0.PI[1][0];
  const R = M.compute({mbti: m2, enea: e2, inst: i2});
  const nb = [e2 === 1 ? 9 : e2 - 1, e2 === 9 ? 1 : e2 + 1];
  ok(R.core === e2 && nb.includes(R.wing) && R.tri[0].t === e2, `persona ${s}: la elección de eneatipo no se aplica bien`);
  ok(R.mbti === m2 && R.chosen && R.chosen.mbti && R.chosen.enea && R.chosen.inst, `persona ${s}: faltan mbti/chosen en el resultado`);
  ok(R.stack.slice(0, 2).join('/') === i2 && R.stack.length === 3, `persona ${s}: la elección de instintos no se aplica bien`);
  ok(JSON.stringify(R.PM) === JSON.stringify(R0.PM) && JSON.stringify(R.PE) === JSON.stringify(R0.PE), `persona ${s}: la elección no debe cambiar las probabilidades`);
}

// ---------- 4. ayudantes ----------
console.log('4. letterProbs() y confidence()');
if (!M.letterProbs || !M.confidence) ok(false, 'faltan letterProbs() o confidence() en model.js');
else {
  for (const s of SEEDS.slice(0, 8)) {
    simulate(M, persona(s, M), mulberry(s * 13));
    const L = M.letterProbs(M.compute().PM);
    ok(L.length === 4 && L.every(o => Math.abs(Object.values(o).reduce((x, y) => x + y, 0) - 1) < 1e-9), `persona ${s}: las letras no suman 1`);
  }
  ok(M.confidence(.75) === 'alta' && M.confidence(.7) === 'alta' && M.confidence(.55) === 'media' && M.confidence(.5) === 'media' && M.confidence(.3) === 'baja', 'confidence() con umbrales incorrectos');
}

console.log(fails ? `\n${fails} de ${checks} comprobaciones FALLAN` : `\nTodo bien: ${checks} comprobaciones`);
process.exit(fails ? 1 : 0);

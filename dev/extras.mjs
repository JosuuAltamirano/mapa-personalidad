// Prioridad 3: fuente ligera, código para otro dispositivo, historial, repetir una parte, imprimir, comparar y animaciones.
// Uso, desde dev/: node extras.mjs
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';   // python3 -m http.server 8765 desde la carpeta del kit
const OLD = JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(path.join(here, '..', 'tests', 'estado-guardado.json'), 'utf8')), {doneAt: '2026-11-15T10:00:00Z'}));
const REAL = JSON.parse(fs.readFileSync(path.join(here, '..', 'tests', 'vectors.json'), 'utf8')).real;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const norm = s => s.replace(/ /g, ' ').trim();
const r4 = x => Math.round(x * 1e4) / 1e4;
const summary = () => { const R = compute(); return JSON.stringify({m: R.PM.slice(0, 3), e: R.PE.slice(0, 3), i: R.PI.slice(0, 3), t: R.tri.map(x => x.t).join(''), s: R.stack.join('/'), g: S.gen}); };

const browser = await chromium.launch();
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext(Object.assign({viewport: {width: 390, height: 844}}, opts));
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new globalThis.URL(URL).origin});
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
  return page;
};
const loadOld = async p => { await p.goto(URL); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mapa-personalidad-v2', s); }, OLD); await p.reload(); };

// 33 · Fuente ligera: solo los archivos latinos de Newsreader
const a = await newPage();
const fonts = [];
await a.goto(URL); await a.evaluate(s => { localStorage.clear(); localStorage.setItem('mapa-personalidad-v2', s); }, OLD);
a.on('response', r => { if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fonts.push(r.url()); });
await a.reload();
await a.waitForTimeout(300);
ok(fonts.length >= 1 && fonts.length === new Set(fonts).size && fonts.every(u => /\/fonts\/newsreader-latin(-italic)?\.woff2$/.test(u)), `solo se piden los archivos latinos de Newsreader, una vez cada uno (${fonts.map(u => u.split('/').pop()).join(', ')})`);

// 28 · Animaciones al mostrar el resultado y al elegir
ok(await a.evaluate(() => getComputedStyle(document.querySelector('.cell')).animationName) === 'subir', 'el póster entra con animación');
await a.waitForTimeout(1700);
ok(await a.evaluate(() => !document.querySelector('.res').classList.contains('anim')), 'y no se repite al cambiar de pestaña');

// 29 · Código para otro dispositivo: copiar aquí y cargar en otro navegador
const before = await a.evaluate(summary);
await a.click('.rfoot [data-act=code]');
const code = await a.evaluate(() => navigator.clipboard.readText());
ok(/^z[A-Za-z0-9_-]+$/.test(code) && code.length < 1600, `el código va comprimido (${code.length} caracteres)`);
const b = await newPage();
await b.goto(URL); await b.evaluate(() => localStorage.clear()); await b.reload();
await b.click('.dev summary');
await b.fill('#codeIn', code);
await b.click('[data-act=loadcode]');
ok(await b.locator('#app').getAttribute('data-view') === 'res', 'el otro navegador abre los resultados');
ok(await b.evaluate(summary) === before, 'con los mismos números y las mismas preguntas generadas');
// a mitad del test
await b.evaluate(() => { const ids = S.seq.filter(id => id[0] !== '#'); for (const id of ids.slice(50)) delete S.ans[id]; S.view = 'quiz'; S.i = 50; save(); });
const half = await b.evaluate(() => packState());
const c = await newPage();
await c.goto(URL); await c.evaluate(() => localStorage.clear()); await c.reload();
await c.click('.dev summary'); await c.fill('#codeIn', half); await c.click('[data-act=loadcode]');
ok(norm(await c.locator('[data-act=start]').textContent()) === 'Continuar por la pregunta 51' && norm(await c.locator('.okmsg').textContent()).startsWith('Listo'), 'un código a mitad del test deja continuar por la pregunta 51');
// códigos malos: basura y uno que intenta colar HTML en una pregunta generada
await c.click('.dev summary'); await c.fill('#codeIn', 'zesto-no-es-un-codigo'); await c.click('[data-act=loadcode]');
ok(norm(await c.locator('#codeMsg').textContent()).startsWith('Ese código no es válido'), 'un código roto da un aviso claro');
const evil = await c.evaluate(() => { const o = {v: 1, ans: {}, i: 0, view: 'quiz', seq: S.seq.filter(id => id[0] !== '#' || true), gen: {tm1: ['TBF', '<img src=x onerror=alert(1)>', 'Ti']}}; return 'j' + btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); });
await c.fill('#codeIn', evil); await c.click('[data-act=loadcode]');
ok(norm(await c.locator('#codeMsg').textContent()).startsWith('Ese código no es válido') && await c.evaluate(() => !document.querySelector('img')), 'un código con HTML en una pregunta se rechaza');

// 30 · Historial: «La otra vez…» y qué ha cambiado
await a.evaluate(() => localStorage.setItem('mapa-personalidad-historial', JSON.stringify([{fecha: '2026-10-03T09:00:00Z', mbti: 'INTJ', enea: '6w5', inst: 'so/sx', tri: '614'}])));
await a.reload();
ok(norm(await a.locator('.hist').textContent()) === 'La otra vez, el 3 de octubre de 2026: INTJ · 6w5 · so/sx · 614. Esta vez cambian el MBTI y el tritipo.', 'el póster dice qué ha cambiado desde la otra vez');
ok((await a.locator('.cell .antes').allTextContents()).map(norm).join(' | ') === 'Antes: INTJ | Antes: 614', 'y cada celda cambiada dice lo de antes');

// 31 · Repetir una parte: solo esa parte (y sus generadas), y vuelve a su primera pregunta
await a.click('#mbti [data-act=redo]');
await a.click('#dlgConfirmar [data-act=yes]');
const st = await a.evaluate(() => ({view: document.querySelector('#app').dataset.view, title: document.querySelector('#trt')?.textContent, mbti: S.seq.filter(id => item(id)?.part === 'mbti' && S.ans[id] !== undefined).length,
  enea: S.seq.filter(id => item(id)?.part === 'enea' && S.ans[id] !== undefined).length, marks: S.seq.filter(id => id[0] === '#').join(' '), gen: Object.keys(S.gen).join(' '), hist: JSON.parse(localStorage.getItem('mapa-personalidad-historial')).length}));
ok(st.view === 'transicion' && st.title.startsWith('MBTI'), 'vuelve a la transición del MBTI');
ok(st.mbti === 0 && st.enea === 51 && st.marks === '#mbti' && st.gen === 'te1 te2 te3 te4 te5 te6 tw1 tw2 tw3 ti1 ti2 ti3', 'borra solo el MBTI y sus desempates; el resto se queda');
ok(st.hist === 2, 'el resultado anterior pasa al historial');
const redo = await a.evaluate(old => {   // contestar lo mismo que antes debe dar el mismo resultado
  const O = JSON.parse(old);
  for (const id of S.seq) if (item(id)?.part === 'mbti') S.ans[id] = O.ans[id];
  S.i = firstUn(); settle();
  for (const id of S.seq) if (id.startsWith('tm')) S.ans[id] = O.ans[id];
  finish();
  const R = compute(); return {view: document.querySelector('#app').dataset.view, m: R.PM.slice(0, 3).map(([k, p]) => [k, Math.round(p * 1e4) / 1e4])};
}, OLD);
ok(redo.view === 'res' && JSON.stringify(redo.m) === JSON.stringify(REAL.mbti), 'al contestarla igual, el resultado vuelve a ser el mismo');

// 32 · Imprimir: todas las pestañas, sin barras ni botones y con fondo blanco
await a.emulateMedia({media: 'print'});
const pr = await a.evaluate(() => ({panels: [...document.querySelectorAll('[role=tabpanel]')].filter(p => getComputedStyle(p).display !== 'none').length,
  tabs: getComputedStyle(document.querySelector('.tabs')).display, btns: [...document.querySelectorAll('.btn')].filter(b => b.offsetParent).length,
  bg: getComputedStyle(document.body).backgroundColor, poster: getComputedStyle(document.querySelector('.poster')).backgroundColor}));
ok(pr.panels === 4 && pr.tabs === 'none' && pr.btns === 0, `al imprimir salen las 4 pestañas, sin barras ni botones (${pr.panels}, ${pr.tabs}, ${pr.btns})`);
ok(pr.bg === 'rgb(255, 255, 255)' && pr.poster === 'rgb(255, 255, 255)', 'y con fondo blanco');
await a.pdf({path: path.join(here, 'out', 'mapa.pdf'), format: 'A4'}).catch(() => {});
await a.emulateMedia({media: 'screen'});

// 34 · Comparar con otra persona
await a.fill('#cmpIn', 'Mis resultados\nENFP · 7w6 · sx/so · 729\nHecho el 1 de octubre de 2026');
await a.click('[data-act=compare]');
const cmp = await a.evaluate(() => ({res: document.querySelector('.cmpres').textContent, rows: [...document.querySelectorAll('.cmp tbody tr')].map(r => r.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim())}));
ok(cmp.res === 'Coincidís en 0 de 4.' && cmp.rows.length === 4 && cmp.rows[0].includes('ENFP') && cmp.rows[0].includes('2 de 4 letras en común'), 'compara lado a lado con otro resultado: ' + cmp.rows[0]);
const mine = await a.evaluate(() => [codes(compute()), '', txt(compute())].join('\n'));
await a.fill('#cmpIn', mine); await a.click('[data-act=compare]');
ok(norm(await a.locator('.cmpres').textContent()) === 'Coincidís en 4 de 4.', 'con tu propio texto coincidís en todo');
await a.fill('#cmpIn', 'MBTI: ISFJ 40 %, ESFJ 20 %\nEneagrama: 2w1 (2: 50 %)\nInstintos: so/sp 40 %\nTritipo: 269 (corazón 2)');
await a.click('[data-act=compare]');
ok((await a.locator('.cmp tbody tr').count()) === 4, 'también entiende el texto de la versión anterior');
await a.fill('#cmpIn', '<img src=x onerror=alert(1)> hola'); await a.click('[data-act=compare]');
ok(norm(await a.locator('#cmpOut').textContent()).startsWith('No encuentro un resultado') && await a.evaluate(() => !document.querySelector('#cmpOut img')), 'un texto sin resultado da un aviso y no se pinta');

// Movimiento reducido: ninguna animación
const d = await newPage({reducedMotion: 'reduce'});
await loadOld(d);
ok(await d.evaluate(() => getComputedStyle(document.querySelector('.cell')).animationName) === 'none', 'con movimiento reducido no hay animaciones');

for (const p of [a, b, c, d]) ok(!p.errs.length, 'sin errores: ' + p.errs.join('; '));
await browser.close();
console.log(fails ? `${fails} fallos` : 'Todo bien');
process.exit(fails ? 1 : 0);

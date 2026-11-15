// Estado guardado por la versión anterior, teclado y revisión con reconcile().
// Uso, desde dev/: node guardado.mjs
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';   // python3 -m http.server 8765 desde la carpeta del kit
const OLD = fs.readFileSync(path.join(here, '..', 'tests', 'estado-guardado.json'), 'utf8');
const REAL = JSON.parse(fs.readFileSync(path.join(here, '..', 'tests', 'vectors.json'), 'utf8')).real;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width: 1280, height: 800}})).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(URL);

// 1. Estado de la versión anterior: abre los resultados con los mismos números.
await page.evaluate(s => { localStorage.clear(); localStorage.setItem('mapa-personalidad-v2', s); }, OLD);
await page.reload();
ok(await page.locator('#app').getAttribute('data-view') === 'res', 'el estado antiguo abre los resultados');
const R = await page.evaluate(() => { const R = compute(); return {mbti: R.PM.slice(0, 3), enea: R.PE.slice(0, 3), inst: R.PI.slice(0, 3), tri: R.tri.map(x => x.t).join(''), stack: R.stack.join('/')}; });
const r4 = x => Math.round(x * 1e4) / 1e4;
ok(JSON.stringify(R.mbti.map(([k, p]) => [k, r4(p)])) === JSON.stringify(REAL.mbti), 'MBTI igual que real');
ok(JSON.stringify(R.enea.map(([k, p]) => [+k, r4(p)])) === JSON.stringify(REAL.enea), 'eneagrama igual que real');
ok(JSON.stringify(R.inst.map(([k, p]) => [k, r4(p)])) === JSON.stringify(REAL.inst), 'instintos igual que real');
ok(R.tri === REAL.tri && R.stack === REAL.stack, 'tritipo y orden iguales');
ok(await page.evaluate(() => document.activeElement.tagName) === 'H1', 'foco en el h1 de resultados');

// 2. Revisión en lista: editar una fila sin avance automático, volver a la lista y recalcular con reconcile().
await page.click('[data-act=review]');
ok(await page.locator('#app').getAttribute('data-view') === 'lista', 'la revisión abre la lista');
ok(await page.locator('.lv h2').count() === 3, 'un h2 por parte');
ok(await page.locator('.row .tag').count() === 18, 'las 18 generadas llevan «Desempate» o «Ala»');
await page.locator('.row').nth(2).click();
ok(await page.locator('#app').getAttribute('data-view') === 'pregunta' && await page.locator('[data-act=tolist]').count() === 1, 'la fila abre la pregunta con «Volver a la lista»');
ok((await page.locator('.where span').textContent()).startsWith('Revisando'), 'contador de revisión');
await page.locator('.op').nth(0).click();
await page.waitForTimeout(1600);
ok(await page.locator('#app').getAttribute('data-view') === 'pregunta', 'sin avance automático al editar');
await page.click('[data-act=tolist]');
ok(await page.evaluate(() => document.activeElement.dataset.j) === '2', 'vuelve a la lista con el foco en la fila editada');
await page.evaluate(() => { for (const id of S.seq) { const it = item(id); if (it && it.part === 'enea' && it.blk === 'EG') S.ans[id] = [0]; } save(); });
await page.click('[data-act=endrev]');
const v = await page.locator('#app').getAttribute('data-view');
const st = await page.evaluate(() => ({u: firstUn(), i: S.i, gen: Object.keys(S.gen).join(' ')}));
console.log('    tras revisar:', v, JSON.stringify(st));
ok(v === 'transicion' || v === 'pregunta', 'los cambios abren preguntas nuevas');
ok((await page.locator('.aviso').first().textContent()).includes('preguntas nuevas'), 'avisa de las preguntas nuevas');

// 3. Teclado: entrada → contestar varias preguntas solo con teclas; Intro nunca desmarca.
await page.evaluate(() => localStorage.clear()); await page.reload();
await page.keyboard.press('Tab'); // primer control
await page.focus('[data-act=start]'); await page.keyboard.press('Enter');
ok(await page.locator('#app').getAttribute('data-view') === 'transicion', 'transición de la parte 1');
await page.keyboard.press('Enter');
ok(await page.evaluate(() => document.activeElement.id) === 'qs', 'foco en el enunciado');
await page.evaluate(() => { S.prefs.auto = false; });
await page.keyboard.press('b');
ok(await page.evaluate(() => JSON.stringify(S.ans[S.seq[S.i]])) === '[1]', 'B elige la segunda');
await page.keyboard.press('3');
ok(await page.evaluate(() => JSON.stringify(S.ans[S.seq[S.i]])) === '[1,2]', '3 marca también');
await page.focus('.op[data-i="1"]'); await page.keyboard.press('Enter');
ok(await page.evaluate(() => S.i) === 1, 'Intro sobre una elegida pasa a la siguiente sin desmarcar');
ok(await page.evaluate(() => JSON.stringify(S.ans.a1)) === '[1,2]', 'la respuesta sigue igual');
await page.focus('.op[data-i="0"]'); await page.keyboard.press('Enter');
ok(await page.evaluate(() => JSON.stringify(S.ans[S.seq[S.i]])) === '[0]', 'Intro sobre una sin elegir la elige');
await page.keyboard.press('Enter');
await page.keyboard.press('ArrowLeft');
ok(await page.evaluate(() => S.i) === 1 && await page.evaluate(() => document.activeElement.id) === 'qs', '← vuelve y el foco va al enunciado');
await page.keyboard.press('?');
ok(await page.evaluate(() => !!document.querySelector('#dlgAyuda[open]')), '? abre la ayuda');
await page.keyboard.press('Escape');
ok(await page.evaluate(() => !document.querySelector('dialog[open]') && document.activeElement.id), 'Esc la cierra');
// atajos desactivados
await page.evaluate(() => { S.prefs.keys = false; });
await page.keyboard.press('c');
ok(await page.evaluate(() => JSON.stringify(S.ans[S.seq[S.i]])) === '[0]', 'sin atajos, las letras no hacen nada');

ok(!errs.length, 'sin errores: ' + errs.join('; '));
await browser.close();
console.log(fails ? `${fails} fallos` : 'Todo bien');
process.exit(fails ? 1 : 0);

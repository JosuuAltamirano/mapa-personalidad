// Recorrido completo de la web con teclado y ratón, comprobando errores y criterios de la prioridad 1.
// Uso, desde dev/: node recorrido.mjs
import {chromium} from 'playwright';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';   // python3 -m http.server 8765 desde la carpeta del kit
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 360, height: 740}, hasTouch: true, isMobile: true});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();

const view = () => page.locator('#app').getAttribute('data-view');
ok(await view() === 'entrada', 'empieza en la entrada');
await page.click('[data-act=start]');

let n = 0, fit = 0, qs = 0, trans = [], parts = [], headerMax = 0;
while (n++ < 400) {
  const v = await view();
  if (v === 'res') break;
  if (v === 'parcial') {   // resultado al terminar el MBTI y el eneagrama
    parts.push(await page.locator('#pvT').textContent());
    ok(await page.evaluate(() => document.activeElement.id) === 'pvT', 'foco en el resultado parcial');
    if (parts.length === 1) {
      await page.click('[data-act=pstop]');
      ok((await page.locator('#pmsg').textContent()).startsWith('Guardado'), '«Parar aquí» confirma que está guardado');
    }
    await page.click('[data-act=pcont]');
    continue;
  }
  if (v === 'transicion') {
    trans.push(await page.locator('#trt').textContent());
    ok(await page.evaluate(() => document.activeElement.id) === 'trt', 'foco en el título de la transición');
    await page.keyboard.press('Enter');
    continue;
  }
  ok(v === 'pregunta', 'vista inesperada ' + v);
  qs++;
  const m = await page.evaluate(() => {
    const b = document.querySelector('.bar').getBoundingClientRect(), o = [...document.querySelectorAll('.op')].pop().getBoundingClientRect();
    return {fits: o.bottom <= b.top + 1, header: document.querySelector('.top').getBoundingClientRect().height, bar: b.bottom <= innerHeight + 1, focus: document.activeElement.id, sx: document.documentElement.scrollWidth > innerWidth};
  });
  if (m.fits) fit++;
  headerMax = Math.max(headerMax, m.header);
  ok(m.bar, 'barra inferior visible');
  ok(m.focus === 'qs', 'foco en el enunciado');
  ok(!m.sx, 'sin desplazamiento horizontal');
  const k = await page.locator('.op').count();
  const pickN = (qs * 7) % k;
  if (qs % 11 === 0) { await page.click('[data-act=skip]'); continue; }
  await page.locator('.op').nth(pickN).tap();
  if (qs % 5 === 0) await page.locator('.op').nth((pickN + 1) % k).tap();   // también
  await page.waitForFunction(() => document.querySelector('#app').dataset.view !== 'pregunta' || !document.querySelector('.op[data-s="1"]'), null, {timeout: 4000}).catch(() => ok(false, 'el avance automático no ha pasado'));
}
console.log(`Preguntas: ${qs} · encajan sin desplazarse: ${fit} (${Math.round(fit / qs * 100)} %) · cabecera máx.: ${headerMax.toFixed(0)} px`);
console.log('Transiciones:', trans.join(' | '));
console.log('Resultados parciales:', parts.join(' | '));
ok(await view() === 'res', 'llega a los resultados');
ok(parts.length === 2, 'un resultado parcial tras el MBTI y otro tras el eneagrama');
ok(await page.evaluate(() => document.activeElement.tagName) === 'H1', 'foco en el título del póster');
ok(await page.locator('[role=tab]').count() === 4, 'cuatro pestañas');
ok(fit / qs >= .9, 'al menos el 90 % de preguntas caben');
ok(headerMax <= 100, 'cabecera de 100 px como máximo');
ok(!errs.length, 'errores en consola: ' + errs.join('; '));
await page.screenshot({path: path.join(here, 'out', 'res.png'), fullPage: false});
await browser.close();
console.log(fails ? `${fails} fallos` : 'Recorrido bien');
process.exit(fails ? 1 : 0);

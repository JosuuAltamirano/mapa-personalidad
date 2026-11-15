// Mapa completo: póster, pestañas, empate y elección, glosario, copiar, compartir, «Cómo se calcula» y repetir.
// Usa el estado guardado de tests/ (INTP 52 %, 6w5 68 %, so/sx 45 %, 613), que tiene empate en MBTI y en instintos.
// Uso, desde dev/: node resultados.mjs
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';   // python3 -m http.server 8765 desde la carpeta del kit
const OLD = JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(path.join(here, '..', 'tests', 'estado-guardado.json'), 'utf8')), {doneAt: '2026-11-15T10:00:00Z'}));   // la versión anterior no guardaba la fecha
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const norm = s => s.replace(/ /g, ' ').trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new globalThis.URL(URL).origin});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL);
await page.evaluate(s => { localStorage.clear(); localStorage.setItem('mapa-personalidad-v2', s); }, OLD);
await page.reload();

// Póster
const cells = await page.$$eval('.cell', els => els.map(e => ({code: e.querySelector('.code').textContent, chip: e.querySelector('.cchip')?.textContent || '', alt: e.querySelector('.alt')?.textContent || ''})));
ok(cells.map(c => c.code).join(' ') === 'INTP 6w5 so/sx 613', 'póster: INTP · 6w5 · so/sx · 613');
ok(cells.slice(0, 3).map(c => norm(c.chip)).join(' | ') === 'Media · 52 % | Media · 68 % | Baja · 45 %', 'póster: confianza en palabras y porcentaje');
ok(norm(cells[0].alt) === 'o ISTP (15 %)' && !cells[3].chip, 'póster: el segundo, y sin chip en el tritipo');
ok(norm(await page.locator('.poster .date').textContent()) === 'Hecho el 15 de noviembre de 2026', 'póster: fecha');

// Pestañas: título antes que figura, enlaces y teclado
ok(await page.locator('[role=tab][aria-selected=true]').getAttribute('id') === 'tab-mbti', 'empieza en la pestaña MBTI');
const order = await page.evaluate(() => [...document.querySelectorAll('[role=tabpanel]')].every(p => { const h = p.querySelector('h2'), f = p.querySelector('svg[role=img], .lets'); return p.firstElementChild.contains(h) && (!f || (h.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
ok(order, 'cada panel empieza por su h2 y la figura va después');
await page.focus('#tab-mbti'); await page.keyboard.press('ArrowRight');
ok(await page.evaluate(() => document.activeElement.id) === 'tab-enea' && await page.evaluate(() => location.hash) === '#eneagrama', '→ pasa a Eneagrama y el enlace cambia a #eneagrama');
ok(await page.locator('#eneagrama').isVisible() && !(await page.locator('#mbti').isVisible()), 'solo se ve el panel elegido');
await page.goto(URL + '#instintos'); await page.reload();
ok(await page.locator('#tab-inst').getAttribute('aria-selected') === 'true', '#instintos abre la pestaña Instintos');

// Vista de empate y elección propia
ok(await page.locator('#mbti .tie').count() === 1 && await page.locator('#eneagrama .tie').count() === 0 && await page.locator('#instintos .tie').count() === 1, 'empate en MBTI e instintos, no en eneagrama');
await page.click('#tab-mbti');
await page.click('#mbti [data-act=choose][data-v=ISTP]');
const c2 = (await page.$$eval('.cell', els => els.map(e => e.textContent))).map(norm);
ok(c2[0].includes('ISTP') && c2[0].includes('Elegido por ti') && c2[0].includes('El test: INTP (52 %)'), 'elegir ISTP cambia el póster y dice lo que daba el test');
ok(norm(await page.locator('#mbti h2').first().textContent()) === 'Tu tipo es ISTP: el artesano', 'el título pasa a «Tu tipo es ISTP»');
ok(norm(await page.locator('#mbti .pb.on .v').first().textContent()) === '15 %' && norm(await page.locator('#mbti .pbs .pb').first().textContent()).includes('52 %'), 'los porcentajes no cambian');
ok(await page.evaluate(() => document.activeElement.dataset.act) === 'unchoose', 'el foco va a «Volver al resultado del test»');
await page.click('#mbti [data-act=unchoose]');
ok((await page.locator('.cell .code').first().textContent()) === 'INTP' && await page.evaluate(() => !S.choice.mbti), 'deshacer vuelve a INTP');
await page.click('#tab-inst'); await page.click('#instintos [data-act=choose][data-v="so/sp"]');
ok((await page.locator('.cell .code').nth(2).textContent()) === 'so/sp', 'elegir so/sp actualiza los instintos del póster');
await page.click('#instintos [data-act=unchoose]');

// Glosario: todos los términos tocables, burbuja con Esc y toque fuera
const terms = await page.evaluate(() => { const got = new Set([...document.querySelectorAll('#app .term')].map(b => b.dataset.term)); return Object.keys(GLOSARIO).filter(k => !got.has(k)); });
ok(terms.join() === 'Contratipo', 'todos los términos que aparecen se pueden tocar (6 social no es contratipo)' + (terms.length ? ': faltan ' + terms.join(', ') : ''));
const contra = await page.evaluate(() => { SUB[6].so[2] = 1; showRes({keep: true}); const ok = !!document.querySelector('#instintos .term[data-term=Contratipo]'); delete SUB[6].so[2]; showRes({keep: true}); return ok; });
ok(contra, 'con un contratipo, la etiqueta «contratipo» también se puede tocar');
await page.click('#tab-mbti');
const term = page.locator('#mbti .ph .term').first();
await term.click();
ok(await page.locator('#bub').isVisible() && (await page.locator('#bubD').textContent()) === await page.evaluate(() => GLOSARIO.Temperamento), 'la burbuja muestra la definición');
ok(await page.evaluate(() => document.activeElement.id) === 'bub', 'el foco entra en la burbuja');
await page.keyboard.press('Escape');
ok(!(await page.locator('#bub').isVisible()) && await page.evaluate(() => document.activeElement.dataset.term) === 'Temperamento', 'Esc la cierra y devuelve el foco al término');
await term.click(); await page.mouse.click(200, 300);
ok(!(await page.locator('#bub').isVisible()), 'tocar fuera la cierra');

// Detalles: «30 %» con espacio y figuras con su resultado
const pctBad = await page.evaluate(() => [...document.querySelectorAll('[role=tabpanel], .poster')].map(p => p.textContent).join(' ').match(/\d%/g));
ok(!pctBad, 'todos los porcentajes llevan espacio');
const labels = await page.$$eval('svg[role=img]', els => els.map(e => e.getAttribute('aria-label')));
ok(labels.length === 3 && labels.every(l => /\d/.test(l)), 'las tres figuras describen el resultado: ' + labels.map(l => l.slice(0, 40)).join(' | '));

// Copiar texto
await page.click('[data-act=copy]');
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
ok(clip.split('\n')[0] === 'INTP · 6w5 · so/sx · 613' && clip.split('\n')[1].startsWith('Hecho el'), 'copiar: códigos en la primera línea y la fecha en la segunda');

// Compartir imagen (sin Web Share se descarga)
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=share]')]);
const png = path.join(here, 'out', 'compartir.png');
await dl.saveAs(png);
const buf = fs.readFileSync(png);
ok(dl.suggestedFilename() === 'mi-mapa-de-personalidad.png' && buf.readUInt32BE(16) === 1080 && buf.readUInt32BE(20) === 1350, `compartir: ${dl.suggestedFilename()} de ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);

// Cómo se calcula
await page.click('.howlink');
ok(await page.evaluate(() => document.activeElement.id) === 'hMet', '«Cómo se calcula» lleva a su sección');

// Repetir: guarda el historial y vuelve a la entrada
await page.click('[data-act=again]');
await page.click('#dlgConfirmar [data-act=yes]');
const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('mapa-personalidad-historial') || '[]'));
ok(hist.length === 1 && hist[0].mbti === 'INTP' && hist[0].tri === '613', 'repetir guarda el resultado en el historial');
ok(await page.locator('#app').getAttribute('data-view') === 'entrada', 'y vuelve a la entrada');

ok(!errs.length, 'sin errores: ' + errs.join('; '));
await browser.close();
console.log(fails ? `${fails} fallos` : 'Todo bien');
process.exit(fails ? 1 : 0);

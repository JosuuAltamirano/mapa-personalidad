// axe-core y capturas de las pantallas de los bocetos, en claro y en oscuro y en los tamaños de la sección 10.
// Uso, desde dev/: node capturas.mjs [--sin-capturas]
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';   // python3 -m http.server 8765 desde la carpeta del kit
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, {recursive: true});
const shots = !process.argv.includes('--sin-capturas');
const SIZES = [[320, 568], [360, 740], [390, 844], [740, 360], [720, 800], [1280, 800], [1440, 900]];
let fails = 0;

// Avanza el estado hasta la primera pregunta del bloque indicado (o hasta el final), contestando de forma determinista.
const prep = ({blk, seenAll}) => {
  localStorage.clear();
  S = fresh(); S.prefs = {auto: true, keys: true}; S.seen = {}; S.pace = []; S.choice = {};
  for (;;) {
    const u = firstUn(); if (u < 0) break;
    S.i = u; settle(); if (S.i >= S.seq.length) break;
    const id = S.seq[S.i], it = item(id);
    if (blk && it.blk === blk) break;
    S.ans[id] = [hash(id) % it.o.length];
  }
  if (seenAll) { S.seen = {mbti: 1, enea: 1, inst: 1, C: 1, IB: 1, WG: 1, tb_mbti: 1, tb_enea: 1, tb_inst: 1}; }
  if (!blk) { S.view = 'res'; S.doneAt = '2026-11-15T10:00:00Z'; S.i = S.seq.length - 1; }
  localStorage.setItem('mapa-personalidad-v2', JSON.stringify(S));
};

const SCREENS = {
  entrada: async p => { await p.evaluate(() => localStorage.clear()); await p.reload(); },
  pregunta: async p => { await p.evaluate(prep, {blk: 'A', seenAll: true}); await p.reload(); await p.click('[data-act=start]'); await p.locator('.op').nth(0).click(); await p.locator('.op').nth(2).click(); await p.waitForTimeout(500); },
  transicion: async p => { await p.evaluate(prep, {blk: 'IB', seenAll: false}); await p.evaluate(() => { S.seen = {mbti: 1, enea: 1, inst: 1, C: 1, WG: 1, tb_mbti: 1, tb_enea: 1}; localStorage.setItem('mapa-personalidad-v2', JSON.stringify(S)); }); await p.reload(); await p.click('[data-act=start]'); },
  ib: async p => { await p.evaluate(prep, {blk: 'IB', seenAll: true}); await p.reload(); await p.click('[data-act=start]'); },
  ayuda: async p => { await p.evaluate(prep, {blk: 'B', seenAll: true}); await p.reload(); await p.click('[data-act=start]'); await p.click('[data-act=help]'); },
  resultados: async p => { await p.evaluate(prep, {blk: null, seenAll: true}); await p.reload(); }
};

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: scheme, reducedMotion: 'reduce', isMobile: w < 900, hasTouch: w < 900});
    const p = await ctx.newPage();
    await p.goto(URL);
    for (const [name, go] of Object.entries(SCREENS)) {
      await go(p);
      await p.waitForTimeout(150);
      const sx = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (sx) { fails++; console.log(`  ✗ ${name} ${w}×${h} ${scheme}: desplazamiento horizontal`); }
      if (w === 390 || w === 1280) {   // axe en un móvil y un escritorio basta: el resto de tamaños solo cambia el diseño
        await p.addScriptTag({path: AXE});
        const r = await p.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']})).violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`));
        if (r.length) { fails += r.length; console.log(`  ✗ axe ${name} ${w}×${h} ${scheme}:\n     ` + r.join('\n     ')); }
      }
      if (shots && (w === 390 || w === 1280 || w === 320 || w === 740)) await p.screenshot({path: path.join(OUT, `${name}-${w}x${h}-${scheme}.png`)});
    }
    await ctx.close();
  }
}
await browser.close();
console.log(fails ? `${fails} fallos` : 'Sin fallos de axe ni desplazamiento horizontal');
process.exit(fails ? 1 : 0);

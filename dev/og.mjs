// Genera web/og.png (1200×630): el póster con los datos de ejemplo de los bocetos, para las vistas previas de enlaces.
// Uso, desde dev/: node og.mjs  (después se reduce con PIL: python3 -c "from PIL import Image;Image.open('../web/og.png').convert('RGB').convert('P',palette=Image.ADAPTIVE,colors=48).save('../web/og.png',optimize=True)")
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.URL || 'http://localhost:8765/web/index.html';
const OLD = fs.readFileSync(path.join(here, '..', 'tests', 'estado-guardado.json'), 'utf8');   // INTP · 6w5 · so/sx · 613
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL);
await page.evaluate(s => { localStorage.clear(); localStorage.setItem('mapa-personalidad-v2', s); }, OLD);
await page.reload();
const data = await page.evaluate(async () => {
  await document.fonts.load('850 96px Archivo'); await document.fonts.load('500 26px Archivo');
  const R = compute(), W = 1200, H = 630, M = 72, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), FF = 'Archivo, system-ui, sans-serif';
  const font = (w, s, wide) => { x.font = `${w} ${s}px ${FF}`; if ('fontStretch' in x) x.fontStretch = wide ? 'expanded' : 'normal'; };
  const wrap = (t, mw) => { const out = []; let l = ''; for (const w of t.split(' ')) { const s = l ? l + ' ' + w : w; if (l && x.measureText(s).width > mw) { out.push(l); l = w; } else l = s; } if (l) out.push(l); return out; };
  x.fillStyle = '#0067a8'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff';
  let ts = 76; font(850, ts, true); while (x.measureText('Tu mapa de personalidad').width > W - 2 * M) { ts -= 2; font(850, ts, true); }
  x.fillText('Tu mapa de personalidad', M, M + 70);
  font(500, 28, false); x.fillText('MBTI, eneagrama, instintos y tritipo a partir de situaciones reales. Sin registro.', M, M + 130);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(M, 256, W - 2 * M, 3);
  const tk = TRI[R.triKey], cells = [['MBTI', R.mbti, T16[R.mbti].n], ['Eneagrama', `${R.core}w${R.wing}`, `${lc(E9[R.core].n)}, ala ${R.wing}`],
    ['Instintos', R.stack.slice(0, 2).join('/'), `Subtipo ${R.core} ${INSN[R.stack[0]].split(' ')[0]}`], ['Tritipo', R.tri.map(t => t.t).join(''), tk.slice(0, tk.indexOf(':'))]];
  const cw = (W - 2 * M - 3 * 28) / 4;
  cells.forEach(([lab, code, name], i) => {
    const cx = M + i * (cw + 28); let cy = 326;
    x.fillStyle = '#fff'; font(500, 26, false); x.fillText(lab, cx, cy);
    let s = 96; font(850, s, true); while (x.measureText(code).width > cw - 6 && s > 40) { s -= 4; font(850, s, true); }
    cy += 22 + 96 * .9; x.fillStyle = '#f23d9f'; x.fillText(code, cx + s * .05, cy + s * .045); x.fillStyle = '#fff'; x.fillText(code, cx, cy);
    font(500, 24, false); cy += 12; for (const l of wrap(name, cw).slice(0, 2)) { cy += 32; x.fillText(l, cx, cy); }
  });
  return cv.toDataURL('image/png');
});
fs.writeFileSync(path.join(here, '..', 'web', 'og.png'), Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log('web/og.png listo');

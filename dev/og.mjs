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
  await Promise.all(['600 96px Newsreader', '500 76px Newsreader', 'italic 400 76px Newsreader'].map(f => document.fonts.load(f)));
  const R = compute(), W = 1200, H = 630, M = 72, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), PAPER = '#fbf8f2', INK = '#1e2a44', INK2 = '#5b6375', HAIR = '#e3dccf', MARK = '#ffe07a';
  const SERIF = 'Newsreader, Georgia, serif', SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const font = (f, s, w = 500, it = false) => { x.font = `${it ? 'italic ' : ''}${w} ${s}px ${f}`; };
  const wrap = (t, mw) => { const out = []; let l = ''; for (const w of t.split(' ')) { const s = l ? l + ' ' + w : w; if (l && x.measureText(s).width > mw) { out.push(l); l = w; } else l = s; } if (l) out.push(l); return out; };
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  x.fillStyle = INK2; font(SANS, 26); x.fillText('Test de personalidad gratuito · sin registro', M, 104);
  x.fillStyle = INK; font(SERIF, 76); x.fillText('Tu mapa de ', M, 196);
  const w1 = x.measureText('Tu mapa de ').width; font(SERIF, 76, 400, true); x.fillText('personalidad', M + w1, 196);
  x.fillStyle = HAIR; x.fillRect(M, 262, W - 2 * M, 2);
  const tk = TRI[R.triKey], cells = [['MBTI', R.mbti, T16[R.mbti].n], ['Eneagrama', `${R.core}w${R.wing}`, `${lc(E9[R.core].n)}, ala ${R.wing}`],
    ['Instintos', R.stack.slice(0, 2).join('/'), `Subtipo ${R.core} ${INSN[R.stack[0]].split(' ')[0]}`], ['Tritipo', R.tri.map(t => t.t).join(''), tk.slice(0, tk.indexOf(':'))]];
  const cw = (W - 2 * M - 3 * 32) / 4;
  cells.forEach(([lab, code, name], i) => {
    const cx = M + i * (cw + 32);
    x.fillStyle = INK2; font(SANS, 24); x.fillText(lab, cx, 322);
    let s = 92; font(SERIF, s, 600); while (x.measureText(code).width > cw - 10 && s > 40) { s -= 4; font(SERIF, s, 600); }
    const base = 430, cwid = x.measureText(code).width;
    x.fillStyle = MARK; x.fillRect(cx - s * .08, base - s * .4, cwid + s * .16, s * .36);
    x.fillStyle = INK; x.fillText(code, cx, base);
    font(SERIF, 26, 400, true); let y = 478; for (const l of wrap(name, cw).slice(0, 2)) { x.fillText(l, cx, y); y += 32; }
  });
  return cv.toDataURL('image/png');
});
fs.writeFileSync(path.join(here, '..', 'web', 'og.png'), Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log('web/og.png listo');

// Génère les logos Kizuna en tracés vectoriels (aucun texte dans les SVG).
// Logo = sceau 絆 penché (-7°) + KIZUNA, d'après le header du site (.hd-logo) et le kit design.
// Usage : node logos.mjs <fontsDir avec unb700.ttf> <outDir> <favicon-site.svg>
// (opentype.js doit être résolvable depuis le dossier où le script est lancé)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'x.js'));
const opentype = require('opentype.js');
const [fontsDir, outDir, faviconPath] = process.argv.slice(2);
const unb700 = opentype.parse(fs.readFileSync(path.join(fontsDir, 'unb700.ttf')).buffer);

const RED = '#E8203F', PAPER = '#F4EFE9', SUMI = '#0B0A0D';
const r = n => Math.round(n * 100) / 100;

// ---- Kanji 絆 du favicon du site (tracé gothique)
const fav = fs.readFileSync(faviconPath, 'utf8');
const kanjiD = fav.match(/ d="([^"]+)"/)[1];
const nums = kanjiD.match(/-?\d+(\.\d+)?/g).map(Number);
const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
const kb = { x1: Math.min(...xs), x2: Math.max(...xs), y1: Math.min(...ys), y2: Math.max(...ys) };
const kanji = (cx, cy, size) => {           // kanji centré en (cx, cy), plus grand côté = size
  const s = size / Math.max(kb.x2 - kb.x1, kb.y2 - kb.y1);
  return `translate(${r(cx)} ${r(cy)}) scale(${r(s * 1e4) / 1e4}) translate(${r(-(kb.x1 + kb.x2) / 2)} ${r(-(kb.y1 + kb.y2) / 2)})`;
};

// ---- Sceau : carré aux coins irréguliers 16% 21% 14% 23% (comme .hd-hanko), filet intérieur à 7 %
function rrect(x, y, s) {
  const [tl, tr, br, bl] = [0.16, 0.21, 0.14, 0.23].map(v => v * s);
  return `M${r(x + tl)} ${r(y)}H${r(x + s - tr)}Q${r(x + s)} ${r(y)} ${r(x + s)} ${r(y + tr)}V${r(y + s - br)}Q${r(x + s)} ${r(y + s)} ${r(x + s - br)} ${r(y + s)}H${r(x + bl)}Q${r(x)} ${r(y + s)} ${r(x)} ${r(y + s - bl)}V${r(y + tl)}Q${r(x)} ${r(y)} ${r(x + tl)} ${r(y)}Z`;
}
const S = 100, TILT = -7, INSET = 0.07, KANJI = 0.64, LINE = 2.6;
const PADS = (S * (Math.cos(7 * Math.PI / 180) + Math.sin(7 * Math.PI / 180)) - S) / 2 + 1; // débord dû à la rotation
function seal(cx, cy, { bg = RED, fg = PAPER, line = PAPER, mono = null, id = 'kz' } = {}) {
  const x = cx - S / 2, y = cy - S / 2, i = S * INSET;
  const inner = rrect(x + i, y + i, S - 2 * i);
  const k = kanji(cx, cy, S * KANJI);
  if (mono) {
    return `<defs><mask id="${id}-m"><path fill="#fff" d="${rrect(x, y, S)}"/><path fill="none" stroke="#000" stroke-width="${LINE}" d="${inner}"/><path transform="${k}" fill="#000" d="${kanjiD}"/></mask></defs>` +
      `<g transform="rotate(${TILT} ${r(cx)} ${r(cy)})"><path fill="${mono}" mask="url(#${id}-m)" d="${rrect(x, y, S)}"/></g>`;
  }
  return `<g transform="rotate(${TILT} ${r(cx)} ${r(cy)})"><path fill="${bg}" d="${rrect(x, y, S)}"/>` +
    `<path fill="none" stroke="${line}" stroke-opacity=".55" stroke-width="${LINE}" d="${inner}"/>` +
    `<path transform="${k}" fill="${fg}" d="${kanjiD}"/></g>`;
}

// ---- Wordmark KIZUNA : Unbounded Bold 700, interlettrage 0,04em (comme .hd-word)
const capH = (unb700.tables.os2.sCapHeight || 700) / unb700.unitsPerEm;
const CAP = 0.31 * S, GAP = 0.32 * S, TRACK = 0.04;
function word(x0, cyCap) {
  const size = CAP / capH; let cx = x0; const p = new opentype.Path();
  const gl = unb700.stringToGlyphs('KIZUNA');
  gl.forEach((g, i) => { p.extend(g.getPath(cx, 0, size)); cx += g.advanceWidth * size / unb700.unitsPerEm + (i < gl.length - 1 ? TRACK * size : 0); });
  const b = p.getBoundingBox();
  p.commands.forEach(c => { for (const k of ['x', 'x1', 'x2']) if (c[k] != null) c[k] += x0 - b.x1; for (const k of ['y', 'y1', 'y2']) if (c[k] != null) c[k] += cyCap - CAP / 2 - b.y1; });
  return { d: p.toPathData(2), w: b.x2 - b.x1, size };
}

const H = S + 2 * PADS, C = H / 2;
const W0 = word(C + S / 2 + GAP, C);
const W = Math.ceil(C + S / 2 + GAP + W0.w + 1);
const lockup = (wordColor, sealOpts = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${r(H)}" role="img" aria-label="Kizuna">${seal(C, C, sealOpts)}<path fill="${wordColor}" d="${W0.d}"/></svg>`;

const Wm = word(0, CAP / 2);
const wordmark = c => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(Wm.w)} ${r(CAP)}" role="img" aria-label="Kizuna"><path fill="${c}" d="${Wm.d}"/></svg>`;

// Icône (avatar) : sceau penché seul, marge de 8 %
const AV = S + 2 * PADS + 16;
const avatar = (opts = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(AV)} ${r(AV)}" role="img" aria-label="絆">${seal(AV / 2, AV / 2, opts)}</svg>`;

// Favicon du site : carré droit, coins 72/512 (inchangé)
const kanjiFav = fav.match(/<path transform="([^"]+)"/)[1];
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="絆"><rect width="512" height="512" rx="72" fill="${RED}"/><path transform="${kanjiFav}" fill="#FFFFFF" d="${kanjiD}"/></svg>`;

// ---- Lignes de concentration : rayons fins vers le sujet, couleur du sujet + quelques rayons papier, centre vide
function lines(subject, { ink = false, n = 260, seed = 11 } = {}) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const Z = 1200, Cc = Z / 2, R = Z * 0.75; let col = '', pap = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.02, w = 0.0018 + rnd() * 0.0055, r0 = Z * (0.2 + rnd() * 0.16);
    const p = (rr, aa) => `${r(Cc + rr * Math.cos(aa))} ${r(Cc + rr * Math.sin(aa))}`;
    const d = `M${p(r0, a)}L${p(R, a - w)}L${p(R, a + w)}Z`;
    if (rnd() < 0.2) pap += d; else col += d;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Z} ${Z}"><defs><radialGradient id="g"><stop offset="0" stop-color="${subject}" stop-opacity="${ink ? 0.42 : 0.3}"/><stop offset=".55" stop-color="${subject}" stop-opacity="0"/></radialGradient></defs>` +
    (ink ? `<rect width="${Z}" height="${Z}" fill="${SUMI}"/>` : '') +
    `<rect width="${Z}" height="${Z}" fill="url(#g)"/><path fill="${subject}" fill-opacity=".75" d="${col}"/><path fill="${PAPER}" fill-opacity=".55" d="${pap}"/></svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
const files = {
  'kizuna-logo-sombre.svg': lockup(PAPER),
  'kizuna-logo-clair.svg': lockup(SUMI),
  'kizuna-logo-mono-blanc.svg': lockup('#FFFFFF', { mono: '#FFFFFF', id: 'w' }),
  'kizuna-logo-mono-noir.svg': lockup('#000000', { mono: '#000000', id: 'k' }),
  'kizuna-wordmark-papier.svg': wordmark(PAPER),
  'kizuna-wordmark-sumi.svg': wordmark(SUMI),
  'kizuna-icone-avatar.svg': avatar(),
  'kizuna-favicon.svg': favicon,
  'kizuna-lignes-encre.svg': lines(RED, { ink: true }),
  'kizuna-lignes-transparent.svg': lines(RED),
};
for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(outDir, f), c);

fs.writeFileSync(path.join(outDir, '_brand-fragments.json'), JSON.stringify({
  logo: lockup('currentColor'),
  mark: avatar(),
  favicon,
  lines: lines(RED, { n: 200 }),
  geometry: { W, H: r(H), S, TILT, INSET, KANJI, CAP, GAP, TRACK, wordSize: r(W0.size) },
}, null, 1));
console.log('ok', { W, H: r(H), wordW: r(W0.w) });

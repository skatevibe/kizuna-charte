// Génère les logos Kizuna en tracés vectoriels (aucun texte dans les SVG).
// Usage : node logos.mjs <fontsDir> <outDir> <faviconSvg>
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const [fontsDir, outDir, faviconPath] = process.argv.slice(2);
const load = f => opentype.parse(fs.readFileSync(path.join(fontsDir, f)).buffer);
const unb900 = load('unb900.ttf');
const unb500 = load('unb500.ttf');
const zen900 = load('zen900.ttf');

const RED = '#E8203F', PAPER = '#F4EFE9', SUMI = '#0B0A0D';
const r = n => Math.round(n * 100) / 100;

// Texte -> {d, bbox} avec tracking (en unités de la taille de police)
function textPath(font, text, size, tracking = 0, x = 0, y = 0) {
  let cx = x; const parts = [];
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    parts.push(p);
    cx += g.advanceWidth * size / font.unitsPerEm;
    if (i < glyphs.length - 1) cx += tracking * size;
  });
  const merged = new opentype.Path();
  parts.forEach(p => merged.extend(p));
  return { path: merged, bbox: merged.getBoundingBox() };
}
const shift = (p, dx, dy) => { p.commands.forEach(c => { for (const k of ['x', 'x1', 'x2']) if (c[k] != null) c[k] += dx; for (const k of ['y', 'y1', 'y2']) if (c[k] != null) c[k] += dy; }); return p; };
const d = p => p.toPathData(2);

// ---- Géométrie relevée sur le kit (unité = 1px du logo de référence, hauteur 104)
const H = 104, BAND_W = 38, GAP = 15;
const CAP = 36;           // hauteur de capitale de KIZUNA
const TAG_CAP = 8.5;      // hauteur de capitale de TRADING CARD GAME
const capH = f => (f.tables.os2.sCapHeight || 700) / f.unitsPerEm;

// KIZUNA — Unbounded Black
const kSize = CAP / capH(unb900);
const kTrack = 0.0;
let K = textPath(unb900, 'KIZUNA', kSize, kTrack);
// TRADING CARD GAME — Unbounded Medium, tracking large
const tSize = TAG_CAP / capH(unb500);
// tracking calculé pour que la signature fasse 82 % de la largeur de KIZUNA (relevé sur le kit)
const w0 = (()=>{const b=textPath(unb500, "TRADING CARD GAME", tSize, 0).bbox; return b.x2-b.x1;})();
const kW = K.bbox.x2 - K.bbox.x1;
const tTrack = Math.round(((0.82*kW - w0) / (16*tSize))*100)/100; // em
let T = textPath(unb500, 'TRADING CARD GAME', tSize, tTrack);

// Bloc texte centré verticalement sur la bande, ancré à gauche à BAND_W + GAP
const LINE_GAP = 9;
const blockH = CAP + LINE_GAP + TAG_CAP;
const top = (H - blockH) / 2;
shift(K.path, BAND_W + GAP - K.bbox.x1, top - K.bbox.y1);
shift(T.path, BAND_W + GAP - T.bbox.x1 + 1.5, top + CAP + LINE_GAP - T.bbox.y1);
K.bbox = K.path.getBoundingBox(); T.bbox = T.path.getBoundingBox();
const W = Math.ceil(Math.max(K.bbox.x2, T.bbox.x2) + 1);

// Katakana キズナ — Zen Kaku Gothic New Black, empilés et centrés dans la bande
const kana = ['キ', 'ズ', 'ナ'];
const slot = H / 3;
const kanaPaths = kana.map((ch, i) => {
  const p = textPath(zen900, ch, 27).path;
  const b = p.getBoundingBox();
  const cxT = BAND_W / 2, cyT = slot * i + slot / 2 + (i === 0 ? 3 : i === 2 ? -3 : 0);
  shift(p, cxT - (b.x1 + b.x2) / 2, cyT - (b.y1 + b.y2) / 2);
  return d(p);
}).join('');

const lockup = (wordColor, bandColor = RED, kanaColor = PAPER) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kizuna — Trading Card Game">` +
  `<rect width="${BAND_W}" height="${H}" fill="${bandColor}"/>` +
  `<path fill="${kanaColor}" d="${kanaPaths}"/>` +
  `<path fill="${wordColor}" d="${d(K.path)}"/>` +
  `<path fill="${wordColor}" d="${d(T.path)}"/></svg>`;

// Monochrome : katakana évidés dans la bande (masque)
const mono = c => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kizuna — Trading Card Game"><defs><mask id="kz-band"><rect width="${BAND_W}" height="${H}" fill="#fff"/><path fill="#000" d="${kanaPaths}"/></mask></defs><rect width="${BAND_W}" height="${H}" fill="${c}" mask="url(#kz-band)"/><path fill="${c}" d="${d(K.path)}"/><path fill="${c}" d="${d(T.path)}"/></svg>`;

// Wordmark seul (sans bande ni signature) pour les petits formats horizontaux
const Kw = textPath(unb900, 'KIZUNA', kSize, kTrack); const kb = Kw.bbox;
shift(Kw.path, -kb.x1, -kb.y1);
const wordmark = c => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(kb.x2 - kb.x1)} ${Math.ceil(kb.y2 - kb.y1)}" role="img" aria-label="Kizuna"><path fill="${c}" d="${d(Kw.path)}"/></svg>`;

// Sceau carré 絆 : géométrie du favicon du site, couleurs paramétrables
const fav = fs.readFileSync(faviconPath, 'utf8');
const kanjiTransform = fav.match(/<path transform="([^"]+)"/)[1];
const kanjiD = fav.match(/ d="([^"]+)"/)[1];
const seal = (bg, fg, rx = 72) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="絆"><rect width="512" height="512" rx="${rx}" fill="${bg}"/><path transform="${kanjiTransform}" fill="${fg}" d="${kanjiD}"/></svg>`;

// Hanko : coins irréguliers 16% 21% 14% 23% (comme .hd-hanko), incliné de -7°
function hankoShape(s) {
  const [tl, tr, br, bl] = [0.16, 0.21, 0.14, 0.23].map(v => v * s);
  return `M${tl} 0H${s - tr}Q${s} 0 ${s} ${tr}V${s - br}Q${s} ${s} ${s - br} ${s}H${bl}Q0 ${s} 0 ${s - bl}V${tl}Q0 0 ${tl} 0Z`;
}
const hanko = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 632 632" role="img" aria-label="絆 — sceau"><g transform="rotate(-7 256 256)"><path fill="${bg}" d="${hankoShape(512)}"/><path transform="${kanjiTransform}" fill="${fg}" d="${kanjiD}"/></g></svg>`;

// Soleil : lignes de concentration (rayons fins irréguliers, centre dégagé)
function sun(color, n = 180, seed = 7) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const C = 512, R = 760; let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.02;
    const w = 0.0025 + rnd() * 0.009;       // demi-largeur angulaire
    const r0 = 70 + rnd() * 150;            // rayon intérieur variable
    const p = (rr, aa) => `${r(C + rr * Math.cos(aa))} ${r(C + rr * Math.sin(aa))}`;
    out += `M${p(r0, a)}L${p(R, a - w)}L${p(R, a + w)}Z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Soleil"><path fill="${color}" d="${out}"/></svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
const files = {
  'kizuna-logo-sombre.svg': lockup(PAPER),            // sur fond sombre (version principale)
  'kizuna-logo-clair.svg': lockup(SUMI),              // sur fond clair
  "kizuna-logo-mono-blanc.svg": mono("#FFFFFF"),
  "kizuna-logo-mono-noir.svg": mono("#000000"),
  'kizuna-wordmark-papier.svg': wordmark(PAPER),
  'kizuna-wordmark-sumi.svg': wordmark(SUMI),
  'kizuna-sceau-carre.svg': seal(RED, '#FFFFFF'),
  'kizuna-sceau-hanko.svg': hanko(RED, PAPER),
  'kizuna-soleil-papier.svg': sun(PAPER),
  'kizuna-soleil-rouge.svg': sun(RED),
};
for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(outDir, f), c);

// Fragments currentColor pour brand.json
fs.writeFileSync(path.join(outDir, '_brand-fragments.json'), JSON.stringify({
  logo: lockup('currentColor').replace(' xmlns="http://www.w3.org/2000/svg"', ' xmlns="http://www.w3.org/2000/svg"'),
  mark: seal(RED, '#FFFFFF'),
  hanko: hanko(RED, PAPER),
  sunPaper: sun(PAPER, 140),
  geometry: { W, H, BAND_W, GAP, CAP, TAG_CAP, kSize: r(kSize), tSize: r(tSize), tTrack, K: K.bbox, T: T.bbox },
}, null, 1));
console.log('ok', { W, H, kWidth: r(K.bbox.x2 - K.bbox.x1), tWidth: r(T.bbox.x2 - T.bbox.x1) });

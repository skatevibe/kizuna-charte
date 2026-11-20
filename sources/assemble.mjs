// Assemble brand.json à partir du gabarit, du CSS et des logos vectorisés.
// Usage (depuis le dossier Kizuna) : node sources/assemble.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const brand = JSON.parse(read('sources/brand.template.json'));
const frag = JSON.parse(read('logos/_brand-fragments.json'));

const sunUri = 'data:image/svg+xml,' + encodeURIComponent(frag.sunPaper);
const logoPaper = frag.logo.replace(/currentColor/g, '#F4EFE9');

const pack = (id, color, kanji, title, sub) =>
  `<div class="kz-pack" style="--pc:${color}"><i class="crimp top"></i><i class="rays"></i><i class="tone"></i>` +
  `<div class="win"><span>${kanji}</span></div><span class="stamp">${kanji}</span><span class="head"><b>絆</b>KIZUNA</span>` +
  `<span class="title">${title}</span><span class="ribbon"><b>5</b><small>cartes</small><em>${sub}</em><u>${kanji}</u></span><i class="crimp bot"></i></div>`;

const expand = s => s
  .replace(/%%PACK:([^:]+):([^:]+):([^:]+):([^:]+):([^%]+)%%/g, (_, ...a) => pack(...a.slice(0, 5)))
  .replace(/%%MARK%%/g, frag.mark)
  .replace(/%%LOGO_PAPER%%/g, logoPaper);

const walk = v => typeof v === 'string' ? expand(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;

const out = walk(brand);
out.logo.svg = frag.logo;
out.logo.mark_svg = frag.mark;
out.css = read('sources/brand.css').replace(/%%SUN_PAPER%%/g, sunUri);

const left = JSON.stringify(out).match(/%%[A-Z_]+[^%]*%%/g);
if (left) { console.error('Marqueurs non remplacés :', left); process.exit(1); }
fs.writeFileSync(path.join(root, 'brand.json'), JSON.stringify(out, null, 2));
console.log('brand.json écrit');

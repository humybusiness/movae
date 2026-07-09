// Génère les icônes PNG de Movaé (PWA + Apple + Open Graph) sans dépendance externe.
// Usage : npm run icons
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

// ---------- Encodeur PNG minimal ----------
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filtre "None"
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- Dessin par champs de distance ----------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const SAGE = hex("#7FA68A");
const SAGE_DARK = hex("#4F755D");
const CREAM = hex("#F4F1E8");
const FOND = hex("#F7F7F2");
const LIGNE = hex("#E5E7E0");

// Trois barres arrondies ascendantes = motif Movaé.
// « droop » (0..1) : les barres s'affaissent — le logo devient l'état du corps.
const BASE_BARS = [
  { x: -0.28, top: 0.03, bottom: 0.28 },
  { x: 0.0, top: -0.1, bottom: 0.28 },
  { x: 0.28, top: -0.26, bottom: 0.28 },
];

function barsSd(px, py, cx, cy, scale, droop = 0) {
  let d = Infinity;
  const hw = 0.065 * scale;
  for (const b of BASE_BARS) {
    const top = b.top + (b.bottom - 0.1 - b.top) * droop; // les barres se tassent
    const bx = cx + b.x * scale;
    const byC = cy + ((top + b.bottom) / 2) * scale;
    const bhh = Math.max(hw / scale, (b.bottom - top) / 2) * scale;
    d = Math.min(d, sdRoundRect(px, py, bx, byC, hw, bhh, hw));
  }
  return d;
}

function renderIcon(size, { cornerRatio, motifScale, opaqueSquare }) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const r = size * cornerRatio;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dTile = opaqueSquare ? -1 : sdRoundRect(px, py, c, c, c, c, r);
      const cover = clamp01(0.5 - dTile);
      const t = clamp01((px + py) / (2 * size));
      let cr = SAGE[0] + (SAGE_DARK[0] - SAGE[0]) * t;
      let cg = SAGE[1] + (SAGE_DARK[1] - SAGE[1]) * t;
      let cb = SAGE[2] + (SAGE_DARK[2] - SAGE[2]) * t;
      const dBar = barsSd(px, py, c, c, size * motifScale);
      const bar = clamp01(0.5 - dBar);
      cr = cr + (CREAM[0] - cr) * bar;
      cg = cg + (CREAM[1] - cg) * bar;
      cb = cb + (CREAM[2] - cb) * bar;
      const i = (y * size + x) * 4;
      buf[i] = Math.round(cr);
      buf[i + 1] = Math.round(cg);
      buf[i + 2] = Math.round(cb);
      buf[i + 3] = Math.round(cover * 255);
    }
  }
  return encodePng(size, size, buf);
}

function renderOg(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const logoSize = h * 0.52;
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let cr = FOND[0];
      let cg = FOND[1];
      let cb = FOND[2];
      // cadre discret
      const dFrame = Math.abs(sdRoundRect(px, py, cx, cy, w / 2 - 28, h / 2 - 28, 32)) - 2;
      const frame = clamp01(0.5 - dFrame);
      cr += (LIGNE[0] - cr) * frame;
      cg += (LIGNE[1] - cg) * frame;
      cb += (LIGNE[2] - cb) * frame;
      // pastille logo
      const dTile = sdRoundRect(px, py, cx, cy, logoSize / 2, logoSize / 2, logoSize * 0.22);
      const tile = clamp01(0.5 - dTile);
      if (tile > 0) {
        const t = clamp01((px - (cx - logoSize / 2) + (py - (cy - logoSize / 2))) / (2 * logoSize));
        let tr = SAGE[0] + (SAGE_DARK[0] - SAGE[0]) * t;
        let tg = SAGE[1] + (SAGE_DARK[1] - SAGE[1]) * t;
        let tb = SAGE[2] + (SAGE_DARK[2] - SAGE[2]) * t;
        const dBar = barsSd(px, py, cx, cy, logoSize);
        const bar = clamp01(0.5 - dBar);
        tr += (CREAM[0] - tr) * bar;
        tg += (CREAM[1] - tg) * bar;
        tb += (CREAM[2] - tb) * bar;
        cr += (tr - cr) * tile;
        cg += (tg - cg) * tile;
        cb += (tb - cb) * tile;
      }
      const i = (y * w + x) * 4;
      buf[i] = Math.round(cr);
      buf[i + 1] = Math.round(cg);
      buf[i + 2] = Math.round(cb);
      buf[i + 3] = 255;
    }
  }
  return encodePng(w, h, buf);
}

// Conteneur .ico (Windows / electron-builder) embarquant un PNG 256 px.
function encodeIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type icône
  header.writeUInt16LE(count, 4);
  const entries = [];
  const datas = [];
  let offset = 6 + 16 * count;
  for (const { size, png } of pngBuffers) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; // palette
    e[3] = 0; // réservé
    e.writeUInt16LE(1, 4); // plans
    e.writeUInt16LE(32, 6); // bits/pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    datas.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

writeFileSync(join(outDir, "icon-192.png"), renderIcon(192, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }));
writeFileSync(join(outDir, "icon-512.png"), renderIcon(512, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }));
writeFileSync(join(outDir, "icon-maskable-512.png"), renderIcon(512, { cornerRatio: 0, motifScale: 0.46, opaqueSquare: true }));
writeFileSync(join(outDir, "apple-touch-icon.png"), renderIcon(180, { cornerRatio: 0, motifScale: 0.56, opaqueSquare: true }));
writeFileSync(join(root, "public", "og-image.png"), renderOg(1200, 630));

// Icônes de l'application de bureau (installeur + barre des tâches)
const buildDir = join(root, "build-assets");
mkdirSync(buildDir, { recursive: true });
writeFileSync(
  join(buildDir, "icon.ico"),
  encodeIco([
    { size: 256, png: renderIcon(256, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }) },
    { size: 64, png: renderIcon(64, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }) },
    { size: 32, png: renderIcon(32, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }) },
    { size: 16, png: renderIcon(16, { cornerRatio: 0.22, motifScale: 0.7, opaqueSquare: false }) },
  ]),
);
writeFileSync(join(buildDir, "icon-256.png"), renderIcon(256, { cornerRatio: 0.22, motifScale: 0.62, opaqueSquare: false }));

// ---------- Icônes de tray « vivantes » : le logo se tasse avec vous ----------
const AMBRE = hex("#C9A86A");
const AMBRE_FONCE = hex("#A87B3F");

function renderTray(size, droop, warm) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const r = size * 0.22;
  const c1 = warm === 0 ? SAGE : warm === 1 ? SAGE : AMBRE;
  const c2 = warm === 0 ? SAGE_DARK : warm === 1 ? SAGE_DARK : AMBRE_FONCE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const cover = clamp01(0.5 - sdRoundRect(px, py, c, c, c, c, r));
      const t = clamp01((px + py) / (2 * size));
      let cr = c1[0] + (c2[0] - c1[0]) * t;
      let cg = c1[1] + (c2[1] - c1[1]) * t;
      let cb = c1[2] + (c2[2] - c1[2]) * t;
      const bar = clamp01(0.5 - barsSd(px, py, c, c, size * 0.62, droop));
      cr += (CREAM[0] - cr) * bar;
      cg += (CREAM[1] - cg) * bar;
      cb += (CREAM[2] - cb) * bar;
      const i = (y * size + x) * 4;
      buf[i] = Math.round(cr);
      buf[i + 1] = Math.round(cg);
      buf[i + 2] = Math.round(cb);
      buf[i + 3] = Math.round(cover * 255);
    }
  }
  return encodePng(size, size, buf);
}

// 4 états : frais / ok / à bouger / prioritaire
const TRAY_STATES = [
  { droop: 0, warm: 0 },
  { droop: 0.22, warm: 1 },
  { droop: 0.5, warm: 2 },
  { droop: 0.78, warm: 2 },
];
TRAY_STATES.forEach((s, i) => {
  writeFileSync(join(buildDir, `tray-${i}.png`), renderTray(32, s.droop, s.warm));
});

console.log("Icônes générées : public/icons, og-image, icon.ico, tray-0..3");

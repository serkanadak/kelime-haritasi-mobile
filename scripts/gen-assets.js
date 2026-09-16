#!/usr/bin/env node
/**
 * Uygulama görsellerini (icon / adaptive-icon / splash / favicon) koddan üretir.
 * Harici kütüphane yok — yalnızca Node'un yerleşik zlib'i ile PNG yazar.
 * "Kelime ağı" motifi: koyu zemin + bağlı düğümler + merkez düğüm.
 *
 * Kullanım: npm run gen:assets   (veya node scripts/gen-assets.js)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', 'assets');

const BG = [15, 23, 42, 255]; // #0f172a
const AMBER = [245, 158, 11, 255]; // #f59e0b
const NODE = [51, 65, 85, 255]; // #334155
const EDGE = [100, 116, 139, 255]; // #64748b
const TEXT = [241, 245, 249, 255];

function makeCanvas(w, h, bg) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = bg[3];
  }
  return { w, h, buf };
}

function setPx(c, x, y, color) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const a = color[3] / 255;
  const i = (y * c.w + x) * 4;
  c.buf[i] = Math.round(color[0] * a + c.buf[i] * (1 - a));
  c.buf[i + 1] = Math.round(color[1] * a + c.buf[i + 1] * (1 - a));
  c.buf[i + 2] = Math.round(color[2] * a + c.buf[i + 2] * (1 - a));
  c.buf[i + 3] = 255;
}

function disc(c, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) {
        // kenar yumuşatma
        const edge = r - d;
        const aa = edge < 1.5 ? Math.max(0, edge / 1.5) : 1;
        setPx(c, x, y, [color[0], color[1], color[2], Math.round(color[3] * aa)]);
      }
    }
  }
}

function ring(c, cx, cy, r, thickness, color) {
  for (let y = Math.floor(cy - r - thickness); y <= cy + r + thickness; y++) {
    for (let x = Math.floor(cx - r - thickness); x <= cx + r + thickness; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.abs(d - r) <= thickness) setPx(c, x, y, color);
    }
  }
}

function line(c, x1, y1, x2, y2, width, color) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    disc(c, x, y, width / 2, color);
  }
}

// Basit ağ motifi çizer (tüm boyutlara ölçeklenir).
function drawNetwork(c) {
  const cx = c.w / 2;
  const cy = c.h / 2;
  const R = Math.min(c.w, c.h) * 0.28;
  const nodes = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count - Math.PI / 2;
    nodes.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  }
  const lw = Math.max(2, c.w * 0.012);
  // merkez-uydu kenarları
  nodes.forEach((n) => line(c, cx, cy, n[0], n[1], lw, EDGE));
  // çevre kenarları
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    line(c, a[0], a[1], b[0], b[1], lw * 0.7, EDGE);
  }
  // uydu düğümleri
  const nr = c.w * 0.055;
  nodes.forEach((n, i) => {
    disc(c, n[0], n[1], nr, i % 2 === 0 ? NODE : [...AMBER.slice(0, 3), 200]);
    ring(c, n[0], n[1], nr, Math.max(1, c.w * 0.004), AMBER);
  });
  // merkez düğüm
  disc(c, cx, cy, c.w * 0.085, AMBER);
  disc(c, cx, cy, c.w * 0.05, BG);
  disc(c, cx, cy, c.w * 0.028, TEXT);
}

function encodePng(c) {
  // Filtre baytı (0) + her satır için RGBA
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h);
  for (let y = 0; y < c.h; y++) {
    raw[y * (c.w * 4 + 1)] = 0;
    c.buf.copy(raw, y * (c.w * 4 + 1) + 1, y * c.w * 4, (y + 1) * c.w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0);
  ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// PNG CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function write(name, c) {
  fs.writeFileSync(path.join(OUT, name), encodePng(c));
  console.log(`+ assets/${name} (${c.w}x${c.h})`);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const icon = makeCanvas(1024, 1024, BG);
  drawNetwork(icon);
  write('icon.png', icon);

  // Adaptive icon: güvenli alan için motif biraz küçük kalsın (zaten merkezde).
  const adaptive = makeCanvas(1024, 1024, BG);
  drawNetwork(adaptive);
  write('adaptive-icon.png', adaptive);

  const splash = makeCanvas(1242, 2436, BG);
  drawNetwork({ w: 1242, h: 2436, buf: splash.buf });
  write('splash.png', splash);

  const favicon = makeCanvas(96, 96, BG);
  drawNetwork(favicon);
  write('favicon.png', favicon);

  console.log('\nGörseller üretildi.');
}

main();

// Generates placeholder PWA icons with a centered "V" glyph.
// Pure Node (no native deps); writes uncompressed PNGs via zlib.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "public/icons");
mkdirSync(OUT_DIR, { recursive: true });

// Parse hex "#rrggbb" into [r,g,b].
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Draw a filled polygon (V shape) using simple point-in-polygon.
// V is defined by 6 points (outer V outline) in a normalized 0..1 coordinate space.
function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1];
    const xj = poly[j][0],
      yj = poly[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add filter byte (0) at the start of each scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon(size, padding = 0) {
  const bg = hex("#0ea5e9");
  const fg = [255, 255, 255];
  const rgba = Buffer.alloc(size * size * 4);

  // Fill background
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = bg[0];
    rgba[i * 4 + 1] = bg[1];
    rgba[i * 4 + 2] = bg[2];
    rgba[i * 4 + 3] = 255;
  }

  // V polygon within safe zone. padding is fraction (0..0.2) of size.
  const pad = padding * size;
  const x0 = pad;
  const x1 = size - pad;
  const y0 = pad;
  const y1 = size - pad;
  const w = x1 - x0;
  const h = y1 - y0;

  // Thickness of V strokes
  const t = w * 0.22;
  // Outer V points (top-left slanting to bottom-center to top-right) as outline with thickness
  const cx = (x0 + x1) / 2;
  const poly = [
    [x0, y0],
    [x0 + t, y0],
    [cx, y1 - t * 0.3],
    [x1 - t, y0],
    [x1, y0],
    [cx + t * 0.15, y1],
    [cx - t * 0.15, y1],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (inPolygon(x + 0.5, y + 0.5, poly)) {
        const o = (y * size + x) * 4;
        rgba[o] = fg[0];
        rgba[o + 1] = fg[1];
        rgba[o + 2] = fg[2];
        rgba[o + 3] = 255;
      }
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  { name: "icon-192.png", size: 192, padding: 0.12 },
  { name: "icon-512.png", size: 512, padding: 0.12 },
  { name: "icon-512-maskable.png", size: 512, padding: 0.22 },
  { name: "apple-touch-icon-180.png", size: 180, padding: 0.12 },
];

for (const t of targets) {
  const buf = makeIcon(t.size, t.padding);
  writeFileSync(resolve(OUT_DIR, t.name), buf);
  console.log(`wrote ${t.name} (${buf.length} bytes)`);
}

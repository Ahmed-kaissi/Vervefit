import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

// Resolve PUBLIC relative to this script so the generator is portable
// (the previous version hard-coded a Windows absolute path, which broke
//  `node scripts/make-icons.mjs` from any other working directory).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

// Brand gradient taken directly from public/logo.svg (vervefit-g).
const GRADIENT = [
  [99, 102, 241], // #6366F1  indigo
  [139, 92, 246], // #8B5CF6  violet
  [6, 182, 212],  // #06B6D4  cyan
];

// Interpolate the three-stop gradient at a normalized 0..1 position.
function gradientColor(t) {
  const i = Math.min(1, Math.max(0, t));
  const idx = i * (GRADIENT.length - 1);
  const a = Math.floor(idx);
  const b = Math.ceil(idx);
  const f = idx - a;
  const c1 = GRADIENT[a];
  const c2 = GRADIENT[b];
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * f),
    Math.round(c1[1] + (c2[1] - c1[1]) * f),
    Math.round(c1[2] + (c2[2] - c1[2]) * f),
  ];
}

// CRC-32 table (ISO/IEC 8802-3 / Zlib compatible).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Render public/logo.svg's brand mark into a PNG.
 *
 * Background: rounded rect filled with the linear gradient.
 * Mark: white arc (three strokes) plus a white dot at the arc's top.
 */
function makeIcon(size, outFile) {
  const px = new Uint8ClampedArray(size * size * 4);
  const idx = (x, y) => ((y * size) + x) * 4;
  const cx = size / 2;
  const cy = size / 2;

  // --- Background: rounded-rect gradient -----------------------
  const radius = Math.round(size * 0.28);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inRect = x >= radius && x < size - radius && y >= radius && y < size - radius;
      let inCorner = false;
      if (inRect) {
        const dx = Math.min(x - radius, size - radius - x);
        const dy = Math.min(y - radius, size - radius - y);
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      }
      if (inRect && !inCorner) {
        const t = (x + y) / (size * 2);
        const [r, g, b] = gradientColor(t);
        const p = idx(x, y);
        px[p] = r;
        px[p + 1] = g;
        px[p + 2] = b;
        px[p + 3] = 255;
      }
    }
  }

  // --- Brand mark: white arc (three strokes) + dot ------------
  // Arc geometry mirrors the logo.svg path (a rounded "three-stroke" arc
  // with a small dot at the top), scaled to `size`.
  const markR = size * 0.28;
  const sa = Math.PI * 0.78; // arc start angle
  const ea = Math.PI * 2.35; // arc end angle
  const innerR = size * 0.27;
  const outerR = size * 0.38;

  for (let dy = -outerR; dy <= outerR; dy += 1) {
    for (let dx = -outerR; dx <= outerR; dx += 1) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < innerR || dist > outerR) continue;
      const angle = Math.atan2(dy, dx);
      if (angle >= sa - 0.02 && angle <= ea + 0.02) {
        const p = idx(Math.round(cx + dx), Math.round(cy + dy));
        px[p] = 255;
        px[p + 1] = 255;
        px[p + 2] = 255;
        px[p + 3] = 255;
      }
    }
  }

  // White dot at the top of the arc (logo.svg circle at cx,cy).
  const dotR = Math.round(size * 0.035);
  for (let dy = -dotR; dy <= dotR; dy += 1) {
    for (let dx = -dotR; dx <= dotR; dx += 1) {
      if (Math.sqrt(dx * dx + dy * dy) <= dotR) {
        const p = idx(Math.round(cx + dx), Math.round(cy + dy));
        px[p] = 255;
        px[p + 1] = 255;
        px[p + 2] = 255;
        px[p + 3] = 255;
      }
    }
  }

  // --- Write PNG ----------------------------------------------
  // Each scanline: 1 filter byte + size*4 bytes (RGBA row).
  const lineWidth = size * 4;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA

  const rawLines = [];
  for (let y = 0; y < size; y += 1) {
    const p = idx(0, y);
    const line = Buffer.alloc(lineWidth + 1);
    line[0] = 0; // filter: None
    for (let x = 0; x < size; x += 1) {
      const q = idx(x, y);
      line[1 + x * 4] = px[q];
      line[2 + x * 4] = px[q + 1];
      line[3 + x * 4] = px[q + 2];
      line[4 + x * 4] = px[q + 3];
    }
    rawLines.push(line);
  }
  const raw = Buffer.concat(rawLines);

  const outPath = path.join(PUBLIC, outFile);
  fs.writeFileSync(
    outPath,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
      makeChunk("IHDR", ihdr),
      makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      makeChunk("IEND", Buffer.alloc(0)),
    ]),
  );
  console.log("Wrote", outPath, fs.statSync(outPath).size, "bytes");
}

// --- DEBUG: count non-transparent pixels for the 512 output ---
{
  const size = 512;
  const radius = Math.round(size * 0.28);
  const px = new Uint8ClampedArray(size * size * 4);
  const idx = (x, y) => ((y * size) + x) * 4;
  let nz = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inRect = x >= radius && x < size - radius && y >= radius && y < size - radius;
      let inCorner = false;
      if (inRect) {
        const dx = Math.min(x - radius, size - radius - x);
        const dy = Math.min(y - radius, size - radius - y);
        inCorner = Math.sqrt(dx * dx + dy * dy) > radius;
      }
      if (inRect && !inCorner) {
        const t = (x + y) / (size * 2);
        const [r, g, b] = gradientColor(t);
        const p = idx(x, y);
        px[p] = r;
        px[p + 1] = g;
        px[p + 2] = b;
        px[p + 3] = 255;
        nz += 1;
      }
    }
  }
  console.log('[debug] 512 interior non-transparent pixels:', nz, 'of', size * size);
}
makeIcon(512, "logo-512.png");
makeIcon(192, "logo-192.png");
makeIcon(180, "apple-touch-icon.png");
makeIcon(512, "logo-maskable-512.png");

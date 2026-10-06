import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

const GREEN = { r: 79, g: 174, b: 106 };
const GREEN_DARK = { r: 47, g: 122, b: 74 };
const WHITE = { r: 255, g: 255, b: 255 };

function setPixel(png, x, y, color, alpha = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = alpha;
}

function inRoundedRect(x, y, size, radius) {
  const xr = Math.min(Math.max(x, radius), size - 1 - radius);
  const yr = Math.min(Math.max(y, radius), size - 1 - radius);
  if (x === xr || y === yr) return true;
  const dx = x - xr;
  const dy = y - yr;
  return dx * dx + dy * dy <= radius * radius;
}

function lerp(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const sx = x1 + t * dx;
  const sy = y1 + t * dy;
  const ex = px - sx;
  const ey = py - sy;
  return Math.sqrt(ex * ex + ey * ey);
}

function paintIcon(size, { maskable }) {
  const png = new PNG({ width: size, height: size });
  const pad = maskable ? Math.round(size * 0.12) : 0;
  const box = size - pad * 2;
  const radius = Math.round(box * 0.28);
  const stroke = Math.max(2, Math.round(box * 0.05));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (maskable) {
        setPixel(png, x, y, GREEN);
      } else {
        setPixel(png, x, y, { r: 0, g: 0, b: 0 }, 0);
      }
    }
  }

  for (let y = 0; y < box; y++) {
    for (let x = 0; x < box; x++) {
      if (!inRoundedRect(x, y, box, radius)) continue;
      const t = (x + y) / (box * 2);
      const color = lerp(GREEN, GREEN_DARK, t * 0.55);
      setPixel(png, x + pad, y + pad, color);
    }
  }

  const cx = size / 2;
  const cy = size / 2 + box * 0.08;
  const markR = box * 0.28;
  const paths = [
    [cx - markR * 0.55, cy + markR * 0.15, cx - markR * 0.1, cy - markR * 0.85],
    [cx - markR * 0.1, cy - markR * 0.85, cx + markR * 0.55, cy + markR * 0.05],
    [cx + markR * 0.1, cy - markR * 0.35, cx + markR * 0.02, cy + markR * 0.55],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = false;
      for (const [x1, y1, x2, y2] of paths) {
        if (distToSegment(x + 0.5, y + 0.5, x1, y1, x2, y2) <= stroke) {
          hit = true;
          break;
        }
      }
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - (cy + markR * 0.72);
      if (dx * dx + dy * dy <= (stroke * 1.15) ** 2) hit = true;
      if (hit) setPixel(png, x, y, WHITE);
    }
  }

  return PNG.sync.write(png);
}

function write(name, buffer) {
  const path = join(OUT, name);
  writeFileSync(path, buffer);
  console.log("wrote", path);
}

write("logo-192.png", paintIcon(192, { maskable: false }));
write("logo-512.png", paintIcon(512, { maskable: false }));
write("apple-touch-icon.png", paintIcon(180, { maskable: false }));
write("logo-maskable-512.png", paintIcon(512, { maskable: true }));

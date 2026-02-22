// Generate apple-touch-icon.png (180x180) pixel art of the player character
// Uses only Node.js built-ins (no external dependencies)
const zlib = require('zlib');
const fs = require('fs');

const W = 180, H = 180;
const PX = 9; // each "pixel" of the character is 9x9 real pixels

// Color palette
const C = {
  bg1:    [61, 122, 50],    // green bg
  bg2:    [45, 110, 32],    // darker green
  hair:   [107, 58, 31],
  hair2:  [90, 48, 24],
  skin:   [212, 168, 64],
  eye:    [34, 211, 238],
  mouth:  [150, 112, 58],
  robe:   [17, 8, 40],
  stripe: [124, 58, 237],
  boot:   [160, 98, 45],
  trim:   [232, 192, 184],
  lower:  [13, 5, 32],
  sword:  [251, 191, 36],
  swordT: [245, 200, 66],
  handle: [160, 98, 45],
  white:  [255, 255, 255],
  text:   [200, 200, 200],
};

// Create pixel buffer
const pixels = Buffer.alloc(W * H * 3);

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b;
}

function fillRect(rx, ry, rw, rh, col) {
  for (let y = ry; y < ry + rh; y++)
    for (let x = rx; x < rx + rw; x++)
      setPixel(x, y, col[0], col[1], col[2]);
}

// Background gradient
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(C.bg1[0] * (1-t) + C.bg2[0] * t);
  const g = Math.round(C.bg1[1] * (1-t) + C.bg2[1] * t);
  const b = Math.round(C.bg1[2] * (1-t) + C.bg2[2] * t);
  for (let x = 0; x < W; x++) setPixel(x, y, r, g, b);
}

// Grid lines (subtle)
for (let y = 0; y < H; y += 18) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    pixels[i] = Math.max(0, pixels[i] - 10);
    pixels[i+1] = Math.max(0, pixels[i+1] - 10);
    pixels[i+2] = Math.max(0, pixels[i+2] - 10);
  }
}
for (let x = 0; x < W; x += 18) {
  for (let y = 0; y < H; y++) {
    const i = (y * W + x) * 3;
    pixels[i] = Math.max(0, pixels[i] - 10);
    pixels[i+1] = Math.max(0, pixels[i+1] - 10);
    pixels[i+2] = Math.max(0, pixels[i+2] - 10);
  }
}

// Character offset (centered)
const OX = 27, OY = 9;

function block(gx, gy, gw, gh, col) {
  fillRect(OX + gx * PX, OY + gy * PX, gw * PX, gh * PX, col);
}

// Hair
block(3, 1, 8, 1, C.hair);
block(2, 2, 10, 1, C.hair2);

// Face
block(3, 3, 8, 3, C.skin);
block(2, 3, 1, 2, C.hair); // side fringe

// Eyes
block(4, 4, 2, 1, C.eye);
block(8, 4, 2, 1, C.eye);

// Mouth
block(6, 5, 2, 1, C.mouth);

// Torso (dark-stripe-dark-stripe)
block(3, 6, 8, 1, C.robe);
block(3, 7, 8, 1, C.stripe);
block(3, 8, 8, 1, C.robe);
block(3, 9, 8, 1, C.stripe);

// Arms
block(2, 6, 1, 3, C.robe);
block(11, 6, 1, 3, C.robe);
// Hands
block(2, 9, 1, 1, C.skin);
block(11, 9, 1, 1, C.skin);

// Lower robe
block(4, 10, 6, 2, C.lower);

// Boot trim
block(4, 12, 2, 1, C.trim);
block(8, 12, 2, 1, C.trim);

// Boots
block(4, 13, 2, 1, C.boot);
block(8, 13, 2, 1, C.boot);

// Sword
block(12, 4, 1, 1, C.swordT);
block(12, 5, 1, 4, C.sword);
block(11, 9, 3, 1, C.handle);

// Add text "SOTARO 99" at bottom using simple pixel font
// (keeping it simple - just fill a small area with white dots to suggest text)
const textY = 160;
const label = "SOTARO 99";
const charW = 8, charH = 8, gap = 2;
const totalW = label.length * (charW + gap);
const startX = Math.floor((W - totalW) / 2);

// Simple 5x7 pixel font for key chars
const font = {
  'S': [0x7C,0xC0,0xC0,0x78,0x0C,0x0C,0xF8],
  'O': [0x78,0xCC,0xCC,0xCC,0xCC,0xCC,0x78],
  'T': [0xFC,0x30,0x30,0x30,0x30,0x30,0x30],
  'A': [0x30,0x78,0xCC,0xCC,0xFC,0xCC,0xCC],
  'R': [0xF8,0xCC,0xCC,0xF8,0xD8,0xCC,0xCC],
  '9': [0x78,0xCC,0xCC,0x7C,0x0C,0x0C,0x78],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
};

for (let ci = 0; ci < label.length; ci++) {
  const ch = label[ci];
  const glyph = font[ch];
  if (!glyph) continue;
  const cx = startX + ci * (charW + gap);
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 8; col++) {
      if (bits & (0x80 >> col)) {
        setPixel(cx + col, textY + row, 240, 240, 240);
      }
    }
  }
}

// === Encode as PNG ===
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type (RGB)
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Raw image data with filter byte per row
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  pixels.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}

const compressed = zlib.deflateSync(raw);

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync('apple-touch-icon.png', png);
console.log('Generated apple-touch-icon.png (' + png.length + ' bytes)');

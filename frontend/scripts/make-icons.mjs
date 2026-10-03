// Generates the app icons as real PNGs with no dependencies (Node's zlib
// does the compression). Runs before every build so Vercel, the PWA and the
// iOS (Capacitor) build always have up-to-date icons.
//
//   node scripts/make-icons.mjs
//
// Design: deep night-blue gradient with a soft glow and a white snowflake.
import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, "../public")

// ---- tiny PNG encoder -------------------------------------------------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// ---- drawing ----------------------------------------------------------
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  const x = ax + t * dx - px
  const y = ay + t * dy - py
  return Math.hypot(x, y)
}

/** Snowflake as line segments in a unit space centred on 0,0. */
function snowflakeSegments() {
  const segs = []
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const rot = (x, y) => [x * cos - y * sin, x * sin + y * cos]
    const arm = [[0, 0], [0.62, 0]]
    const b1 = [[0.36, 0], [0.5, 0.13]]
    const b2 = [[0.36, 0], [0.5, -0.13]]
    for (const [[x1, y1], [x2, y2]] of [arm, b1, b2]) {
      const [ax, ay] = rot(x1, y1)
      const [bx, by] = rot(x2, y2)
      segs.push([ax, ay, bx, by])
    }
  }
  return segs
}

function render(size, { padded }) {
  const px = Buffer.alloc(size * size * 4)
  const segs = snowflakeSegments()
  const scale = size * (padded ? 0.3 : 0.36)
  const half = size * 0.028 // line half-width
  const cx = size / 2
  const cy = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      // Base: diagonal night gradient.
      const t = Math.min(1, Math.max(0, (u * 0.4 + v * 0.8) / 1.1))
      let r = 18 + (3 - 18) * t
      let g = 58 + (7 - 58) * t
      let b = 134 + (14 - 134) * t
      // Teal glow lower right, warm hint lower left.
      const tg = Math.exp(-(((u - 0.85) ** 2 + (v - 0.8) ** 2) / 0.08))
      r += (7 - r) * tg * 0.6
      g += (100 - g) * tg * 0.6
      b += (110 - b) * tg * 0.6
      // Top-left sheen.
      const sh = Math.exp(-(((u - 0.2) ** 2 + (v - 0.1) ** 2) / 0.05))
      r += (255 - r) * sh * 0.12
      g += (255 - g) * sh * 0.12
      b += (255 - b) * sh * 0.12

      // Snowflake, anti-aliased by distance.
      const fx = (x + 0.5 - cx) / scale
      const fy = (y + 0.5 - cy) / scale
      let d = Infinity
      for (const [ax, ay, bx, by] of segs) d = Math.min(d, segDist(fx, fy, ax, ay, bx, by))
      const a = Math.max(0, Math.min(1, half - d * scale + 0.5))
      r += (255 - r) * a
      g += (255 - g) * a
      b += (255 - b) * a

      const i = (y * size + x) * 4
      px[i] = Math.round(r)
      px[i + 1] = Math.round(g)
      px[i + 2] = Math.round(b)
      px[i + 3] = 255
    }
  }
  return encodePng(size, px)
}

const outputs = [
  ["icons/apple-touch-icon.png", 180, false],
  ["icons/icon-192.png", 192, false],
  ["icons/icon-512.png", 512, false],
  ["icons/icon-maskable-512.png", 512, true],
  ["icons/icon-1024.png", 1024, false],
]

for (const [file, size, padded] of outputs) {
  const path = resolve(publicDir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, render(size, { padded }))
}
console.log(`icons: wrote ${outputs.length} PNGs to public/icons`)

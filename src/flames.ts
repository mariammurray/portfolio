const PAD = 6
const GLOW_SLOWDOWN = 5   // the light's flicker runs this many times slower than the flames themselves

// Flames are baked into foreground.webp. The mask selects them; each one is redrawn on top,
// stretched/swayed/brightened. Stretch never drops below 1 so the original pixels stay covered.
export function createFlames(canvas: HTMLCanvasElement, fg: HTMLImageElement, mask: HTMLImageElement, onFlicker?: (level: number) => void) {
  const W = canvas.width, H = canvas.height
  const read = (img: HTMLImageElement) => {
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0, W, H)
    return g.getImageData(0, 0, W, H)
  }
  const f = read(fg), m = read(mask)

  // find the mask's connected-by-column flame groups
  const cols: boolean[] = []
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (m.data[(y * W + x) * 4] > 20) {
      cols[x] = true
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  }
  const ranges: [number, number][] = []
  for (let x = x0; x <= x1; x++) {
    if (!cols[x]) continue
    const last = ranges[ranges.length - 1]
    if (last && x - last[1] <= 2) last[1] = x
    else ranges.push([x, x])
  }

  const flames = ranges.map(([a, b]) => {
    let top = H, bot = 0
    for (let y = y0; y <= y1; y++) for (let x = a; x <= b; x++) {
      if (m.data[(y * W + x) * 4] > 20) { top = Math.min(top, y); bot = Math.max(bot, y) }
    }
    const sx = a - PAD, sy = top - PAD, sw = b - a + 1 + PAD * 2, sh = bot - top + 1 + PAD * 2
    const s = document.createElement('canvas')
    s.width = sw; s.height = sh
    const g = s.getContext('2d')!
    const px = g.createImageData(sw, sh)
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * W + sx + x) * 4, o = (y * sw + x) * 4
      px.data[o] = f.data[i]; px.data[o + 1] = f.data[i + 1]; px.data[o + 2] = f.data[i + 2]
      px.data[o + 3] = m.data[i] // mask luminance becomes alpha
    }
    g.putImageData(px, 0, 0)
    return { s, sx, sy, sw, sh, baseX: sx + sw / 2, baseY: sy + sh - PAD, seed: Math.random() * 100 }
  })

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ctx = canvas.getContext('2d')!
  const noise = (t: number, s: number) =>
    (Math.sin(t * 7.3 + s) + Math.sin(t * 12.9 + s * 2.1) * 0.6 + Math.sin(t * 3.1 + s * 0.7) * 0.8) / 2.4

  function draw(t: number) {
    ctx.clearRect(0, 0, W, H)
    let level = 0
    for (const fl of flames) {
      const n = noise(t, fl.seed), n2 = noise(t * 1.3 + 4, fl.seed + 9)
      level += noise(t / GLOW_SLOWDOWN, fl.seed) / flames.length
      const stretch = 1.12 + n * 0.1, sway = n2 * 0.09, narrow = 1 - n * 0.05
      ctx.save()
      ctx.translate(fl.baseX, fl.baseY)
      ctx.rotate(sway)
      ctx.scale(narrow, stretch)
      ctx.drawImage(fl.s, -fl.sw / 2, -(fl.sh - PAD))
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.25 + (n + 1) * 0.15
      ctx.drawImage(fl.s, -fl.sw / 2, -(fl.sh - PAD))
      ctx.restore()
    }
    onFlicker?.(level)
  }

  let raf = 0
  let started = false
  const loop = (now: number) => { draw(now / 1000); raf = requestAnimationFrame(loop) }
  return {
    start: () => {
      if (started) return
      started = true
      if (reduce) draw(0)
      else raf = requestAnimationFrame(loop)
    },
    stop: () => {
      cancelAnimationFrame(raf)
      started = false
    },
  }
}

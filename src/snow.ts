interface Flake { x: number; y: number; r: number; vy: number; sway: number; phase: number; a: number }

// Soft white flake with a faint blue rim so it stays visible on the white preliminary screen.
function sprite(rim: string) {
  const s = 32, c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,.95)')
  grad.addColorStop(0.6, rim)
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

export function createSnow(canvas: HTMLCanvasElement, opts: { width?: number; height?: number; count: number; rim: string; scale?: number }) {
  const ctx = canvas.getContext('2d')!
  const img = sprite(opts.rim)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let w = 0, h = 0, dpr = 1
  let flakes: Flake[] = []
  let last = performance.now()
  let raf = 0

  const make = (initial: boolean): Flake => {
    const depth = Math.random() ** 2
    return {
      x: Math.random() * w, y: initial ? Math.random() * h : -10,
      r: (1.5 + depth * 4.5) * (opts.scale ?? 1),
      vy: (18 + depth * 55) * (opts.scale ?? 1),
      sway: 8 + Math.random() * 18, phase: Math.random() * Math.PI * 2,
      a: 0.45 + depth * 0.55,
    }
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = opts.width ?? canvas.clientWidth
    h = opts.height ?? canvas.clientHeight
    canvas.width = Math.round(w * dpr * (opts.width ? 2 : 1))
    canvas.height = Math.round(h * dpr * (opts.height ? 2 : 1))
    flakes = Array.from({ length: opts.count }, () => make(true))
  }

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const k = canvas.width / w
    ctx.setTransform(k, 0, 0, k, 0, 0)
    ctx.clearRect(0, 0, w, h)
    for (const f of flakes) {
      f.y += f.vy * dt
      f.phase += dt * 0.8
      const x = f.x + Math.sin(f.phase) * f.sway
      if (f.y - f.r > h) Object.assign(f, make(false), { x: Math.random() * w })
      ctx.globalAlpha = f.a
      ctx.drawImage(img, x - f.r, f.y - f.r, f.r * 2, f.r * 2)
    }
    raf = requestAnimationFrame(frame)
  }

  resize()
  if (!opts.width) addEventListener('resize', resize)
  if (reduce) frame(last + 16), cancelAnimationFrame(raf)
  else raf = requestAnimationFrame(frame)
  return { stop: () => cancelAnimationFrame(raf) }
}

import gsap from 'gsap'

const GROUPS = 4
const GLOW = [255, 214, 140]

// The mask is white bulbs on black. Each bulb is found, dealt into a group, and painted as warm light on
// its group's canvas, so groups can twinkle out of step while staying locked to the holly.
export function createTwinkle(parent: HTMLElement, mask: HTMLImageElement, reduce: boolean) {
  const w = mask.naturalWidth, h = mask.naturalHeight
  const src = document.createElement('canvas')
  src.width = w; src.height = h
  const sctx = src.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(mask, 0, 0)
  const px = sctx.getImageData(0, 0, w, h).data

  const labels = new Int32Array(w * h)
  let count = 0
  const stack: number[] = []
  for (let i = 0; i < w * h; i++) {
    if (labels[i] || px[i * 4] <= 20) continue
    const id = ++count
    labels[i] = id
    stack.push(i)
    while (stack.length) {
      const p = stack.pop()!
      const x = p % w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q < 0 || q >= w * h || labels[q] || px[q * 4] <= 20) continue
        labels[q] = id
        stack.push(q)
      }
    }
  }

  const layers = Array.from({ length: GROUPS }, () => {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    c.className = 'twinkle'
    c.setAttribute('aria-hidden', 'true')
    const ctx = c.getContext('2d')!
    return { c, ctx, img: ctx.createImageData(w, h) }
  })
  for (let i = 0; i < w * h; i++) {
    if (!labels[i]) continue
    const d = layers[(labels[i] - 1) % GROUPS].img.data
    d[i * 4] = GLOW[0]; d[i * 4 + 1] = GLOW[1]; d[i * 4 + 2] = GLOW[2]; d[i * 4 + 3] = px[i * 4]
  }
  for (const l of layers) { l.ctx.putImageData(l.img, 0, 0); parent.appendChild(l.c) }

  const els = layers.map((l) => l.c)
  gsap.set(els, { opacity: 0 })
  if (reduce) return { start: () => gsap.set(els, { opacity: 0.8 }) }

  const flicker = (el: HTMLElement) => {
    gsap.to(el, {
      opacity: gsap.utils.random(0.15, 1), duration: gsap.utils.random(0.35, 1.4), ease: 'sine.inOut',
      onComplete: () => flicker(el),
    })
  }
  return { start: () => els.forEach((el, i) => gsap.delayedCall(i * 0.3, () => flicker(el))) }
}

import gsap from 'gsap'
import './style.css'
import { createSnow } from './snow'
import { createFlames } from './flames'
import bgUrl from '../assets/background-no-trees.webp'
import treesUrl from '../assets/background-trees.webp'
import indoorUrl from '../assets/indoor-no-light.webp'
import hollyUrl from '../assets/holly.webp'
import indoorLitUrl from '../assets/indoor-lit.webp'
import hollyLitUrl from '../assets/holly-lit.webp'
import wineUrl from '../assets/wine.webp'
import steamUrl from '../assets/steam.webp'
import maskUrl from '../assets/candles mask.webp'
import lightMaskUrl from '../assets/light mask.webp'
import soundOgg from '../assets/369545__zacki_17__pub_open-air-ogg.ogg'
import soundMp3 from '../assets/369545__zacki_17__pub_open-air-mp3.mp3'
import ringOgg from '../assets/ring-ogg.ogg'
import ringMp3 from '../assets/ring-mp3.mp3'
import { createTwinkle } from './twinkle'
import { createAmbience } from './ambience'
import { createMenu } from './menu'

const KNOBS = {
  minLoader: 1.6,      // minimum time the opening screen stays before entry is enabled
  picFade: 1.6,
  zoomOut: 4.2,
  signFade: 1.2,       // sign fades out before the foreground fades in
  fgFade: 1.4,
}
// picture area inside the background art (the rest is the blue frame)
const PIC = { x: 119 + 50, y: 25, w: 978 - 100, h: 574 - 50 }   // inset so the slanted edges stay off-screen
const MUG_X = 815   // scene x of the mug
const SCENE = { w: 1200, h: 675 }
const MOBILE_BACKGROUND_SHIFT = 160

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!
const scene = $('#scene'), loader = $('#loader'), wash = $('#loader .wash'), copy = $('#loader .copy')
const backdrop = $('#backdrop'), treeLayer = $('#tree-layer'), bg = $<HTMLImageElement>('#bg'), trees = $<HTMLImageElement>('#trees'), indoor = $<HTMLImageElement>('#indoor'), holly = $<HTMLImageElement>('#holly'), wine = $<HTMLImageElement>('#wine')
// pre-baked lit images faded with plain opacity, on all viewports; set to false to try the live blend-mode layers
const baked = true
$('#stage').classList.toggle('baked', baked)
const lit = Array.from(document.querySelectorAll<HTMLImageElement>('.lit'))
const lights = Array.from(document.querySelectorAll<HTMLElement>('.light'))
const GLOW = 0.4   // strength of each soft-light layer (static + flickering); they add up where they overlap
const LIFT = 0.25   // strength of the screen layer relative to the soft-light layer
const PEAK = 0.8   // desktop only: flicker peaks at this fraction of full strength (1 = original)
const reveal = { v: reduce ? 1 : 0 }   // fades the light in together with the indoor layeri
const steams = document.querySelectorAll<HTMLImageElement>('.steam')
const hollyWrap = $('#hollywrap')
const flamesEl = $<HTMLCanvasElement>('#flames')
const ambience = createAmbience([{ url: soundOgg, type: 'audio/ogg; codecs=vorbis' }, { url: soundMp3, type: 'audio/mpeg' }], $<HTMLButtonElement>('#sound'))
const ringAudio = new Audio()
ringAudio.preload = 'auto'
const ringSource = [{ url: ringOgg, type: 'audio/ogg; codecs=vorbis' }, { url: ringMp3, type: 'audio/mpeg' }]
ringAudio.src = ringSource.find((source) => ringAudio.canPlayType(source.type))?.url ?? ringMp3
ringAudio.load()

const loadOnce = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error(`Failed to load ${src}`))
  img.src = src
})
// retry once so a single dropped request on a flaky connection doesn't strand the loading screen
const load = (src: string) => loadOnce(src).catch(() => loadOnce(src))
const wait = (s: number) => new Promise<void>((resolve) => setTimeout(resolve, s * 1000))

// camera: scene pixels -> viewport. zoomed in = picture fills the screen, zoomed out = whole scene covers it
function camera(zoomedIn: boolean) {
  const vw = innerWidth, vh = innerHeight
  const portrait = vw < vh
  const out = Math.max(vw / SCENE.w, vh / SCENE.h) * 1.04   // slight overscan so parallax never exposes the edges
  const scale = zoomedIn ? Math.max(vw / PIC.w, vh / PIC.h) : out
  const box = zoomedIn ? PIC : { x: 0, y: 0, w: SCENE.w, h: SCENE.h }
  const cy = (vh - SCENE.h * scale) / 2
  let x = vw / 2 - (box.x + box.w / 2) * scale
  // on portrait screens the mug sits just right of centre, kept within the visible art
  if (portrait) x = Math.min(-box.x * scale, Math.max(vw - (box.x + box.w) * scale, vw * 0.56 - MUG_X * scale))
  const y = zoomedIn ? vh / 2 - (box.y + box.h / 2) * scale : cy
  return { scale, x, y }
}
let zoomedIn = true
addEventListener('resize', () => {
  gsap.set(scene, camera(zoomedIn))
  renderParallax()
})

const loaderSnow = createSnow($<HTMLCanvasElement>('#loader-snow'), { count: 350, rim: 'rgba(110,140,230,.4)' })
const enterButton = $<HTMLButtonElement>('#enter-pub')
const enterLabel = $('#entry-label')
const enterArrow = $<HTMLSpanElement>('#entry-arrow')

function waitForEntry() {
  return new Promise<void>((resolve) => {
    const cleanup = () => {
      enterButton.removeEventListener('click', enter)
      removeEventListener('wheel', onWheel)
      removeEventListener('keydown', onKeydown)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchend', onTouchEnd)
      removeEventListener('touchcancel', onTouchCancel)
    }
    const enter = () => {
      if (enterButton.disabled) return
      enterButton.disabled = true
      cleanup()
      ringAudio.currentTime = 0
      void ringAudio.play().catch((error: unknown) => console.error('Unable to play pub entry sound', error))
      resolve()
    }
    const onWheel = (event: WheelEvent) => { if (event.deltaY > 0) enter() }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        enter()
      }
    }
    // touch events rather than pointer events: the browser cancels pointer events once it claims a swipe
    let touchStartY: number | null = null
    const onTouchStart = (event: TouchEvent) => { touchStartY = event.touches[0].clientY }
    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY !== null && touchStartY - event.changedTouches[0].clientY > 40) enter()
      touchStartY = null
    }
    const onTouchCancel = () => { touchStartY = null }

    enterButton.addEventListener('click', enter)
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('keydown', onKeydown)
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchend', onTouchEnd)
    addEventListener('touchcancel', onTouchCancel)
  })
}

async function run() {
  const started = performance.now()
  const [[bgImg, treesImg], fgImages] = await Promise.all([
    Promise.all([load(bgUrl), load(treesUrl)]),
    Promise.all([load(indoorUrl), load(steamUrl), load(maskUrl), load(hollyUrl), load(lightMaskUrl), load(wineUrl)]),
  ])
  const [fgImg, steamImg, maskImg, hollyImg, lightMaskImg, wineImg] = fgImages
  bg.src = bgImg.src
  trees.src = treesImg.src
  indoor.src = fgImg.src
  holly.src = hollyImg.src
  holly.hidden = false
  wine.src = wineImg.src
  steams.forEach((s) => { s.src = steamImg.src; s.hidden = false })
  if (baked) { lit[0].src = indoorLitUrl; lit[1].src = hollyLitUrl }
  // decode up front so layers don't pop in tile by tile on first paint
  await Promise.all([bg, trees, indoor, holly, wine, ...(baked ? lit : []), ...Array.from(steams)].map((img) => img.decode().catch(() => {})))

  // Prepare the close-up pub view while the sign remains over the loading screen.
  const sceneSnow = { width: SCENE.w, height: SCENE.h, count: 350, rim: 'rgba(200,215,255,.25)', scale: 0.8 }
  createSnow($<HTMLCanvasElement>('#scene-snow-behind'), sceneSnow)
  createSnow($<HTMLCanvasElement>('#scene-snow'), sceneSnow)
  gsap.set(scene, camera(true))
  // on mobile, slide the backdrop so the sign's transparent areas sit over the snow instead of a dark tree
  if (matchMedia('(orientation: portrait)').matches) gsap.set([backdrop, treeLayer], { x: MOBILE_BACKGROUND_SHIFT })

  await wait(Math.max(0, KNOBS.minLoader - (performance.now() - started) / 1000))
  // Stage 1 -> show the picture and its snow, leaving the sign as the entry prompt.
  await new Promise<void>((resolve) => {
    gsap.timeline({ onComplete: resolve })
      // the scene is always painted beneath the opaque wash; fading the wash avoids group-fading the whole scene
      .to([wash, '#loader-snow'], { opacity: 0, duration: reduce ? 0 : KNOBS.picFade, ease: 'power1.inOut' }, 0)
      .to(copy, { color: '#f6ecd2', duration: reduce ? 0 : KNOBS.picFade, ease: 'power1.inOut' }, 0)
      .to(enterButton, { '--glow': 'rgba(9,16,34,1)', duration: reduce ? 0 : KNOBS.picFade, ease: 'power1.inOut' }, 0)
  })
  loaderSnow.stop()

  // Finish the foreground effects before announcing that the pub is open.
  const noop = { start: () => {}, stop: () => {} }
  const guard = <T>(what: string, make: () => T, fallback: T): T => {
    try { return make() } catch (error) { console.error(`${what} failed`, error); return fallback }
  }
  const flameAnimation = guard('flames', () => createFlames(flamesEl, fgImg, maskImg, (n) => {
    const k = Math.max(0, Math.min(1, (n * 2.2 + 1) / 2))   // 0..1 flicker level
    if (baked) {
      const o = String(reveal.v * k)   // ranges 0%..100% of the baked glow
      for (const l of lit) l.style.opacity = o
      return
    }
    for (const l of lights) {
      if (l.classList.contains('fixed')) { l.style.opacity = String(reveal.v * GLOW); continue }
      const lift = l.classList.contains('lift')
      const strength = lift ? LIFT * (0.4 + (PEAK - 0.4) * k) : GLOW * (0.6 + (PEAK - 0.6) * k)
      l.style.opacity = String(reveal.v * strength)
    }
  }), noop)
  const twinkle = guard('twinkle', () => createTwinkle(hollyWrap, lightMaskImg, reduce), noop)

  enterButton.setAttribute('aria-label', 'Enter the pub')
  enterButton.disabled = false
  // crossfade the label: old text out, new text and arrow in
  await gsap.to(enterLabel, { opacity: 0, duration: reduce ? 0 : 0.5, ease: 'power1.in' })
  enterLabel.textContent = 'Come on in'
  enterArrow.hidden = false
  gsap.set(enterArrow, { opacity: 0 })
  gsap.to([enterLabel, enterArrow], { opacity: 1, duration: reduce ? 0 : 0.7, ease: 'power1.out' })
  ambience.show()
  void ambience.play()
  await waitForEntry()

  // Stage 2 -> dismiss the sign while revealing the foreground.
  flameAnimation.start()
  zoomedIn = false
  const d = reduce ? 0 : 1
  // the zoom-out runs continuously while the sign fades out, then the foreground fades in
  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    const fgStart = KNOBS.signFade * d   // the sign finishes fading before the foreground starts
    tl.to(copy, { opacity: 0, duration: KNOBS.signFade * d, ease: 'power1.inOut' }, 0)
      .to(reveal, { v: 1, duration: KNOBS.fgFade * d, ease: 'power1.inOut' }, fgStart)
      .to([indoor, holly, wine, flamesEl], { opacity: 1, duration: KNOBS.fgFade * d, ease: 'power1.inOut' }, fgStart)
      .to(scene, { ...camera(false), duration: KNOBS.zoomOut * d, ease: 'power2.inOut' }, 0)
      .set(loader, { autoAlpha: 0 })
    if (!reduce) {
      gsap.to(hollyWrap, { rotation: 1.4, skewX: 1.2, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.to(hollyWrap, { y: 3, x: 7, duration: 12.75, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.to(trees, { scaleY: 1.01, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.to(trees, { skewX: 0.6, duration: 6.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    }
    twinkle.start()
  })
  $('#stage').classList.add('steaming')
  startParallax()
  createMenu($('#menu'), reduce).show()
}

// Parallax: pointer, horizontal scroll/trackpad and touch-drag nudge the view. Far layer and near layer
// move in opposite directions so the window feels like a real opening.
// Shift scales with 1/distance: window edge ~1.5m, scene ~15m, so far moves roughly a tenth of near.
const FAR = { x: -5 }, NEAR = { x: 30 }
const look = { x: 0 }   // target, -1..1
const eased = { x: 0 }
let parallaxOn = false

function renderParallax() {
  // In portrait, center on the former left endpoint while retaining the former right endpoint.
  const offset = innerWidth < innerHeight ? eased.x * 2 - 1 : eased.x
  gsap.set('.pic', { x: offset * FAR.x })
  gsap.set('#near', { x: -offset * NEAR.x })
}

function startParallax() {
  if (reduce) return
  parallaxOn = true
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return
    look.x = clamp((e.clientX / innerWidth - 0.5) * 2)
  })
  addEventListener('wheel', (e) => {
    e.preventDefault()
    look.x = clamp(look.x + (e.deltaX || (e.shiftKey ? e.deltaY : 0)) / 500)
  }, { passive: false })
  // touch events rather than pointer events: the browser cancels pointer events once it claims a swipe
  let drag: number | null = null
  addEventListener('touchstart', (e) => {
    drag = (e.target as Element).closest('#menu') ? null : e.touches[0].clientX
  }, { passive: true })
  addEventListener('touchmove', (e) => {
    if (drag === null) return
    const x = e.touches[0].clientX
    look.x = clamp(look.x - (x - drag) / 300)
    drag = x
  }, { passive: true })
  addEventListener('touchend', () => { drag = null })
  addEventListener('touchcancel', () => { drag = null })
  // gyro tilt makes the view drift constantly in the hand, so it is only used where there is no touch input
  if (!matchMedia('(pointer: coarse)').matches) {
    addEventListener('deviceorientation', (e) => {
      if (e.gamma != null) look.x = clamp(e.gamma / 25)
    })
  }
  gsap.ticker.add(() => {
    eased.x += (look.x - eased.x) * 0.06
    renderParallax()
  })
}

renderParallax()
run().catch((error: unknown) => {
  console.error('Pub failed to open', error)
  enterLabel.textContent = 'Sorry, something went wrong. Please reload the page.'
})

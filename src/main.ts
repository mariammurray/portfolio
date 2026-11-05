import gsap from 'gsap'
;(window as unknown as { __appStarted: boolean }).__appStarted = true
const step = (name: string) => { (window as unknown as { __step: string }).__step = name }
step('module start')
import './style.css'
import { createSnow } from './snow'
import { createFlames } from './flames'
import bgUrl from '../assets/background.webp'
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
  zoomOut: 3.2,
  fgFade: 1.4,
}
// picture area inside background.webp (the rest is the blue frame)
const PIC = { x: 119 + 50, y: 25, w: 978 - 100, h: 574 - 50 }   // inset so the slanted edges stay off-screen
const MUG_X = 815   // scene x of the mug
const SCENE = { w: 1200, h: 675 }

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!
const scene = $('#scene'), loader = $('#loader'), wash = $('#loader .wash'), copy = $('#loader .copy')
const bg = $<HTMLImageElement>('#bg'), indoor = $<HTMLImageElement>('#indoor'), holly = $<HTMLImageElement>('#holly'), wine = $<HTMLImageElement>('#wine')
// portrait/mobile uses pre-baked lit images faded with plain opacity; blend-mode layers glitch there
const baked = matchMedia('(orientation: portrait)').matches
$('#stage').classList.toggle('baked', baked)
const lit = Array.from(document.querySelectorAll<HTMLImageElement>('.lit'))
const lights = Array.from(document.querySelectorAll<HTMLElement>('.light'))
const GLOW = 0.4   // strength of each soft-light layer (static + flickering); they add up where they overlap
const LIFT = 0.25   // strength of the screen layer relative to the soft-light layer
const reveal = { v: reduce ? 1 : 0 }   // fades the light in together with the indoor layeri
const steams = document.querySelectorAll<HTMLImageElement>('.steam')
const hollyWrap = $('#hollywrap')
const flamesEl = $<HTMLCanvasElement>('#flames')
step('ambience')
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
addEventListener('resize', () => gsap.set(scene, camera(zoomedIn)))

step('loader snow')
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
  step('loading images')
  const [bgImg, fgImages] = await Promise.all([
    load(bgUrl),
    Promise.all([load(indoorUrl), load(steamUrl), load(maskUrl), load(hollyUrl), load(lightMaskUrl), load(wineUrl)]),
  ])
  const [fgImg, steamImg, maskImg, hollyImg, lightMaskImg, wineImg] = fgImages
  step('images loaded')
  bg.src = bgImg.src
  indoor.src = fgImg.src
  holly.src = hollyImg.src
  holly.hidden = false
  wine.src = wineImg.src
  steams.forEach((s) => { s.src = steamImg.src; s.hidden = false })
  if (baked) { lit[0].src = indoorLitUrl; lit[1].src = hollyLitUrl }
  // decode up front so layers don't pop in tile by tile on first paint
  await Promise.all([bg, indoor, holly, wine, ...(baked ? lit : []), ...Array.from(steams)].map((img) => img.decode().catch(() => {})))

  // Prepare the close-up pub view while the sign remains over the loading screen.
  createSnow($<HTMLCanvasElement>('#scene-snow'), { width: SCENE.w, height: SCENE.h, count: 700, rim: 'rgba(200,215,255,.25)', scale: 0.8 })
  gsap.set(scene, camera(true))
  step('minimum loader wait')

  await wait(Math.max(0, KNOBS.minLoader - (performance.now() - started) / 1000))
  // Stage 1 -> show the picture and its snow, leaving the sign as the entry prompt.
  await new Promise<void>((resolve) => {
    gsap.timeline({ onComplete: resolve })
      // the scene is always painted beneath the opaque wash; fading the wash avoids group-fading the whole scene
      .to([wash, '#loader-snow'], { opacity: 0, duration: reduce ? 0 : KNOBS.picFade, ease: 'power1.inOut' }, 0)
      .to(copy, { color: '#f6ecd2', duration: reduce ? 0 : KNOBS.picFade, ease: 'power1.inOut' }, 0)
  })
  loaderSnow.stop()
  step('flames')

  // Finish the foreground effects before announcing that the pub is open.
  const noop = { start: () => {}, stop: () => {} }
  const guard = <T>(what: string, make: () => T, fallback: T): T => {
    try { return make() } catch (error) { console.error(`${what} failed`, error); return fallback }
  }
  const flameAnimation = guard('flames', () => createFlames(flamesEl, fgImg, maskImg, (n) => {
    const k = Math.max(0, Math.min(1, (n * 2.2 + 1) / 2))   // 0..1 flicker level
    if (baked) {
      const o = String(reveal.v * (0.2 + 0.6 * k))   // ranges 20%..80% of the baked glow; wide because the small viewport hides subtle flicker
      for (const l of lit) l.style.opacity = o
      return
    }
    for (const l of lights) {
      if (l.classList.contains('fixed')) { l.style.opacity = String(reveal.v * GLOW); continue }
      const lift = l.classList.contains('lift')
      const strength = lift ? LIFT * (0.4 + 0.6 * k) : GLOW * (0.6 + 0.4 * k)
      l.style.opacity = String(reveal.v * strength)
    }
  }), noop)
  step('twinkle')
  // twinkles sit mostly off-screen on portrait (mobile) viewports, so skip them there
  const twinkle = matchMedia('(orientation: portrait)').matches ? noop : guard('twinkle', () => createTwinkle(hollyWrap, lightMaskImg, reduce), noop)

  step('ready')
  enterLabel.textContent = 'Open for business'
  enterButton.setAttribute('aria-label', 'Enter the pub')
  enterArrow.hidden = false
  enterButton.disabled = false
  ambience.show()
  void ambience.play()
  await waitForEntry()

  // Stage 2 -> dismiss the sign while revealing the foreground.
  flameAnimation.start()
  zoomedIn = false
  const d = reduce ? 0 : 1
  // fades and zoom-out run together as one continuous movement
  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(reveal, { v: 1, duration: KNOBS.fgFade * d, ease: 'power1.inOut' }, 0)
      .to(copy, { opacity: 0, duration: KNOBS.picFade * d, ease: 'power1.inOut' }, 0)
      .to([indoor, holly, wine, flamesEl], { opacity: 1, duration: KNOBS.fgFade * d, ease: 'power1.inOut' }, 0)
      .to(scene, { ...camera(false), duration: KNOBS.zoomOut * d, ease: 'power2.inOut' }, 0)
      .set(loader, { autoAlpha: 0 })
    if (!reduce) {
      gsap.to(hollyWrap, { rotation: 0.7, skewX: 0.5, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.to(hollyWrap, { y: 3, x: 2, duration: 12.75, ease: 'sine.inOut', yoyo: true, repeat: -1 })
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
const FAR = { x: 3, y: 1.2 }, NEAR = { x: 30, y: 12 }
const look = { x: 0, y: 0 }   // target, -1..1
const eased = { x: 0, y: 0 }
let parallaxOn = false

function startParallax() {
  if (reduce) return
  parallaxOn = true
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return
    look.x = clamp((e.clientX / innerWidth - 0.5) * 2)
    look.y = clamp((e.clientY / innerHeight - 0.5) * 2)
  })
  addEventListener('wheel', (e) => {
    e.preventDefault()
    look.x = clamp(look.x + (e.deltaX || (e.shiftKey ? e.deltaY : 0)) / 500)
  }, { passive: false })
  let drag: number | null = null
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') drag = e.clientX })
  addEventListener('pointermove', (e) => {
    if (drag === null) return
    look.x = clamp(look.x + (e.clientX - drag) / 300)
    drag = e.clientX
  })
  addEventListener('pointerup', () => { drag = null })
  // gyro tilt makes the view drift constantly in the hand, so it is only used where there is no touch input
  if (!matchMedia('(pointer: coarse)').matches) {
    addEventListener('deviceorientation', (e) => {
      if (e.gamma != null) look.x = clamp(e.gamma / 25)
    })
  }
  gsap.ticker.add(() => {
    eased.x += (look.x - eased.x) * 0.06
    eased.y += (look.y - eased.y) * 0.06
    gsap.set('.pic', { x: eased.x * FAR.x, y: eased.y * FAR.y })
    gsap.set('#near', { x: -eased.x * NEAR.x, y: -eased.y * NEAR.y })
  })
}

run().catch((error: unknown) => {
  console.error('Pub failed to open', error)
  enterLabel.textContent = 'Something went wrong. Please reload.'
})

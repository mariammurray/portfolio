import gsap from 'gsap'

const KEY = 'ambience-muted'
const VOLUME = 0.6

// Autoplaying sound longer than 3s needs a way to stop it (WCAG 1.4.2). Browsers also block unmuted autoplay
// until the visitor interacts, so if play() is refused it starts on the first gesture instead.
export function createAmbience(sources: { url: string; type: string }[], button: HTMLButtonElement) {
  const audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  // first format the browser says it can play; mp3 is the last-resort fallback
  const pick = sources.find((s) => audio.canPlayType(s.type)) ?? sources[sources.length - 1]
  audio.src = pick.url
  let muted = localStorage.getItem(KEY) === '1'
  let started = false
  const level = { v: 0 }
  const apply = () => { audio.volume = level.v }

  const render = () => {
    button.setAttribute('aria-pressed', String(muted))
    button.setAttribute('aria-label', muted ? 'Unmute ambient sound' : 'Mute ambient sound')
    button.dataset.muted = String(muted)
  }
  render()

  const fadeTo = (v: number, d: number) => gsap.to(level, { v, duration: d, ease: 'power1.inOut', onUpdate: apply })

  const play = async () => {
    if (started || muted) return
    try {
      level.v = 0; apply()
      await audio.play()
      started = true
      fadeTo(VOLUME, 3)
    } catch {
      const retry = () => {
        removeEventListener('pointerdown', retry)
        removeEventListener('keydown', retry)
        removeEventListener('wheel', retry)
        void play()
      }
      addEventListener('pointerdown', retry, { once: true })
      addEventListener('keydown', retry, { once: true })
      addEventListener('wheel', retry, { once: true, passive: true })
    }
  }

  button.addEventListener('click', () => {
    muted = !muted
    localStorage.setItem(KEY, muted ? '1' : '0')
    render()
    if (muted) {
      gsap.killTweensOf(level)
      fadeTo(0, 0.4).then(() => { if (muted) { audio.pause(); started = false } })
    } else if (started) {
      gsap.killTweensOf(level)
      void audio.play().then(() => fadeTo(VOLUME, 1))
    } else {
      void play()
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (!started || muted) return
    if (document.hidden) audio.pause(); else void audio.play()
  })

  return {
    ready: new Promise<void>((resolve) => {
      if (audio.readyState >= 3) return resolve()
      audio.addEventListener('canplaythrough', () => resolve(), { once: true })
      audio.addEventListener('error', () => resolve(), { once: true })
    }),
    play,
    show: () => { button.hidden = false },
  }
}

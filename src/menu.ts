import './menu.css'
import logoUrl from '../assets/logo.png'
import { PUB_NAME, SECTIONS, APPETIZERS, LINKS, SPECIALS, EDUCATION, type Entry } from './data'

const PEEK = 88   // px of the menu left showing at the bottom of the screen on mobile, before it is pulled up

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text !== undefined) node.textContent = text
  return node
}

function externalLink(label: string, href: string, cls?: string) {
  const a = el('a', cls, label)
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  return a
}

function header() {
  const head = el('header', 'menu-head')
  const logo = el('img', 'menu-logo')
  logo.src = logoUrl
  logo.alt = ''
  const name = el('div', 'menu-name', PUB_NAME)
  const links = el('nav', 'menu-links')
  links.setAttribute('aria-label', 'Contact and social links')
  for (const l of LINKS) {
    const item = el('div', 'menu-link')
    const a = externalLink(l.label, l.href)
    a.title = l.desc
    a.setAttribute('aria-label', l.desc)
    item.append(a)
    links.append(item)
  }
  head.append(links, logo, name)
  return head
}

export function createMenu(root: HTMLElement, reduce: boolean) {
  const mobile = matchMedia('(orientation: portrait)')
  const book = el('div', 'book')
  const leaf = el('div', 'leaf')
  const front = el('section', 'face front')
  const back = el('section', 'face back')
  const tilt = el('div', 'tilt')
  book.append(leaf)
  leaf.append(front, back)
  tilt.append(book)
  root.append(tilt)

  // ---------- front: the menu ----------
  const frontHead = header()
  const handle = el('button', 'handle')
  handle.type = 'button'
  handle.setAttribute('aria-expanded', 'false')
  handle.setAttribute('aria-label', 'Open the menu')
  const arrow = el('button', 'handle-arrow', '▲')
  arrow.type = 'button'
  arrow.setAttribute('aria-hidden', 'true')
  arrow.tabIndex = -1
  frontHead.append(handle, arrow)
  const frontScroll = el('div', 'scroll')
  front.append(frontHead, frontScroll)

  function appendSection(section: typeof SECTIONS[number], interactive = true) {
    const block = el('div', 'course')
    block.append(el('h2', undefined, section.title))
    const list = el('ul')
    for (const entry of section.entries) {
      const item = el('li')
      if (interactive) {
        const btn = el('button', 'dish')
        btn.type = 'button'
        btn.append(el('span', 'dish-name', entry.label), el('span', 'leader'), el('span', 'dish-go', '→'))
        btn.append(el('span', 'dish-desc', entry.desc))
        btn.addEventListener('click', () => flipTo(entry, btn))
        item.append(btn)
      } else {
        const row = el('div', 'dish dish-static')
        row.append(el('span', 'dish-name', entry.label), el('span', 'leader'), el('span', 'dish-desc', entry.desc))
        item.append(row)
      }
      list.append(item)
    }
    block.append(list)
    frontScroll.append(block)
  }
  for (const section of SECTIONS) appendSection(section)

  const education = el('div', 'course education')
  education.append(el('h2', undefined, 'Education'))
  const eduList = el('ul')
  for (const e of EDUCATION) {
    const item = el('li', 'edu')
    item.append(el('span', 'dish-name', e.label), el('span', 'dish-desc', e.desc))
    eduList.append(item)
  }
  education.append(eduList)
  frontScroll.append(education)

  const specials = el('div', 'course specials')
  specials.append(el('h2', undefined, "Specials"))
  const specialList = el('ul')
  for (const s of SPECIALS) {
    const item = el('li', 'special')
    item.append(el('span', 'dish-name', s.label), el('span', 'special-note', s.note))
    specialList.append(item)
  }
  specials.append(specialList)
  frontScroll.append(specials)

  appendSection(APPETIZERS, false)

  // ---------- back: the page for the chosen entry ----------
  const backBtn = el('button', 'back-btn', '← Back to the menu')
  backBtn.type = 'button'
  const backScroll = el('div', 'scroll')
  const backBody = el('article', 'detail')
  backScroll.append(backBody)
  back.append(backBtn, backScroll)

  let current: HTMLElement | null = null
  let flipped = false
  let lift = 0   // mobile only: 0 = just the edge showing, 1 = fully raised

  function fill(entry: Entry) {
    const p = entry.project
    backBody.replaceChildren()
    if (!p) return
    backBody.append(el('h2', undefined, p.title))
    for (const para of p.body) backBody.append(el('p', undefined, para))
    const ul = el('ul', 'detail-links')
    for (const [label, href] of p.links) {
      const li = el('li')
      li.append(externalLink(label, href))
      ul.append(li)
    }
    backBody.append(ul, el('div', 'fleuron'))
  }

  function setFlipped(on: boolean) {
    flipped = on
    book.classList.toggle('flipped', on)
    front.inert = on
    back.inert = !on
    front.setAttribute('aria-hidden', String(on))
    back.setAttribute('aria-hidden', String(!on))
  }

  // faces only become focusable once the sheet has turned edge-on and they swap visibility
  function focusAfterSwap(node: HTMLElement) {
    setTimeout(() => node.focus({ preventScroll: true }), reduce ? 20 : 650)
  }

  function flipTo(entry: Entry, opener: HTMLElement) {
    if (!entry.project) { window.open(entry.href, '_blank', 'noopener'); return }
    current = opener
    fill(entry)
    backScroll.scrollTop = 0
    setFlipped(true)
    focusAfterSwap(backBtn)
  }

  function flipBack() {
    if (!flipped) return
    setFlipped(false)
    if (current) focusAfterSwap(current)
  }
  backBtn.addEventListener('click', flipBack)

  // ---------- mobile: pull the menu up from the bottom edge ----------
  const collapsed = () => mobile.matches && lift < 0.5

  function setLift(v: number, animate: boolean) {
    lift = Math.max(0, Math.min(1, v))
    root.classList.toggle('dragging', !animate)
    root.style.setProperty('--lift', String(lift))
    syncState()
  }

  function syncState() {
    const isCollapsed = collapsed()
    root.classList.toggle('collapsed', isCollapsed)
    frontScroll.inert = isCollapsed
    handle.setAttribute('aria-expanded', String(!isCollapsed))
    handle.setAttribute('aria-label', isCollapsed ? 'Open the menu' : 'Close the menu')
    if (isCollapsed && flipped) setFlipped(false)
  }
  root.style.setProperty('--peek', `${PEEK}px`)
  mobile.addEventListener('change', syncState)
  setFlipped(false)
  syncState()

  // the arrow sits above the contact links, so it needs its own button rather than relying on the handle underneath
  for (const btn of [handle, arrow]) btn.addEventListener('click', () => {
    if (suppressClick) return
    setLift(collapsed() ? 1 : 0, true)
  })

  let suppressClick = false
  let drag: { x: number; y: number; lift: number; moved: boolean } | null = null
  const range = () => Math.max(1, root.offsetHeight - PEEK)

  addEventListener('pointerdown', (e) => {
    if (!shown || !mobile.matches || e.pointerType !== 'touch') return
    const t = e.target as Element
    if (t.closest('#sound')) return
    const inHead = !!t.closest('.menu-head')
    if (!(collapsed() || inHead)) return
    drag = { x: e.clientX, y: e.clientY, lift, moved: false }
  }, true)
  addEventListener('pointermove', (e) => {
    if (!drag) return
    const dy = e.clientY - drag.y, dx = e.clientX - drag.x
    if (!drag.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) drag.moved = true
    if (drag.moved) setLift(drag.lift - dy / range(), false)
  }, true)
  const endDrag = (e: PointerEvent) => {
    if (!drag) return
    const { moved, y } = drag
    drag = null
    if (!moved) return
    const dy = e.clientY - y
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 60)
    setLift(dy < -30 ? 1 : dy > 30 ? 0 : Math.round(lift), true)
  }
  addEventListener('pointerup', endDrag, true)
  addEventListener('pointercancel', endDrag, true)

  // pulling down on the list while it sits at the top lowers the menu (touch events keep firing while the
  // browser handles the scroll, unlike pointer events, which it cancels)
  let pull: { y: number; lift: number; active: boolean } | null = null
  const endPull = (e: TouchEvent) => {
    const p = pull
    pull = null
    if (!p?.active) return
    const dy = (e.changedTouches[0]?.clientY ?? p.y) - p.y
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 60)
    setLift(dy > 30 || lift < 0.5 ? 0 : 1, true)
  }
  frontScroll.addEventListener('touchstart', (e) => {
    pull = mobile.matches && !collapsed() ? { y: e.touches[0].clientY, lift, active: false } : null
  }, { passive: true })
  frontScroll.addEventListener('touchmove', (e) => {
    if (!pull) return
    const y = e.touches[0].clientY
    if (!pull.active) {
      if (frontScroll.scrollTop > 0 || y < pull.y - 4) { pull = null; return }
      if (y - pull.y < 12) return
      pull.active = true
      pull.y = y
    }
    setLift(pull.lift - (y - pull.y) / range(), false)
  }, { passive: true })
  frontScroll.addEventListener('touchend', endPull)
  frontScroll.addEventListener('touchcancel', endPull)

  // scrolling up from the bottom edge raises the menu; scrolling over the header lowers it again
  addEventListener('wheel', (e) => {
    if (!shown || !mobile.matches) return
    if (collapsed() && e.deltaY > 6) setLift(1, true)
    else if (!collapsed() && e.deltaY < -6 && (e.target as Element).closest('.menu-head')) setLift(0, true)
  }, { capture: true, passive: true })
  // the page-wide parallax must not hijack scrolling or dragging inside the menu
  root.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true })
  root.addEventListener('pointerdown', (e) => e.stopPropagation())

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !shown) return
    if (flipped) flipBack()
    else if (mobile.matches && !collapsed()) setLift(0, true)
  })

  let shown = false
  return {
    show() {
      shown = true
      root.hidden = false
      // next frame, so the entrance transition runs from the hidden state
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('shown')))
      if (reduce) root.classList.add('reduce')
    },
  }
}

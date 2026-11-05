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

function socialIcon(label: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')

  const paths: Record<string, string> = {
    GitHub: 'M12 .297a12 12 0 0 0-3.79 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 6.006 0c2.29-1.553 3.296-1.23 3.296-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.805 5.624-5.478 5.921.43.372.814 1.102.814 2.222v3.293c0 .319.216.694.825.576A12 12 0 0 0 12 .297z',
    LinkedIn: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.119 20.452H2.555V9h3.564v11.452z',
  }

  if (label === 'Email') {
    for (const d of ['M3 5.5h18v13H3z', 'm3 6.5 9 7 9-7']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1.8')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      svg.append(path)
    }
  } else {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', paths[label])
    path.setAttribute('fill', 'currentColor')
    svg.append(path)
  }
  return svg
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
    const a = externalLink(l.label, l.href)
    a.title = l.desc
    a.setAttribute('aria-label', l.desc)
    a.replaceChildren(socialIcon(l.label))
    links.append(a)
  }
  const top = el('div', 'menu-top')
  top.append(links, el('div', 'menu-owner', 'Maria Murray'))
  head.append(top, logo, name)
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

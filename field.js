// Block field engine: colour maths, isometric projection, spring physics, drawing, input.
// Reads its settings (KEYS, SPEED, ...) from the config script in index.html.

// ===== colour helpers =====
// Colours come from the CSS variables in :root (index.html).
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COLORS = ["--c1", "--c2", "--c3", "--c4"].map(cssVar); // lightest -> darkest
const BACKGROUND = cssVar("--bg");
const LETTER_GREY = cssVar("--letter-grey");
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const css = (c, k = 1) => `rgb(${c.map(v => Math.round(Math.min(255, v * k))).join(",")})`;
const cssRgb = (c, k = 1) => {
  const r = (c[0] * k + 0.5) | 0;
  const g = (c[1] * k + 0.5) | 0;
  const b = (c[2] * k + 0.5) | 0;
  return `rgb(${r < 255 ? r : 255},${g < 255 ? g : 255},${b < 255 ? b : 255})`;
};
const BG = hex(BACKGROUND);
// swell ramp runs from the darkest (rest) to the lightest (peak)
const RAMP = COLORS.map(hex).reverse();
const REST = mix(RAMP[0], BG, 0.78);
const REST_LEFT = css(REST, 0.55);
const REST_RIGHT = css(REST, 0.38);
const REST_TOP = css(REST, 1);
function swellColor(t) {
  if (t <= 0) return REST;
  const x = Math.min(1, t) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const from = i === 0 ? mix(REST, RAMP[0], Math.min(1, x * 1.0)) : RAMP[i];
  return i === 0 ? mix(REST, RAMP[1], x) : mix(from, RAMP[i + 1], x - i);
}

// ===== glyphs =====
const GITHUB = new Path2D("M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656");

function drawGlyph(ctx, glyph, color, face) {
  // glyph space is a 100x100 square lying on the block's top face
  ctx.fillStyle = color;
  if (glyph.icon === "github") {
    ctx.save(); ctx.translate(8, 8); ctx.scale(5.2, 5.2); ctx.fill(GITHUB); ctx.restore();
  } else if (glyph.icon === "linkedin") {
    ctx.beginPath(); ctx.roundRect(8, 8, 84, 84, 16); ctx.fill();
    ctx.fillStyle = face;
    ctx.font = "800 62px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("in", 50, 55);
  } else if (glyph.img) {
    ctx.drawImage(glyph.img, 14, 14, 72, 72);
  } else {
    ctx.font = "700 60px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (glyph.rotate) {
      ctx.translate(50, 50); ctx.rotate(glyph.rotate * Math.PI / 180); ctx.translate(-50, -50);
    }
    const w = ctx.measureText(glyph.text).width;
    const maxW = glyph.rotate ? 116 : 76;
    const size = glyph.fontSize || Math.min(72, 60 * maxW / w);
    ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
    ctx.fillText(glyph.text, 50, 54);
  }
}

// Pre-render filler letters onto offscreen canvases once
const letterCanvases = {};
for (const ch of new Set(NAME_TEXT)) {
  const c = document.createElement("canvas");
  c.width = c.height = 100;
  const x = c.getContext("2d");
  x.font = "700 60px Inter, system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const w = x.measureText(ch).width;
  const size = Math.min(72, 60 * 76 / w);
  x.font = `700 ${size}px Inter, system-ui, sans-serif`;
  x.fillStyle = LETTER_GREY;
  x.fillText(ch, 50, 54);
  letterCanvases[ch] = c;
}

// Image icons are white silhouettes; tint a cached copy per ink level.
const TINT_LEVELS = 8;
const iconImages = {};
function tinted(src, level, color) {
  const key = src + level;
  if (tinted.cache[key]) return tinted.cache[key];
  const img = iconImages[src];
  if (!img || !img.complete || !img.naturalWidth) return null;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, 256, 256);
  x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  return (tinted.cache[key] = c);
}
tinted.cache = {};
KEYS.forEach(k => {
  if (k.icon && k.icon.includes("/")) { const im = new Image(); im.src = k.icon; iconImages[k.icon] = im; }
});

const nav = document.getElementById("links");

// ===== field =====
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let W, H, CY, dpr, TW, TH, N, half, h, v, specials, fillers, keyCells, hover = null, focusedKey = null, holeCI, holeCJ, holeCells, holeDelay, activeProject = null, holeT = 0, holeH0, returnFocus = null, DEPTH, MAXH, mobile;
let hTW, hTH, y0Offset, y2Offset, tA, tB, tC, tD;
const GAP = 0.58;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function rand(n) { return Math.floor(Math.random() * n); }
const cell = (i, j) => i * N + j;
const proj = (i, j, z = 0) => [W / 2 + (i - j) * TW / 2, CY + (i + j - 2 * half) * TH / 2 - z];

function updateGeometryConstants() {
  hTW = GAP * TW / 2;
  hTH = TH / 2;
  y0Offset = (1 - GAP) * hTH;
  y2Offset = (1 + GAP) * hTH;
  tA = dpr * hTW / 100;
  tB = dpr * GAP * hTH / 100;
  tC = -tA;
  tD = tB;
}

function setup() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  mobile = W <= MOBILE_MAX_WIDTH;
  // On desktop, size the keys so about DESKTOP_ROWS horizontal rows fill the screen height
  // (rows are TH / 2 = 0.28 * TW apart), which also keeps the field filling the width.
  TW = mobile ? W / (typeof MOBILE_KEY_DIVISOR !== "undefined" ? MOBILE_KEY_DIVISOR : 3.45) : Math.max(56, H / (DESKTOP_ROWS * 0.28)); TH = TW * 0.56;
  DEPTH = TW * 0.33; MAXH = TW * 0.45;
  updateGeometryConstants();
  N = Math.ceil(W / TW + H / TH) + 6; half = (N - 1) / 2;
  h = new Float32Array(N * N); v = new Float32Array(N * N);

  const c = Math.round(half);
  if (mobile) CY = H * 0.4;
  else {
    // Put the middle of the KEYS group at KEYS_Y_DESKTOP of the screen height, whatever the key size.
    const sums = KEYS.map(k => k.at[0] + k.at[1]);
    const mid = (Math.min(...sums) + Math.max(...sums)) / 2;
    CY = H * KEYS_Y_DESKTOP - (2 * (c - half) + mid) * TH / 2;
  }
  specials = new Map();
  for (const k of KEYS) specials.set(cell(c + k.at[0], c + k.at[1]), k);
  fillers = new Uint8Array(N * N);
  for (let n = 0; n < fillers.length; n++) fillers[n] = rand(NAME_TEXT.length);
  keyCells = new Map(KEYS.map(k => [k, cell(c + k.at[0], c + k.at[1])]));

  // The hole is centred on the middle of the KEYS group.
  const is = KEYS.map(k => k.at[0]), js = KEYS.map(k => k.at[1]);
  holeCI = c + (Math.min(...is) + Math.max(...is)) / 2 + 0.5;
  holeCJ = c + (Math.min(...js) + Math.max(...js)) / 2 + 0.5;
  holeCells = new Set(); holeDelay = new Map();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = Math.hypot(i + .5 - holeCI, j + .5 - holeCJ);
    if (d <= HOLE_RADIUS) { holeCells.add(cell(i, j)); holeDelay.set(cell(i, j), d / HOLE_RADIUS * 0.5); }
  }
  layoutPanel();
  render();
  wake();
}

// ===== project panel in the middle of the hole =====
const panel = document.getElementById("project");
function layoutPanel() {
  // largest rectangle inscribed in the on-screen ellipse is R*TW wide and R*TH tall
  const [x, y] = proj(holeCI, holeCJ);
  // slightly larger than the inscribed rectangle; the panel's own background hides any block edges it overlaps
  const w = Math.min(HOLE_RADIUS * TW * 1.1, W - 32), hh = mobile ? H * 0.55 : Math.min(HOLE_RADIUS * TH * 1.25, H - 32);
  panel.style.left = x + "px"; panel.style.top = y + "px";
  panel.style.width = w + "px"; panel.style.maxHeight = hh + "px";
  panel.style.fontSize = Math.max(12.5, Math.min(16, TW * 0.095)) + "px";
}
const HOLE_REVEAL = 1.25; // holeT at which all blocks have finished dropping (1.0) plus a buffer
const holeProgress = id => Math.max(0, Math.min(1, (holeT - holeDelay.get(id)) / 0.5));

function openProject(k, from) {
  activeProject = k; returnFocus = from;
  holeH0 = Float32Array.from(h);
  const p = k.project;
  document.getElementById("project-title").textContent = p.title;
  document.getElementById("project-desc").replaceChildren(...p.body.map(t => { const e = document.createElement("p"); e.textContent = t; return e; }));
  document.getElementById("project-links").replaceChildren(...p.links.map(([label, href]) => {
    const li = document.createElement("li"), a = document.createElement("a");
    a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label;
    const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = " (opens in a new tab)";
    a.appendChild(sr); li.appendChild(a); return li;
  }));
  nav.inert = true; focusedKey = null; hover = null; canvas.style.cursor = "default";
  if (reduceMotion.matches) holeT = 2;
  wake();
}
function closeProject() {
  if (!activeProject) return;
  activeProject = null;
  focusedKey = null;
  panel.classList.remove("open");
  nav.inert = false;
  if (reduceMotion.matches) holeT = 0;
  if (returnFocus) {
    returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  wake();
}
document.getElementById("project-back").addEventListener("click", closeProject);
addEventListener("keydown", e => { if (e.key === "Escape") closeProject(); });

function facePoints(i, j, z) {
  const m = (1 - GAP) / 2;
  return [proj(i + m, j + m, z), proj(i + 1 - m, j + m, z), proj(i + 1 - m, j + 1 - m, z), proj(i + m, j + 1 - m, z)];
}

// ===== spring physics: each block is pulled toward its neighbours and back to rest =====
function step() {
  const k = 0.02 * SPEED, c = 0.2 * SPEED, damp = Math.pow(0.95, SPEED);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const id = cell(i, j);
    const nb = ((i > 0 ? h[id - N] : 0) + (i < N - 1 ? h[id + N] : 0) + (j > 0 ? h[id - 1] : 0) + (j < N - 1 ? h[id + 1] : 0)) / 4;
    v[id] = (v[id] + (nb - h[id]) * c - h[id] * k) * damp;
  }
  let maxEnergy = 0;
  for (let n = 0; n < h.length; n++) {
    h[n] += v[n] * SPEED;
    const e = Math.abs(h[n]) + Math.abs(v[n]);
    if (e > maxEnergy) maxEnergy = e;
  }
  for (const id of holeCells) if (holeT > 0) h[id] = v[id] = 0;
  holeT = Math.max(0, Math.min(HOLE_REVEAL, holeT + (activeProject ? 1 : -1) / 60 * 1.2));
  // reveal the text only once every block has dropped, plus a short buffer
  if (activeProject && holeT >= HOLE_REVEAL && !panel.classList.contains("open")) {
    panel.classList.add("open");
    document.getElementById("project-title").focus({ preventScroll: true });
  }
  return maxEnergy;
}

function poke(px, py, strength) {
  if (reduceMotion.matches) return;
  strength *= SPEED;
  const gx = (px - W / 2) / (TW / 2), gy = (py - CY) / (TH / 2) + 2 * half;
  const ci = (gx + gy) / 2, cj = (gy - gx) / 2, R = 2.2;
  for (let i = Math.floor(ci - R * 2); i <= ci + R * 2; i++) for (let j = Math.floor(cj - R * 2); j <= cj + R * 2; j++) {
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    const d2 = (i + .5 - ci) ** 2 + (j + .5 - cj) ** 2;
    v[cell(i, j)] += strength * Math.exp(-d2 / (R * R));
  }
  wake();
}

function hitSpecial(px, py) {
  if (holeT > 0) return null;
  for (const [id, k] of specials) {
    if (!k.href) continue;
    const i = Math.floor(id / N), j = id % N;
    const p = facePoints(i, j, Math.max(0, h[id]));
    const cx = (p[0][0] + p[2][0]) / 2, cy = (p[0][1] + p[2][1]) / 2;
    if (Math.abs(px - cx) / (TW * GAP / 2) + Math.abs(py - cy) / (TH * GAP / 2) <= 1) return k;
  }
  return null;
}

// ===== keyboard-accessible links mirror the clickable keys =====
for (const k of KEYS) {
  if (!k.href) continue;
  const a = document.createElement("a");
  a.href = k.href;
  if (k.project) a.addEventListener("click", e => { e.preventDefault(); openProject(k, a); });
  else { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  if (k.desc) a.setAttribute("aria-label", `${k.label}: ${k.desc}`);
  else a.textContent = k.label;
  const labelSpan = document.createElement("span");
  labelSpan.textContent = k.label;
  const sr = document.createElement("span");
  sr.className = "sr"; sr.textContent = " (opens in a new tab)";
  a.textContent = "";
  a.appendChild(labelSpan);
  a.appendChild(sr);
  a.addEventListener("focus", () => {
    try {
      if ("matches" in a && !a.matches(":focus-visible")) return;
    } catch (e) {}
    focusedKey = k;
    const id = keyCells.get(k), p = facePoints(Math.floor(id / N), id % N, 0);
    poke((p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, CLICK_STRENGTH * 1.1);
  });
  a.addEventListener("blur", () => {
    if (focusedKey === k) focusedKey = null;
  });
  a.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "Enter") {
      const id = keyCells.get(k), p = facePoints(Math.floor(id / N), id % N, 0);
      poke((p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, CLICK_STRENGTH * 1.5);
      if (e.key === " ") {
        e.preventDefault();
        if (k.project) openProject(k, a);
        else window.open(k.href, "_blank", "noopener,noreferrer");
      }
    }
  });
  nav.appendChild(a);
}

// ===== input =====
let last = null;
addEventListener("pointermove", e => {
  if (last) poke(e.clientX, e.clientY, Math.min(2.2, Math.hypot(e.clientX - last[0], e.clientY - last[1]) / 18));
  last = [e.clientX, e.clientY];
  hover = hitSpecial(e.clientX, e.clientY);
  canvas.style.cursor = hover ? "pointer" : "default";
  wake();
});
addEventListener("pointerleave", () => { last = null; });
canvas.addEventListener("pointerdown", e => {
  poke(e.clientX, e.clientY, CLICK_STRENGTH);
  const k = hitSpecial(e.clientX, e.clientY);
  if (k && k.project) openProject(k);
  else if (k) window.open(k.href, "_blank", "noopener");
});

// ===== drawing =====
function drawBlock(i, j) {
  const id = cell(i, j), drop = holeT > 0 && holeCells.has(id) ? holeProgress(id) : 0;
  if (drop >= 1) return;

  const base = holeT > 0 && holeCells.has(id) ? (activeProject ? holeH0[id] : 0) : h[id];
  const isRest = Math.abs(base) < 0.001;
  const z = base - drop * drop * (DEPTH * 2 + MAXH + Math.max(0, base));

  const cx = W / 2 + (i - j) * (TW / 2);
  const cy = CY + (i + j - 2 * half) * hTH - z;
  const dz = z + DEPTH;

  const p0x = cx, p0y = cy + y0Offset;
  const p1x = cx + hTW, p1y = cy + hTH;
  const p2x = cx, p2y = cy + y2Offset;
  const p3x = cx - hTW, p3y = cy + hTH;

  const bot1y = p1y + dz;
  const bot2y = p2y + dz;
  const bot3y = p3y + dz;

  if (drop > 0) {
    ctx.save();
    ctx.globalAlpha = 1 - drop * drop;
  }

  let cLeft, cRight, cTop, col, glow;
  if (isRest) {
    cLeft = REST_LEFT;
    cRight = REST_RIGHT;
    cTop = REST_TOP;
  } else {
    const t = Math.max(0, base) / MAXH;
    col = swellColor(t * 1.15);
    cLeft = cssRgb(col, 0.55);
    cRight = cssRgb(col, 0.38);
    glow = Math.min(1, t * 1.4);
    cTop = cssRgb(mix(col, [255, 255, 255], glow * 0.08), 1 + glow * 0.1);
  }

  // Left face
  ctx.beginPath();
  ctx.moveTo(p3x, p3y); ctx.lineTo(p2x, p2y); ctx.lineTo(p2x, bot2y); ctx.lineTo(p3x, bot3y); ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle = cLeft; ctx.fill(); ctx.stroke();

  // Right face
  ctx.beginPath();
  ctx.moveTo(p2x, p2y); ctx.lineTo(p1x, p1y); ctx.lineTo(p1x, bot1y); ctx.lineTo(p2x, bot2y); ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle = cRight; ctx.fill(); ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.lineTo(p3x, p3y); ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle = cTop; ctx.fill(); ctx.stroke();

  const key = specials.get(id);
  const S = 100;
  if (!key) {
    ctx.setTransform(tA, tB, tC, tD, dpr * p0x, dpr * p0y);
    ctx.drawImage(letterCanvases[NAME_TEXT[fillers[id]]], 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else {
    ctx.save();
    const ux = (p1x - p0x) / S, uy = (p1y - p0y) / S;
    const vx = (p3x - p0x) / S, vy = (p3y - p0y) / S;
    ctx.transform(ux, uy, vx, vy, p0x, p0y);
    if (isRest) {
      col = REST;
      glow = 0;
    }
    const t = Math.max(0, base) / MAXH;
    const faceCol = mix(col, [255, 255, 255], glow * 0.08);
    const x = Math.max(0, 1 - t * 1.6), level = Math.round(x * TINT_LEVELS);
    const ink = cssRgb(mix(RAMP[0], RAMP[RAMP.length - 1], level / TINT_LEVELS));
    const glyph = key.icon && key.icon.includes("/") ? { img: tinted(key.icon, level, ink) } : key;
    if (glyph.img !== null) drawGlyph(ctx, glyph, ink, cssRgb(faceCol, 1 + glow * 0.1));
    ctx.restore();
  }

  if (drop > 0) {
    ctx.restore();
  }
}

function drawFocusRing(k) {
  const id = keyCells.get(k);
  if (id === undefined) return;
  const i = Math.floor(id / N), j = id % N;
  const z = h[id];
  const top = facePoints(i, j, z);

  // Outer contrasting glow / dark ring
  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  top.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath();

  ctx.lineWidth = TW * 0.1;
  ctx.strokeStyle = "rgba(11, 12, 16, 0.9)";
  ctx.stroke();

  // Vibrant focus ring using light theme colour --c1
  ctx.lineWidth = TW * 0.055;
  ctx.strokeStyle = COLORS[0]; // lightest colour #FDBCB4
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineWidth = TW * 0.05;
  for (let s = 0; s <= 2 * (N - 1); s++) {
    for (let i = Math.max(0, s - N + 1); i <= Math.min(N - 1, s); i++) {
      const j = s - i, [x, y] = proj(i, j);
      if (x < -TW || x > W + TW || y < -MAXH - TH * 2 || y > H + DEPTH + TH * 2) continue;
      drawBlock(i, j);
    }
  }
  if (focusedKey) {
    drawFocusRing(focusedKey);
  }
}

let animating = false;
let idleTimer = null;

function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleRipple() {
  if (idleTimer || reduceMotion.matches) return;
  idleTimer = setTimeout(() => {
    idleTimer = null;
    poke(W * (0.2 + 0.6 * Math.random()), H * (0.15 + 0.5 * Math.random()), 2.5);
  }, 5000);
}

function wake() {
  resetIdleTimer();
  if (!animating) {
    animating = true;
    requestAnimationFrame(frame);
  }
}

function frame() {
  // continuous gentle swell reaction while focused via keyboard (matches mouse hover effect)
  if (focusedKey) {
    const fId = keyCells.get(focusedKey);
    if (fId !== undefined) {
      const p = facePoints(Math.floor(fId / N), fId % N, 0);
      poke((p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, 0.35);
    }
  }

  const maxEnergy = step();
  render();

  const isTransitioning = (activeProject !== null && holeT < HOLE_REVEAL) || (activeProject === null && holeT > 0);
  const isMoving = maxEnergy > 0.05;

  if (isMoving || isTransitioning || focusedKey !== null) {
    requestAnimationFrame(frame);
  } else {
    h.fill(0);
    v.fill(0);
    render();
    animating = false;
    scheduleIdleRipple();
  }
}

addEventListener("resize", () => {
  setup();
  wake();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    wake();
  } else {
    resetIdleTimer();
  }
});

setup();

/* AC Controller tray panel. Talks to the main process through window.ac. */
"use strict"

const MIN_T = 20
const MAX_T = 28
const MODES = ["cool", "heat", "dry"]
const MODE_LABEL = { cool: "Cool", heat: "Heat", dry: "Dry" }
const VERB = { cool: "Cooling", heat: "Heating", dry: "Drying" }
const FANS = ["eco", "low", "medium", "high"]
const FAN_LABEL = { eco: "Eco", low: "Low", medium: "Medium", high: "High" }

const ICON = {
  cool: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2"/></svg>',
  heat: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dry: '<svg viewBox="0 0 24 24"><path d="M12 3 6.5 11a6.5 6.5 0 1 0 11 0Z"/></svg>',
  eco: '<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/></svg>',
  fan: (s) =>
    `<svg viewBox="0 0 24 24" style="width:${s}px;height:${s}px"><path d="M10.8 16.4a6.1 6.1 0 0 1-8.6-7l5.4 1.5a6.1 6.1 0 0 1 7-8.6l-1.5 5.4a6.1 6.1 0 0 1 8.6 7l-5.4-1.5a6.1 6.1 0 0 1-7 8.6l1.5-5.4Z"/><path d="M12 12v.01"/></svg>`,
}

const $ = (id) => document.getElementById(id)

const state = {
  signedIn: false,
  ac: null, // { power, temperature, mode, fan }
  online: null,
  timers: [],
  timerAction: "turn_off",
  pending: 0,
  visible: false,
  lastTemp: null,
}

// ===========================================================================
// Airflow: a small particle system on a canvas. Air streams out of the
// flap, fans outward and fades; strength follows the fan speed, colour the
// mode, and it eases in / out when the AC turns on / off.
// ===========================================================================

const air = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  dpr: 1,
  parts: [],
  intensity: 0, // 0..1, eased toward target
  target: 0,
  speed: 1, // fan multiplier
  color: [143, 211, 255],
  colorTarget: [143, 211, 255],
  raf: 0,
  last: 0,
  emitAcc: 0,
}

const MODE_RGB = { cool: [143, 211, 255], heat: [255, 176, 106], dry: [130, 232, 205] }
const FAN_MULT = { eco: 0.55, low: 0.75, medium: 1, high: 1.45 }

function airInit() {
  air.canvas = $("air")
  air.ctx = air.canvas.getContext("2d")
  airResize()
  window.addEventListener("resize", airResize)
}

function airResize() {
  const r = air.canvas.getBoundingClientRect()
  air.dpr = window.devicePixelRatio || 1
  air.w = r.width
  air.h = r.height
  air.canvas.width = Math.round(r.width * air.dpr)
  air.canvas.height = Math.round(r.height * air.dpr)
  air.ctx.setTransform(air.dpr, 0, 0, air.dpr, 0, 0)
}

function airSpawn(swing) {
  const cx = air.w / 2
  const halfMouth = 104
  const x = cx + (Math.random() * 2 - 1) * halfMouth
  const spread = (x - cx) / halfMouth // -1 .. 1
  const base = 46 + Math.random() * 30
  air.parts.push({
    x,
    y: 76,
    px: x,
    py: 76,
    vx: spread * 22 + swing * 10,
    vy: base,
    life: 0,
    max: 1.5 + Math.random() * 1.1,
    w: 0.8 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
  })
}

function airFrame(now) {
  const dt = Math.min(0.05, (now - (air.last || now)) / 1000)
  air.last = now
  const ctx = air.ctx

  // Ease intensity + colour so on/off and mode changes glide.
  air.intensity += (air.target - air.intensity) * Math.min(1, dt * 2.2)
  for (let k = 0; k < 3; k++) air.color[k] += (air.colorTarget[k] - air.color[k]) * Math.min(1, dt * 3)
  const [r, g, b] = air.color.map(Math.round)

  ctx.clearRect(0, 0, air.w, air.h)

  // Soft cool "breath" right under the unit.
  if (air.intensity > 0.01) {
    const grd = ctx.createRadialGradient(air.w / 2, 78, 4, air.w / 2, 100, 150)
    grd.addColorStop(0, `rgba(${r},${g},${b},${0.22 * air.intensity})`)
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grd
    ctx.fillRect(0, 70, air.w, air.h - 70)
  }

  // Emit.
  const swing = Math.sin(now / 1800)
  air.emitAcc += dt * 70 * air.intensity * air.speed
  while (air.emitAcc >= 1) {
    airSpawn(swing)
    air.emitAcc -= 1
  }

  // Update + draw streaks.
  ctx.lineCap = "round"
  const sp = 0.6 + air.speed * 0.55
  for (let i = air.parts.length - 1; i >= 0; i--) {
    const p = air.parts[i]
    p.life += dt
    if (p.life >= p.max || p.y > air.h + 10) {
      air.parts.splice(i, 1)
      continue
    }
    p.px = p.x
    p.py = p.y
    const wobble = Math.sin(p.phase + p.life * 3) * 8
    p.x += (p.vx + wobble) * dt * sp
    p.y += p.vy * dt * sp
    p.vx *= 1 + dt * 0.35 // fan out as it travels
    p.vy *= 1 - dt * 0.25 // and slow down

    const t = p.life / p.max
    const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
    const a = Math.max(0, fade) * 0.75 * Math.min(1, air.intensity * 1.4)
    if (a <= 0.01) continue

    // A tail a few frames long reads as moving air, not dots.
    const tx = p.x - (p.x - p.px) * 4
    const ty = p.y - (p.y - p.py) * 4
    const grad = ctx.createLinearGradient(tx, ty, p.x, p.y)
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},${a})`)
    ctx.strokeStyle = grad
    ctx.lineWidth = p.w
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const idle = air.intensity < 0.005 && air.parts.length === 0
  air.raf = idle && air.target === 0 ? 0 : requestAnimationFrame(airFrame)
  if (!air.raf) ctx.clearRect(0, 0, air.w, air.h)
}

function airKick() {
  if (!air.raf && state.visible) {
    air.last = 0
    air.raf = requestAnimationFrame(airFrame)
  }
}

function airSet(on, mode, fan) {
  air.target = on ? 1 : 0
  air.speed = FAN_MULT[fan] || 1
  air.colorTarget = (MODE_RGB[mode] || MODE_RGB.cool).slice()
  airKick()
}

function airPause() {
  if (air.raf) cancelAnimationFrame(air.raf)
  air.raf = 0
}

// ===========================================================================
// Segmented controls (Mode, Fan)
// ===========================================================================

function buildSeg(el, items, onPick) {
  el.innerHTML = '<span class="seg-lens"></span>'
  for (const it of items) {
    const b = document.createElement("button")
    b.dataset.value = it.value
    b.innerHTML = `${it.icon}<span>${it.label}</span>`
    b.addEventListener("click", () => onPick(it.value))
    el.appendChild(b)
  }
}

function setSeg(el, value, disabled) {
  const buttons = [...el.querySelectorAll("button")]
  const i = Math.max(
    0,
    buttons.findIndex((b) => b.dataset.value === value)
  )
  el.style.setProperty("--i", i)
  buttons.forEach((b, k) => b.classList.toggle("on", k === i))
  el.classList.toggle("disabled", !!disabled)
}

// ===========================================================================
// Rendering
// ===========================================================================

function render() {
  const ac = state.ac
  const on = !!(ac && ac.power)
  const mode = ac ? ac.mode : "cool"
  const fan = ac ? ac.fan : "medium"
  const scene = $("scene")

  $("remote").classList.toggle("off", !on)
  scene.classList.toggle("running", on)
  scene.classList.toggle("off", !on)
  scene.classList.toggle("heat", mode === "heat")
  scene.classList.toggle("dry", mode === "dry")
  airSet(on, mode, fan)

  $("power").classList.toggle("on", on)

  // Temperature, with a small roll when it changes.
  const t = ac ? ac.temperature : null
  const num = $("temp")
  if (t !== null && state.lastTemp !== null && t !== state.lastTemp) {
    num.classList.remove("up", "down")
    void num.offsetWidth
    num.classList.add(t > state.lastTemp ? "up" : "down")
  }
  state.lastTemp = t
  num.textContent = t ?? "--"
  $("unit-temp").textContent = t ?? "--"
  $("unit-mode").innerHTML = ICON[mode] || ICON.cool
  $("temp-sub").textContent = on ? VERB[mode] : "Off"

  const val = t ?? 24
  $("range").value = val
  $("slider").style.setProperty("--p", `${((val - MIN_T) / (MAX_T - MIN_T)) * 100}%`)
  $("range").disabled = !on
  $("minus").style.opacity = on ? 1 : 0.4
  $("plus").style.opacity = on ? 1 : 0.4

  setSeg($("mode-seg"), mode, !on)
  setSeg($("fan-seg"), fan, !on)

  const dot = $("dot")
  dot.classList.toggle("online", state.online === true)
  dot.classList.toggle("offline", state.online === false)
  $("state-text").textContent =
    state.online === false ? "Pi offline" : !ac ? "Connecting…" : on ? `${VERB[mode]} · ${FAN_LABEL[fan]} fan` : "Off"

  renderTimers()
  updateTray()
}

function minutesLeft(iso) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
}
function fmtLeft(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

let timerKey = ""
function renderTimers() {
  const key = state.timers.map((t) => `${t.id}:${minutesLeft(t.fires_at)}`).join("|")
  if (key === timerKey) return
  timerKey = key
  const list = $("timer-list")
  list.innerHTML = ""
  if (!state.timers.length) {
    list.innerHTML = '<div class="timer-empty">No active timers</div>'
    return
  }
  for (const t of state.timers) {
    const off = t.action !== "turn_on"
    const row = document.createElement("div")
    row.className = "timer-row"
    row.innerHTML = `<span class="t-dot" style="background:${off ? "#ff6a5f" : "#3ee08f"}"></span>
      <span class="t-label">${off ? "Turns off in" : "Turns on in"}</span>
      <span class="t-left">${fmtLeft(minutesLeft(t.fires_at))}</span>
      <button class="t-x" aria-label="Cancel timer">✕</button>`
    row.querySelector("button").addEventListener("click", async () => {
      row.style.opacity = "0.4"
      const r = await window.ac.cancelTimer(t.id)
      if (!r.ok) return toast(r.error)
      loadTimers()
    })
    list.appendChild(row)
  }
}

// Notification-area icon: the temperature, with a coloured bar while on.
function updateTray() {
  const c = $("tray-canvas")
  const ctx = c.getContext("2d")
  ctx.clearRect(0, 0, 32, 32)
  const ac = state.ac
  const on = !!(ac && ac.power)
  ctx.fillStyle = on ? "#ffffff" : "#9aa3b2"
  ctx.font = "700 22px 'Segoe UI', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(ac ? String(ac.temperature) : "AC", 16, 14)
  ctx.fillStyle = on ? (ac.mode === "heat" ? "#ffb06a" : "#4b9dff") : "#5a6170"
  ctx.fillRect(5, 27, 22, 4)
  const tooltip = !ac
    ? "AC Controller"
    : on
      ? `AC Controller: ${ac.temperature}° ${MODE_LABEL[ac.mode]}, ${FAN_LABEL[ac.fan]} fan`
      : "AC Controller: Off"
  window.ac.updateTray({ icon: c.toDataURL("image/png"), tooltip })
}

let toastTimer
function toast(msg) {
  const el = $("toast")
  el.textContent = msg
  el.classList.add("show")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500)
}

// ===========================================================================
// Data
// ===========================================================================

async function loadStatus() {
  if (!state.signedIn || state.pending > 0) return
  const r = await window.ac.status()
  if (r.ok) {
    state.online = true
    state.ac = r.data.ac_state
  } else if (r.error === "NOT_SIGNED_IN" || /expired|invalid/i.test(r.error)) {
    return showLogin()
  } else {
    state.online = false
  }
  render()
}

async function loadTimers() {
  if (!state.signedIn) return
  const r = await window.ac.timers()
  if (r.ok) state.timers = r.data || []
  timerKey = ""
  renderTimers()
}

// Optimistic: the UI changes on the same frame; the command follows.
async function send(change, call) {
  if (!state.ac) return
  const before = { ...state.ac }
  state.ac = { ...state.ac, ...change }
  render()
  state.pending++
  const r = await call()
  state.pending--
  if (r.ok && r.data && r.data.state) {
    if (state.pending === 0) state.ac = r.data.state
  } else if (!r.ok) {
    state.ac = before
    toast(r.error || "Command failed")
  }
  render()
}

let tempTimer
function setTemperature(t) {
  t = Math.max(MIN_T, Math.min(MAX_T, t))
  if (!state.ac || !state.ac.power || t === state.ac.temperature) return
  state.ac = { ...state.ac, temperature: t }
  render()
  clearTimeout(tempTimer)
  tempTimer = setTimeout(() => send({ temperature: t }, () => window.ac.temperature(t)), 450)
}

// ===========================================================================
// Screens + wiring
// ===========================================================================

function showLogin() {
  state.signedIn = false
  state.ac = null
  $("remote").classList.add("hidden")
  $("login").classList.remove("hidden")
  airSet(false, "cool", "medium")
  updateTray()
}

async function showRemote() {
  state.signedIn = true
  $("login").classList.add("hidden")
  $("remote").classList.remove("hidden")
  airResize()
  const auto = await window.ac.autostart()
  $("autostart").checked = !!(auto.ok && auto.data)
  render()
  loadStatus()
  loadTimers()
}

function wire() {
  buildSeg(
    $("mode-seg"),
    MODES.map((m) => ({ value: m, label: MODE_LABEL[m], icon: ICON[m] })),
    (m) => state.ac && state.ac.power && m !== state.ac.mode && send({ mode: m }, () => window.ac.mode(m))
  )
  buildSeg(
    $("fan-seg"),
    [
      { value: "eco", label: "Eco", icon: ICON.eco },
      { value: "low", label: "Low", icon: ICON.fan(13) },
      { value: "medium", label: "Medium", icon: ICON.fan(16) },
      { value: "high", label: "High", icon: ICON.fan(19) },
    ],
    (f) => state.ac && state.ac.power && f !== state.ac.fan && send({ fan: f }, () => window.ac.fan(f))
  )
  $("ticks").innerHTML = Array.from({ length: MAX_T - MIN_T + 1 }, () => "<i></i>").join("")

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const btn = $("login-btn")
    btn.disabled = true
    $("login-error").textContent = ""
    const r = await window.ac.signIn($("email").value.trim(), $("password").value)
    btn.disabled = false
    if (!r.ok) {
      $("login-error").textContent = r.error
      return
    }
    $("password").value = ""
    showRemote()
  })

  $("power").addEventListener("click", () => {
    if (!state.ac) return
    const p = $("power")
    p.classList.remove("pulse")
    void p.offsetWidth
    p.classList.add("pulse")
    const next = !state.ac.power
    send({ power: next }, () => window.ac.power(next))
  })

  $("minus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature - 1))
  $("plus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature + 1))
  $("range").addEventListener("input", (e) => setTemperature(Number(e.target.value)))

  // Mouse wheel over the temperature changes it too.
  $("scene").parentElement.querySelector(".temp-row").addEventListener(
    "wheel",
    (e) => {
      if (!state.ac) return
      e.preventDefault()
      setTemperature(state.ac.temperature + (e.deltaY < 0 ? 1 : -1))
    },
    { passive: false }
  )

  $("timer-action").addEventListener("click", (e) => {
    const b = e.target.closest("button")
    if (!b) return
    state.timerAction = b.dataset.action
    for (const x of $("timer-action").querySelectorAll("button")) x.classList.toggle("on", x === b)
  })
  $("presets").addEventListener("click", async (e) => {
    const b = e.target.closest("button")
    if (!b) return
    b.disabled = true
    const r = await window.ac.createTimer(state.timerAction, Number(b.dataset.min))
    b.disabled = false
    if (!r.ok) return toast(r.error)
    loadTimers()
  })

  $("open-web").addEventListener("click", () => window.ac.openWeb())
  $("autostart").addEventListener("change", (e) => window.ac.setAutostart(e.target.checked))
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.ac.hide()
  })

  window.ac.on("panel:shown", () => {
    state.visible = true
    const panel = $("panel")
    panel.classList.remove("shown")
    void panel.offsetWidth
    panel.classList.add("shown")
    airKick()
    loadStatus()
    loadTimers()
  })
  window.ac.on("panel:hidden", () => {
    state.visible = false
    $("panel").classList.remove("shown")
    airPause()
  })
  window.ac.on("auth:changed", () => showLogin())
}

// Poll every 10 s while open, every 60 s in the background (tray icon).
function startPolling() {
  let tick = 0
  setInterval(() => {
    tick++
    if (state.visible || tick % 6 === 0) loadStatus()
    if (state.visible && tick % 3 === 0) loadTimers()
    else renderTimers()
  }, 10_000)
}

async function init() {
  // Never leave the panel invisible if the first "shown" event was missed.
  $("panel").classList.add("shown")
  airInit()
  wire()
  const auth = await window.ac.authState()
  if (auth.ok && auth.data) showRemote()
  else showLogin()
  startPolling()
}

init()

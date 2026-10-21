/* AC Controller tray panel. Talks to the main process through window.ac. */
"use strict"

const MIN_T = 20
const MAX_T = 28
const FANS = ["eco", "low", "medium", "high"]
const FAN_LABEL = { eco: "Eco", low: "Low", medium: "Medium", high: "High" }
const PRESETS = [0, 30, 60, 120]

const $ = (id) => document.getElementById(id)

const state = {
  signedIn: false,
  ac: null, // { power, temperature, mode, fan }
  online: null,
  timers: [],
  timerAction: "turn_off",
  presetIndex: 0,
  version: null,
  update: null,
  pending: 0,
  visible: false,
  dragging: false,
  dragPos: 24,
}

// ===========================================================================
// Airflow: streaks fan out from the flap, sway with it, and fade behind the
// temperature. Density/speed follow the fan; it eases in/out with power.
// ===========================================================================

const air = { cv: null, ctx: null, w: 0, h: 0, parts: [], inten: 0, target: 0, mult: 0.8, raf: 0, last: 0, acc: 0 }
const RGB = [143, 211, 255]
const MULT = { eco: 0.5, low: 0.8, medium: 1.15, high: 1.6 }
const Y0 = 62 // bottom of the unit (flap)

function airInit() {
  air.cv = $("air")
  air.ctx = air.cv.getContext("2d")
  airResize()
  window.addEventListener("resize", airResize)
}

function airResize() {
  const r = air.cv.getBoundingClientRect()
  if (!r.width) return
  const d = window.devicePixelRatio || 1
  air.w = r.width
  air.h = r.height
  air.cv.width = Math.round(r.width * d)
  air.cv.height = Math.round(r.height * d)
  air.ctx.setTransform(d, 0, 0, d, 0, 0)
}

function airSpawn(now) {
  const cx = air.w / 2
  const half = 100
  const x = cx + (Math.random() * 2 - 1) * half
  const s = (x - cx) / half
  const sw = Math.sin(now / 1700) * 0.6
  air.parts.push({
    x, y: Y0, px: x, py: Y0,
    vx: s * 16 + sw * 10,
    vy: 30 + Math.random() * 20,
    life: 0,
    max: 1.1 + Math.random() * 0.8,
    w: 0.6 + Math.random() * 1.2,
    ph: Math.random() * 6.3,
  })
}

function airFrame(now) {
  const dt = Math.min(0.05, (now - (air.last || now)) / 1000) || 0.016
  air.last = now
  const ctx = air.ctx
  air.inten += (air.target - air.inten) * Math.min(1, dt * 2.4)
  const [r, g, b] = RGB
  const m = air.mult
  ctx.clearRect(0, 0, air.w, air.h)

  if (air.inten > 0.01) {
    const gr = ctx.createRadialGradient(air.w / 2, Y0, 2, air.w / 2, Y0 + 20, 105)
    gr.addColorStop(0, `rgba(${r},${g},${b},${0.18 * air.inten})`)
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gr
    ctx.fillRect(0, Y0 - 2, air.w, air.h)
  }

  air.acc += dt * 55 * air.inten * m
  while (air.acc >= 1) {
    airSpawn(now)
    air.acc--
  }

  ctx.lineCap = "round"
  const sp = 0.55 + m * 0.6
  for (let i = air.parts.length - 1; i >= 0; i--) {
    const p = air.parts[i]
    p.life += dt
    if (p.life > p.max || p.y > air.h) {
      air.parts.splice(i, 1)
      continue
    }
    p.px = p.x
    p.py = p.y
    p.x += (p.vx + Math.sin(p.ph + p.life * 3.2) * 6) * dt * sp
    p.y += p.vy * dt * sp
    p.vx *= 1 + dt * 0.4
    p.vy *= 1 - dt * 0.2
    const t = p.life / p.max
    const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
    const depth = 1 - Math.max(0, (p.y - 118) / 62) * 0.6 // softer behind the number
    const a = Math.max(0, fade) * 0.75 * depth * Math.min(1, air.inten * 1.4)
    if (a < 0.01) continue
    const vx = (p.x - p.px) / dt
    const vy = (p.y - p.py) / dt
    const L = 0.2
    const gl = ctx.createLinearGradient(p.x - vx * L, p.y - vy * L, p.x, p.y)
    gl.addColorStop(0, `rgba(${r},${g},${b},0)`)
    gl.addColorStop(1, `rgba(${r},${g},${b},${a})`)
    ctx.strokeStyle = gl
    ctx.lineWidth = p.w
    ctx.beginPath()
    ctx.moveTo(p.x - vx * L, p.y - vy * L)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const idle = air.target === 0 && air.inten < 0.005 && air.parts.length === 0
  if (idle || !state.visible) {
    air.raf = 0
    if (idle) ctx.clearRect(0, 0, air.w, air.h)
    return
  }
  air.raf = requestAnimationFrame(airFrame)
}

function airKick() {
  if (!air.raf && state.visible) {
    air.last = 0
    air.raf = requestAnimationFrame(airFrame)
  }
}

function airSet(on, fan) {
  air.target = on ? 1 : 0
  air.mult = MULT[fan] || 1
  airKick()
}

// ===========================================================================
// Segmented controls
// ===========================================================================

function setSeg(el, index, animate) {
  const prev = Number(el.style.getPropertyValue("--i"))
  el.style.setProperty("--i", index)
  ;[...el.querySelectorAll("button")].forEach((b, k) => b.classList.toggle("on", k === index))
  if (animate && prev !== index) {
    const lens = el.querySelector(".lens")
    lens.classList.remove("stretch")
    void lens.offsetWidth
    lens.classList.add("stretch")
  }
}

// ===========================================================================
// Rendering
// ===========================================================================

function setReel(v) {
  $("strip").style.setProperty("--pos", v - MIN_T)
  $("slider").style.setProperty("--p", (v - MIN_T) / (MAX_T - MIN_T))
}

function render() {
  const ac = state.ac
  const on = !!(ac && ac.power)
  const fan = ac ? ac.fan : "low"
  const t = ac ? ac.temperature : 24

  $("remote").classList.toggle("on", on)
  airSet(on, fan)

  $("disp").textContent = ac ? `${t}°` : "--°"
  setReel(state.dragging ? state.dragPos : t)
  if (!state.dragging) $("range").value = t

  setSeg($("fan-seg"), Math.max(0, FANS.indexOf(fan)), false)

  const dot = $("dot")
  dot.classList.toggle("online", state.online === true)
  dot.classList.toggle("offline", state.online === false)
  $("st").textContent =
    state.online === false ? "Pi offline" : !ac ? "Connecting…" : on ? `Cooling · ${FAN_LABEL[fan]} fan` : "Off"

  renderTimers()
  renderToday()
  updateTray()
}

function minutesLeft(iso) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
}
function fmtLeft(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`
}

let timerKey = null
function renderTimers() {
  if (!state.timers.length) state.presetIndex = 0
  else if (state.presetIndex === 0) {
    // A timer set elsewhere (phone, web): highlight the nearest preset.
    const left = minutesLeft(state.timers[0].fires_at)
    let best = 1
    for (let k = 1; k < PRESETS.length; k++) if (Math.abs(PRESETS[k] - left) < Math.abs(PRESETS[best] - left)) best = k
    state.presetIndex = best
  }
  setSeg($("presets"), state.presetIndex, false)
  const key = state.timers.map((t) => `${t.id}:${t.action}:${minutesLeft(t.fires_at)}:${!!t._pending}`).join("|")
  if (key === timerKey) return
  timerKey = key
  // Always exactly one line here, so the panel never changes height.
  const box = $("chips")
  const t = state.timers[0]
  box.innerHTML = ""
  const row = document.createElement("div")
  if (!t) {
    row.className = "chip idle"
    row.innerHTML = "<span>No timer</span>"
  } else {
    const off = t.action !== "turn_on"
    const more = state.timers.length > 1 ? ` <em>+${state.timers.length - 1}</em>` : ""
    row.className = `chip${off ? "" : " on-timer"}${t._pending ? " pending" : ""}`
    row.innerHTML = `<i></i><span>${off ? "Turns off in" : "Turns on in"}</span><b>${fmtLeft(
      minutesLeft(t.fires_at)
    )}</b>${more}<button type="button">Cancel</button>`
    // Resolved by id at click time (the list refreshes in the background).
    row.querySelector("button").dataset.cancel = "1"
  }
  box.appendChild(row)
}

// Notification-area icon: the temperature, with a bar while on.
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
  ctx.fillStyle = on ? "#4b9dff" : "#5a6170"
  ctx.fillRect(5, 27, 22, 4)
  const tooltip = !ac
    ? "AC Controller"
    : on
      ? `AC Controller: ${ac.temperature}°, ${FAN_LABEL[ac.fan]} fan`
      : "AC Controller: Off"
  window.ac.updateTray({ icon: c.toDataURL("image/png"), tooltip })
}

function renderUpdate() {
  const u = state.update || {}
  const v = state.version ? `Version ${state.version}` : "Version –"
  const btn = $("upd-btn")
  const text = {
    checking: "Checking…",
    available: "Downloading update…",
    downloading: `Downloading… ${Math.round(u.percent || 0)}%`,
    ready: `Update ${u.version || ""} ready`,
    latest: `${v} · up to date`,
    error: `${v} · couldn't check`,
    dev: `${v} · updates only in the installed app`,
  }[u.state]
  $("upd-text").textContent = text || v
  btn.textContent = u.state === "ready" ? "Restart" : "Check"
  btn.classList.toggle("go", u.state === "ready")
  btn.disabled = ["checking", "available", "downloading"].includes(u.state)
}

let toastTimer
function toast(msg) {
  const el = $("toast")
  el.textContent = msg
  el.classList.add("show")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500)
}

// The window is sized to the panel.
let lastH = 0
function reportHeight() {
  requestAnimationFrame(() => {
    const h = $("panel").offsetHeight // layout height, ignores the open animation's transform
    if (h && h !== lastH) {
      lastH = h
      window.ac.setHeight(h)
    }
  })
}

// ===========================================================================
// Data
// ===========================================================================

async function loadStatus() {
  if (!state.signedIn || state.pending > 0 || state.dragging) return
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
  if (cancelling > 0) return // a cancel is in flight; don't bring the row back
  if (r.ok) {
    const local = state.timers.filter((t) => t._pending)
    state.timers = [...(r.data || []), ...local]
  }
  timerKey = null // force a redraw (an empty list has key "", so "" wouldn't)
  renderTimers()
}

// ---------------------------------------------------------------------------
// Today: on-periods from command history (same rule as the phone app:
// power:true starts a period, power:false ends it), clipped to today.
// ---------------------------------------------------------------------------

let todayEvents = []

function todayIntervals() {
  const now = Date.now()
  const d = new Date()
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const out = []
  let start = null
  for (const e of todayEvents) {
    const t = new Date(e.created_at).getTime()
    if (e.power === true && start === null) start = t
    else if (e.power === false && start !== null) {
      out.push([start, t, false])
      start = null
    }
  }
  // Trust the live state for "is it on right now".
  const onNow = state.ac ? !!state.ac.power : start !== null
  if (start !== null && onNow) out.push([start, now, true])
  else if (start === null && onNow) out.push([now - 60_000, now, true]) // turned on just now
  return out
    .map(([a, b, live]) => [Math.max(a, midnight), Math.min(b, now), live])
    .filter(([a, b]) => b > a)
    .map(([a, b, live]) => ({ a: a - midnight, b: b - midnight, live }))
}

function fmtDuration(ms) {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function renderToday() {
  const DAY = 86_400_000
  const ivs = todayIntervals()
  const bar = $("t-bar")
  bar.querySelectorAll(".seg-on").forEach((n) => n.remove())
  let total = 0
  for (const iv of ivs) {
    total += iv.b - iv.a
    const s = document.createElement("span")
    s.className = `seg-on${iv.live ? " live" : ""}`
    s.style.left = `${(iv.a / DAY) * 100}%`
    s.style.width = `${((iv.b - iv.a) / DAY) * 100}%`
    bar.appendChild(s)
  }
  const d = new Date()
  const sinceMidnight = d.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  $("t-now").style.left = `${(sinceMidnight / DAY) * 100}%`
  $("t-val").textContent = fmtDuration(total)
  $("today").title = ivs.length
    ? ivs
        .map((iv) => {
          const t = (ms) => {
            const x = new Date(new Date().setHours(0, 0, 0, 0) + ms)
            return x.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          }
          return `${t(iv.a)} – ${iv.live ? "now" : t(iv.b)}`
        })
        .join("\n")
    : "Not used today"
}

async function loadToday() {
  if (!state.signedIn) return
  const r = await window.ac.usageToday()
  if (r.ok) todayEvents = r.data || []
  renderToday()
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
  if (!r.ok) {
    state.ac = before
    toast(r.error || "Command failed")
  } else if (r.data && r.data.success === false) {
    // The Pi answered but the IR send failed: it returns the old state.
    if (r.data.state) state.ac = r.data.state
    else state.ac = before
    toast(r.data.message || "The AC didn't receive the command")
  } else if (r.data && r.data.state) {
    if (state.pending === 0 && !state.dragging) state.ac = r.data.state
  }
  render()
}

let tempTimer
function setTemperature(t, debounce = 400) {
  t = Math.max(MIN_T, Math.min(MAX_T, Math.round(t)))
  if (!state.ac || !state.ac.power) return
  if (t !== state.ac.temperature) {
    state.ac = { ...state.ac, temperature: t }
    render()
  }
  clearTimeout(tempTimer)
  tempTimer = setTimeout(() => send({ temperature: t }, () => window.ac.temperature(t)), debounce)
}

// Timers: show immediately, confirm in the background.
async function createTimer(minutes, index) {
  const action = state.timerAction
  // One timer at a time: replace any existing ones.
  const old = state.timers.filter((t) => !t._pending)
  const temp = {
    id: `local-${Date.now()}`,
    action,
    fires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    _pending: true,
  }
  state.presetIndex = index
  state.timers = [temp]
  timerKey = null // force a redraw (an empty list has key "", so "" wouldn't)
  renderTimers()
  await Promise.all(old.map((t) => window.ac.cancelTimer(t.id)))
  const r = await window.ac.createTimer(action, minutes)
  state.timers = state.timers.filter((t) => t !== temp)
  if (!r.ok) toast(r.error || "Could not set timer")
  else if (cancelledPending.has(temp.id) && r.data && r.data.id) {
    // Cancel was pressed while this was still being saved.
    cancelledPending.delete(temp.id)
    await window.ac.cancelTimer(r.data.id)
  }
  loadTimers()
}

// Timers being created right now that were cancelled before the server
// answered: cancel them as soon as their real id comes back.
const cancelledPending = new Set()
let cancelling = 0

async function cancelAllTimers() {
  const all = state.timers
  state.timers = []
  timerKey = null // force a redraw (an empty list has key "", so "" wouldn't)
  renderTimers()
  for (const t of all) if (t._pending) cancelledPending.add(t.id)
  cancelling++
  // Server side: cancel everything pending, including rows this list hasn't seen yet.
  const r = await window.ac.cancelAllTimers()
  cancelling--
  if (!r.ok) toast(r.error || "Could not cancel timer")
  loadTimers()
}

// ===========================================================================
// Screens + wiring
// ===========================================================================

function showLogin() {
  state.signedIn = false
  state.ac = null
  $("remote").classList.add("hidden")
  $("login").classList.remove("hidden")
  airSet(false, "low")
  updateTray()
  reportHeight()
}

async function showRemote() {
  state.signedIn = true
  $("login").classList.add("hidden")
  $("remote").classList.remove("hidden")
  airResize()
  render()
  reportHeight()
  loadStatus()
  loadTimers()
  loadToday()
}

function wire() {
  $("strip").innerHTML = Array.from({ length: MAX_T - MIN_T + 1 }, (_, k) => `<span>${MIN_T + k}</span>`).join("")

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const btn = $("login-btn")
    btn.disabled = true
    $("login-error").textContent = ""
    const r = await window.ac.signIn($("email").value.trim(), $("password").value)
    btn.disabled = false
    if (!r.ok) {
      $("login-error").textContent = r.error
      reportHeight()
      return
    }
    $("password").value = ""
    showRemote()
  })

  // Opens the website's sign-in page in a small window (Windows Hello).
  $("passkey-btn").addEventListener("click", async () => {
    const btn = $("passkey-btn")
    btn.disabled = true
    $("passkey-lab").textContent = "Waiting for Windows Hello…"
    $("login-error").textContent = ""
    const r = await window.ac.signInWithPasskey()
    btn.disabled = false
    $("passkey-lab").textContent = "Sign in with a passkey"
    if (!r.ok) {
      if (r.error !== "PASSKEY_CANCELLED") $("login-error").textContent = r.error
      reportHeight()
      return
    }
    showRemote()
  })

  $("pw").addEventListener("click", () => {
    if (!state.ac) return
    const p = $("pw")
    p.classList.remove("pulse")
    void p.offsetWidth
    p.classList.add("pulse")
    const next = !state.ac.power
    send({ power: next }, () => window.ac.power(next)).then(() => setTimeout(loadToday, 2500))
  })

  $("minus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature - 1))
  $("plus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature + 1))
  $("temp").addEventListener(
    "wheel",
    (e) => {
      if (!state.ac) return
      e.preventDefault()
      setTemperature(state.ac.temperature + (e.deltaY < 0 ? 1 : -1))
    },
    { passive: false }
  )

  // Slider: moves continuously under the mouse, the number reel follows,
  // and both settle on the nearest degree when released.
  const rg = $("range")
  const sl = $("slider")
  const strip = $("strip")
  rg.addEventListener("pointerdown", () => {
    if (!state.ac || !state.ac.power) return
    state.dragging = true
    state.dragPos = Number(rg.value)
    sl.classList.add("drag")
    strip.classList.add("drag")
  })
  rg.addEventListener("input", () => {
    if (!state.ac || !state.ac.power) return
    state.dragPos = Number(rg.value)
    const t = Math.round(state.dragPos)
    if (t !== state.ac.temperature) state.ac = { ...state.ac, temperature: t }
    render()
    if (!state.dragging) setTemperature(t) // keyboard
  })
  const release = () => {
    if (!state.dragging) return
    state.dragging = false
    sl.classList.remove("drag")
    strip.classList.remove("drag")
    setTemperature(state.ac.temperature, 150)
    render()
  }
  window.addEventListener("pointerup", release)
  rg.addEventListener("change", release)

  // Delegated handlers: one listener per control, resolved at click time.
  $("fan-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]")
    if (!b) return
    if (!state.ac) return toast(state.online === false ? "Can't reach the Raspberry Pi" : "Still connecting…")
    if (!state.ac.power) return toast("Turn the AC on to change the fan")
    const fan = b.dataset.v
    if (fan === state.ac.fan) return
    setSeg($("fan-seg"), FANS.indexOf(fan), true)
    send({ fan }, () => window.ac.fan(fan))
  })
  // Cancel = cancel every pending timer (there's only ever one from here).
  $("chips").addEventListener("click", (e) => {
    if (!e.target.closest("button[data-cancel]")) return
    setSeg($("presets"), 0, true)
    state.presetIndex = 0
    cancelAllTimers()
  })

  // Settings
  const settings = $("settings")
  const openSettings = async (open) => {
    settings.classList.toggle("open", open)
    settings.setAttribute("aria-hidden", String(!open))
    if (!open) return
    const [auto, auth, ver] = await Promise.all([window.ac.autostart(), window.ac.authState(), window.ac.version()])
    $("autostart").checked = !!(auto.ok && auto.data)
    $("acct").textContent = (auth.ok && auth.data && auth.data.email) || "–"
    if (ver.ok) state.version = ver.data
    renderUpdate()
  }
  $("gear").addEventListener("click", () => openSettings(true))
  $("back").addEventListener("click", () => openSettings(false))
  $("autostart").addEventListener("change", (e) => window.ac.setAutostart(e.target.checked))
  $("open-web").addEventListener("click", () => window.ac.openWeb())
  $("signout").addEventListener("click", async () => {
    await window.ac.signOut()
    openSettings(false)
    showLogin()
  })
  $("quit").addEventListener("click", () => window.ac.quit())
  $("upd-btn").addEventListener("click", () => {
    if (state.update && state.update.state === "ready") return window.ac.installUpdate()
    state.update = { state: "checking" }
    renderUpdate()
    window.ac.checkUpdate()
  })
  window.ac.on("update:status", (s) => {
    state.update = s
    renderUpdate()
  })

  $("tk").addEventListener("click", () => {
    state.timerAction = state.timerAction === "turn_off" ? "turn_on" : "turn_off"
    const l = $("tk-lab")
    l.textContent = state.timerAction === "turn_off" ? "Off in" : "On in"
    l.classList.remove("flip")
    void l.offsetWidth
    l.classList.add("flip")
  })
  ;[...$("presets").querySelectorAll("button")].forEach((b, i) =>
    b.addEventListener("click", () => {
      setSeg($("presets"), i, true)
      if (PRESETS[i] === 0) {
        state.presetIndex = 0
        cancelAllTimers()
      } else {
        createTimer(PRESETS[i], i)
      }
    })
  )

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return
    if ($("settings").classList.contains("open")) $("back").click()
    else window.ac.hide()
  })

  window.ac.on("panel:shown", () => {
    state.visible = true
    const panel = $("panel")
    panel.classList.remove("shown", "closing")
    void panel.offsetWidth
    panel.classList.add("shown")
    airResize()
    airKick()
    loadStatus()
    loadTimers()
    loadToday()
  })
  // The main process hides the window once this close animation is done.
  window.ac.on("panel:hiding", () => {
    $("panel").classList.remove("shown")
    $("panel").classList.add("closing")
  })
  window.ac.on("panel:hidden", () => {
    state.visible = false
    $("settings").classList.remove("open")
  })
  window.ac.on("auth:changed", () => showLogin())

  new ResizeObserver(reportHeight).observe($("panel"))
}

// Poll every 10 s while open, every 60 s in the background (tray icon).
function startPolling() {
  let tick = 0
  setInterval(() => {
    tick++
    if (state.visible || tick % 6 === 0) loadStatus()
    if (state.visible && tick % 6 === 0) loadToday()
    if (state.visible && tick % 3 === 0) loadTimers()
    else renderTimers()
  }, 10_000)
}

async function init() {
  $("panel").classList.add("shown")
  airInit()
  wire()
  const auth = await window.ac.authState()
  if (auth.ok && auth.data) showRemote()
  else showLogin()
  startPolling()
}

init()

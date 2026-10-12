/* AC Controller tray panel. Talks to the main process through window.ac. */
"use strict"

const MIN_T = 20
const MAX_T = 28
const MODES = ["cool", "heat", "dry"]
const MODE_LABEL = { cool: "Cool", heat: "Heat", dry: "Dry" }
const VERB = { cool: "Cooling", heat: "Heating", dry: "Drying" }
const FANS = ["eco", "low", "medium", "high"]
const FAN_LABEL = { eco: "Eco", low: "Low", medium: "Medium", high: "High" }
const FAN_SPEED = { eco: "2.6s", low: "2s", medium: "1.4s", high: "0.85s" }

const ICONS = {
  cool: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2"/></svg>',
  heat: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dry: '<svg viewBox="0 0 24 24"><path d="M12 3 6.5 11a6.5 6.5 0 1 0 11 0Z"/></svg>',
  fan: '<svg viewBox="0 0 24 24"><path d="M10.8 16.4a6.1 6.1 0 0 1-8.6-7l5.4 1.5a6.1 6.1 0 0 1 7-8.6l-1.5 5.4a6.1 6.1 0 0 1 8.6 7l-5.4-1.5a6.1 6.1 0 0 1-7 8.6l1.5-5.4Z"/><path d="M12 12v.01"/></svg>',
  eco: '<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/></svg>',
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
}

// ---------------------------------------------------------------------------
// Scene: wind lines + particles
// ---------------------------------------------------------------------------

function buildScene() {
  const lines = 9
  let html = ""
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1) - 0.5 // -0.5 .. 0.5
    const x0 = 150 + t * 150
    const x1 = 150 + t * 290
    const cx = 150 + t * 200
    html += `<path d="M${x0.toFixed(1)} 0 Q ${cx.toFixed(1)} 55 ${x1.toFixed(1)} 112" style="animation-delay:${(-i * 0.17).toFixed(2)}s"/>`
  }
  $("wind-lines").innerHTML = html

  let dots = ""
  for (let i = 0; i < 16; i++) {
    const left = 18 + Math.random() * 64
    const dx = (left - 50) * 1.4
    const delay = -(Math.random() * 2.4)
    const size = 2 + Math.random() * 3
    dots += `<i style="left:${left.toFixed(1)}%;--dx:${dx.toFixed(0)}px;animation-delay:${delay.toFixed(2)}s;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px"></i>`
  }
  $("particles").innerHTML = dots

  $("ticks").innerHTML = Array.from({ length: MAX_T - MIN_T + 1 }, () => "<i></i>").join("")
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render() {
  const ac = state.ac
  const on = !!(ac && ac.power)
  const scene = $("scene")

  $("remote").classList.toggle("off", !on)
  scene.classList.toggle("running", on)
  scene.classList.toggle("off", !on)
  scene.classList.toggle("heat", !!ac && ac.mode === "heat")
  scene.classList.toggle("dry", !!ac && ac.mode === "dry")
  if (ac) {
    scene.style.setProperty("--speed", FAN_SPEED[ac.fan] || "1.4s")
    scene.style.setProperty("--fall", ac.fan === "high" ? "1.4s" : ac.fan === "eco" ? "3.2s" : "2.3s")
  }

  $("power").classList.toggle("on", on)
  $("temp").textContent = ac ? ac.temperature : "--"
  $("unit-temp").textContent = ac ? ac.temperature : "--"
  $("range").value = ac ? ac.temperature : 24

  const mode = ac ? ac.mode : "cool"
  $("mode-pill").textContent = on ? VERB[mode] || "On" : "Off"
  $("mode-icon").innerHTML = ICONS[mode] || ICONS.cool
  $("mode-v").textContent = MODE_LABEL[mode] || "Cool"

  const fan = ac ? ac.fan : "medium"
  $("fan-icon").innerHTML = fan === "eco" ? ICONS.eco : ICONS.fan
  $("fan-v").textContent = FAN_LABEL[fan] || "Medium"

  for (const id of ["tile-mode", "tile-fan", "minus", "plus"]) $(id).classList.toggle("disabled", !on)
  $("range").disabled = !on

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

function renderTimers() {
  const next = state.timers[0]
  $("timer-v").textContent = next
    ? `${next.action === "turn_on" ? "On" : "Off"} ${fmtLeft(minutesLeft(next.fires_at))}`
    : "Off"
  $("tile-timer").classList.toggle("active", $("drawer").classList.contains("open"))

  const list = $("timer-list")
  list.innerHTML = ""
  if (!state.timers.length) {
    list.innerHTML = '<div class="muted" style="font-size:11.5px;text-align:center;padding:4px">No active timers</div>'
    return
  }
  for (const t of state.timers) {
    const row = document.createElement("div")
    row.className = "timer-row"
    const off = t.action !== "turn_on"
    row.innerHTML = `<span class="t-dot" style="background:${off ? "#ff6a5f" : "#3ee08f"}"></span>
      <span class="t-label">${off ? "Turning off in" : "Turning on in"}</span>
      <span class="t-left">${fmtLeft(minutesLeft(t.fires_at))}</span>
      <button aria-label="Cancel timer">✕</button>`
    row.querySelector("button").addEventListener("click", async () => {
      const r = await window.ac.cancelTimer(t.id)
      if (!r.ok) return flash(r.error)
      loadTimers()
    })
    list.appendChild(row)
  }
}

// Draws the notification-area icon: the temperature in white when the AC
// runs (with a blue bar under it), grey when it's off.
function updateTray() {
  const c = $("tray-canvas")
  const ctx = c.getContext("2d")
  ctx.clearRect(0, 0, 32, 32)
  const ac = state.ac
  const on = !!(ac && ac.power)
  const text = ac ? String(ac.temperature) : "AC"
  ctx.fillStyle = on ? "#ffffff" : "#9aa3b2"
  ctx.font = "700 22px 'Segoe UI', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 16, 14)
  ctx.fillStyle = on ? (ac.mode === "heat" ? "#ffb06a" : "#4b9dff") : "#5a6170"
  ctx.fillRect(5, 27, 22, 4)

  const tooltip = !ac
    ? "AC Controller"
    : on
      ? `AC Controller: ${ac.temperature}° ${MODE_LABEL[ac.mode]}, ${FAN_LABEL[ac.fan]} fan`
      : "AC Controller: Off"
  window.ac.updateTray({ icon: c.toDataURL("image/png"), tooltip })
}

let flashTimer
function flash(msg) {
  const el = $("foot-text")
  el.textContent = msg
  el.style.color = "#ff8a80"
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    el.textContent = ""
    el.style.color = ""
  }, 4000)
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function loadStatus() {
  if (!state.signedIn) return
  // Don't overwrite an optimistic change while commands are still sending.
  if (state.pending > 0) return
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
  renderTimers()
}

// Optimistic command: update the UI now, send in the background, then
// re-sync with whatever the Pi reports.
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
    flash(r.error || "Command failed")
  }
  render()
}

let tempTimer
function setTemperature(t) {
  t = Math.max(MIN_T, Math.min(MAX_T, t))
  if (!state.ac || t === state.ac.temperature) return
  state.ac = { ...state.ac, temperature: t }
  render()
  // Debounce: dragging or tapping + quickly sends one command, not many.
  clearTimeout(tempTimer)
  tempTimer = setTimeout(() => send({ temperature: t }, () => window.ac.temperature(t)), 450)
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function showLogin() {
  state.signedIn = false
  state.ac = null
  $("remote").classList.add("hidden")
  $("login").classList.remove("hidden")
  updateTray()
}

async function showRemote() {
  state.signedIn = true
  $("login").classList.add("hidden")
  $("remote").classList.remove("hidden")
  const auto = await window.ac.autostart()
  $("autostart").checked = !!(auto.ok && auto.data)
  render()
  loadStatus()
  loadTimers()
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function wire() {
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
    const next = !state.ac.power
    send({ power: next }, () => window.ac.power(next))
  })

  $("minus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature - 1))
  $("plus").addEventListener("click", () => state.ac && setTemperature(state.ac.temperature + 1))
  $("range").addEventListener("input", (e) => setTemperature(Number(e.target.value)))

  $("tile-mode").addEventListener("click", () => {
    if (!state.ac) return
    const next = MODES[(MODES.indexOf(state.ac.mode) + 1) % MODES.length]
    send({ mode: next }, () => window.ac.mode(next))
  })
  $("tile-fan").addEventListener("click", () => {
    if (!state.ac) return
    const next = FANS[(FANS.indexOf(state.ac.fan) + 1) % FANS.length]
    send({ fan: next }, () => window.ac.fan(next))
  })

  $("tile-timer").addEventListener("click", () => {
    const d = $("drawer")
    d.classList.toggle("open")
    renderTimers()
    if (d.classList.contains("open")) {
      setTimeout(() => $("remote").scrollTo({ top: $("remote").scrollHeight, behavior: "smooth" }), 120)
    }
  })
  $("timer-action").addEventListener("click", (e) => {
    const b = e.target.closest("button")
    if (!b) return
    state.timerAction = b.dataset.action
    for (const x of $("timer-action").querySelectorAll("button")) x.classList.toggle("on", x === b)
  })
  $("presets").addEventListener("click", async (e) => {
    const b = e.target.closest("button")
    if (!b) return
    const r = await window.ac.createTimer(state.timerAction, Number(b.dataset.min))
    if (!r.ok) return flash(r.error)
    loadTimers()
  })

  $("tile-web").addEventListener("click", () => window.ac.openWeb())
  $("autostart").addEventListener("change", (e) => window.ac.setAutostart(e.target.checked))

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.ac.hide()
  })

  window.ac.on("panel:shown", () => {
    state.visible = true
    loadStatus()
    loadTimers()
  })
  window.ac.on("panel:hidden", () => {
    state.visible = false
  })
  window.ac.on("auth:changed", () => showLogin())
}

// Poll: every 10 s while the panel is open, every 60 s in the background
// (keeps the tray icon's temperature current).
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
  buildScene()
  wire()
  const auth = await window.ac.authState()
  if (auth.ok && auth.data) showRemote()
  else showLogin()
  startPolling()
}

init()

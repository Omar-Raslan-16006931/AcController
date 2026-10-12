// AC Controller for Windows: lives in the notification area (the "hidden
// icons" tray, and can be dragged next to the clock like Volume). Clicking
// the icon opens a small glass panel right above it; clicking elsewhere
// hides it again. Starts with Windows.
//
// All network calls (Supabase sign-in, the Pi API, timers) happen here in
// the main process: Node has no CORS limits, and the renderer only talks to
// us through the small `window.ac` bridge in preload.js.

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell, safeStorage } = require("electron")
const path = require("path")
const fs = require("fs")
const cfg = require("./config")

const WIDTH = 360
const HEIGHT = 600

let tray = null
let win = null
let lastHiddenAt = 0

// ---------------------------------------------------------------------------
// Single instance + auto start
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit()
}
app.on("second-instance", () => showPanel())

function autoStartEnabled() {
  return app.getLoginItemSettings().openAtLogin
}
function setAutoStart(on) {
  // For the portable .exe, PORTABLE_EXECUTABLE_FILE is the real file the
  // user launched (process.execPath points into a temp folder).
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
  app.setLoginItemSettings({ openAtLogin: on, path: exe, args: ["--hidden"] })
}

// ---------------------------------------------------------------------------
// Session (Supabase auth), stored encrypted with Windows DPAPI
// ---------------------------------------------------------------------------

const sessionFile = () => path.join(app.getPath("userData"), "session.bin")
let session = null // { access_token, refresh_token, expires_at, user_id, email }

function loadSession() {
  try {
    const buf = fs.readFileSync(sessionFile())
    const json = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString("utf8")
    session = JSON.parse(json)
  } catch {
    session = null
  }
}
function saveSession() {
  try {
    if (!session) {
      fs.rmSync(sessionFile(), { force: true })
      return
    }
    const json = JSON.stringify(session)
    const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, "utf8")
    fs.writeFileSync(sessionFile(), data)
  } catch (err) {
    console.error("saveSession", err)
  }
}

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"))
  } catch {
    return {}
  }
}

function storeAuthResponse(data) {
  const claims = decodeJwt(data.access_token)
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at ? data.expires_at * 1000 : Date.now() + (data.expires_in || 3600) * 1000,
    user_id: claims.sub,
    email: claims.email || (data.user && data.user.email) || "",
  }
  saveSession()
}

async function authRequest(grant, body) {
  const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || `Sign-in failed (${res.status})`)
  return data
}

let refreshing = null
async function accessToken() {
  if (!session) throw new Error("NOT_SIGNED_IN")
  if (Date.now() < session.expires_at - 60_000) return session.access_token
  if (!refreshing) {
    refreshing = authRequest("refresh_token", { refresh_token: session.refresh_token })
      .then((data) => storeAuthResponse(data))
      .catch((err) => {
        session = null
        saveSession()
        throw err
      })
      .finally(() => {
        refreshing = null
      })
  }
  await refreshing
  return session.access_token
}

// ---------------------------------------------------------------------------
// Pi API: prefer the stable Tailscale address, fall back to the Cloudflare
// tunnel published at /pi-url.txt
// ---------------------------------------------------------------------------

let apiBase = null

async function withTimeout(promise, ms) {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("timeout")), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(t)
  }
}

async function reachable(base) {
  try {
    const res = await withTimeout(fetch(`${base}/api/status/ping`), 5000)
    return res.ok
  } catch {
    return false
  }
}

async function resolveApiBase(force = false) {
  if (apiBase && !force) return apiBase
  const candidates = [cfg.STABLE_API_URL]
  try {
    const res = await withTimeout(fetch(cfg.PI_URL_FILE, { cache: "no-store" }), 5000)
    const url = (await res.text()).trim().replace(/\/+$/, "")
    if (url.startsWith("http")) candidates.push(url)
  } catch {
    // ignore: the stable address may still work
  }
  for (const base of candidates) {
    if (await reachable(base)) {
      apiBase = base
      return base
    }
  }
  throw new Error("Can't reach the Raspberry Pi")
}

async function api(method, pathName, body, retry = true) {
  const base = await resolveApiBase()
  const token = await accessToken()
  let res
  try {
    res = await withTimeout(
      fetch(`${base}${pathName}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }),
      15000
    )
  } catch (err) {
    if (retry) {
      apiBase = null
      return api(method, pathName, body, false)
    }
    throw err
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.detail) || `Request failed (${res.status})`)
  return data
}

// Supabase REST (timers table), same row-level security as the web app.
async function rest(method, pathAndQuery, body) {
  const token = await accessToken()
  const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }
  if (method === "GET") return res.json()
  return null
}

// ---------------------------------------------------------------------------
// IPC used by the renderer
// ---------------------------------------------------------------------------

function wrap(fn) {
  return async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) }
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) }
    }
  }
}

ipcMain.handle("auth:state", wrap(async () => (session ? { email: session.email } : null)))
ipcMain.handle(
  "auth:signIn",
  wrap(async (email, password) => {
    storeAuthResponse(await authRequest("password", { email, password }))
    return { email: session.email }
  })
)
ipcMain.handle(
  "auth:signOut",
  wrap(async () => {
    session = null
    saveSession()
  })
)

ipcMain.handle("ac:status", wrap(() => api("GET", "/api/status")))
ipcMain.handle("ac:power", wrap((power) => api("POST", "/api/power", { power })))
ipcMain.handle("ac:temperature", wrap((temperature) => api("POST", "/api/temperature", { temperature })))
ipcMain.handle("ac:mode", wrap((mode) => api("POST", "/api/mode", { mode })))
ipcMain.handle("ac:fan", wrap((fan) => api("POST", "/api/fan", { fan })))

ipcMain.handle(
  "timers:list",
  wrap(() => rest("GET", "timers?select=id,action,fires_at&status=eq.pending&order=fires_at.asc"))
)
ipcMain.handle(
  "timers:create",
  wrap((action, minutes) =>
    rest("POST", "timers", {
      user_id: session.user_id,
      action,
      fires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      label: "",
      status: "pending",
    })
  )
)
ipcMain.handle(
  "timers:cancel",
  wrap((id) => rest("PATCH", `timers?id=eq.${encodeURIComponent(id)}`, { status: "cancelled" }))
)

ipcMain.handle("app:autostart", wrap(() => autoStartEnabled()))
ipcMain.handle("app:setAutostart", wrap((on) => setAutoStart(!!on)))
ipcMain.handle("app:openWeb", wrap(() => shell.openExternal(cfg.WEB_APP_URL)))
ipcMain.handle("app:hide", wrap(() => hidePanel()))

// The renderer draws the tray icon (temperature + state) on a canvas and
// sends it here, so the taskbar shows "22" like the volume icon shows level.
ipcMain.on("tray:update", (_event, payload) => {
  if (!tray || !payload) return
  try {
    if (payload.icon) tray.setImage(nativeImage.createFromDataURL(payload.icon))
    if (payload.tooltip) tray.setToolTip(payload.tooltip)
  } catch (err) {
    console.error("tray:update", err)
  }
})

// ---------------------------------------------------------------------------
// Window + tray
// ---------------------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  win.setAlwaysOnTop(true, "pop-up-menu")
  win.loadFile(path.join(__dirname, "renderer", "index.html"))

  win.on("blur", () => {
    if (win.webContents.isDevToolsOpened()) return
    hidePanel()
  })
}

function positionPanel() {
  const trayBounds = tray.getBounds()
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
  const work = display.workArea
  const full = display.bounds
  const margin = 10

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - WIDTH / 2)
  let y
  if (work.y > full.y) {
    // Taskbar at the top.
    y = work.y + margin
  } else if (work.x > full.x) {
    // Taskbar on the left.
    x = work.x + margin
    y = Math.round(trayBounds.y + trayBounds.height / 2 - HEIGHT / 2)
  } else if (work.width < full.width) {
    // Taskbar on the right.
    x = work.x + work.width - WIDTH - margin
    y = Math.round(trayBounds.y + trayBounds.height / 2 - HEIGHT / 2)
  } else {
    // Taskbar at the bottom (the usual case).
    y = work.y + work.height - HEIGHT - margin
  }
  x = Math.max(work.x + margin, Math.min(x, work.x + work.width - WIDTH - margin))
  y = Math.max(work.y + margin, Math.min(y, work.y + work.height - HEIGHT - margin))
  win.setPosition(x, y, false)
}

function showPanel() {
  if (!win) return
  positionPanel()
  win.show()
  win.focus()
  win.webContents.send("panel:shown")
}

function hidePanel() {
  if (!win || !win.isVisible()) return
  lastHiddenAt = Date.now()
  win.hide()
  win.webContents.send("panel:hidden")
}

function togglePanel() {
  if (!win) return
  if (win.isVisible()) return hidePanel()
  // Clicking the tray icon while the panel is open first blurs (hides) it;
  // don't immediately re-open on that same click.
  if (Date.now() - lastHiddenAt < 250) return
  showPanel()
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: "Open AC Controller", click: () => showPanel() },
    { label: "Open web app", click: () => shell.openExternal(cfg.WEB_APP_URL) },
    { type: "separator" },
    {
      label: "Start with Windows",
      type: "checkbox",
      checked: autoStartEnabled(),
      click: (item) => setAutoStart(item.checked),
    },
    {
      label: "Sign out",
      click: () => {
        session = null
        saveSession()
        if (win) win.webContents.send("auth:changed")
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ])
}

function createTray() {
  const iconPath = path.join(__dirname, "assets", "tray.png")
  let image = nativeImage.createFromPath(iconPath)
  if (!image.isEmpty()) image = image.resize({ width: 16, height: 16 })
  tray = new Tray(image)
  tray.setToolTip("AC Controller")
  tray.on("click", togglePanel)
  tray.on("right-click", () => tray.popUpContextMenu(buildMenu()))
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.omar.accontroller.desktop")
  loadSession()
  // First run: turn on start-with-Windows (can be switched off in the menu).
  const flag = path.join(app.getPath("userData"), "autostart-initialized")
  if (!fs.existsSync(flag)) {
    setAutoStart(true)
    try {
      fs.writeFileSync(flag, "1")
    } catch {
      // ignore
    }
  }
  createTray()
  createWindow()
  if (!process.argv.includes("--hidden")) {
    win.once("ready-to-show", () => showPanel())
  }
})

// Tray app: closing the panel never quits.
app.on("window-all-closed", (e) => e.preventDefault())

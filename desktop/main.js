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

const WIDTH = 304
// The panel's height follows its content (the renderer reports it).
let HEIGHT = 420

let tray = null
let win = null
let lastHiddenAt = 0
// While the close animation plays the window is still visible; this is the
// timer that hides it afterwards. Keep in step with .panel.closing in style.css.
const CLOSE_MS = 170
let hiding = null

// ---------------------------------------------------------------------------
// Single instance + auto start
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit()
}
app.on("second-instance", () => showPanel())

// Windows only reports a login item as enabled when it's queried with the
// same path + args it was registered with, so both calls use the same ones.
// The choice is also saved to a file, since updates reinstall the app.
const AUTOSTART_ARGS = ["--hidden"]
const autostartExe = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
const autostartPrefFile = () => path.join(app.getPath("userData"), "autostart.json")

function autoStartEnabled() {
  try {
    return JSON.parse(fs.readFileSync(autostartPrefFile(), "utf8")).on === true
  } catch {
    return app.getLoginItemSettings({ path: autostartExe(), args: AUTOSTART_ARGS }).openAtLogin
  }
}
function setAutoStart(on) {
  // For the portable .exe, PORTABLE_EXECUTABLE_FILE is the real file the
  // user launched (process.execPath points into a temp folder).
  app.setLoginItemSettings({ openAtLogin: !!on, path: autostartExe(), args: AUTOSTART_ARGS })
  try {
    fs.writeFileSync(autostartPrefFile(), JSON.stringify({ on: !!on }))
  } catch {
    // ignore
  }
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
// Passkey sign-in. Passkeys belong to the website's domain, so the panel (a
// local file) can't use them itself. Instead we open the website's sign-in
// page in a small window, where Windows Hello works, and take the session
// from it once signed in. The window uses a throwaway in-memory profile.
// ---------------------------------------------------------------------------

// supabase-js keeps the session in localStorage under sb-<project>-auth-token.
const WEB_SESSION_KEY = `sb-${new URL(cfg.SUPABASE_URL).hostname.split(".")[0]}-auth-token`
let passkeyWin = null

function passkeySession() {
  if (passkeyWin && !passkeyWin.isDestroyed()) {
    passkeyWin.focus()
    return Promise.reject(new Error("The passkey window is already open"))
  }
  return new Promise((resolve, reject) => {
    const w = new BrowserWindow({
      width: 440,
      height: 640,
      title: "Sign in with a passkey",
      autoHideMenuBar: true,
      backgroundColor: "#03070e",
      webPreferences: {
        partition: `passkey-${Date.now()}`,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    passkeyWin = w
    let done = false
    let poll = null
    const finish = (err, value) => {
      if (done) return
      done = true
      clearInterval(poll)
      passkeyWin = null
      if (!w.isDestroyed()) w.destroy()
      if (err) reject(err)
      else resolve(value)
    }

    const readSession = `(() => { try { return localStorage.getItem(${JSON.stringify(WEB_SESSION_KEY)}) } catch { return null } })()`
    poll = setInterval(async () => {
      if (w.isDestroyed()) return
      try {
        const raw = await w.webContents.executeJavaScript(readSession)
        const s = raw ? JSON.parse(raw) : null
        if (s && s.access_token && s.refresh_token) finish(null, s)
      } catch {
        // Page still loading.
      }
    }, 400)

    w.on("closed", () => finish(new Error("PASSKEY_CANCELLED")))
    w.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: "deny" }
    })
    // Press the site's "Sign in with a passkey" button so Windows Hello
    // opens straight away (it can still be pressed by hand).
    w.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        if (w.isDestroyed()) return
        w.webContents
          .executeJavaScript(
            `(() => { const b = [...document.querySelectorAll("button")].find((b) => /passkey/i.test(b.textContent)); if (b) b.click() })()`,
            true
          )
          .catch(() => {})
      }, 900)
    })
    w.loadURL(`${cfg.WEB_APP_URL}/login`)
  })
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
async function rest(method, pathAndQuery, body, returnRows = false) {
  const token = await accessToken()
  const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: returnRows ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }
  if (method === "GET" || returnRows) return res.json()
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
  "auth:passkey",
  wrap(async () => {
    storeAuthResponse(await passkeySession())
    showPanel()
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
  wrap(async (action, minutes) => {
    const rows = await rest(
      "POST",
      "timers?select=id,action,fires_at",
      {
        user_id: session.user_id,
        action,
        fires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
        label: "",
        status: "pending",
      },
      true
    )
    return Array.isArray(rows) ? rows[0] : rows
  })
)
ipcMain.handle(
  "timers:cancel",
  wrap((id) => rest("PATCH", `timers?id=eq.${encodeURIComponent(id)}`, { status: "cancelled" }))
)
// Today's on-time: power events from the last week (so a session that
// started before midnight is still counted), oldest first.
ipcMain.handle(
  "usage:today",
  wrap(() => {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 7)
    return rest(
      "GET",
      `command_history?select=power,created_at&created_at=gte.${encodeURIComponent(since.toISOString())}&order=created_at.asc`
    )
  })
)
// Row-level security limits this to the signed-in user's timers.
ipcMain.handle(
  "timers:cancelAll",
  wrap(() => rest("PATCH", "timers?status=eq.pending", { status: "cancelled" }))
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

ipcMain.on("panel:size", (_event, h) => {
  const next = Math.max(200, Math.min(700, Math.round(Number(h) || 0)))
  if (!win || !next || next === HEIGHT) return
  HEIGHT = next
  // Windows ignores size changes on non-resizable windows, so unlock briefly.
  win.setResizable(true)
  win.setContentSize(WIDTH, HEIGHT, false)
  win.setResizable(false)
  if (win.isVisible()) positionPanel()
})

ipcMain.handle("app:version", wrap(() => app.getVersion()))
ipcMain.handle("app:quit", wrap(() => setTimeout(() => app.quit(), 50)))
ipcMain.handle("update:check", wrap(() => checkForUpdates(true)))
ipcMain.handle(
  "update:install",
  wrap(() => {
    if (updateStatus.state === "ready") installUpdate()
  })
)

// ---------------------------------------------------------------------------
// Auto update (installed app only): new builds are published as GitHub
// releases by the "Windows EXE" workflow; we download them in the
// background and install silently the next time the panel is closed.
// ---------------------------------------------------------------------------

let autoUpdater = null
try {
  ;({ autoUpdater } = require("electron-updater"))
} catch {
  autoUpdater = null
}
let updateStatus = { state: "idle" }
const updatedFlag = () => path.join(app.getPath("userData"), "just-updated")

function canUpdate() {
  // The portable .exe can't replace itself; only the installed app updates.
  return !!autoUpdater && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE
}

function sendUpdate(status) {
  updateStatus = status
  if (win && !win.isDestroyed()) win.webContents.send("update:status", status)
}

function installUpdate() {
  try {
    fs.writeFileSync(updatedFlag(), "1")
  } catch {
    // ignore
  }
  // Silent install, then start the new version.
  autoUpdater.quitAndInstall(true, true)
}

async function checkForUpdates(manual = false) {
  if (!canUpdate()) {
    if (manual) sendUpdate({ state: "dev" })
    return
  }
  if (["downloading", "ready"].includes(updateStatus.state)) return sendUpdate(updateStatus)
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    sendUpdate({ state: "error", message: String((err && err.message) || err) })
  }
}

function setupUpdater() {
  if (!canUpdate()) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on("checking-for-update", () => sendUpdate({ state: "checking" }))
  autoUpdater.on("update-available", (info) => sendUpdate({ state: "available", version: info.version }))
  autoUpdater.on("update-not-available", () => sendUpdate({ state: "latest" }))
  autoUpdater.on("download-progress", (p) => sendUpdate({ state: "downloading", percent: p.percent }))
  autoUpdater.on("update-downloaded", (info) => {
    sendUpdate({ state: "ready", version: info.version })
    // Don't interrupt someone using the panel; install once it's closed.
    if (!win || !win.isVisible()) installUpdate()
  })
  autoUpdater.on("error", (err) => sendUpdate({ state: "error", message: String((err && err.message) || err) }))
  setTimeout(() => checkForUpdates(), 10_000)
  setInterval(() => checkForUpdates(), 30 * 60_000)
}

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
  if (hiding) {
    clearTimeout(hiding)
    hiding = null
  }
  positionPanel()
  win.show()
  win.focus()
  win.webContents.send("panel:shown")
}

// Plays the close animation in the panel, then hides the window. Ending on
// a fully transparent frame also means reopening never flashes the old one.
function hidePanel() {
  if (!win || !win.isVisible() || hiding) return
  lastHiddenAt = Date.now()
  win.webContents.send("panel:hiding")
  hiding = setTimeout(() => {
    hiding = null
    if (!win || !win.isVisible()) return
    win.hide()
    win.webContents.send("panel:hidden")
    if (updateStatus.state === "ready") setTimeout(installUpdate, 1500)
  }, CLOSE_MS)
}

function togglePanel() {
  if (!win) return
  if (win.isVisible() && !hiding) return hidePanel()
  // Clicking the tray icon while the panel is open first blurs (hides) it;
  // don't immediately re-open on that same click.
  if (Date.now() - lastHiddenAt < 250) return
  showPanel()
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: "Open AC Controller", click: () => showPanel() },
    { label: "Open web app", click: () => shell.openExternal(cfg.WEB_APP_URL) },
    { label: `Check for updates (v${app.getVersion()})`, click: () => checkForUpdates(true) },
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
  // After that, re-apply the saved choice on every start so it survives
  // updates (and points at the current exe).
  if (!fs.existsSync(autostartPrefFile())) setAutoStart(true)
  else setAutoStart(autoStartEnabled())
  createTray()
  createWindow()
  // After a silent background update, come back quietly in the tray.
  const justUpdated = fs.existsSync(updatedFlag())
  if (justUpdated) fs.rmSync(updatedFlag(), { force: true })
  if (!process.argv.includes("--hidden") && !justUpdated) {
    win.once("ready-to-show", () => showPanel())
  }
  setupUpdater()
})

// Tray app: closing the panel never quits.
app.on("window-all-closed", (e) => e.preventDefault())

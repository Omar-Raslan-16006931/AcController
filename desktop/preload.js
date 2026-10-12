const { contextBridge, ipcRenderer } = require("electron")

// Every call resolves to { ok: true, data } or { ok: false, error }.
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld("ac", {
  authState: () => invoke("auth:state"),
  signIn: (email, password) => invoke("auth:signIn", email, password),
  signOut: () => invoke("auth:signOut"),

  status: () => invoke("ac:status"),
  power: (on) => invoke("ac:power", on),
  temperature: (t) => invoke("ac:temperature", t),
  mode: (m) => invoke("ac:mode", m),
  fan: (f) => invoke("ac:fan", f),

  timers: () => invoke("timers:list"),
  createTimer: (action, minutes) => invoke("timers:create", action, minutes),
  cancelTimer: (id) => invoke("timers:cancel", id),

  autostart: () => invoke("app:autostart"),
  setAutostart: (on) => invoke("app:setAutostart", on),
  openWeb: () => invoke("app:openWeb"),
  hide: () => invoke("app:hide"),

  updateTray: (payload) => ipcRenderer.send("tray:update", payload),
  on: (channel, fn) => {
    const allowed = ["panel:shown", "panel:hidden", "auth:changed"]
    if (allowed.includes(channel)) ipcRenderer.on(channel, () => fn())
  },
})

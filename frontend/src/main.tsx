import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import App from "@/App.tsx"

// Vite fires this event when a dynamically-imported chunk fails to load --
// most commonly right after a new deploy, when a tab that's been open since
// before it tries to fetch a JS chunk hash that no longer exists on the
// server. lazyWithReload (src/lib/lazy-with-reload.ts) handles this for our
// route-level lazy() imports directly; this listener is a second safety net
// for module-preload link failures that can fire independently of that.
// Guarded by the same sessionStorage key so the two mechanisms don't cause
// a double reload.
const CHUNK_RELOAD_GUARD_KEY = "ac-controller-chunk-reload-attempted"
window.addEventListener("vite:preloadError", () => {
  const alreadyTried = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1"
  if (alreadyTried) return
  window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1")
  window.location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import { lazy, type ComponentType } from "react"

// After a new production deploy, every JS chunk gets a new content hash.
// A browser tab that's been open since before the deploy will still try to
// dynamically import an old hash (e.g. when navigating to a lazy route for
// the first time), that file 404s, and our SPA catch-all rewrite in
// vercel.json serves index.html back instead of a real 404 -- which is what
// produced the "Expected a JavaScript-or-Wasm module script ... text/html"
// error. There's no way to prevent the 404 itself (the old chunk is really
// gone), so instead we catch the failed import and silently reload the page
// once, which re-fetches the current index.html and its up-to-date chunk
// hashes. Guarded by sessionStorage so a *genuine* repeated failure (e.g.
// actually offline) doesn't cause a reload loop.
const RELOAD_GUARD_KEY = "ac-controller-chunk-reload-attempted"

export function lazyWithReload<T extends { default: ComponentType<unknown> }>(
  factory: () => Promise<T>
) {
  return lazy(async () => {
    try {
      const mod = await factory()
      // A later successful load means the app is on a good build again --
      // clear the guard so a future real deploy can trigger one more retry.
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY)
      return mod
    } catch (error) {
      const alreadyTried = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === "1"
      if (alreadyTried) {
        // Already tried reloading once and it still failed -- this is a
        // real error (offline, broken deploy, etc), so let it surface
        // normally instead of reload-looping.
        throw error
      }
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1")
      window.location.reload()
      // Never resolve/reject -- the page is about to reload, so there's no
      // useful component to render in the meantime.
      return new Promise<T>(() => {})
    }
  })
}

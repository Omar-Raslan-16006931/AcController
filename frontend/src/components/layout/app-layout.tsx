import * as React from "react"
import { Suspense } from "react"
import { useLocation, useOutlet } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { MobileMenu } from "@/components/layout/mobile-menu"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"
import { useLiveActivitySync } from "@/lib/native"

// Tab order decides which way a page slides: moving to a tab on the right
// slides in from the right, like iOS. Sub-pages opened from Settings sit
// "after" it so they push in from the right too.
function routeOrder(pathname: string): number {
  if (pathname === "/") return 0
  if (pathname.startsWith("/remote")) return 1
  if (pathname.startsWith("/schedules")) return 2
  if (pathname.startsWith("/settings")) return 3
  return 4
}

/** The page as it was when this slide mounted. Without this, the page that
 * is sliding OUT would already render the NEW route (Outlet always reads
 * the current location), so the exit animation would show the wrong page. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = React.useState(outlet)
  return frozen
}

const pageVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -36, opacity: 0 }),
}

export function AppLayout() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const mainRef = React.useRef<HTMLElement>(null)

  // Slide direction, fixed once per navigation (so a data refresh mid-
  // transition can't reset it to "no slide").
  const order = routeOrder(location.pathname)
  const nav = React.useRef({ path: location.pathname, order, dir: 0 })
  if (nav.current.path !== location.pathname) {
    const prev = nav.current.order
    nav.current = { path: location.pathname, order, dir: order === prev ? 1 : order > prev ? 1 : -1 }
  }
  const dir = nav.current.dir

  // Keeps the Dynamic Island / lock-screen Live Activity in step with the
  // AC (no-op outside the iOS app).
  useLiveActivitySync()

  // Warm every tab's code once the first screen is up, so switching tabs
  // never waits on a network download.
  React.useEffect(() => {
    const warm = () => {
      void import("@/pages/dashboard-page")
      void import("@/pages/remote-page")
      void import("@/pages/schedules-page")
      void import("@/pages/settings-page")
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(warm)
    else window.setTimeout(warm, 1200)
  }, [])

  return (
    // Transparent so the living background (App.tsx) shows through.
    <div className="relative z-0 flex h-svh flex-col overflow-hidden">
      <OfflineBanner />

      <main ref={mainRef} className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <AnimatePresence
          mode="wait"
          initial={false}
          custom={dir}
          onExitComplete={() => mainRef.current?.scrollTo({ top: 0 })}
        >
          <motion.div
            key={location.pathname}
            custom={dir}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 },
              opacity: { duration: 0.18 },
            }}
            className="pb-tabbar mx-auto w-full max-w-xl px-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <FrozenOutlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileMenu />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

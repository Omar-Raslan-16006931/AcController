import * as React from "react"
import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { motion } from "framer-motion"

import { Topbar } from "@/components/layout/topbar"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"

/**
 * App shell. The document itself scrolls (not an inner overflow box) --
 * that's what gives iOS its native momentum scrolling, tap-status-bar-to-top,
 * and a stable address-bar collapse with no layout jumps. The top bar is
 * sticky, the tab bar is fixed, and page content reserves room for both.
 */
export function AppLayout() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  // New page always starts at the top instead of inheriting the previous
  // page's scroll position.
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [location.pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <OfflineBanner />

      <main className="flex-1">
        <ErrorBoundary key={location.pathname}>
          {/* A short settle on the y-axis only. Content is never hidden
              behind the animation (no opacity-from-0), and there is no scale,
              so nothing reads as a zoom. */}
          <motion.div
            key={location.pathname}
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
            className="pb-tabbar mx-auto w-full max-w-lg px-4 pt-4 sm:max-w-2xl sm:px-6"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </ErrorBoundary>
      </main>

      <MobileMenu />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

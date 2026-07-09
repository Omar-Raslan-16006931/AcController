import * as React from "react"
import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { Topbar } from "@/components/layout/topbar"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"

export function AppLayout() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  return (
    // No bg-background here on purpose: body already supplies that solid
    // color, and BackgroundPixelStars is mounted once at the App.tsx root
    // (above the router, so it covers /login too and never remounts on
    // navigation) -- leaving this div transparent lets that fixed starfield
    // canvas show through page gaps/margins instead of being hidden behind
    // an opaque layer of its own.
    <div className="flex h-svh flex-col overflow-hidden">
      <OfflineBanner />
      <Topbar />

      <main className="no-scrollbar flex-1 overflow-y-auto">
        <ErrorBoundary key={location.pathname}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
              className="pb-tabbar mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6"
            >
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <MobileMenu />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

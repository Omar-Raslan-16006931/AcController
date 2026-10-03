import * as React from "react"
import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { MobileMenu } from "@/components/layout/mobile-menu"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"

export function AppLayout() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  return (
    // Transparent so the living background (App.tsx) shows through.
    <div className="relative z-0 flex h-svh flex-col overflow-hidden">
      <OfflineBanner />

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <ErrorBoundary key={location.pathname}>
          <AnimatePresence mode="wait" initial={false}>
            {/* Slide only, no scale: page changes never read as a zoom. */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
              className="pb-tabbar mx-auto w-full max-w-xl px-3"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
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

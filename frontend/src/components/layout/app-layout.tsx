import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { Topbar } from "@/components/layout/topbar"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"
import * as React from "react"

export function AppLayout() {
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <OfflineBanner />
      <Topbar onOpenPalette={() => setPaletteOpen(true)} />

      <main className="no-scrollbar flex-1 overflow-y-auto">
        <ErrorBoundary key={location.pathname}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto w-full max-w-7xl p-4 sm:p-6"
            >
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

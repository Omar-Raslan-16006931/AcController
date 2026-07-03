import * as React from "react"
import { Suspense } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { SidebarNav } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { CommandPalette } from "@/components/layout/command-palette"
import { OfflineBanner } from "@/components/offline-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoader } from "@/components/page-loader"

const SIDEBAR_STORAGE_KEY = "ac-controller-sidebar-collapsed"

export function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = React.useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1"
  )

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }

  const [paletteOpen, setPaletteOpen] = React.useState(false)

  return (
    <div className="bg-background flex h-svh overflow-hidden">
      <SidebarNav
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        className="hidden md:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

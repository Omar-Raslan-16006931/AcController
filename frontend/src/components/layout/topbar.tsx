import { Search } from "lucide-react"
import { useLocation } from "react-router-dom"

import { navItems } from "@/components/layout/nav-items"
import { NavDrawer } from "@/components/layout/nav-drawer"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { ConnectionBadge } from "@/components/layout/connection-badge"
import { UserMenu } from "@/components/layout/user-menu"

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const location = useLocation()
  const current = navItems.find((item) =>
    item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)
  )

  return (
    <header className="bg-background/70 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-md sm:px-5">
      <NavDrawer />

      <h1 className="font-heading text-lg font-semibold">{current?.title ?? "AcController"}</h1>

      <button
        onClick={onOpenPalette}
        className="text-muted-foreground hover:bg-accent/60 ml-2 hidden max-w-xs flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors sm:flex"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="bg-muted ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ConnectionBadge />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

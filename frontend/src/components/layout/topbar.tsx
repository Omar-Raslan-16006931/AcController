import { Snowflake } from "lucide-react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { ConnectionBadge } from "@/components/layout/connection-badge"
import { UserMenu } from "@/components/layout/user-menu"

/**
 * Slim iOS-style navigation bar: brand mark on the left, status + actions on
 * the right. The page itself owns its large title (see PageHeader), so the
 * bar never duplicates it. Primary navigation lives in the bottom MobileMenu.
 */
export function Topbar() {
  return (
    <header
      className="ios-bar hairline-b sticky top-0 z-30 shrink-0"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-2 px-4">
        <div className="text-foreground flex size-7 items-center justify-center">
          <Snowflake className="size-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">AcController</span>

        <div className="ml-auto flex items-center gap-1">
          <ConnectionBadge />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

import { Snowflake } from "lucide-react"

import { ConnectionBadge } from "@/components/layout/connection-badge"
import { UserMenu } from "@/components/layout/user-menu"

/**
 * Slim sticky top bar: brand mark on the left, Pi status + account on the
 * right. Pages own their own large title (PageHeader), and primary
 * navigation lives in the bottom tab bar.
 */
export function Topbar() {
  return (
    <header className="ios-bar hairline-b pt-safe sticky top-0 z-30 shrink-0">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-2.5 px-4 sm:max-w-2xl sm:px-6">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl">
          <Snowflake className="size-4" strokeWidth={2.4} />
        </div>
        <span className="text-[16px] font-bold tracking-tight">AcController</span>

        <div className="ml-auto flex items-center gap-2">
          <ConnectionBadge />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

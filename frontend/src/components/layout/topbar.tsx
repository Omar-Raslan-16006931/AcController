import { ConnectionBadge } from "@/components/layout/connection-badge"
import { UserMenu } from "@/components/layout/user-menu"

/**
 * Slim sticky top bar: a typographic wordmark (no icon tile) on the left,
 * Pi status and account on the right. Pages own their large titles.
 */
export function Topbar() {
  return (
    <header className="bar pt-safe sticky top-0 z-30 shrink-0">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 px-5 sm:max-w-2xl sm:px-6">
        <span className="font-heading text-[19px] leading-none font-medium tracking-[-0.01em]">
          Ac<span className="text-primary">°</span>Controller
        </span>

        <div className="ml-auto flex items-center gap-3">
          <ConnectionBadge />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

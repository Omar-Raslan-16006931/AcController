import { useNavigate, useLocation } from "react-router-dom"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"

function activeIndexForPath(pathname: string): number {
  const index = navItems.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )
  // Sub-pages linked from Settings (history, system, detect) keep the
  // Settings tab lit.
  return index === -1 ? navItems.length - 1 : index
}

/** Floating glass tab bar; a glass lens slides under the active tab. */
export function MobileMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeIndexForPath(location.pathname)

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass glass-dense pointer-events-auto relative mx-auto grid h-[58px] w-full max-w-md grid-cols-4 rounded-[29px] p-[5px]">
        <span
          aria-hidden
          className="absolute top-[5px] bottom-[5px] left-[5px] transition-transform duration-500 ease-[cubic-bezier(.34,1.45,.5,1)]"
          style={{ width: "calc((100% - 10px) / 4)", transform: `translateX(${active * 100}%)` }}
        >
          {/* Keyed by tab so the liquid stretch replays on every move. */}
          <span key={active} className="lens lens-stretch absolute inset-0 rounded-[24px]" />
        </span>
        {navItems.map((item, i) => {
          const Icon = item.icon
          const on = i === active
          return (
            <button
              key={item.href}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => navigate(item.href)}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200",
                on ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-[20px]" strokeWidth={1.8} />
              {item.title}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

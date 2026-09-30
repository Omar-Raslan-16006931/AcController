import { NavLink, useLocation } from "react-router-dom"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

/**
 * Fixed bottom tab bar: solid white surface, hairline top border, five
 * equal-width tabs with icon + label. The active tab gets a blue icon on a
 * pale-blue pill -- no bounce, no scale, nothing that shifts layout.
 */
export function MobileMenu() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Primary"
      className="bg-card/95 hairline-t fixed inset-x-0 bottom-0 z-40 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 w-full max-w-lg items-stretch px-2 sm:max-w-2xl">
        {navItems.map((item) => {
          const active = isActive(item.href, pathname)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex flex-1">
              <NavLink
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150",
                    active ? "bg-accent" : "bg-transparent"
                  )}
                >
                  <Icon className="size-[20px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.title}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

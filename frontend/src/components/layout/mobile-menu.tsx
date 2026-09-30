import { NavLink, useLocation } from "react-router-dom"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

/**
 * Bottom tab bar. The active tab is marked by a raised plate that slides
 * between tabs (shared layoutId), plus a type/colour shift on the label --
 * no dots, no underline. Everything is visible at rest; the slide is the
 * only motion.
 */
export function MobileMenu() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Primary"
      className="bar fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[4.25rem] w-full max-w-lg items-stretch gap-1 px-3 py-2 sm:max-w-2xl">
        {navItems.map((item) => {
          const active = isActive(item.href, pathname)
          const Icon = item.icon
          return (
            <li key={item.href} className="relative flex flex-1">
              {active && (
                <motion.span
                  layoutId="tabbar-plate"
                  className="bg-raised absolute inset-0 rounded-[1rem]"
                  transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.8 }}
                />
              )}
              <NavLink
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] text-[11px] transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "text-foreground font-semibold" : "text-muted-foreground font-medium active:text-foreground"
                )}
              >
                <Icon
                  className={cn("size-[20px] transition-colors duration-200", active && "text-primary")}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.title}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

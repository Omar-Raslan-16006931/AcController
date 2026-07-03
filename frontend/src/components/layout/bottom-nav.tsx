import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// The 4 destinations reached constantly on a phone get a permanent tab.
// Everything else lives one tap away behind "More" instead of a hamburger —
// this is the primary "always mobile-first" nav for the app.
const PRIMARY_COUNT = 4

export function BottomNav() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const primaryItems = navItems.slice(0, PRIMARY_COUNT)
  const overflowItems = navItems.slice(PRIMARY_COUNT)

  const isOverflowActive = overflowItems.some((item) =>
    item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)
  )

  return (
    <>
      <nav
        className="bg-background/90 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {primaryItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("size-5", isActive && "drop-shadow-[0_0_6px_var(--primary)]")} />
                  {item.title}
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              isOverflowActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-3 gap-2 p-4 pt-0">
            {overflowItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground border-transparent"
                      : "text-foreground/70 hover:bg-accent/60 border-border/60"
                  )
                }
              >
                <item.icon className="size-5" />
                {item.title}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}

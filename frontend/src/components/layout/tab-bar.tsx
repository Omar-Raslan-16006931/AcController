import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { ChevronRight, Ellipsis } from "lucide-react"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * iOS-native bottom tab bar: blurred bar pinned to the bottom edge with a
 * hairline top border and safe-area padding. The first four destinations get
 * tabs; the rest live behind a "More" tab that opens a bottom sheet, exactly
 * like UIKit's more-navigation pattern.
 */
const tabItems = navItems.slice(0, 4)
const moreItems = navItems.slice(4)

const spring = { type: "spring" as const, stiffness: 500, damping: 32 }

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ElementType
  label: string
  onClick?: () => void
}) {
  return (
    <motion.span
      whileTap={{ scale: 0.88 }}
      transition={spring}
      onClick={onClick}
      className={cn(
        "relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-active-glow"
          transition={spring}
          className="bg-primary/10 absolute inset-x-2 top-0 h-8 rounded-full"
        />
      )}
      <Icon className="relative size-[22px]" strokeWidth={active ? 2.4 : 2} />
      <span className="relative text-[10px] font-medium leading-none">{label}</span>
    </motion.span>
  )
}

export function TabBar() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href)
  const moreActive = moreItems.some((item) => isActive(item.href))

  return (
    <>
      <nav
        aria-label="Primary"
        className="ios-bar hairline-t fixed inset-x-0 bottom-0 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex w-full max-w-md items-stretch px-2 pt-1 pb-1">
          {tabItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className="flex flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-xl"
            >
              <TabButton active={isActive(item.href)} icon={item.icon} label={item.title} />
            </NavLink>
          ))}
          <TabButton
            active={moreActive || moreOpen}
            icon={Ellipsis}
            label="More"
            onClick={() => setMoreOpen(true)}
          />
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="ios-bar rounded-t-[1.5rem] border-0 px-4 pb-safe"
        >
          <SheetHeader className="px-1 pt-1 pb-0">
            <div className="bg-muted-foreground/30 mx-auto h-1 w-9 rounded-full" />
            <SheetTitle className="pt-2 text-left text-lg font-bold">More</SheetTitle>
          </SheetHeader>
          <div className="bg-card mb-3 overflow-hidden rounded-[1.1rem] dark:ring-1 dark:ring-white/[0.07]">
            {moreItems.map((item, i) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className={({ isActive: active }) =>
                  cn(
                    "active:bg-accent/70 flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-colors",
                    i > 0 && "border-border/70 border-t",
                    active ? "text-primary" : "text-foreground"
                  )
                }
              >
                <span className="bg-secondary text-foreground/80 flex size-8 items-center justify-center rounded-[9px]">
                  <item.icon className="size-4" />
                </span>
                {item.title}
                <ChevronRight className="text-muted-foreground/50 ml-auto size-4" />
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

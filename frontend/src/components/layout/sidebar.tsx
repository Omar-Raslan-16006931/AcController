import { NavLink } from "react-router-dom"
import { motion } from "framer-motion"
import { ChevronsLeft, Snowflake } from "lucide-react"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  className?: string
}

export function SidebarNav({ collapsed, onToggle, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r transition-[width] duration-200 ease-out",
        collapsed ? "w-[76px]" : "w-64",
        className
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Snowflake className="size-5" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="truncate text-sm font-semibold"
          >
            AcController
          </motion.span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="bg-sidebar-primary absolute left-0 h-6 w-1 rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </>
              )}
            </NavLink>
          )

          if (!collapsed) return link

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className="p-3">
        <button
          onClick={onToggle}
          className="hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <ChevronsLeft
            className={cn("size-5 transition-transform duration-200", collapsed && "rotate-180")}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

import * as React from "react"
import { NavLink } from "react-router-dom"
import { Menu, Snowflake } from "lucide-react"

import { cn } from "@/lib/utils"
import { navItems } from "@/components/layout/nav-items"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="flex-row items-center gap-2 border-b">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Snowflake className="size-5" />
          </div>
          <SheetTitle>AcController</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/70 hover:bg-accent/60 hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="size-5" />
              {item.title}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
    </Sheet>
  )
}

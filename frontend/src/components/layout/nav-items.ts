import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Radio,
  CalendarClock,
  History,
  Settings,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

// Trimmed to the 5 destinations people actually use day-to-day. Timers now
// live inline on the Remote page (see timer-controls.tsx) instead of a
// separate page, and System (Pi diagnostics/restart) is still a real route
// -- just reached via a link on the Settings page instead of primary nav.
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Remote", href: "/remote", icon: Radio },
  { title: "Schedules", href: "/schedules", icon: CalendarClock },
  { title: "History", href: "/history", icon: History },
  { title: "Settings", href: "/settings", icon: Settings },
]

import type { LucideIcon } from "lucide-react"
import { Home, Radio, CalendarClock, Settings } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

// Four tabs. History, System and Detect are real routes reached from
// link rows on the Settings page.
export const navItems: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Remote", href: "/remote", icon: Radio },
  { title: "Schedules", href: "/schedules", icon: CalendarClock },
  { title: "Settings", href: "/settings", icon: Settings },
]

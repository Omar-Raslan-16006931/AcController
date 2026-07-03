import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Radio,
  CalendarClock,
  TimerReset,
  History,
  Settings,
  Cpu,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Remote", href: "/remote", icon: Radio },
  { title: "Schedules", href: "/schedules", icon: CalendarClock },
  { title: "Timers", href: "/timers", icon: TimerReset },
  { title: "History", href: "/history", icon: History },
  { title: "System", href: "/system", icon: Cpu },
  { title: "Settings", href: "/settings", icon: Settings },
]

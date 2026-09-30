import { useNavigate, useLocation } from "react-router-dom"

import { navItems } from "@/components/layout/nav-items"
import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/modern-mobile-menu"

const menuItems: InteractiveMenuItem[] = navItems.map((item) => ({
  label: item.title,
  icon: item.icon,
}))

function activeIndexForPath(pathname: string): number {
  const index = navItems.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )
  return index === -1 ? 0 : index
}

/** Floating liquid-glass pill dock; active item derived from the route. */
export function MobileMenu() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-md pb-1">
        <InteractiveMenu
          items={menuItems}
          activeIndex={activeIndexForPath(location.pathname)}
          onActiveIndexChange={(index) => navigate(navItems[index].href)}
        />
      </div>
    </nav>
  )
}

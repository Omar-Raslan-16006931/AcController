import { useNavigate, useLocation } from "react-router-dom"

import { navItems } from "@/components/layout/nav-items"
import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/modern-mobile-menu"

/**
 * Replaces the old iOS-style TabBar (fixed bottom tabs + "More" sheet)
 * with the 21st.dev "Modern Mobile Menu" InteractiveMenu component. The
 * component itself is purely visual/local-state (see
 * components/ui/modern-mobile-menu.tsx) -- this wrapper is what actually
 * makes it a navbar: it maps the app's real `navItems` to the menu's item
 * shape, derives which one is active from the current route instead of
 * from clicks, and calls `navigate()` on selection.
 */
const menuItems: InteractiveMenuItem[] = navItems.map((item) => ({
  label: item.title,
  icon: item.icon,
}))

function activeIndexForPath(pathname: string): number {
  // Exact match for "/" (Dashboard), startsWith for everything else --
  // same matching rule the old TabBar used, so /remote/foo still
  // highlights "Remote".
  const index = navItems.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )
  return index === -1 ? 0 : index
}

export function MobileMenu() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeIndex = activeIndexForPath(location.pathname)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-md pb-1">
        <InteractiveMenu
          items={menuItems}
          activeIndex={activeIndex}
          onActiveIndexChange={(index) => navigate(navItems[index].href)}
        />
      </div>
    </nav>
  )
}

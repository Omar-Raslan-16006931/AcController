import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react"

/**
 * Adapted from the "Modern Mobile Menu" / InteractiveMenu component
 * (21st.dev, @easemize) -- the component JS is kept as close to the
 * original as possible. Two deliberate deviations from the pasted source:
 *
 *  1. The original hard-caps `items` at 2-5 entries (falling back to demo
 *     data otherwise). AcController has 7 real destinations, so that cap
 *     is raised to 8 here -- still a safety rail against an empty/huge
 *     array, just sized for this app instead of the component's demo.
 *  2. Added optional `activeIndex`/`onActiveIndexChange` so a parent (see
 *     `components/layout/mobile-menu.tsx`) can drive the selected item
 *     from the current route instead of purely local click state -- the
 *     original component has no concept of external navigation at all.
 *     Omit both props and it behaves exactly like the standalone demo.
 */

type IconComponentType = React.ElementType<{ className?: string }>

export interface InteractiveMenuItem {
  label: string
  icon: IconComponentType
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[]
  accentColor?: string
  /** Controlled active index (e.g. derived from the current route). */
  activeIndex?: number
  /** Called with the clicked index -- pairs with `activeIndex` for control. */
  onActiveIndexChange?: (index: number) => void
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "home", icon: Home },
  { label: "strategy", icon: Briefcase },
  { label: "period", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
]

const defaultAccentColor = "var(--component-active-color-default)"

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  accentColor,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
}) => {
  const finalItems = useMemo(() => {
    // Raised from the original 2-5 to 2-8 -- see file docstring.
    const isValid = items && Array.isArray(items) && items.length >= 2 && items.length <= 8
    if (!isValid) {
      console.warn("InteractiveMenu: 'items' prop is invalid or missing. Using default items.", items)
      return defaultItems
    }
    return items
  }, [items])

  const isControlled = controlledActiveIndex !== undefined
  const [internalActiveIndex, setInternalActiveIndex] = useState(0)
  const activeIndex = isControlled ? controlledActiveIndex : internalActiveIndex

  useEffect(() => {
    if (!isControlled && activeIndex >= finalItems.length) {
      setInternalActiveIndex(0)
    }
  }, [finalItems, activeIndex, isControlled])

  const textRefs = useRef<(HTMLElement | null)[]>([])
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const setLineWidth = () => {
      const activeItemElement = itemRefs.current[activeIndex]
      const activeTextElement = textRefs.current[activeIndex]

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth
        activeItemElement.style.setProperty("--lineWidth", `${textWidth}px`)
      }
    }

    setLineWidth()
    window.addEventListener("resize", setLineWidth)
    return () => {
      window.removeEventListener("resize", setLineWidth)
    }
  }, [activeIndex, finalItems])

  const handleItemClick = (index: number) => {
    if (!isControlled) setInternalActiveIndex(index)
    onActiveIndexChange?.(index)
  }

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor
    return { "--component-active-color": activeColor } as React.CSSProperties
  }, [accentColor])

  return (
    <nav className="menu" role="navigation" style={navStyle}>
      {finalItems.map((item, index) => {
        const isActive = index === activeIndex
        const IconComponent = item.icon

        return (
          <button
            key={item.label}
            type="button"
            className={`menu__item ${isActive ? "active" : ""}`}
            onClick={() => handleItemClick(index)}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            style={{ "--lineWidth": "0px" } as React.CSSProperties}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="menu__icon">
              <IconComponent className="icon" />
            </div>
            <strong
              className={`menu__text ${isActive ? "active" : ""}`}
              ref={(el) => {
                textRefs.current[index] = el
              }}
            >
              {item.label}
            </strong>
          </button>
        )
      })}
    </nav>
  )
}

export { InteractiveMenu }

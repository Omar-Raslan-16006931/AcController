import * as React from "react"

interface PageHeaderProps {
  title: string
  /** Small line above the title (a date, a room name). */
  eyebrow?: string
  description?: string
  actions?: React.ReactNode
}

/** Large title with an optional small line above and a trailing slot. */
export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        {eyebrow && <p className="text-muted-foreground text-[11.5px] font-semibold">{eyebrow}</p>}
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.4px]">{title}</h1>
        {description && <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-snug">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
    </div>
  )
}

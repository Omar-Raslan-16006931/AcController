import * as React from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

/** Large page title in the display face, one quiet line under it. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h1 className="font-heading text-[34px] leading-[1.05] font-medium tracking-[-0.015em]">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 text-[14px] leading-snug">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

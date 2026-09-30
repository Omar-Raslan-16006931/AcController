import * as React from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

/** Large page title with an optional subtitle and trailing action. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-[14px] leading-snug">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </div>
  )
}

import * as React from "react"
import { motion } from "framer-motion"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

/**
 * iOS large-title header: bold 28pt title owned by the page content, with an
 * optional trailing action (kept compact, like a nav-bar bar-button item).
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="mb-4 flex items-start justify-between gap-3"
    >
      <div className="min-w-0">
        <h2 className="font-heading text-[28px] font-bold leading-tight tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </motion.div>
  )
}

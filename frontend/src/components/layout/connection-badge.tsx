import { cn } from "@/lib/utils"
import { useConnectionStatus } from "@/hooks/use-connection-status"

export function ConnectionBadge() {
  const { state } = useConnectionStatus()

  const config = {
    online: { label: "Online", className: "bg-success/10 text-success", dot: "bg-success" },
    offline: { label: "Offline", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    checking: { label: "Checking", className: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground/60" },
  }[state]

  return (
    <div
      role="status"
      aria-label={`Raspberry Pi ${config.label.toLowerCase()}`}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
        config.className
      )}
    >
      <span className={cn("size-2 rounded-full", config.dot)} />
      {config.label}
    </div>
  )
}

import { Wifi, WifiOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useConnectionStatus } from "@/hooks/use-connection-status"

export function ConnectionBadge() {
  const { state } = useConnectionStatus()

  const config = {
    online: {
      icon: Wifi,
      label: "Pi online",
      className: "bg-success/10 text-success",
      dot: "bg-success",
    },
    offline: {
      icon: WifiOff,
      label: "Pi offline",
      className: "bg-destructive/10 text-destructive",
      dot: "bg-destructive",
    },
    checking: {
      icon: Loader2,
      label: "Checking…",
      className: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  }[state]

  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        config.className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot, state === "online" && "animate-pulse")} />
      <Icon className={cn("size-3.5", state === "checking" && "animate-spin")} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}

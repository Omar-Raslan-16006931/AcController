import { cn } from "@/lib/utils"
import { useConnectionStatus } from "@/hooks/use-connection-status"

/** Plain typographic status: a small solid dot and a word, no pill. */
export function ConnectionBadge() {
  const { state } = useConnectionStatus()

  const config = {
    online: { label: "Online", text: "text-foreground/80", dot: "bg-success" },
    offline: { label: "Offline", text: "text-destructive", dot: "bg-destructive" },
    checking: { label: "Checking", text: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  }[state]

  return (
    <div
      role="status"
      aria-label={`Raspberry Pi ${config.label.toLowerCase()}`}
      className={cn("flex items-center gap-2 text-[13px] font-medium transition-colors duration-300", config.text)}
    >
      <span className={cn("size-[7px] rounded-full transition-colors duration-300", config.dot)} />
      {config.label}
    </div>
  )
}

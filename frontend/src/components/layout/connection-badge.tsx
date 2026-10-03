import { cn } from "@/lib/utils"
import { useConnectionStatus } from "@/hooks/use-connection-status"

/** Small glass chip: green dot + "Pi online". */
export function ConnectionBadge({ onlineLabel = "Pi online" }: { onlineLabel?: string }) {
  const { state } = useConnectionStatus()

  const config = {
    online: { label: onlineLabel, dot: "bg-[#3ee08f] shadow-[0_0_0_3px_rgba(62,224,143,.18)]" },
    offline: { label: "Pi offline", dot: "bg-destructive shadow-[0_0_0_3px_rgba(255,90,79,.2)]" },
    checking: { label: "Checking", dot: "bg-muted-foreground" },
  }[state]

  return (
    <div className="glass flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium">
      <span className={cn("size-[7px] rounded-full", config.dot)} />
      {config.label}
    </div>
  )
}

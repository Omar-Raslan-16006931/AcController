import * as React from "react"
import { BellRing, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { isNativeApp, sendTestNotification } from "@/lib/native"

const DELAY_SECONDS = 5

/** Settings > Notifications: sends a test notification after 5 seconds. */
export function NotificationTestCard() {
  const [left, setLeft] = React.useState<number | null>(null)
  const native = React.useMemo(isNativeApp, [])

  React.useEffect(() => {
    if (left === null || left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  const send = async () => {
    setLeft(DELAY_SECONDS)
    try {
      await sendTestNotification(DELAY_SECONDS)
      if (native) toast.success("Scheduled", { description: "Lock the phone or leave the app to see it as a banner." })
    } catch (err) {
      setLeft(null)
      toast.error("Couldn't send the notification", {
        description: err instanceof Error ? err.message : String(err),
      })
      return
    }
    // Web path resolves after the delay; the native path resolves at once.
    if (!native) setLeft(null)
  }

  const busy = left !== null && left > 0

  return (
    <div className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Notifications</p>
        <p className="text-muted-foreground text-[11.5px]">
          {busy ? `Arriving in ${left}s…` : `Sends a test notification after ${DELAY_SECONDS} seconds`}
        </p>
      </div>
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold disabled:cursor-default disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="text-ice size-3.5" />}
        {busy ? `${left}s` : "Test"}
      </button>
    </div>
  )
}

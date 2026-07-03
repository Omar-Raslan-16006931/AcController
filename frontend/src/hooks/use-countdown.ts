import * as React from "react"

/** Live-updating "time remaining" string for a future ISO timestamp. */
export function useCountdown(targetIso: string) {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const remainingMs = Math.max(0, new Date(targetIso).getTime() - now)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const label =
    hours > 0
      ? `${hours}h ${minutes.toString().padStart(2, "0")}m`
      : `${minutes}:${seconds.toString().padStart(2, "0")}`

  return { remainingMs, totalSeconds, label, isDone: remainingMs <= 0 }
}

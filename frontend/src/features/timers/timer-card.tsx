import { motion } from "framer-motion"
import { Power, PowerOff, X } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCountdown } from "@/hooks/use-countdown"
import type { Timer } from "@/features/timers/use-timers"

export function TimerCard({ timer, onCancel }: { timer: Timer; onCancel: () => void }) {
  const { label } = useCountdown(timer.fires_at)
  const isOff = timer.action === "turn_off"

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
              isOff ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            }`}
          >
            {isOff ? <PowerOff className="size-5" /> : <Power className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{isOff ? "Turning off" : "Turning on"}</p>
            <p className="text-muted-foreground text-sm">{timer.label || "Countdown timer"}</p>
          </div>
          <div className="text-lg font-semibold tabular-nums">{label}</div>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel timer">
            <X className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { TimerReset } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog } from "@/components/ui/dialog"
import { useTimers, useCreateTimer, useCancelTimer } from "@/features/timers/use-timers"
import { TimerCard } from "@/features/timers/timer-card"
import { CustomDurationDialog } from "@/features/timers/custom-duration-dialog"

const OFF_PRESETS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "45 min", seconds: 45 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "2 hours", seconds: 2 * 60 * 60 },
  { label: "4 hours", seconds: 4 * 60 * 60 },
]

export function TimersPage() {
  const { data: timers, isLoading } = useTimers()
  const createTimer = useCreateTimer()
  const cancelTimer = useCancelTimer()

  const [customDialog, setCustomDialog] = React.useState<"turn_off" | "turn_on" | null>(null)

  const offTimers = timers?.filter((t) => t.action === "turn_off") ?? []
  const onTimers = timers?.filter((t) => t.action === "turn_on") ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Timers" description="Countdown actions — no schedule required." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Turn off after</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {OFF_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  className="h-16 flex-col gap-0.5 rounded-2xl"
                  disabled={createTimer.isPending}
                  onClick={() => createTimer.mutate({ action: "turn_off", seconds: preset.seconds })}
                >
                  <span className="font-semibold">{preset.label}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-16 flex-col gap-0.5 rounded-2xl"
                onClick={() => setCustomDialog("turn_off")}
              >
                Custom
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Turn on after</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="h-16 w-full rounded-2xl" onClick={() => setCustomDialog("turn_on")}>
              Set custom duration
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Active timers</h3>

        {isLoading && <Skeleton className="h-20 w-full" />}

        {!isLoading && (offTimers.length + onTimers.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <TimerReset className="size-6" />
              </div>
              <p className="text-muted-foreground text-sm">No active timers right now.</p>
            </CardContent>
          </Card>
        )}

        <AnimatePresence initial={false}>
          {[...offTimers, ...onTimers].map((timer) => (
            <TimerCard key={timer.id} timer={timer} onCancel={() => cancelTimer.mutate(timer.id)} />
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={customDialog !== null} onOpenChange={(open) => !open && setCustomDialog(null)}>
        {customDialog && (
          <CustomDurationDialog
            title={customDialog === "turn_off" ? "Turn off after…" : "Turn on after…"}
            description="The AC will receive this command automatically when the timer ends."
            submitting={createTimer.isPending}
            onSubmit={(seconds) => {
              createTimer.mutate(
                { action: customDialog, seconds },
                { onSuccess: () => setCustomDialog(null) }
              )
            }}
            onCancel={() => setCustomDialog(null)}
          />
        )}
      </Dialog>
    </div>
  )
}

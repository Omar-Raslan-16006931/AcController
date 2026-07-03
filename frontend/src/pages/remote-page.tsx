import { WifiOff } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useStatus } from "@/features/dashboard/use-status"
import { useSetPower, useSetTemperature, useSetMode, useSetFan } from "@/features/remote/use-ac-control"
import { PowerButton } from "@/features/remote/power-button"
import { TemperatureDial } from "@/features/remote/temperature-dial"
import { ModeSelector } from "@/features/remote/mode-selector"
import { FanSelector } from "@/features/remote/fan-selector"

export function RemotePage() {
  const { data: status, isLoading, isError } = useStatus({ refetchInterval: 15_000 })

  const setPower = useSetPower()
  const setTemperature = useSetTemperature()
  const setMode = useSetMode()
  const setFan = useSetFan()

  const busy =
    setPower.isPending || setTemperature.isPending || setMode.isPending || setFan.isPending

  return (
    <div>
      <PageHeader title="Remote" description="Instant control — every change is sent immediately." />

      {isLoading && (
        <div className="mx-auto max-w-md space-y-6">
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {isError && !isLoading && (
        <Card className="border-destructive/30 mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
              <WifiOff className="size-6" />
            </div>
            <p className="font-medium">Can't reach the Raspberry Pi</p>
            <p className="text-muted-foreground text-sm">
              The remote needs a live connection to send commands.
            </p>
          </CardContent>
        </Card>
      )}

      {status && (
        <Card className="mx-auto max-w-md">
          <CardContent className="space-y-8 pt-6">
            <div className="flex justify-center">
              <PowerButton
                on={status.ac_state.power}
                disabled={setPower.isPending}
                onToggle={() => setPower.mutate(!status.ac_state.power)}
              />
            </div>

            <Separator />

            <TemperatureDial
              value={status.ac_state.temperature}
              disabled={!status.ac_state.power || busy}
              onChange={(temperature) => setTemperature.mutate(temperature)}
            />

            <Separator />

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">Mode</p>
              <ModeSelector
                value={status.ac_state.mode}
                disabled={!status.ac_state.power || busy}
                onChange={(mode) => setMode.mutate(mode)}
              />
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">Fan speed</p>
              <FanSelector
                value={status.ac_state.fan}
                disabled={!status.ac_state.power || busy}
                onChange={(fan) => setFan.mutate(fan)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

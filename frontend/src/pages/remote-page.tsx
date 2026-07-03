import * as React from "react"
import { Send, Undo2, WifiOff, Zap } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useStatus } from "@/features/dashboard/use-status"
import {
  useSetPower,
  useSetTemperature,
  useSetMode,
  useSetFan,
  useSendCommand,
  type DraftCommand,
} from "@/features/remote/use-ac-control"
import { PowerButtons } from "@/features/remote/power-button"
import { TemperatureDial } from "@/features/remote/temperature-dial"
import { ModeSelector } from "@/features/remote/mode-selector"
import { FanSelector } from "@/features/remote/fan-selector"
import type { AcMode, FanSpeed } from "@/types/database"

const AUTO_SEND_STORAGE_KEY = "ac-controller-auto-send"

function getStoredAutoSend(): boolean {
  if (typeof window === "undefined") return true
  const stored = window.localStorage.getItem(AUTO_SEND_STORAGE_KEY)
  return stored === null ? true : stored === "1"
}

export function RemotePage() {
  const { data: status, isLoading, isError } = useStatus({ refetchInterval: 15_000 })

  const setPower = useSetPower()
  const setTemperature = useSetTemperature()
  const setMode = useSetMode()
  const setFan = useSetFan()
  const sendCommand = useSendCommand()

  const [autoSend, setAutoSend] = React.useState(getStoredAutoSend)
  const [draft, setDraft] = React.useState<DraftCommand>({})

  const pendingCount = Object.keys(draft).length
  const hasPendingChanges = pendingCount > 0

  const busy =
    setPower.isPending ||
    setTemperature.isPending ||
    setMode.isPending ||
    setFan.isPending ||
    sendCommand.isPending

  const applyAutoSendChange = (next: boolean) => {
    window.localStorage.setItem(AUTO_SEND_STORAGE_KEY, next ? "1" : "0")
    setAutoSend(next)
    // Flipping to "on" with staged changes still pending — flush them
    // immediately instead of silently discarding what the user set up.
    if (next && hasPendingChanges) {
      sendCommand.mutate(draft, { onSuccess: () => setDraft({}) })
    }
  }

  const handleTemperatureChange = (temperature: number) => {
    if (autoSend) setTemperature.mutate(temperature)
    else setDraft((d) => ({ ...d, temperature }))
  }

  const handleModeChange = (mode: AcMode) => {
    if (autoSend) setMode.mutate(mode)
    else setDraft((d) => ({ ...d, mode }))
  }

  const handleFanChange = (fan: FanSpeed) => {
    if (autoSend) setFan.mutate(fan)
    else setDraft((d) => ({ ...d, fan }))
  }

  const handleSendNow = () => {
    if (!hasPendingChanges) return
    sendCommand.mutate(draft, { onSuccess: () => setDraft({}) })
  }

  const handleDiscardDraft = () => setDraft({})

  return (
    <div>
      <PageHeader
        title="Remote"
        description={
          autoSend
            ? "Instant control — every change is sent immediately."
            : "Automatic Send is off — adjust settings, then send them together."
        }
      />

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
            <div className="flex items-center justify-between rounded-2xl border p-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={
                    autoSend
                      ? "brand-gradient flex size-9 items-center justify-center rounded-xl text-white"
                      : "bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-xl"
                  }
                >
                  <Zap className="size-4.5" />
                </div>
                <div>
                  <Label htmlFor="auto-send" className="cursor-pointer text-sm font-medium">
                    Automatic Send
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {autoSend
                      ? "Every change is sent right away"
                      : "Adjust settings, then send them all at once"}
                  </p>
                </div>
              </div>
              <Switch id="auto-send" checked={autoSend} onCheckedChange={applyAutoSendChange} />
            </div>

            <PowerButtons
              on={status.ac_state.power}
              onPowerOn={() => setPower.mutate(true)}
              onPowerOff={() => setPower.mutate(false)}
            />

            <Separator />

            <TemperatureDial
              value={draft.temperature ?? status.ac_state.temperature}
              disabled={!status.ac_state.power || busy}
              onChange={handleTemperatureChange}
            />

            <Separator />

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">Mode</p>
              <ModeSelector
                value={draft.mode ?? status.ac_state.mode}
                disabled={!status.ac_state.power || busy}
                onChange={handleModeChange}
              />
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">Fan speed</p>
              <FanSelector
                value={draft.fan ?? status.ac_state.fan}
                disabled={!status.ac_state.power || busy}
                onChange={handleFanChange}
              />
            </div>

            {!autoSend && hasPendingChanges && (
              <div className="border-mint/40 bg-mint/5 flex items-center justify-between gap-3 rounded-2xl border p-3.5">
                <p className="text-sm font-medium">
                  {pendingCount} change{pendingCount > 1 ? "s" : ""} not sent yet
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscardDraft}
                    disabled={sendCommand.isPending}
                  >
                    <Undo2 className="size-4" />
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={handleSendNow}
                    disabled={sendCommand.isPending}
                  >
                    <Send className="size-4" />
                    Send now
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

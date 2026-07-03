import * as React from "react"
import { motion } from "framer-motion"
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

  const effectiveMode = draft.mode ?? status?.ac_state.mode
  const isCoolGlow = !!status?.ac_state.power && effectiveMode === "cool"
  const isHeatGlow = !!status?.ac_state.power && effectiveMode === "heat"

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(closest-side at 50% 10%, var(--tint-cool), transparent 65%)" }}
          animate={{ opacity: isCoolGlow ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(closest-side at 50% 10%, var(--tint-heat), transparent 65%)" }}
          animate={{ opacity: isHeatGlow ? 1 : 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </div>

      <PageHeader
        title="Remote"
        description={autoSend ? "Every change is sent right away." : "Automatic Send is off."}
      />

      {isLoading && (
        <Card className="mx-auto w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4">
            <Skeleton className="size-44 rounded-full sm:size-48" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Card className="mx-auto w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-2.5 py-10 text-center">
            <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-xl">
              <WifiOff className="size-5" />
            </div>
            <p className="text-sm font-medium">Can't reach the Raspberry Pi</p>
            <p className="text-muted-foreground text-xs">
              The remote needs a live connection to send commands.
            </p>
          </CardContent>
        </Card>
      )}

      {status && (
        <Card className="mx-auto w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-1">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className={autoSend ? "text-frost size-3.5" : "text-muted-foreground size-3.5"} />
                <Label htmlFor="auto-send" className="cursor-pointer text-xs font-medium">
                  Automatic Send
                </Label>
              </div>
              <Switch id="auto-send" checked={autoSend} onCheckedChange={applyAutoSendChange} />
            </div>

            <Separator />

            <TemperatureDial
              value={draft.temperature ?? status.ac_state.temperature}
              disabled={!status.ac_state.power || busy}
              onChange={handleTemperatureChange}
            />

            <PowerButtons
              on={status.ac_state.power}
              onPowerOn={() => setPower.mutate(true)}
              onPowerOff={() => setPower.mutate(false)}
            />

            <div className="w-full space-y-2">
              <ModeSelector
                value={draft.mode ?? status.ac_state.mode}
                disabled={!status.ac_state.power || busy}
                onChange={handleModeChange}
              />
              <FanSelector
                value={draft.fan ?? status.ac_state.fan}
                disabled={!status.ac_state.power || busy}
                onChange={handleFanChange}
              />
            </div>

            {!autoSend && hasPendingChanges && (
              <div className="bg-accent flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2">
                <p className="text-xs font-medium">
                  {pendingCount} change{pendingCount > 1 ? "s" : ""} pending
                </p>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="ghost" size="sm" onClick={handleDiscardDraft} disabled={sendCommand.isPending} className="h-7 px-2 text-xs">
                    <Undo2 className="size-3.5" />
                    Discard
                  </Button>
                  <Button type="button" variant="brand" size="sm" onClick={handleSendNow} disabled={sendCommand.isPending} className="h-7 px-2.5 text-xs">
                    <Send className="size-3.5" />
                    Send
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

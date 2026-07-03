import * as React from "react"
import { motion } from "framer-motion"
import { Send, Undo2, WifiOff, Zap } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
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
      {/* Ambient background — subtly shifts color temperature when the AC is on */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(closest-side at 50% 12%, var(--tint-cool), transparent 70%)",
          }}
          animate={{ opacity: isCoolGlow ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(closest-side at 50% 12%, var(--tint-heat), transparent 70%)",
          }}
          animate={{ opacity: isHeatGlow ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </div>

      <PageHeader
        title="Remote"
        description={
          autoSend
            ? "Every change is sent right away."
            : "Automatic Send is off — adjust, then send together."
        }
      />

      {isLoading && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-8 py-6">
          <Skeleton className="size-64 rounded-full sm:size-72" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
            <WifiOff className="size-6" />
          </div>
          <p className="font-medium">Can't reach the Raspberry Pi</p>
          <p className="text-muted-foreground text-sm">
            The remote needs a live connection to send commands.
          </p>
        </div>
      )}

      {status && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-9 py-4">
          <div className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Zap className={autoSend ? "text-frost size-4" : "text-muted-foreground size-4"} />
              <Label htmlFor="auto-send" className="cursor-pointer text-sm font-medium">
                Automatic Send
              </Label>
            </div>
            <Switch id="auto-send" checked={autoSend} onCheckedChange={applyAutoSendChange} />
          </div>

          <TemperatureDial
            value={draft.temperature ?? status.ac_state.temperature}
            disabled={!status.ac_state.power || busy}
            onChange={handleTemperatureChange}
          />

          <div className="w-full">
            <PowerButtons
              on={status.ac_state.power}
              onPowerOn={() => setPower.mutate(true)}
              onPowerOff={() => setPower.mutate(false)}
            />
          </div>

          <div className="w-full space-y-5">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-light tracking-wide">Mode</p>
              <ModeSelector
                value={draft.mode ?? status.ac_state.mode}
                disabled={!status.ac_state.power || busy}
                onChange={handleModeChange}
              />
            </div>

            <div>
              <p className="text-muted-foreground mb-2 text-xs font-light tracking-wide">Fan</p>
              <FanSelector
                value={draft.fan ?? status.ac_state.fan}
                disabled={!status.ac_state.power || busy}
                onChange={handleFanChange}
              />
            </div>
          </div>

          {!autoSend && hasPendingChanges && (
            <div className="glass flex w-full items-center justify-between gap-3 rounded-2xl p-3.5">
              <p className="text-sm font-medium">
                {pendingCount} change{pendingCount > 1 ? "s" : ""} not sent
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
        </div>
      )}
    </div>
  )
}

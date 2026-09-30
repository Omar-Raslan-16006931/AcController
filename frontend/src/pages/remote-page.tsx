import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { WifiOff } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
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
import { TemperatureDial, type DialTone } from "@/features/remote/temperature-dial"
import { ModeSelector } from "@/features/remote/mode-selector"
import { FanSelector } from "@/features/remote/fan-selector"
import { AuxButtons } from "@/features/remote/aux-buttons"
import { TimerControls } from "@/features/remote/timer-controls"
import { LearnedRemotePanel } from "@/features/remote/learned-remote-panel"
import { Segmented } from "@/features/remote/segmented"
import { modeConfig, fanConfig } from "@/lib/ac-labels"
import type { AcMode, FanSpeed } from "@/types/database"

const AUTO_SEND_STORAGE_KEY = "ac-controller-auto-send"

function getStoredAutoSend(): boolean {
  if (typeof window === "undefined") return true
  const stored = window.localStorage.getItem(AUTO_SEND_STORAGE_KEY)
  return stored === null ? true : stored === "1"
}

// Which AC the Remote page controls. "carrier" is the home unit (structured
// power/temp/mode/fan state); "learned" is a send-only grid of buttons
// captured via Detect AC, Learn manually.
type RemoteProfile = "carrier" | "learned"
const REMOTE_PROFILE_STORAGE_KEY = "ac-controller-remote-profile"

function getStoredProfile(): RemoteProfile {
  if (typeof window === "undefined") return "carrier"
  const stored = window.localStorage.getItem(REMOTE_PROFILE_STORAGE_KEY)
  return stored === "learned" ? "learned" : "carrier"
}

const PROFILE_OPTIONS = [
  { value: "carrier" as const, label: "Carrier" },
  { value: "learned" as const, label: "Learned" },
]

function toneForMode(mode: AcMode | undefined): DialTone {
  if (mode === "heat") return "heat"
  if (mode === "dry") return "dry"
  return "cool"
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
  const [profile, setProfile] = React.useState<RemoteProfile>(getStoredProfile)

  const applyProfileChange = (next: RemoteProfile) => {
    window.localStorage.setItem(REMOTE_PROFILE_STORAGE_KEY, next)
    setProfile(next)
  }

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

  const ac = status?.ac_state
  const controlsDisabled = !ac?.power || busy
  const effectiveMode = draft.mode ?? ac?.mode

  return (
    <div>
      <PageHeader title="Remote" />

      <div className="mb-4">
        <Segmented
          size="sm"
          options={PROFILE_OPTIONS}
          value={profile}
          onChange={(v) => applyProfileChange(v)}
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="bg-card h-[400px] w-full rounded-[1.375rem]" />
          <Skeleton className="bg-card h-40 w-full rounded-[1.375rem]" />
        </div>
      )}

      {isError && !isLoading && (
        <Card>
          <CardContent className="py-6">
            <WifiOff className="text-destructive size-5" />
            <p className="font-heading mt-3 text-[22px] leading-tight font-medium">Can't reach the Pi</p>
            <p className="text-muted-foreground mt-1 text-[14px]">The remote needs a live connection to send.</p>
          </CardContent>
        </Card>
      )}

      {status && profile === "learned" && (
        <Card>
          <CardContent>
            <LearnedRemotePanel />
          </CardContent>
        </Card>
      )}

      {status && ac && profile === "carrier" && (
        <div className="space-y-3">
          <Card className="pt-5 pb-4">
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-[14px]">
                  <span className={ac.power ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {ac.power ? "Running" : "Off"}
                  </span>
                  {ac.power && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {modeConfig[ac.mode]?.label ?? ac.mode}
                      {" · "}
                      {fanConfig[ac.fan]?.label ?? ac.fan} fan
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-2.5">
                  <Label htmlFor="auto-send" className="text-muted-foreground cursor-pointer text-[13px] font-normal">
                    Instant
                  </Label>
                  <Switch id="auto-send" checked={autoSend} onCheckedChange={applyAutoSendChange} />
                </div>
              </div>

              <TemperatureDial
                value={draft.temperature ?? ac.temperature}
                disabled={controlsDisabled}
                tone={toneForMode(effectiveMode)}
                onChange={handleTemperatureChange}
              />

              <PowerButtons on={ac.power} onPowerOn={() => setPower.mutate(true)} onPowerOff={() => setPower.mutate(false)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5">
              <ModeSelector value={draft.mode ?? ac.mode} disabled={controlsDisabled} onChange={handleModeChange} />
              <FanSelector value={draft.fan ?? ac.fan} disabled={controlsDisabled} onChange={handleFanChange} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              {/* Light / Self clean aren't part of AcState -- momentary
                  buttons that only gate on their own in-flight request. */}
              <AuxButtons />
              <TimerControls />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending-changes bar, pinned just above the tab bar. It slides in on
          the y-axis only; nothing is ever hidden behind an opacity fade. */}
      <AnimatePresence>
        {profile === "carrier" && !autoSend && hasPendingChanges && (
          <motion.div
            key="pending-bar"
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 460, damping: 38 }}
            className="fixed inset-x-0 z-30 px-4"
            style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom) + 0.75rem)" }}
          >
            <div className="bg-foreground text-background mx-auto flex max-w-lg items-center justify-between gap-2 rounded-[1.125rem] py-2 pr-2 pl-5 sm:max-w-2xl">
              <p className="text-[14px] font-medium">
                {pendingCount} change{pendingCount > 1 ? "s" : ""} to send
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({})}
                  disabled={sendCommand.isPending}
                  className="text-background/70 hover:text-background hover:bg-background/10 active:bg-background/15"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendNow}
                  disabled={sendCommand.isPending}
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  Send
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

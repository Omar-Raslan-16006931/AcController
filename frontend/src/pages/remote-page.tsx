import * as React from "react"
import { Send, Undo2, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { AuxButtons } from "@/features/remote/aux-buttons"
import { TimerControls } from "@/features/remote/timer-controls"
import { LearnedRemotePanel } from "@/features/remote/learned-remote-panel"
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
// captured via Detect AC -> Learn manually.
type RemoteProfile = "carrier" | "learned"
const REMOTE_PROFILE_STORAGE_KEY = "ac-controller-remote-profile"

function getStoredProfile(): RemoteProfile {
  if (typeof window === "undefined") return "carrier"
  const stored = window.localStorage.getItem(REMOTE_PROFILE_STORAGE_KEY)
  return stored === "learned" ? "learned" : "carrier"
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-2 px-1 text-[12px] font-semibold tracking-wide uppercase">{children}</p>
  )
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

  return (
    <div>
      <PageHeader
        title="Remote"
        description={
          profile === "learned"
            ? "Tap a learned button to send it."
            : autoSend
              ? "Changes are sent instantly."
              : "Changes wait until you tap Send."
        }
      />

      <Tabs value={profile} onValueChange={(v) => applyProfileChange(v as RemoteProfile)} className="mb-4 w-full">
        <TabsList className="w-full">
          <TabsTrigger value="carrier">Carrier</TabsTrigger>
          <TabsTrigger value="learned">Learned</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-[380px] w-full rounded-[1.25rem]" />
          <Skeleton className="h-40 w-full rounded-[1.25rem]" />
        </div>
      )}

      {isError && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
              <WifiOff className="size-6" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Can't reach the Raspberry Pi</p>
              <p className="text-muted-foreground mt-1 text-[13px]">The remote needs a live connection to send commands.</p>
            </div>
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
          {/* Hero: state summary + dial + power */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", ac.power ? "bg-success" : "bg-muted-foreground/40")} />
                  <p className="truncate text-[14px] font-semibold">
                    {ac.power
                      ? `On · ${modeConfig[ac.mode]?.label ?? ac.mode} · ${fanConfig[ac.fan]?.label ?? ac.fan} fan`
                      : "AC is off"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor="auto-send" className="text-muted-foreground cursor-pointer text-[13px] font-medium">
                    Auto-send
                  </Label>
                  <Switch id="auto-send" checked={autoSend} onCheckedChange={applyAutoSendChange} />
                </div>
              </div>

              <TemperatureDial
                value={draft.temperature ?? ac.temperature}
                disabled={controlsDisabled}
                onChange={handleTemperatureChange}
              />

              <PowerButtons on={ac.power} onPowerOn={() => setPower.mutate(true)} onPowerOff={() => setPower.mutate(false)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <ModeSelector value={draft.mode ?? ac.mode} disabled={controlsDisabled} onChange={handleModeChange} />
              <FanSelector value={draft.fan ?? ac.fan} disabled={controlsDisabled} onChange={handleFanChange} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionLabel>Extras</SectionLabel>
              {/* Light / Self Clean aren't part of AcState -- momentary
                  buttons that only gate on their own in-flight request. */}
              <AuxButtons />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionLabel>Timers</SectionLabel>
              <TimerControls />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending-changes bar, pinned just above the tab bar. */}
      {profile === "carrier" && !autoSend && hasPendingChanges && (
        <div
          className="fixed inset-x-0 z-30 px-4"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="bg-foreground text-background mx-auto flex max-w-lg items-center justify-between gap-2 rounded-2xl py-2 pr-2 pl-4 shadow-lg sm:max-w-2xl">
            <p className="text-[14px] font-semibold">
              {pendingCount} change{pendingCount > 1 ? "s" : ""} pending
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDraft({})}
                disabled={sendCommand.isPending}
                className="text-background hover:bg-background/10 active:bg-background/15"
              >
                <Undo2 className="size-4" />
                Discard
              </Button>
              <Button type="button" size="sm" onClick={handleSendNow} disabled={sendCommand.isPending}>
                <Send className="size-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

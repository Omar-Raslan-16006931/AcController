import * as React from "react"
import { WifiOff } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { ConnectionBadge } from "@/components/layout/connection-badge"
import { setBackgroundWarmth } from "@/components/ui/night-background"
import { useStatus } from "@/features/dashboard/use-status"
import { useSetPower, useSetTemperature, useSetMode, useSetFan } from "@/features/remote/use-ac-control"
import { PowerButtons } from "@/features/remote/power-button"
import { GlassDial, MIN_TEMP, MAX_TEMP } from "@/features/remote/glass-dial"
import { GlassSegmented, type SegmentItem } from "@/features/remote/glass-segmented"
import { TimerControls } from "@/features/remote/timer-controls"
import { LearnedRemotePanel } from "@/features/remote/learned-remote-panel"
import { modeConfig, modeOrder, fanConfig, fanOrder } from "@/lib/ac-labels"
import type { AcMode, FanSpeed } from "@/types/database"

type RemoteProfile = "carrier" | "learned"
const REMOTE_PROFILE_STORAGE_KEY = "ac-controller-remote-profile"

function getStoredProfile(): RemoteProfile {
  if (typeof window === "undefined") return "carrier"
  return window.localStorage.getItem(REMOTE_PROFILE_STORAGE_KEY) === "learned" ? "learned" : "carrier"
}

const VERBS: Record<AcMode, string> = { cool: "Cooling", heat: "Heating", dry: "Drying" }

// Fan glyph grows with speed; Eco keeps its leaf.
const FAN_ICON_PX: Record<FanSpeed, number> = { eco: 14, low: 13, medium: 16, high: 19 }

const MODE_ITEMS: SegmentItem<AcMode>[] = modeOrder.map((m) => {
  const Icon = modeConfig[m].icon
  return { value: m, label: modeConfig[m].label, icon: <Icon size={17} strokeWidth={1.8} /> }
})

const FAN_ITEMS: SegmentItem<FanSpeed>[] = fanOrder.map((f) => {
  const Icon = fanConfig[f].icon
  return { value: f, label: fanConfig[f].label, icon: <Icon size={FAN_ICON_PX[f]} strokeWidth={2} /> }
})

const PROFILE_ITEMS: SegmentItem<RemoteProfile>[] = [
  { value: "carrier", label: "Carrier" },
  { value: "learned", label: "Learned" },
]

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mt-3.5 mb-1 flex justify-between px-1 text-[11px] font-semibold">
      <span>{children}</span>
      {right && <span className="text-faint">{right}</span>}
    </div>
  )
}

export function RemotePage() {
  const { data: status, isLoading, isError } = useStatus({ refetchInterval: 15_000 })

  const setPower = useSetPower()
  const setTemperature = useSetTemperature()
  const setMode = useSetMode()
  const setFan = useSetFan()

  const [profile, setProfile] = React.useState<RemoteProfile>(getStoredProfile)

  const changeProfile = (next: RemoteProfile) => {
    window.localStorage.setItem(REMOTE_PROFILE_STORAGE_KEY, next)
    setProfile(next)
  }

  const ac = status?.ac_state
  const on = !!ac?.power
  // Controls stay live while commands are sending: every tap updates the UI
  // instantly (optimistic) and the IR command follows in the background.
  const busy = false

  // Warmer setting -> more amber in the background; off -> none.
  const handlePreview = React.useCallback(
    (t: number) => setBackgroundWarmth(on ? (t - MIN_TEMP) / (MAX_TEMP - MIN_TEMP) : 0),
    [on]
  )
  React.useEffect(() => () => setBackgroundWarmth(0.1), [])

  return (
    <div>
      <PageHeader title="Remote" eyebrow="Bedroom · Carrier" actions={<ConnectionBadge onlineLabel="Ready" />} />

      <GlassSegmented items={PROFILE_ITEMS} value={profile} onChange={changeProfile} size="sm" />

      {isLoading && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <Skeleton className="size-[200px] rounded-full bg-white/[0.06]" />
          <Skeleton className="h-[42px] w-full rounded-[15px] bg-white/[0.06]" />
          <Skeleton className="h-[46px] w-full rounded-[15px] bg-white/[0.06]" />
          <Skeleton className="h-[46px] w-full rounded-[15px] bg-white/[0.06]" />
        </div>
      )}

      {isError && !status && (
        <div className="glass mt-4 flex flex-col items-center gap-2 rounded-[20px] px-4 py-10 text-center">
          <WifiOff className="text-destructive size-6" />
          <p className="text-sm font-semibold">Can't reach the Raspberry Pi</p>
          <p className="text-muted-foreground text-xs">The remote needs a live connection to send commands.</p>
        </div>
      )}

      {status && profile === "learned" && (
        <div className="glass mt-4 rounded-[20px] p-3">
          <LearnedRemotePanel />
        </div>
      )}

      {status && ac && profile === "carrier" && (
        <>
          <div className="mt-6">
            <GlassDial
              value={ac.temperature}
              off={!on}
              disabled={busy}
              status={on ? VERBS[ac.mode] : "Off"}
              onChange={(t) => setTemperature.mutate(t)}
              onPreview={handlePreview}
            />
          </div>

          <div className="mt-4">
            <PowerButtons
              on={on}
              onPowerOn={() => setPower.mutate(true)}
              onPowerOff={() => setPower.mutate(false)}
            />
          </div>

          <SectionLabel>Mode</SectionLabel>
          <GlassSegmented
            items={MODE_ITEMS}
            value={ac.mode}
            disabled={!on || busy}
            onChange={(m) => setMode.mutate(m)}
          />

          <SectionLabel right={fanConfig[ac.fan]?.label}>Fan</SectionLabel>
          <GlassSegmented
            items={FAN_ITEMS}
            value={ac.fan}
            disabled={!on || busy}
            onChange={(f) => setFan.mutate(f)}
          />

          <SectionLabel>Timer</SectionLabel>
          <TimerControls />
        </>
      )}
    </div>
  )
}

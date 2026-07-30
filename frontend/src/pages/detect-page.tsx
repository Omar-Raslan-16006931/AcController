import * as React from "react"
import {
  Bell,
  Fan,
  Lightbulb,
  Loader2,
  Moon,
  Play,
  Power,
  RotateCcw,
  Sparkles,
  Square,
  Thermometer,
  Wind,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  useDetectStatus,
  useStartDetect,
  useStopDetect,
  useResetDetect,
  useConfirmDetect,
  useReplayCode,
  useDetectSignals,
  useSendSignal,
  type DetectSignal,
} from "@/features/detect/use-detect"

export function DetectPage() {
  const { data: status, isLoading } = useDetectStatus()
  const start = useStartDetect()
  const stop = useStopDetect()
  const reset = useResetDetect()
  const confirm = useConfirmDetect()
  const replay = useReplayCode()

  const [interval, setInterval_] = React.useState(1.5)

  const running = status?.state === "running"
  const progressPct = status && status.total > 0 ? (status.sent_count / status.total) * 100 : 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detect AC"
        description="For an AC that isn't your Carrier unit — e.g. a hotel or rental. Cycles through 116 real captured codes from 70+ brands; tap the bell the moment you hear it beep."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Live run</CardTitle>
          {!running && (
            <CardDescription className="text-xs">
              Point the IR blaster at the AC, start the run, and listen. One code fires every{" "}
              {interval.toFixed(1)}s — a beep or click means that brand's protocol matched.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-xs">Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {status?.current_brand ?? "—"}
                    {status?.current_model ? (
                      <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                        {status.current_model}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {status ? `${status.sent_count} / ${status.total} sent` : "—"}
                  </p>
                </div>
                <StateBadge state={status?.state} />
              </div>

              <Progress value={progressPct} />

              {status?.last_error && (
                <p className="text-destructive text-[11px]">Last transmit error: {status.last_error}</p>
              )}

              {!running && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Seconds between codes</span>
                    <span className="font-medium">{interval.toFixed(1)}s</span>
                  </div>
                  <Slider
                    min={0.5}
                    max={4}
                    step={0.5}
                    value={[interval]}
                    onValueChange={([v]) => setInterval_(v)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                {!running ? (
                  <Button
                    className="col-span-2 h-11 gap-1.5 sm:col-span-1"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ interval_seconds: interval })}
                  >
                    {start.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Start
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="col-span-2 h-11 gap-1.5 sm:col-span-1"
                    disabled={stop.isPending}
                    onClick={() => stop.mutate()}
                  >
                    <Square className="size-4" />
                    Stop
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="h-11 gap-1.5"
                  disabled={reset.isPending || status?.state === "idle"}
                  onClick={() => reset.mutate()}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>

                <Button
                  className="col-span-2 h-11 gap-1.5 bg-foreground text-background hover:bg-foreground/90 sm:col-span-2"
                  disabled={confirm.isPending || status?.current_index == null}
                  onClick={() => confirm.mutate()}
                >
                  {confirm.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Bell className="size-4" />
                  )}
                  I heard it! Confirm
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {status?.detected && (
        <Card className="border-primary/30">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">{status.detected.brand}</CardTitle>
              <CardDescription className="text-xs">{status.detected.model}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              disabled={replay.isPending || running}
              onClick={() => replay.mutate(status.detected!.index)}
            >
              {replay.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Replay probe
            </Button>
          </CardHeader>
          <CardContent>
            <ControlPanel disabled={running} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="text-muted-foreground space-y-1.5 pt-4 text-[11px]">
          <p>
            Once confirmed, every button captured for that model — not just the probe signal used
            during detection — becomes available above. Each is an independent captured waveform
            replayed as-is, same as pressing that button on the real remote; there's no shared state
            model backing it the way the Carrier integration has, so button names/labels are a
            best-effort guess and may not perfectly match your unit.
          </p>
          <p>Codes sourced from the community Flipper-IRDB project (CC0 license). See NOTICE.md.</p>
        </CardContent>
      </Card>
    </div>
  )
}

const CATEGORY_CONFIG: Record<string, { title: string; icon: React.ElementType }> = {
  power: { title: "Power", icon: Power },
  temperature: { title: "Temperature", icon: Thermometer },
  mode: { title: "Mode", icon: Wind },
  fan: { title: "Fan", icon: Fan },
  swing: { title: "Swing", icon: Wind },
  light: { title: "Light", icon: Lightbulb },
  sleep: { title: "Sleep", icon: Moon },
  boost: { title: "Eco / turbo", icon: Sparkles },
  other: { title: "Other buttons", icon: Sparkles },
}
const CATEGORY_ORDER = ["power", "temperature", "mode", "fan", "swing", "light", "sleep", "boost", "other"]

function ControlPanel({ disabled }: { disabled: boolean }) {
  const { data, isLoading, isError } = useDetectSignals(true)
  const send = useSendSignal()
  const [pending, setPending] = React.useState<string | null>(null)

  const handleSend = (signal: DetectSignal) => {
    setPending(signal.name)
    send.mutate(signal.name, { onSettled: () => setPending(null) })
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-xs">Loading buttons…</p>
  }
  if (isError || !data) {
    return <p className="text-muted-foreground text-xs">Couldn't load this AC's button set.</p>
  }

  const grouped = new Map<string, DetectSignal[]>()
  for (const signal of data.signals) {
    const list = grouped.get(signal.category) ?? []
    list.push(signal)
    grouped.set(signal.category, list)
  }

  return (
    <div className="space-y-3">
      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
        const config = CATEGORY_CONFIG[cat]
        const Icon = config.icon
        return (
          <div key={cat}>
            <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
              <Icon className="size-3" />
              {config.title}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {grouped.get(cat)!.map((signal) => (
                <Button
                  key={signal.name}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={disabled || send.isPending}
                  onClick={() => handleSend(signal)}
                >
                  {pending === signal.name && send.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  {signal.label}
                </Button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StateBadge({ state }: { state?: string }) {
  if (!state) return null
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" }> = {
    idle: { label: "Idle", variant: "secondary" },
    running: { label: "Running", variant: "default" },
    finished: { label: "Finished — no confirm", variant: "outline" },
    confirmed: { label: "Confirmed", variant: "success" },
  }
  const c = config[state] ?? { label: state, variant: "secondary" as const }
  return (
    <Badge variant={c.variant} className="shrink-0">
      {c.label}
    </Badge>
  )
}

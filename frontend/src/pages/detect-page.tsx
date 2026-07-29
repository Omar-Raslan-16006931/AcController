import * as React from "react"
import { Bell, Loader2, Play, RotateCcw, Square } from "lucide-react"

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
          <CardHeader>
            <CardTitle className="text-sm">Last confirmed match</CardTitle>
            <CardDescription className="text-xs">
              Confirmed {new Date(status.detected.confirmed_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{status.detected.brand}</p>
              <p className="text-muted-foreground truncate text-[11px]">{status.detected.model}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              disabled={replay.isPending || running}
              onClick={() => replay.mutate(status.detected!.index)}
            >
              {replay.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Replay
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="text-muted-foreground space-y-1.5 pt-4 text-[11px]">
          <p>
            This identifies a brand/protocol and replays a real captured "on" signal — it is not full
            temperature/mode control the way the Carrier remote is. If a code makes the AC beep, that
            brand is confirmed working for at least power/mode toggling.
          </p>
          <p>Codes sourced from the community Flipper-IRDB project (CC0 license). See NOTICE.md.</p>
        </CardContent>
      </Card>
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

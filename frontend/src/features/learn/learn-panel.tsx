import * as React from "react"
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  useLearnStatus,
  useLearnedButtons,
  useStartLearning,
  useCancelLearning,
  useSendLearned,
  useDeleteLearned,
  type LearnStatus,
} from "@/features/learn/use-learn"

const TIMEOUT_SECONDS = 10

const STEPS = [
  "Name the button, like Power or Cool 22.",
  "Hold the real remote close to the Pi's receiver.",
  "Tap Listen, then press that button once.",
]

export function LearnPanel() {
  const { data: status } = useLearnStatus()
  const { data: buttonsData, isLoading: buttonsLoading } = useLearnedButtons()
  const start = useStartLearning()
  const cancel = useCancelLearning()
  const send = useSendLearned()
  const del = useDeleteLearned()

  const [name, setName] = React.useState("")
  const [pendingSend, setPendingSend] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null)

  const listening = status?.state === "listening"
  const canListen = name.trim().length > 0 && !listening

  const handleListen = () => {
    if (!canListen) return
    start.mutate({ name: name.trim(), timeout_seconds: TIMEOUT_SECONDS })
  }

  const handleSend = (buttonName: string) => {
    setPendingSend(buttonName)
    send.mutate(buttonName, { onSettled: () => setPendingSend(null) })
  }

  const handleDelete = (buttonName: string) => {
    setPendingDelete(buttonName)
    del.mutate(buttonName, { onSettled: () => setPendingDelete(null) })
  }

  // Clear the name once a capture succeeds so the next button starts fresh;
  // keep it on timeout/error so a retry doesn't need retyping.
  const prevStateRef = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (status?.state === "received" && prevStateRef.current !== "received") {
      setName("")
    }
    prevStateRef.current = status?.state
  }, [status?.state])

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-4">
          <ol className="space-y-2.5 px-1">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px]">
                <span className="font-heading tnum text-muted-foreground w-3 shrink-0 text-[15px]">{i + 1}</span>
                <span className="text-foreground/85">{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex gap-2">
            <Input
              placeholder="Button name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={listening}
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && handleListen()}
            />
            {!listening ? (
              <Button className="h-11 shrink-0 px-5" disabled={!canListen || start.isPending} onClick={handleListen}>
                {start.isPending && <Loader2 className="size-4 animate-spin" />}
                Listen
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-11 shrink-0 px-5"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel
              </Button>
            )}
          </div>

          <StatusLine status={status} timeoutSeconds={TIMEOUT_SECONDS} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-muted-foreground mb-3 px-1 text-[13px]">Learned buttons</p>
          {buttonsLoading ? (
            <Loader2 className="text-muted-foreground mx-1 size-4 animate-spin" />
          ) : !buttonsData?.buttons.length ? (
            <p className="text-muted-foreground px-1 text-[14px]">None yet.</p>
          ) : (
            <div className="space-y-1.5">
              {buttonsData.buttons.map((b) => {
                const sending = send.isPending && pendingSend === b.name
                const deleting = del.isPending && pendingDelete === b.name
                return (
                  <div
                    key={b.name}
                    className="bg-secondary flex items-center justify-between gap-2 rounded-[1rem] py-1.5 pr-1.5 pl-4"
                  >
                    <span className="truncate text-[15px] font-medium">{b.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={listening || sending}
                        onClick={() => handleSend(b.name)}
                      >
                        {sending && <Loader2 className="size-3.5 animate-spin" />}
                        Send
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${b.name}`}
                        className="hover:text-destructive size-9 rounded-full"
                        disabled={deleting}
                        onClick={() => handleDelete(b.name)}
                      >
                        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * One line of state under the input. While listening, a thin bar drains
 * across the full width over the timeout -- a real countdown, not a pulse.
 */
function StatusLine({ status, timeoutSeconds }: { status: LearnStatus | undefined; timeoutSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = React.useState(timeoutSeconds)

  React.useEffect(() => {
    if (status?.state !== "listening" || !status.started_at) return
    const startedAt = new Date(status.started_at).getTime()
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      setSecondsLeft(Math.max(0, timeoutSeconds - elapsed))
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [status?.state, status?.started_at, timeoutSeconds])

  if (!status || status.state === "idle") {
    return <p className="text-muted-foreground px-1 text-[13px]">Ready when you are.</p>
  }

  if (status.state === "listening") {
    const pct = Math.max(0, Math.min(100, (secondsLeft / timeoutSeconds) * 100))
    return (
      <div className="px-1">
        <p className="text-[14px]">
          Listening for <span className="text-primary font-medium">{status.button_name}</span>. Press it now.
          <span className="text-muted-foreground tnum ml-1">{Math.ceil(secondsLeft)}s</span>
        </p>
        <div className="bg-secondary mt-2.5 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  const tone =
    status.state === "received" ? "text-success" : status.state === "timed_out" ? "text-destructive" : "text-warning"
  const Icon = status.state === "received" ? CheckCircle2 : status.state === "timed_out" ? XCircle : AlertTriangle
  const message =
    status.state === "received"
      ? `Got it. Saved as ${status.button_name}.`
      : status.state === "timed_out"
        ? `Nothing received for ${status.button_name}. Move closer and try again.`
        : "Couldn't listen. The IR receiver may not be wired up."

  return (
    <div className="flex items-start gap-2.5 px-1">
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
      <div className="min-w-0 text-[14px]">
        <p>{message}</p>
        {status.state !== "received" && status.error && (
          <p className={cn("mt-1 text-[12px] break-all", tone)}>{status.error}</p>
        )}
      </div>
    </div>
  )
}

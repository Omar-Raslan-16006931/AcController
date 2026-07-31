import * as React from "react"
import { AlertTriangle, CheckCircle2, Ear, Loader2, Radio, Send, Trash2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  'Name the button below (e.g. "Power", "Cool 22", "Swing").',
  "Point the real remote directly at the Pi's IR receiver, close range (within ~10cm).",
  'Tap "Listen", then immediately press that button once on the real remote.',
  "The Pi checks whether it actually received a signal and tells you either way.",
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

  // Clear the name field once a capture succeeds so the next button starts
  // fresh; leave it in place on timeout/error so retrying doesn't require
  // retyping the same name.
  const prevStateRef = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (status?.state === "received" && prevStateRef.current !== "received") {
      setName("")
    }
    prevStateRef.current = status?.state
  }, [status?.state])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to learn a button</CardTitle>
          <CardDescription className="text-xs">
            For an AC whose remote isn't in the built-in library at all. Requires a physical IR
            receiver wired to the Pi, separate from the transmitter blaster — see docs/AC_LEARN.md
            if every attempt times out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground space-y-2 text-xs">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="bg-muted text-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Button name, e.g. Cool 22"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={listening}
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && handleListen()}
            />
            {!listening ? (
              <Button
                className="h-10 shrink-0 gap-1.5"
                disabled={!canListen || start.isPending}
                onClick={handleListen}
              >
                {start.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Ear className="size-4" />
                )}
                Listen
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-10 shrink-0 gap-1.5"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel
              </Button>
            )}
          </div>

          <StatusBanner status={status} timeoutSeconds={TIMEOUT_SECONDS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Learned buttons</CardTitle>
        </CardHeader>
        <CardContent>
          {buttonsLoading ? (
            <p className="text-muted-foreground text-xs">Loading…</p>
          ) : !buttonsData?.buttons.length ? (
            <p className="text-muted-foreground text-xs">
              Nothing learned yet — name a button above and tap Listen to add your first one.
            </p>
          ) : (
            <div className="space-y-1.5">
              {buttonsData.buttons.map((b) => (
                <div
                  key={b.name}
                  className="bg-muted/50 flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                >
                  <span className="truncate text-sm font-medium">{b.name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={listening || (send.isPending && pendingSend === b.name)}
                      onClick={() => handleSend(b.name)}
                    >
                      {send.isPending && pendingSend === b.name ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Send className="size-3" />
                      )}
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive h-7 gap-1 text-xs"
                      disabled={del.isPending && pendingDelete === b.name}
                      onClick={() => handleDelete(b.name)}
                    >
                      {del.isPending && pendingDelete === b.name ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBanner({
  status,
  timeoutSeconds,
}: {
  status: LearnStatus | undefined
  timeoutSeconds: number
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(timeoutSeconds)

  React.useEffect(() => {
    if (status?.state !== "listening" || !status.started_at) return
    const startedAt = new Date(status.started_at).getTime()
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      setSecondsLeft(Math.max(0, Math.ceil(timeoutSeconds - elapsed)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [status?.state, status?.started_at, timeoutSeconds])

  if (!status || status.state === "idle") {
    return (
      <p className="text-muted-foreground text-xs">
        Ready — name a button above to start listening.
      </p>
    )
  }

  if (status.state === "listening") {
    return (
      <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
        <Radio className="text-primary size-4 shrink-0 animate-pulse" />
        <p className="text-xs">
          Listening for <span className="font-semibold">"{status.button_name}"</span> — press it
          now. Giving up in {secondsLeft}s.
        </p>
      </div>
    )
  }

  if (status.state === "received") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs">
          Signal received and saved as <span className="font-semibold">"{status.button_name}"</span>.
        </p>
      </div>
    )
  }

  if (status.state === "timed_out") {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2.5">
        <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
        <div className="text-xs">
          <p>
            No signal received for <span className="font-semibold">"{status.button_name}"</span>.
            Move closer to the receiver, aim directly at it, and try again.
          </p>
          {status.error && <p className="text-destructive mt-1 font-mono text-[10px]">{status.error}</p>}
        </div>
      </div>
    )
  }

  // error
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-xs">
        <p>Couldn't listen — this usually means the IR receiver isn't wired up yet.</p>
        {status.error && <p className="mt-1 font-mono text-[10px] text-amber-700 dark:text-amber-400">{status.error}</p>}
      </div>
    </div>
  )
}

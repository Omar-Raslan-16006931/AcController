import * as React from "react"
import { Link } from "react-router-dom"
import { Loader2, Radio, Zap } from "lucide-react"

import { useLearnedButtons, useSendLearned } from "@/features/learn/use-learn"

/**
 * Remote page "Learned" profile: every captured button as a large tap
 * target. No dial/mode mapping -- each tap replays that exact capture.
 * Learning new buttons happens on Detect AC -> Learn manually.
 */
export function LearnedRemotePanel() {
  const { data, isLoading } = useLearnedButtons()
  const send = useSendLearned()
  const [pending, setPending] = React.useState<string | null>(null)

  const handleSend = (name: string) => {
    setPending(name)
    send.mutate(name, { onSettled: () => setPending(null) })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (!data?.buttons.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="bg-accent text-primary flex size-12 items-center justify-center rounded-2xl">
          <Radio className="size-6" />
        </div>
        <div>
          <p className="text-[15px] font-semibold">No learned buttons yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-[240px] text-[13px]">
            Capture buttons from your real remote first.
          </p>
        </div>
        <Link
          to="/detect"
          className="bg-primary text-primary-foreground active:bg-primary/85 flex h-11 items-center rounded-full px-5 text-[14px] font-semibold transition-colors"
        >
          Learn buttons
        </Link>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {data.buttons.map((b) => {
        const sending = send.isPending && pending === b.name
        return (
          <button
            key={b.name}
            type="button"
            disabled={sending}
            onClick={() => handleSend(b.name)}
            className="border-border bg-card active:bg-accent flex h-16 min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border px-3 text-left transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70"
          >
            <span className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            </span>
            <span className="min-w-0 truncate text-[14px] font-semibold">{b.name}</span>
          </button>
        )
      })}
    </div>
  )
}

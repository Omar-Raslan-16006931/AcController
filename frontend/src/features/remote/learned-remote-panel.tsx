import * as React from "react"
import { Link } from "react-router-dom"
import { Loader2, Radio, Send } from "lucide-react"

import { useLearnedButtons, useSendLearned } from "@/features/learn/use-learn"

/**
 * Remote page "Learned" profile: a grid of learned buttons, tap to replay.
 * Learning happens on Settings > Detect & learn AC.
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
    return <p className="text-muted-foreground py-6 text-center text-xs">Loading…</p>
  }

  if (!data?.buttons.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Radio className="text-muted-foreground size-6" />
        <p className="text-sm font-semibold">No learned buttons yet</p>
        <Link to="/detect" className="text-ice text-xs font-semibold">
          Learn buttons from a remote
        </Link>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {data.buttons.map((b) => {
        const sending = send.isPending && pending === b.name
        return (
          <button
            key={b.name}
            type="button"
            disabled={sending}
            onClick={() => handleSend(b.name)}
            className="glass flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] px-3 text-[13px] font-semibold disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="text-ice size-3.5" />}
            <span className="truncate">{b.name}</span>
          </button>
        )
      })}
    </div>
  )
}

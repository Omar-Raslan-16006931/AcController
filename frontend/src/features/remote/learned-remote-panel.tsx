import * as React from "react"
import { Link } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useLearnedButtons, useSendLearned } from "@/features/learn/use-learn"

/**
 * Remote page "Learned" profile: every captured button as a large tap
 * target. No dial or mode mapping; each tap replays that exact capture.
 * New buttons are learned on Detect AC, Learn manually.
 */
export function LearnedRemotePanel() {
  const { data, isLoading } = useLearnedButtons()
  const send = useSendLearned()
  const [pending, setPending] = React.useState<string | null>(null)
  const [lastSent, setLastSent] = React.useState<string | null>(null)

  const handleSend = (name: string) => {
    setPending(name)
    send.mutate(name, {
      onSuccess: () => setLastSent(name),
      onSettled: () => setPending(null),
    })
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
      <div className="px-1 py-6">
        <p className="font-heading text-[22px] leading-tight font-medium">Nothing learned yet</p>
        <p className="text-muted-foreground mt-1.5 text-[14px]">Capture buttons from your real remote first.</p>
        <Link
          to="/detect"
          className="bg-primary text-primary-foreground active:bg-primary/80 mt-5 inline-flex h-11 items-center rounded-[0.875rem] px-5 text-[14px] font-medium transition-colors"
        >
          Learn buttons
        </Link>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2.5">
      {data.buttons.map((b) => {
        const sending = send.isPending && pending === b.name
        const justSent = lastSent === b.name && !sending
        return (
          <button
            key={b.name}
            type="button"
            disabled={sending}
            onClick={() => handleSend(b.name)}
            className={cn(
              "bg-secondary hover:bg-raised active:bg-raised/70 flex h-16 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[1rem] px-4 text-left transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              justSent && "bg-accent"
            )}
          >
            <span className="min-w-0 truncate text-[15px] font-medium">{b.name}</span>
            {sending && <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />}
          </button>
        )
      })}
    </div>
  )
}

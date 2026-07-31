import * as React from "react"
import { Loader2, Radio, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLearnedButtons, useSendLearned } from "@/features/learn/use-learn"

/**
 * Flat grid of learned buttons for the Remote page's "Learned" profile --
 * no dial/mode/fan mapping, just tap a button name to replay that exact
 * capture. Learning new buttons still happens on Detect AC -> Learn
 * manually; this panel is send-only.
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
        <p className="text-sm font-medium">No learned buttons yet</p>
        <p className="text-muted-foreground max-w-[220px] text-xs">
          Go to Detect AC → Learn manually to capture buttons from a real remote first.
        </p>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2 py-1">
      {data.buttons.map((b) => (
        <Button
          key={b.name}
          variant="outline"
          className="h-12 justify-center gap-1.5 text-sm"
          disabled={send.isPending && pending === b.name}
          onClick={() => handleSend(b.name)}
        >
          {send.isPending && pending === b.name ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          <span className="truncate">{b.name}</span>
        </Button>
      ))}
    </div>
  )
}

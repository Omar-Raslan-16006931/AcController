import { BrushCleaning, Lightbulb, Loader2 } from "lucide-react"

import { useToggleLight, useTriggerSelfClean } from "@/features/remote/use-aux-control"

const base =
  "bg-secondary text-foreground/90 hover:bg-raised active:bg-raised/70 flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[1rem] text-[14px] font-medium transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"

/**
 * Momentary buttons for the real remote's Light and Self Clean -- neither is
 * part of AcState (see use-aux-control.ts), so there is no current value to
 * show, just tap-to-fire with a spinner while the request is in flight.
 */
export function AuxButtons({ disabled = false }: { disabled?: boolean }) {
  const toggleLight = useToggleLight()
  const selfClean = useTriggerSelfClean()

  return (
    <div className="flex w-full items-center gap-2.5">
      <button
        type="button"
        disabled={disabled || toggleLight.isPending}
        onClick={() => toggleLight.mutate()}
        aria-label="Toggle AC display light"
        className={base}
      >
        {toggleLight.isPending ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <Lightbulb className="text-muted-foreground size-4" />
        )}
        Light
      </button>

      <button
        type="button"
        disabled={disabled || selfClean.isPending}
        onClick={() => selfClean.mutate()}
        aria-label="Start Self Clean"
        className={base}
      >
        {selfClean.isPending ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <BrushCleaning className="text-muted-foreground size-4" />
        )}
        Self clean
      </button>
    </div>
  )
}

import { BrushCleaning, Lightbulb } from "lucide-react"

import { useToggleLight, useTriggerSelfClean } from "@/features/remote/use-aux-control"

const base =
  "bg-secondary text-muted-foreground hover:text-foreground flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-80 disabled:pointer-events-none disabled:opacity-40"

/** Momentary Light / Self Clean buttons (not part of AcState). */
export function AuxButtons({ disabled = false }: { disabled?: boolean }) {
  const toggleLight = useToggleLight()
  const selfClean = useTriggerSelfClean()

  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        disabled={disabled || toggleLight.isPending}
        onClick={() => toggleLight.mutate()}
        aria-label="Toggle AC display light"
        className={base}
      >
        <Lightbulb className="size-3.5" strokeWidth={2.25} />
        Light
      </button>
      <button
        type="button"
        disabled={disabled || selfClean.isPending}
        onClick={() => selfClean.mutate()}
        aria-label="Start Self Clean"
        className={base}
      >
        <BrushCleaning className="size-3.5" strokeWidth={2.25} />
        Self Clean
      </button>
    </div>
  )
}

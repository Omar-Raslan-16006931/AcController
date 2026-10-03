import * as React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { modeConfig, fanConfig } from "@/lib/ac-labels"
import { estimateKwh } from "@/lib/energy"
import type { AcUsageDayDetail } from "@/features/dashboard/use-ac-usage-detail"
import { DayStrip } from "@/features/dashboard/day-strip"
import {
  MS_PER_HOUR,
  avgTemp,
  dayTotalMs,
  formatClock,
  formatDuration,
} from "@/features/dashboard/usage-utils"

// Sub-minute blips (a double tap) clutter the list; totals still count them.
const MIN_LISTED_MS = 60_000

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0 [&+&]:border-l [&+&]:border-white/[0.07] [&+&]:pl-2.5">
      <div className="text-muted-foreground text-[10px]">{k}</div>
      <div className="num truncate text-[15px] font-semibold tracking-[-0.2px]">{v}</div>
    </div>
  )
}

/**
 * Bottom sheet for one day: ‹ › to move between days, the 24 h strip, day
 * totals, then every session with its start/end, mode, temperature, fan
 * and how long it ran. Close by tapping outside or dragging it down.
 */
export function DaySheet({
  days,
  index,
  onIndexChange,
  onClose,
}: {
  days: AcUsageDayDetail[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const open = index !== null
  const day = open ? days[index] : undefined
  const isToday = index === days.length - 1
  const bodyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [index])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const total = dayTotalMs(day)
  const temp = day ? avgTemp(day.intervals) : null
  const listed = day ? day.intervals.filter((iv) => iv.endMs - iv.startMs >= MIN_LISTED_MS) : []

  const title = !day ? "" : isToday ? "Today" : format(new Date(`${day.date}T00:00:00`), "EEEE, d MMM")

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && day && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-50 bg-[rgba(2,5,10,.55)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass glass-dense fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[74svh] max-w-xl flex-col rounded-t-[30px]"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <DragHandle onDragEnd={onDragEnd} />

            <div className="flex shrink-0 items-center gap-2 px-3.5 pb-2.5">
              <button
                type="button"
                aria-label="Previous day"
                disabled={index === 0}
                onClick={() => onIndexChange(index - 1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-opacity disabled:cursor-default disabled:opacity-25"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[15px] font-bold">{title}</div>
                <div className="text-muted-foreground text-[11.5px]">
                  {formatDuration(total)} on · {day.intervals.length} {day.intervals.length === 1 ? "entry" : "entries"}
                </div>
              </div>
              <button
                type="button"
                aria-label="Next day"
                disabled={isToday}
                onClick={() => onIndexChange(index + 1)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-opacity disabled:cursor-default disabled:opacity-25"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div
              ref={bodyRef}
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5"
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
              <DayStrip day={day} isToday={isToday} big />

              <div className="my-2.5 grid grid-cols-3 border-y border-white/[0.07] py-2.5">
                <Stat k="Total" v={formatDuration(total)} />
                <Stat k="Avg temp" v={temp != null ? `${Math.round(temp)}°` : "–"} />
                <Stat k="Energy" v={`${estimateKwh(total / MS_PER_HOUR).toFixed(1)} kWh`} />
              </div>

              {listed.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-[13px]">
                  {day.intervals.length === 0 ? "The AC wasn't used this day." : "Only brief taps this day."}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {listed.map((iv, i) => {
                    const mode = iv.mode ? modeConfig[iv.mode] : null
                    const fan = iv.fan ? fanConfig[iv.fan] : null
                    const ModeIcon = mode?.icon
                    const FanIcon = fan?.icon
                    return (
                      <div key={i} className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.06] px-3 py-2">
                        <div className="num w-[64px] shrink-0 text-[12.5px] leading-tight font-semibold">
                          {formatClock(iv.startMs)}
                          <span className="text-muted-foreground block text-[11px] font-medium">
                            {iv.ongoing ? "now" : formatClock(iv.endMs)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            {ModeIcon && <ModeIcon className="text-ice size-3" />}
                            {mode?.label ?? "On"}
                            {iv.temperature != null && ` · ${iv.temperature}°`}
                          </div>
                          {fan && (
                            <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                              {FanIcon && <FanIcon className="size-3" />}
                              {fan.label} fan
                            </div>
                          )}
                        </div>
                        <div className="num text-ice shrink-0 text-[15px] font-bold">
                          {formatDuration(iv.endMs - iv.startMs)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

/** The grab bar: dragging it down past a threshold closes the sheet. Kept
 * separate from the list so scrolling the sessions never drags the sheet. */
function DragHandle({ onDragEnd }: { onDragEnd: (e: unknown, info: PanInfo) => void }) {
  return (
    <motion.div
      className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-2"
      onPanEnd={(e, info) => onDragEnd(e, info)}
    >
      <div className="h-[5px] w-10 rounded-full bg-white/30" />
    </motion.div>
  )
}

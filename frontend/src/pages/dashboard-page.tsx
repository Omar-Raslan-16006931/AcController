import * as React from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useStatus } from "@/features/dashboard/use-status"
import { useDashboardAnalytics } from "@/features/dashboard/use-dashboard-analytics"
import { AcHeroCard } from "@/features/dashboard/analytics-hero-card"
import { AnalyticsSplitCard } from "@/features/dashboard/analytics-split-card"
import { WeekBarChart } from "@/features/dashboard/week-bar-chart"
import { FanModeCard } from "@/features/dashboard/fan-mode-card"
import { UsageEnergyCard } from "@/features/dashboard/usage-energy-card"
import { DayDetailSheet } from "@/features/dashboard/day-detail-sheet"

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[168px] w-full rounded-[1.25rem]" />
      <Skeleton className="h-16 w-full rounded-[1.25rem]" />
      <Skeleton className="h-52 w-full rounded-[1.25rem]" />
      <Skeleton className="h-28 w-full rounded-[1.25rem]" />
      <Skeleton className="h-40 w-full rounded-[1.25rem]" />
    </div>
  )
}

/**
 * The Dashboard's own analytics screen -- a deliberately flatter, darker
 * design than the rest of the app (no glass/frost/starfield), scoped to
 * this page via the `dashboard-flat` + `dark` classes on the root wrapper
 * (see index.css). Every card below is an existing app component (Card,
 * Button, Skeleton) rendering unmodified -- they just pick up the new
 * palette because it's expressed as the same CSS custom properties those
 * components already read.
 */
export function DashboardPage() {
  const { data: status, isLoading: statusLoading, isError, refetch, isFetching } = useStatus()
  const { analytics, isLoading: analyticsLoading } = useDashboardAnalytics()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const isLoading = statusLoading || analyticsLoading

  return (
    <div className="dashboard-flat dark bg-background text-foreground -mx-4 -mt-3 -mb-20 min-h-[calc(100svh-3rem)] px-4 pt-5 pb-tabbar sm:-mx-6 sm:px-6">
      {/* -mx/-mt/-mb bleed past AppLayout's own page padding (which leaves
          the fixed starfield canvas visible through the gap on every other
          page) so this opaque background fully covers it, edge to edge,
          matching the "no starfield" requirement for this screen
          specifically -- pb-tabbar on this div itself re-establishes the
          bottom-nav clearance that the cancelled parent padding removed. */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="mb-4 flex items-center justify-between"
      >
        <h2 className="text-[28px] leading-tight font-bold tracking-tight">Dashboard</h2>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Refresh"
          onClick={() => refetch()}
          disabled={isFetching}
          className="size-9"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </motion.div>

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
              <WifiOff className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Can't reach the Raspberry Pi</p>
              <p className="text-muted-foreground mt-1 text-[13px]">
                Check that the backend is running and VITE_API_BASE_URL points to it.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {status && analytics && !isLoading && (
        <div className="space-y-3">
          <AcHeroCard
            acState={status.ac_state}
            lastCommandAt={status.last_command_at}
            lastCommandResult={status.last_command_result}
          />

          <AnalyticsSplitCard
            todayHours={analytics.todayHours}
            weekAverageHours={analytics.weekAverageHours}
          />

          <WeekBarChart
            bars={analytics.weekBars}
            onSelectDay={(date) => {
              setSelectedDate(date)
              setSheetOpen(true)
            }}
          />

          <FanModeCard distribution={analytics.fanDistribution} />

          <UsageEnergyCard
            weekKwh={analytics.weekKwh}
            weekCostEgp={analytics.weekCostEgp}
            peakHourLabel={analytics.peakHourLabel}
            weekAvgTemp={analytics.weekAvgTemp}
          />
        </div>
      )}

      <DayDetailSheet open={sheetOpen} onOpenChange={setSheetOpen} initialDate={selectedDate} />
    </div>
  )
}

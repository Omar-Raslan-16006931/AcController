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

// Stagger the card list in on mount -- each card fades/slides up ~50ms
// after the previous one instead of all popping in at once.
const cardListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const cardItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 30 } },
}

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
 * The Dashboard's own analytics screen -- cards use a deliberately flatter,
 * darker palette than the rest of the app (via the `dashboard-flat` + `dark`
 * classes scoping Card/Button/etc.'s CSS custom properties, see index.css),
 * but the page itself no longer overrides the background -- the app's
 * fixed starfield canvas shows through here the same as on every other
 * page, per the user's request to drop the solid-black page cover.
 */
export function DashboardPage() {
  const { data: status, isLoading: statusLoading, isError, refetch, isFetching } = useStatus()
  const { analytics, isLoading: analyticsLoading } = useDashboardAnalytics()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const isLoading = statusLoading || analyticsLoading

  return (
    <div className="dashboard-flat dark text-foreground">
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
        <motion.div
          variants={cardListVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <motion.div variants={cardItemVariants}>
            <AcHeroCard
              acState={status.ac_state}
              lastCommandAt={status.last_command_at}
              lastCommandResult={status.last_command_result}
            />
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <AnalyticsSplitCard
              todayHours={analytics.todayHours}
              weekAverageHours={analytics.weekAverageHours}
            />
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <WeekBarChart
              bars={analytics.weekBars}
              onSelectDay={(date) => {
                setSelectedDate(date)
                setSheetOpen(true)
              }}
            />
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <FanModeCard distribution={analytics.fanDistribution} />
          </motion.div>

          <motion.div variants={cardItemVariants}>
            <UsageEnergyCard
              weekKwh={analytics.weekKwh}
              weekCostEgp={analytics.weekCostEgp}
              peakHourLabel={analytics.peakHourLabel}
              weekAvgTemp={analytics.weekAvgTemp}
            />
          </motion.div>
        </motion.div>
      )}

      <DayDetailSheet open={sheetOpen} onOpenChange={setSheetOpen} initialDate={selectedDate} />
    </div>
  )
}

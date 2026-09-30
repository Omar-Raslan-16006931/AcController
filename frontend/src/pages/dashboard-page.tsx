import * as React from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { useStatus } from "@/features/dashboard/use-status"
import { useDashboardAnalytics } from "@/features/dashboard/use-dashboard-analytics"
import { AcHeroCard } from "@/features/dashboard/analytics-hero-card"
import { AnalyticsSplitCard } from "@/features/dashboard/analytics-split-card"
import { WeekBarChart } from "@/features/dashboard/week-bar-chart"
import { FanModeCard } from "@/features/dashboard/fan-mode-card"
import { UsageEnergyCard } from "@/features/dashboard/usage-energy-card"
import { DayDetailSheet } from "@/features/dashboard/day-detail-sheet"

// Cards settle up into place one after another. y-axis only: every card is
// fully visible from the first frame even if the animation never runs.
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const itemVariants = {
  hidden: { y: 14 },
  show: { y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 34 } },
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="bg-card h-[150px] w-full rounded-[1.375rem]" />
      <Skeleton className="bg-card h-[84px] w-full rounded-[1.375rem]" />
      <Skeleton className="bg-card h-52 w-full rounded-[1.375rem]" />
      <Skeleton className="bg-card h-28 w-full rounded-[1.375rem]" />
    </div>
  )
}

export function DashboardPage() {
  const { data: status, isLoading: statusLoading, isError, refetch, isFetching } = useStatus()
  const { analytics, isLoading: analyticsLoading } = useDashboardAnalytics()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const isLoading = statusLoading || analyticsLoading

  return (
    <div>
      <PageHeader
        title="Today"
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            onClick={() => refetch()}
            disabled={isFetching}
            className="size-10 rounded-full"
          >
            <RefreshCw className={`size-[18px] ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <Card>
          <CardContent className="py-6">
            <WifiOff className="text-destructive size-5" />
            <p className="font-heading mt-3 text-[22px] leading-tight font-medium">Can't reach the Pi</p>
            <p className="text-muted-foreground mt-1 text-[14px]">Check that it's powered and online.</p>
            <Button variant="secondary" className="mt-5" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {status && analytics && !isLoading && (
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
          <motion.div variants={itemVariants}>
            <AcHeroCard
              acState={status.ac_state}
              lastCommandAt={status.last_command_at}
              lastCommandResult={status.last_command_result}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AnalyticsSplitCard todayHours={analytics.todayHours} weekAverageHours={analytics.weekAverageHours} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <WeekBarChart
              bars={analytics.weekBars}
              onSelectDay={(date) => {
                setSelectedDate(date)
                setSheetOpen(true)
              }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FanModeCard distribution={analytics.fanDistribution} />
          </motion.div>

          <motion.div variants={itemVariants}>
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

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

// Gentle staggered fade-in on mount -- opacity only, no movement.
const cardListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const cardItemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" as const } },
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

export function DashboardPage() {
  const { data: status, isLoading: statusLoading, isError, refetch, isFetching } = useStatus()
  const { analytics, isLoading: analyticsLoading } = useDashboardAnalytics()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const isLoading = statusLoading || analyticsLoading

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today's usage at a glance."
        actions={
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh"
            onClick={() => refetch()}
            disabled={isFetching}
            className="size-10"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      />

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

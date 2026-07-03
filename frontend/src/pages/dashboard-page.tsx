import { WifiOff, RefreshCw } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useStatus } from "@/features/dashboard/use-status"
import { AcStatusCard } from "@/features/dashboard/ac-status-card"
import { SystemMetricsGrid } from "@/features/dashboard/system-metrics-grid"

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-44 w-full rounded-[1.25rem]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: status, isLoading, isError, refetch, isFetching } = useStatus()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
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

      {status && (
        <div className="space-y-3 lg:grid lg:grid-cols-[380px_1fr] lg:items-start lg:gap-4 lg:space-y-0">
          <AcStatusCard status={status} />
          <div>
            <p className="text-muted-foreground mb-2 px-1 text-[13px] font-semibold tracking-[0.02em] uppercase lg:hidden">
              Raspberry Pi
            </p>
            <SystemMetricsGrid system={status.system} />
          </div>
        </div>
      )}
    </div>
  )
}

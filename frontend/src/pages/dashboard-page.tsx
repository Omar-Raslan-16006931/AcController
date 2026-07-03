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
    <div className="space-y-6">
      <Skeleton className="h-40 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
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
        description="Live status of your AC and the Raspberry Pi controlling it."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
              <WifiOff className="size-6" />
            </div>
            <div>
              <p className="font-medium">Can't reach the Raspberry Pi</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Check that the backend is running and VITE_API_BASE_URL points to it.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {status && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <AcStatusCard status={status} />
          <SystemMetricsGrid system={status.system} />
        </div>
      )}
    </div>
  )
}

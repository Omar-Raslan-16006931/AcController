import * as React from "react"
import { RotateCw, Power, RefreshCw, WifiOff } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useStatus } from "@/features/dashboard/use-status"
import { SystemMetricsGrid } from "@/features/dashboard/system-metrics-grid"
import { useRestartBackend, useRebootPi, useShutdownPi } from "@/features/system/use-system-actions"

type PendingAction = "restart" | "reboot" | "shutdown" | null

export function SystemPage() {
  const { data: status, isLoading, isError } = useStatus({ refetchInterval: 10_000 })
  const restartBackend = useRestartBackend()
  const rebootPi = useRebootPi()
  const shutdownPi = useShutdownPi()

  const [pending, setPending] = React.useState<PendingAction>(null)

  const actionConfig = {
    restart: {
      title: "Restart the backend service?",
      description: "The FastAPI service restarts in place — the Pi itself stays on. Takes a few seconds.",
      confirmLabel: "Restart backend",
      run: () => restartBackend.mutate(),
      loading: restartBackend.isPending,
    },
    reboot: {
      title: "Reboot the Raspberry Pi?",
      description: "The whole Pi restarts. It'll be offline for roughly 30-60 seconds.",
      confirmLabel: "Reboot Pi",
      run: () => rebootPi.mutate(),
      loading: rebootPi.isPending,
    },
    shutdown: {
      title: "Shut down the Raspberry Pi?",
      description: "The Pi powers off completely. You'll need to physically power-cycle it to bring it back online.",
      confirmLabel: "Shut down",
      run: () => shutdownPi.mutate(),
      loading: shutdownPi.isPending,
    },
  } as const

  return (
    <div className="space-y-4">
      <PageHeader title="System" description="Raspberry Pi diagnostics and power controls." />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl">
              <WifiOff className="size-6" />
            </div>
            <p className="font-medium">Can't reach the Raspberry Pi</p>
          </CardContent>
        </Card>
      )}

      {status && <SystemMetricsGrid system={status.system} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Power controls</CardTitle>
          <CardDescription>These take effect immediately — use with care.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2.5 sm:grid-cols-3">
          <Button variant="outline" className="h-12 gap-2" onClick={() => setPending("restart")}>
            <RefreshCw className="size-4" />
            Restart backend
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={() => setPending("reboot")}>
            <RotateCw className="size-4" />
            Restart Pi
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive h-12 gap-2"
            onClick={() => setPending("shutdown")}
          >
            <Power className="size-4" />
            Shutdown Pi
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? actionConfig[pending].title : ""}
        description={pending ? actionConfig[pending].description : ""}
        confirmLabel={pending ? actionConfig[pending].confirmLabel : ""}
        loading={pending ? actionConfig[pending].loading : false}
        onConfirm={() => {
          if (pending) actionConfig[pending].run()
          setPending(null)
        }}
      />
    </div>
  )
}

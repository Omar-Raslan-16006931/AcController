import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { Power, Wind, CheckCircle2, XCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { modeConfig, fanConfig } from "@/lib/ac-labels"
import type { StatusResponse } from "@/features/dashboard/use-status"

export function AcStatusCard({ status }: { status: StatusResponse }) {
  const { ac_state: ac, last_command_result, last_command_at } = status
  const mode = modeConfig[ac.mode]
  const ModeIcon = mode.icon

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Air Conditioner</CardTitle>
        <Badge variant={ac.power ? "success" : "secondary"} className="gap-1.5">
          <Power className="size-3" />
          {ac.power ? "On" : "Off"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-5">
          <motion.div
            key={ac.temperature}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-5xl font-semibold tabular-nums"
          >
            {ac.temperature}°
          </motion.div>
          <div className="flex flex-col gap-1.5">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${mode.className}`}>
              <ModeIcon className="size-4" />
              {mode.label}
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Wind className="size-4" />
              Fan: {fanConfig[ac.fan].label}
            </div>
          </div>
        </div>

        {last_command_at && (
          <div className="text-muted-foreground flex items-center gap-1.5 border-t pt-3 text-xs">
            {last_command_result === "success" ? (
              <CheckCircle2 className="text-success size-3.5" />
            ) : (
              <XCircle className="text-destructive size-3.5" />
            )}
            Last command {formatDistanceToNow(new Date(last_command_at), { addSuffix: true })}
            {last_command_result === "failure" && " · failed"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

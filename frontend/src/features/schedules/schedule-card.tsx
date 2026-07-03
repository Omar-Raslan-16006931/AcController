import { motion } from "framer-motion"
import { Clock, MoreVertical, Pencil, Copy, Trash2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { repeatLabel, actionSummary, formatTime } from "@/features/schedules/schedule-utils"
import type { Schedule } from "@/features/schedules/use-schedules"
import type { ScheduleAction } from "@/types/database"

interface ScheduleCardProps {
  schedule: Schedule
  onToggle: (enabled: boolean) => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ScheduleCard({ schedule, onToggle, onEdit, onDuplicate, onDelete }: ScheduleCardProps) {
  const action = schedule.action as unknown as ScheduleAction

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className={schedule.enabled ? "" : "opacity-60"}>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Clock className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{schedule.name}</p>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {formatTime(schedule.time)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {repeatLabel(schedule)} · {actionSummary(action)}
            </p>
          </div>

          <Switch checked={schedule.enabled} onCheckedChange={onToggle} aria-label="Toggle schedule" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:bg-accent/60 flex size-9 items-center justify-center rounded-lg">
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </motion.div>
  )
}

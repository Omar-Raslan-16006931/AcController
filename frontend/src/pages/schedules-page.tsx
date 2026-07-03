import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { Plus, CalendarClock } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
  useDuplicateSchedule,
  type Schedule,
  type ScheduleInput,
} from "@/features/schedules/use-schedules"
import { ScheduleForm } from "@/features/schedules/schedule-form"
import { ScheduleCard } from "@/features/schedules/schedule-card"

export function SchedulesPage() {
  const { data: schedules, isLoading } = useSchedules()
  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule()
  const deleteSchedule = useDeleteSchedule()
  const toggleSchedule = useToggleSchedule()
  const duplicateSchedule = useDuplicateSchedule()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Schedule | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = React.useState<Schedule | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule)
    setFormOpen(true)
  }

  const handleSubmit = (input: ScheduleInput) => {
    if (editing) {
      updateSchedule.mutate(
        { id: editing.id, ...input },
        { onSuccess: () => setFormOpen(false) }
      )
    } else {
      createSchedule.mutate(input, { onSuccess: () => setFormOpen(false) })
    }
  }

  return (
    <div>
      <PageHeader
        title="Schedules"
        description="Automate power, temperature, mode, and fan changes."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" />
            New schedule
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && schedules?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <CalendarClock className="size-6" />
            </div>
            <div>
              <p className="font-medium">No schedules yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Create one to automate your AC — e.g. cool down before bedtime.
              </p>
            </div>
            <Button onClick={openCreate} variant="outline" size="sm">
              Create your first schedule
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {schedules?.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onToggle={(enabled) => toggleSchedule.mutate({ id: schedule.id, enabled })}
              onEdit={() => openEdit(schedule)}
              onDuplicate={() => duplicateSchedule.mutate(schedule)}
              onDelete={() => setPendingDelete(schedule)}
            />
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        {formOpen && (
          <ScheduleForm
            schedule={editing}
            submitting={createSchedule.isPending || updateSchedule.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        title="Delete schedule?"
        description={`"${pendingDelete?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteSchedule.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteSchedule.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(undefined) })
        }
      />
    </div>
  )
}

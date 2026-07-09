import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { modeOrder, fanOrder, modeConfig, fanConfig } from "@/lib/ac-labels"
import { WEEKDAY_LABELS } from "@/features/schedules/schedule-utils"
import type { Schedule, ScheduleInput } from "@/features/schedules/use-schedules"
import type { ScheduleAction } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const scheduleSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(80),
    enabled: z.boolean(),
    time: z.string().min(1, "Time is required"),
    repeat: z.enum(["once", "daily", "weekdays", "weekends", "custom"]),
    customDays: z.array(z.number()),
    runDate: z.string().optional(),
    power: z.boolean(),
    // Restricted to exactly what the real Carrier hardware supports.
    temperature: z.coerce.number().min(20).max(28),
    mode: z.enum(["cool", "heat", "dry"]),
    fan: z.enum(["eco", "low", "medium", "high"]),
  })
  .refine((v) => v.repeat !== "custom" || v.customDays.length > 0, {
    message: "Pick at least one day",
    path: ["customDays"],
  })
  .refine((v) => v.repeat !== "once" || !!v.runDate, {
    message: "Pick a date",
    path: ["runDate"],
  })

type ScheduleFormInput = z.input<typeof scheduleSchema>
type ScheduleFormOutput = z.output<typeof scheduleSchema>

function toFormValues(schedule?: Schedule): ScheduleFormInput {
  const action = (schedule?.action ?? {}) as Partial<ScheduleAction>
  return {
    name: schedule?.name ?? "",
    enabled: schedule?.enabled ?? true,
    time: schedule?.time?.slice(0, 5) ?? "07:00",
    repeat: schedule?.repeat ?? "daily",
    customDays: schedule?.custom_days ?? [],
    runDate: schedule?.run_date ?? new Date().toISOString().slice(0, 10),
    power: action.power ?? true,
    temperature: action.temperature ?? 24,
    mode: action.mode ?? "cool",
    fan: action.fan ?? "low",
  }
}

interface ScheduleFormProps {
  schedule?: Schedule
  submitting?: boolean
  onSubmit: (input: ScheduleInput) => void
  onCancel: () => void
}

export function ScheduleForm({ schedule, submitting, onSubmit, onCancel }: ScheduleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormInput, unknown, ScheduleFormOutput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: toFormValues(schedule),
  })

  const repeat = watch("repeat")
  const power = watch("power")

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      enabled: values.enabled,
      time: values.time,
      repeat: values.repeat,
      custom_days: values.repeat === "custom" ? values.customDays : [],
      run_date: values.repeat === "once" ? values.runDate ?? null : null,
      action: values.power
        ? { power: true, temperature: values.temperature, mode: values.mode, fan: values.fan }
        : { power: false },
    })
  })

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
        <DialogDescription>Runs automatically at the time you set.</DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="e.g. Cool down before bed" {...register("name")} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="flex items-center justify-between rounded-xl border p-3">
          <Label htmlFor="enabled" className="cursor-pointer">
            Enabled
          </Label>
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch id="enabled" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" {...register("time")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repeat">Repeat</Label>
            <Controller
              control={control}
              name="repeat"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="repeat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="custom">Custom days</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {repeat === "once" && (
          <div className="space-y-1.5">
            <Label htmlFor="runDate">Date</Label>
            <Input id="runDate" type="date" {...register("runDate")} />
            {errors.runDate && <p className="text-destructive text-xs">{errors.runDate.message}</p>}
          </div>
        )}

        {repeat === "custom" && (
          <Controller
            control={control}
            name="customDays"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Days</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, index) => {
                    const active = field.value.includes(index)
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((d) => d !== index)
                              : [...field.value, index].sort()
                          )
                        }
                        className={cn(
                          "size-10 rounded-full border text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent/60"
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {errors.customDays && (
                  <p className="text-destructive text-xs">{errors.customDays.message as string}</p>
                )}
              </div>
            )}
          />
        )}

        <div className="flex items-center justify-between rounded-xl border p-3">
          <Label htmlFor="power" className="cursor-pointer">
            Turn AC on
          </Label>
          <Controller
            control={control}
            name="power"
            render={({ field }) => (
              <Switch id="power" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {power && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temp °C</Label>
              <Input id="temperature" type="number" min={20} max={28} {...register("temperature")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mode">Mode</Label>
              <Controller
                control={control}
                name="mode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modeOrder.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {modeConfig[mode].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fan">Fan</Label>
              <Controller
                control={control}
                name="fan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="fan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fanOrder.map((fan) => (
                        <SelectItem key={fan} value={fan}>
                          {fanConfig[fan].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {schedule ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

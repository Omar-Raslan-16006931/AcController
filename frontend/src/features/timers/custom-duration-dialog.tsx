import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface CustomDurationDialogProps {
  title: string
  description: string
  submitting?: boolean
  onSubmit: (seconds: number) => void
  onCancel: () => void
}

export function CustomDurationDialog({
  title,
  description,
  submitting,
  onSubmit,
  onCancel,
}: CustomDurationDialogProps) {
  const [amount, setAmount] = React.useState(30)
  const [unit, setUnit] = React.useState<"minutes" | "hours">("minutes")

  const seconds = unit === "minutes" ? amount * 60 : amount * 3600

  return (
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="duration-amount">Duration</Label>
          <Input
            id="duration-amount"
            type="number"
            min={1}
            max={unit === "minutes" ? 1440 : 24}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <Select value={unit} onValueChange={(v) => setUnit(v as "minutes" | "hours")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(seconds)} disabled={submitting}>
          Start timer
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

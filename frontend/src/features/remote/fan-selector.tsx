import { fanConfig, fanOrder } from "@/lib/ac-labels"
import type { FanSpeed } from "@/types/database"
import { Segmented } from "@/features/remote/segmented"

const options = fanOrder.map((fan) => ({
  value: fan,
  label: fanConfig[fan].label,
  icon: fanConfig[fan].icon,
}))

export function FanSelector({
  value,
  disabled,
  onChange,
}: {
  value: FanSpeed
  disabled?: boolean
  onChange: (fan: FanSpeed) => void
}) {
  return <Segmented label="Fan" options={options} value={value} disabled={disabled} onChange={onChange} />
}

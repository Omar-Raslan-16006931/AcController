import { modeConfig, modeOrder } from "@/lib/ac-labels"
import type { AcMode } from "@/types/database"
import { Segmented } from "@/features/remote/segmented"

const options = modeOrder.map((mode) => ({
  value: mode,
  label: modeConfig[mode].label,
  icon: modeConfig[mode].icon,
  activeTone: modeConfig[mode].className,
}))

export function ModeSelector({
  value,
  disabled,
  onChange,
}: {
  value: AcMode
  disabled?: boolean
  onChange: (mode: AcMode) => void
}) {
  return <Segmented label="Mode" options={options} value={value} disabled={disabled} onChange={onChange} />
}

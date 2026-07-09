import { Cpu, MemoryStick, HardDrive, Thermometer, Wifi, Clock, Network, Tag } from "lucide-react"

import { Card } from "@/components/ui/card"
import { StatRow } from "@/features/dashboard/stat-card"
import { formatUptime } from "@/lib/utils"
import type { SystemMetrics } from "@/features/dashboard/use-status"

/**
 * Compact two-column list of system metrics inside a single bordered card --
 * replaces the old 8-tile grid (each ~104px tall) with tight single-line
 * rows so the whole dashboard reads at a glance instead of requiring a
 * scroll on mobile.
 */
export function SystemMetricsGrid({ system }: { system: SystemMetrics }) {
  return (
    <Card className="p-3.5">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <div className="divide-border/60 flex flex-col divide-y">
          <StatRow
            index={0}
            icon={Cpu}
            label="CPU"
            value={`${Math.round(system.cpu_percent)}%`}
            progress={system.cpu_percent}
            accent={system.cpu_percent > 85 ? "destructive" : "default"}
          />
          <StatRow
            index={1}
            icon={MemoryStick}
            label="RAM"
            value={`${Math.round(system.ram_percent)}%`}
            progress={system.ram_percent}
          />
          <StatRow
            index={2}
            icon={HardDrive}
            label="Disk"
            value={`${Math.round(system.disk_percent)}%`}
            progress={system.disk_percent}
          />
          <StatRow
            index={3}
            icon={Thermometer}
            label="CPU temp"
            value={system.cpu_temperature_c != null ? `${system.cpu_temperature_c}°C` : "—"}
            accent={
              system.cpu_temperature_c != null && system.cpu_temperature_c > 70 ? "destructive" : "default"
            }
          />
        </div>
        <div className="divide-border/60 flex flex-col divide-y">
          <StatRow
            index={4}
            icon={Wifi}
            label="WiFi signal"
            value={system.wifi_signal_percent != null ? `${system.wifi_signal_percent}%` : "—"}
            sub={system.wifi_ssid ?? "Not connected"}
          />
          <StatRow index={5} icon={Clock} label="Uptime" value={formatUptime(system.uptime_seconds)} />
          <StatRow index={6} icon={Tag} label="Hostname" value={system.hostname} />
          <StatRow index={7} icon={Network} label="IP address" value={system.ip_address ?? "—"} />
        </div>
      </div>
    </Card>
  )
}

import { Cpu, MemoryStick, HardDrive, Thermometer, Wifi, Clock, Network, Tag } from "lucide-react"

import { StatCard } from "@/features/dashboard/stat-card"
import { formatUptime, formatBytes } from "@/lib/utils"
import type { SystemMetrics } from "@/features/dashboard/use-status"

export function SystemMetricsGrid({ system }: { system: SystemMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        index={0}
        icon={Cpu}
        label="CPU"
        value={`${Math.round(system.cpu_percent)}%`}
        progress={system.cpu_percent}
        accent={system.cpu_percent > 85 ? "destructive" : "default"}
      />
      <StatCard
        index={1}
        icon={MemoryStick}
        label="RAM"
        value={`${Math.round(system.ram_percent)}%`}
        sub={`${formatBytes(system.ram_used_mb)} / ${formatBytes(system.ram_total_mb)}`}
        progress={system.ram_percent}
      />
      <StatCard
        index={2}
        icon={HardDrive}
        label="Disk"
        value={`${Math.round(system.disk_percent)}%`}
        sub={`${system.disk_used_gb} / ${system.disk_total_gb} GB`}
        progress={system.disk_percent}
      />
      <StatCard
        index={3}
        icon={Thermometer}
        label="CPU temp"
        value={system.cpu_temperature_c != null ? `${system.cpu_temperature_c}°C` : "—"}
        accent={
          system.cpu_temperature_c != null && system.cpu_temperature_c > 70 ? "destructive" : "default"
        }
      />
      <StatCard
        index={4}
        icon={Wifi}
        label="WiFi signal"
        value={system.wifi_signal_percent != null ? `${system.wifi_signal_percent}%` : "—"}
        sub={system.wifi_ssid ?? "Not connected"}
      />
      <StatCard index={5} icon={Clock} label="Uptime" value={formatUptime(system.uptime_seconds)} />
      <StatCard index={6} icon={Tag} label="Hostname" value={system.hostname} />
      <StatCard index={7} icon={Network} label="IP address" value={system.ip_address ?? "—"} />
    </div>
  )
}

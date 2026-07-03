import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AcMode, FanSpeed } from "@/types/database"

export interface AcState {
  power: boolean
  temperature: number
  mode: AcMode
  fan: FanSpeed
  updated_at: string
}

export interface SystemMetrics {
  cpu_percent: number
  ram_percent: number
  ram_used_mb: number
  ram_total_mb: number
  disk_percent: number
  disk_used_gb: number
  disk_total_gb: number
  cpu_temperature_c: number | null
  wifi_ssid: string | null
  wifi_signal_percent: number | null
  ip_address: string | null
  hostname: string
  uptime_seconds: number
}

export interface StatusResponse {
  online: boolean
  ac_state: AcState
  system: SystemMetrics
  last_command_result: "success" | "failure" | null
  last_command_at: string | null
}

export function useStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => api.get<StatusResponse>("/api/status"),
    refetchInterval: options?.refetchInterval ?? 10_000,
  })
}

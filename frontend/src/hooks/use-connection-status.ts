import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export type ConnectionState = "online" | "offline" | "checking"

interface StatusResponse {
  online: boolean
}

/**
 * Polls the FastAPI backend's /api/status endpoint to determine whether the
 * Raspberry Pi is reachable. Full payload (CPU/RAM/etc.) is consumed by the
 * Dashboard/System pages in a later module — this hook only needs the
 * online/offline signal for the topbar indicator.
 */
export function useConnectionStatus() {
  const query = useQuery({
    queryKey: ["connection-status"],
    queryFn: () => api.get<StatusResponse>("/api/status"),
    refetchInterval: 15_000,
    retry: 1,
  })

  const state: ConnectionState = query.isLoading
    ? "checking"
    : query.isError
      ? "offline"
      : query.data?.online
        ? "online"
        : "offline"

  return { state, isLoading: query.isLoading }
}

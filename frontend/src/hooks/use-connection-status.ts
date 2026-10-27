import { useStatus } from "@/features/dashboard/use-status"

export type ConnectionState = "online" | "offline" | "checking"

/**
 * Online/offline signal for the topbar chip, derived from the same
 * /api/status query the rest of the app already polls (one request instead
 * of two, and it starts from the cached copy, so the chip is right on the
 * first frame instead of sitting on "Checking").
 *
 * "checking" only shows while there is nothing to go on yet: no cached
 * answer and the first request still running.
 */
export function useConnectionStatus() {
  const query = useStatus()

  const state: ConnectionState = query.data
    ? query.data.online
      ? "online"
      : "offline"
    : query.isError
      ? "offline"
      : "checking"

  return { state, isLoading: query.isLoading }
}

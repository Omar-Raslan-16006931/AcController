import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { StatusResponse } from "@/features/dashboard/use-status"
import type { AcMode, FanSpeed } from "@/types/database"

interface CommandResponse {
  success: boolean
  state: StatusResponse["ac_state"]
  message?: string | null
}

function useAcMutation<TVariables>(
  path: string,
  toVariables: (v: TVariables) => Record<string, unknown>,
  optimisticState: (current: StatusResponse["ac_state"], v: TVariables) => StatusResponse["ac_state"]
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: TVariables) => api.post<CommandResponse>(path, toVariables(variables)),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.status })
      const previous = queryClient.getQueryData<StatusResponse>(queryKeys.status)

      if (previous) {
        queryClient.setQueryData<StatusResponse>(queryKeys.status, {
          ...previous,
          ac_state: optimisticState(previous.ac_state, variables),
        })
      }

      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.status, context.previous)
      }
      toast.error("Command failed", {
        description: error instanceof Error ? error.message : "The AC didn't respond.",
      })
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error("Command failed", { description: data.message ?? "The AC didn't respond." })
        return
      }
      queryClient.setQueryData<StatusResponse>(queryKeys.status, (prev) =>
        prev ? { ...prev, ac_state: data.state } : prev
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status })
    },
  })
}

export function useSetPower() {
  return useAcMutation<boolean>(
    "/api/power",
    (power) => ({ power }),
    (current, power) => ({ ...current, power })
  )
}

export function useSetTemperature() {
  return useAcMutation<number>(
    "/api/temperature",
    (temperature) => ({ temperature }),
    (current, temperature) => ({ ...current, temperature })
  )
}

export function useSetMode() {
  return useAcMutation<AcMode>(
    "/api/mode",
    (mode) => ({ mode }),
    (current, mode) => ({ ...current, mode })
  )
}

export function useSetFan() {
  return useAcMutation<FanSpeed>(
    "/api/fan",
    (fan) => ({ fan }),
    (current, fan) => ({ ...current, fan })
  )
}

export interface DraftCommand {
  temperature?: number
  mode?: AcMode
  fan?: FanSpeed
}

/**
 * Combined "send now" mutation used when Automatic Send is off: fires
 * whichever of temperature/mode/fan were changed locally as one request,
 * matching the backend's /api/command endpoint (one IR transmission for
 * the whole batch instead of one per change).
 */
export function useSendCommand() {
  return useAcMutation<DraftCommand>(
    "/api/command",
    (draft) => ({ ...draft }),
    (current, draft) => ({ ...current, ...draft })
  )
}

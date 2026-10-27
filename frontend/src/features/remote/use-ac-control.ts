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

const AC_MUTATION_KEY = ["ac-command"] as const

type CommandPatch = Partial<Pick<StatusResponse["ac_state"], "power" | "temperature" | "mode" | "fan">>

/**
 * One command at a time on the wire. The Pi sends infrared one command at a
 * time and every command re-sends the whole state, so firing a request per
 * tap just queues them up on the Pi (and they can overtake each other).
 * Instead: while a request is out, further taps are merged into ONE pending
 * request with the latest values, sent the moment the first one returns.
 * Tapping + five times is two requests, not five, and the AC ends on the
 * right value sooner.
 */
interface Waiter {
  resolve: (r: CommandResponse) => void
  reject: (e: unknown) => void
}
let inFlight = false
let pending: { patch: CommandPatch; waiters: Waiter[] } | null = null

function sendMerged(patch: CommandPatch): Promise<CommandResponse> {
  return new Promise((resolve, reject) => {
    pending ??= { patch: {}, waiters: [] }
    Object.assign(pending.patch, patch)
    pending.waiters.push({ resolve, reject })
    void pump()
  })
}

async function pump(): Promise<void> {
  if (inFlight || !pending) return
  inFlight = true
  const batch = pending
  pending = null
  try {
    const res = await api.post<CommandResponse>("/api/command", batch.patch)
    batch.waiters.forEach((w) => w.resolve(res))
  } catch (err) {
    batch.waiters.forEach((w) => w.reject(err))
  } finally {
    inFlight = false
    void pump()
  }
}

function useAcMutation<TVariables>(
  toVariables: (v: TVariables) => CommandPatch,
  optimisticState: (current: StatusResponse["ac_state"], v: TVariables) => StatusResponse["ac_state"]
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: AC_MUTATION_KEY,
    mutationFn: (variables: TVariables) => sendMerged(toVariables(variables)),
    onMutate: async (variables) => {
      // Optimistic first, synchronously, so the UI reacts on the same frame
      // as the tap; then stop any in-flight status poll from overwriting it.
      const previous = queryClient.getQueryData<StatusResponse>(queryKeys.status)
      void queryClient.cancelQueries({ queryKey: queryKeys.status })

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
      // Merged taps fail together: one toast, not one per tap.
      toast.error("Command failed", {
        id: "ac-command-failed",
        description: error instanceof Error ? error.message : "The AC didn't respond.",
      })
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error("Command failed", { id: "ac-command-failed", description: data.message ?? "The AC didn't respond." })
        return
      }
      // While more taps are still in flight, keep showing the optimistic
      // state of the latest tap instead of snapping back to this older reply.
      if (queryClient.isMutating({ mutationKey: AC_MUTATION_KEY }) > 1) return
      queryClient.setQueryData<StatusResponse>(queryKeys.status, (prev) =>
        prev ? { ...prev, ac_state: data.state } : prev
      )
    },
    onSettled: () => {
      // Only re-sync once the last queued command has finished; refetching
      // between rapid taps made the controls jump back and forth.
      if (queryClient.isMutating({ mutationKey: AC_MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: queryKeys.status })
      }
    },
  })
}

export function useSetPower() {
  return useAcMutation<boolean>(
    (power) => ({ power }),
    (current, power) => ({ ...current, power })
  )
}

export function useSetTemperature() {
  return useAcMutation<number>(
    (temperature) => ({ temperature }),
    (current, temperature) => ({ ...current, temperature })
  )
}

export function useSetMode() {
  return useAcMutation<AcMode>(
    (mode) => ({ mode }),
    (current, mode) => ({ ...current, mode })
  )
}

export function useSetFan() {
  return useAcMutation<FanSpeed>(
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
    (draft) => ({ ...draft }),
    (current, draft) => ({ ...current, ...draft })
  )
}

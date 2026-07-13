import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"

interface AuxCommandResponse {
  success: boolean
  message?: string | null
}

/**
 * Momentary auxiliary buttons (Light, Self Clean) -- unlike
 * use-ac-control.ts's mutations, these don't touch AcState (no optimistic
 * update, nothing to roll back, no status refetch needed), since the
 * backend endpoints just replay a raw captured waveform with no tracked
 * resulting state.
 */
function useAuxMutation(path: string, successLabel: string) {
  return useMutation({
    mutationFn: () => api.post<AuxCommandResponse>(path),
    onSuccess: (data) => {
      if (!data.success) {
        toast.error("Command failed", { description: data.message ?? "The AC didn't respond." })
        return
      }
      toast.success(successLabel)
    },
    onError: (error) => {
      toast.error("Command failed", {
        description: error instanceof Error ? error.message : "The AC didn't respond.",
      })
    },
  })
}

export function useToggleLight() {
  return useAuxMutation("/api/aux/light", "Light toggled")
}

export function useTriggerSelfClean() {
  return useAuxMutation("/api/aux/self-clean", "Self Clean started")
}

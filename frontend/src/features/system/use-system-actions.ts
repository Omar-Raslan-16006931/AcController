import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"

interface SystemActionResponse {
  accepted: boolean
  action: "reboot" | "shutdown" | "restart"
  message: string
}

function useSystemAction(path: string) {
  return useMutation({
    mutationFn: () => api.post<SystemActionResponse>(path),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error("Action failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useRestartBackend() {
  return useSystemAction("/api/system/restart")
}

export function useRebootPi() {
  return useSystemAction("/api/system/reboot")
}

export function useShutdownPi() {
  return useSystemAction("/api/system/shutdown")
}

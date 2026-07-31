import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export type LearnState = "idle" | "listening" | "received" | "timed_out" | "error"

export interface LearnStatus {
  state: LearnState
  button_name: string | null
  started_at: string | null
  error: string | null
}

export interface LearnedButton {
  name: string
  learned_at: string
}

interface LearnActionResponse {
  success: boolean
  status: LearnStatus
  message?: string
}

// Polls quickly while actively listening so the UI can react the instant a
// signal lands (or the window times out) -- this mirrors useDetectStatus's
// same fast-poll-while-active / back-off-when-idle pattern.
export function useLearnStatus() {
  return useQuery({
    queryKey: queryKeys.learnStatus,
    queryFn: () => api.get<LearnStatus>("/api/learn/status"),
    refetchInterval: (query) => (query.state.data?.state === "listening" ? 400 : 5_000),
  })
}

export function useLearnedButtons() {
  return useQuery({
    queryKey: queryKeys.learnButtons,
    queryFn: () => api.get<{ buttons: LearnedButton[] }>("/api/learn/buttons"),
  })
}

export function useStartLearning() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; timeout_seconds?: number }) =>
      api.post<LearnActionResponse>("/api/learn/start", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.learnStatus }),
    onError: (error) => {
      toast.error("Couldn't start listening", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useCancelLearning() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<LearnActionResponse>("/api/learn/cancel"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.learnStatus }),
  })
}

export function useSendLearned() {
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ success: boolean; name: string }>("/api/learn/send", { name }),
    onError: (error) => {
      toast.error("Send failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useDeleteLearned() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.delete<{ success: boolean }>(`/api/learn/buttons/${encodeURIComponent(name)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.learnButtons }),
    onError: (error) => {
      toast.error("Couldn't delete button", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

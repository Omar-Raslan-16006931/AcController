import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export type DetectRunState = "idle" | "running" | "finished" | "confirmed"

export interface DetectedAc {
  brand: string
  model: string
  index: number
  file: string
  confirmed_at: string
}

export interface DetectStatus {
  state: DetectRunState
  current_index: number | null
  current_brand: string | null
  current_model: string | null
  sent_count: number
  total: number
  interval_seconds: number
  started_at: string | null
  last_error: string | null
  detected: DetectedAc | null
}

export interface DetectCode {
  index: number
  brand: string
  model: string
}

interface DetectActionResponse {
  success: boolean
  status: DetectStatus
  message?: string
}

interface DetectConfirmResponse {
  success: boolean
  detected: DetectedAc | null
  message?: string
}

// Polls quickly while a run is in flight (so the brand/model name and
// progress bar feel live), and backs off the rest of the time -- this is
// Pi-local state, not something that changes on its own when idle.
export function useDetectStatus() {
  return useQuery({
    queryKey: queryKeys.detectStatus,
    queryFn: () => api.get<DetectStatus>("/api/detect/status"),
    refetchInterval: (query) => (query.state.data?.state === "running" ? 600 : 5_000),
  })
}

export function useDetectCodes() {
  return useQuery({
    queryKey: queryKeys.detectCodes,
    queryFn: () => api.get<{ codes: DetectCode[]; total: number }>("/api/detect/codes"),
    staleTime: Infinity, // the bundled code list never changes at runtime
  })
}

export function useStartDetect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { interval_seconds: number; start_index?: number }) =>
      api.post<DetectActionResponse>("/api/detect/start", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.detectStatus }),
    onError: (error) => {
      toast.error("Couldn't start detection", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useStopDetect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<DetectActionResponse>("/api/detect/stop"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.detectStatus }),
    onError: (error) => {
      toast.error("Couldn't stop detection", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useResetDetect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<DetectActionResponse>("/api/detect/reset"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.detectStatus }),
    onError: (error) => {
      toast.error("Couldn't reset", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useConfirmDetect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<DetectConfirmResponse>("/api/detect/confirm"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.detectStatus })
      if (data.detected) {
        toast.success(`Matched: ${data.detected.brand} ${data.detected.model}`)
      }
    },
    onError: (error) => {
      toast.error("Couldn't confirm", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useReplayCode() {
  return useMutation({
    mutationFn: (index: number) =>
      api.post<{ success: boolean; brand: string; model: string }>(`/api/detect/replay/${index}`),
    onSuccess: (data) => toast.success(`Replayed ${data.brand} ${data.model}`),
    onError: (error) => {
      toast.error("Replay failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

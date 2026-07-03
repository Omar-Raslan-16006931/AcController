import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"
import type { Database, Json, RepeatRule, ScheduleAction } from "@/types/database"

export type Schedule = Database["public"]["Tables"]["schedules"]["Row"]

export interface ScheduleInput {
  name: string
  enabled: boolean
  time: string // "HH:MM"
  repeat: RepeatRule
  custom_days: number[]
  run_date: string | null
  action: ScheduleAction
}

export function useSchedules() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const query = useQuery({
    queryKey: userId ? queryKeys.schedules(userId) : ["schedules", "anonymous"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("time", { ascending: true })
      if (error) throw error
      return data as Schedule[]
    },
    enabled: !!userId,
  })

  React.useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`schedules-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.schedules(userId) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

function useScheduleMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.schedules(user.id) })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useCreateSchedule() {
  const { user } = useAuth()
  return useScheduleMutation(async (input: ScheduleInput) => {
    if (!user) throw new Error("Not signed in")
    const { error } = await supabase
      .from("schedules")
      .insert({ ...input, user_id: user.id, action: input.action as unknown as Json })
    if (error) throw error
  }, "Schedule created")
}

export function useUpdateSchedule() {
  return useScheduleMutation(async ({ id, ...input }: Partial<ScheduleInput> & { id: string }) => {
    const payload = { ...input, action: input.action as unknown as Json | undefined }
    const { error } = await supabase.from("schedules").update(payload).eq("id", id)
    if (error) throw error
  }, "Schedule updated")
}

export function useDeleteSchedule() {
  return useScheduleMutation(async (id: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id)
    if (error) throw error
  }, "Schedule deleted")
}

export function useToggleSchedule() {
  return useScheduleMutation(async ({ id, enabled }: { id: string; enabled: boolean }) => {
    const { error } = await supabase.from("schedules").update({ enabled }).eq("id", id)
    if (error) throw error
  }, "Schedule updated")
}

export function useDuplicateSchedule() {
  const { user } = useAuth()
  return useScheduleMutation(async (schedule: Schedule) => {
    if (!user) throw new Error("Not signed in")
    const { error } = await supabase.from("schedules").insert({
      user_id: user.id,
      name: `${schedule.name} (copy)`,
      enabled: false,
      time: schedule.time,
      repeat: schedule.repeat,
      custom_days: schedule.custom_days,
      run_date: schedule.run_date,
      action: schedule.action,
    })
    if (error) throw error
  }, "Schedule duplicated")
}

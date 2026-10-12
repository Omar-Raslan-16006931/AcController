import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"
import type { Database, TimerAction } from "@/types/database"

export type Timer = Database["public"]["Tables"]["timers"]["Row"]

export function useTimers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const query = useQuery({
    queryKey: userId ? queryKeys.timers(userId) : ["timers", "anonymous"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timers")
        .select("*")
        .eq("status", "pending")
        .order("fires_at", { ascending: true })
      if (error) throw error
      return data as Timer[]
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  })

  React.useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`timers-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.timers(userId) })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

type CreateVars = { action: TimerAction; seconds: number; label?: string; firesAt: string; tempId: string }

/**
 * Optimistic: the timer row appears the moment you tap Start, then is swapped
 * for the saved row when Supabase answers (or removed again on error).
 */
export function useCreateTimer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = user ? queryKeys.timers(user.id) : ["timers", "anonymous"]

  const mutation = useMutation({
    mutationFn: async ({ action, label, firesAt }: CreateVars) => {
      if (!user) throw new Error("Not signed in")
      const { data, error } = await supabase
        .from("timers")
        .insert({ user_id: user.id, action, fires_at: firesAt, label: label ?? "", status: "pending" })
        .select()
        .single()
      if (error) throw error
      return data as Timer
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Timer[]>(key)
      const temp = {
        id: vars.tempId,
        user_id: user?.id ?? "",
        action: vars.action,
        fires_at: vars.firesAt,
        label: vars.label ?? "",
        status: "pending",
        created_at: new Date().toISOString(),
        completed_at: null,
      } satisfies Timer
      queryClient.setQueryData<Timer[]>(key, (old) =>
        [...(old ?? []), temp].sort((a, b) => a.fires_at.localeCompare(b.fires_at))
      )
      return { previous }
    },
    onSuccess: (saved, vars) => {
      queryClient.setQueryData<Timer[]>(key, (old) => (old ?? []).map((t) => (t.id === vars.tempId ? saved : t)))
      toast.success("Timer set")
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
      toast.error("Couldn't set timer", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return {
    ...mutation,
    mutate: ({ action, seconds, label }: { action: TimerAction; seconds: number; label?: string }) =>
      mutation.mutate({
        action,
        seconds,
        label,
        firesAt: new Date(Date.now() + seconds * 1000).toISOString(),
        tempId: `local-${Date.now()}`,
      }),
  }
}

export function useCancelTimer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = user ? queryKeys.timers(user.id) : ["timers", "anonymous"]

  return useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("local-")) return
      const { error } = await supabase.from("timers").update({ status: "cancelled" }).eq("id", id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Timer[]>(key)
      queryClient.setQueryData<Timer[]>(key, (old) => (old ?? []).filter((t) => t.id !== id))
      return { previous }
    },
    onSuccess: () => toast.success("Timer cancelled"),
    onError: (error, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
      toast.error("Couldn't cancel timer", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

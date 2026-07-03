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

export function useCreateTimer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      action,
      seconds,
      label,
    }: {
      action: TimerAction
      seconds: number
      label?: string
    }) => {
      if (!user) throw new Error("Not signed in")
      const fires_at = new Date(Date.now() + seconds * 1000).toISOString()
      const { error } = await supabase.from("timers").insert({
        user_id: user.id,
        action,
        fires_at,
        label: label ?? "",
        status: "pending",
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.timers(user.id) })
      toast.success("Timer set")
    },
    onError: (error) => {
      toast.error("Couldn't set timer", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useCancelTimer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timers").update({ status: "cancelled" }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.timers(user.id) })
      toast.success("Timer cancelled")
    },
    onError: (error) => {
      toast.error("Couldn't cancel timer", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"
import type { CommandResult, Database } from "@/types/database"

export type HistoryEntry = Database["public"]["Tables"]["command_history"]["Row"]

export interface HistoryFilters {
  search: string
  result: CommandResult | "all"
  page: number
  pageSize: number
}

export function useHistory(filters: HistoryFilters) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const query = useQuery({
    queryKey: userId ? queryKeys.history(userId, filters) : ["history", "anonymous"],
    queryFn: async () => {
      const from = filters.page * filters.pageSize
      const to = from + filters.pageSize - 1

      let request = supabase
        .from("command_history")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (filters.result !== "all") {
        request = request.eq("result", filters.result)
      }
      if (filters.search.trim()) {
        const like = `%${filters.search.trim()}%`
        request = request.or(`mode.ilike.${like},fan.ilike.${like},source.ilike.${like}`)
      }

      const { data, error, count } = await request
      if (error) throw error
      return { items: data as HistoryEntry[], total: count ?? 0 }
    },
    enabled: !!userId,
    placeholderData: (prev) => prev,
  })

  React.useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`history-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "command_history", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["history", userId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

export function useDeleteHistoryEntry() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("command_history").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ["history", user.id] })
      toast.success("Entry deleted")
    },
    onError: (error) => {
      toast.error("Couldn't delete entry", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useClearHistory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in")
      const { error } = await supabase.from("command_history").delete().eq("user_id", user.id)
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ["history", user.id] })
      toast.success("History cleared")
    },
    onError: (error) => {
      toast.error("Couldn't clear history", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"
import type { Database } from "@/types/database"

export type UserSettings = Database["public"]["Tables"]["settings"]["Row"]
export type UserSettingsUpdate = Database["public"]["Tables"]["settings"]["Update"]

export function useSettings() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: userId ? queryKeys.settings(userId) : ["settings", "anonymous"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle()
      if (error) throw error

      if (data) return data as UserSettings

      // Defensive fallback: the `on_auth_user_created` trigger should have
      // already created this row, but create one if it's somehow missing.
      const { data: created, error: insertError } = await supabase
        .from("settings")
        .insert({ user_id: userId! })
        .select("*")
        .single()
      if (insertError) throw insertError
      return created as UserSettings
    },
    enabled: !!userId,
  })
}

export function useUpdateSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: UserSettingsUpdate) => {
      if (!user) throw new Error("Not signed in")
      const { data, error } = await supabase
        .from("settings")
        .update(update)
        .eq("user_id", user.id)
        .select("*")
        .single()
      if (error) throw error
      return data as UserSettings
    },
    onSuccess: (data) => {
      if (user) queryClient.setQueryData(queryKeys.settings(user.id), data)
      toast.success("Settings saved")
    },
    onError: (error) => {
      toast.error("Couldn't save settings", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

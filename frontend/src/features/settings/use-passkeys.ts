import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"

export interface Passkey {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export function usePasskeys() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: userId ? queryKeys.passkeys(userId) : ["passkeys", "anonymous"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.passkey.list()
      if (error) throw error
      return (data ?? []) as Passkey[]
    },
    enabled: !!userId,
  })
}

export function useRegisterPasskey() {
  const { user, registerPasskey } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await registerPasskey()
      if (error) throw new Error(error)
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.passkeys(user.id) })
      toast.success("Passkey added")
    },
    onError: (error) => {
      toast.error("Couldn't add passkey", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useRenamePasskey() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ passkeyId, friendlyName }: { passkeyId: string; friendlyName: string }) => {
      const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName })
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.passkeys(user.id) })
    },
    onError: (error) => {
      toast.error("Couldn't rename passkey", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

export function useDeletePasskey() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (passkeyId: string) => {
      const { error } = await supabase.auth.passkey.delete({ passkeyId })
      if (error) throw error
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.passkeys(user.id) })
      toast.success("Passkey removed")
    },
    onError: (error) => {
      toast.error("Couldn't remove passkey", {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })
}

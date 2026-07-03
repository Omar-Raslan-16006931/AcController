import * as React from "react"
import type { Session, User } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signInWithPasskey: () => Promise<{ error: string | null }>
  registerPasskey: () => Promise<{ error: string | null }>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const signInWithPasskey = React.useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithPasskey()
      return { error: error?.message ?? null }
    } catch (err) {
      // navigator.credentials.get() throws (rather than resolving with an
      // error) if the user cancels the prompt or the browser lacks WebAuthn.
      return { error: err instanceof Error ? err.message : "Passkey sign-in failed" }
    }
  }, [])

  const registerPasskey = React.useCallback(async () => {
    try {
      const { error } = await supabase.auth.registerPasskey()
      return { error: error?.message ?? null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't register passkey" }
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithPasskey,
      registerPasskey,
    }),
    [session, loading, signIn, signUp, signOut, signInWithPasskey, registerPasskey]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, Lock, Mail, ScanFace, Snowflake } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { session, loading, signIn, signUp, signInWithPasskey } = useAuth()
  const location = useLocation()
  const [submitting, setSubmitting] = React.useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = React.useState(false)
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in")
  const [signUpSuccess, setSignUpSuccess] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  if (!loading && session) {
    const from = (location.state as { from?: string } | null)?.from ?? "/"
    return <Navigate to={from} replace />
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true)
    if (mode === "sign-up") {
      const { error } = await signUp(values.email, values.password)
      setSubmitting(false)
      if (error) {
        toast.error("Couldn't create account", { description: error })
        return
      }
      setSignUpSuccess(true)
      reset()
      toast.success("Account created")
      return
    }
    const { error } = await signIn(values.email, values.password)
    setSubmitting(false)
    if (error) {
      toast.error("Couldn't sign in", { description: error })
      return
    }
    toast.success("Welcome back")
  }

  const onPasskeySignIn = async () => {
    setPasskeySubmitting(true)
    const { error } = await signInWithPasskey()
    setPasskeySubmitting(false)
    if (error) {
      toast.error("Couldn't sign in with passkey", { description: error })
      return
    }
    toast.success("Welcome back")
  }

  const toggleMode = () => {
    setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))
    setSignUpSuccess(false)
    reset()
  }

  return (
    <div
      className="bg-background flex min-h-svh items-center justify-center px-4 py-10 sm:p-6"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader className="items-center pt-6 text-center">
            <div className="bg-primary text-primary-foreground mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl">
              <Snowflake className="size-7" />
            </div>
            <CardTitle className="text-2xl font-bold">AcController</CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Sign in to control your AC"
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <AnimatePresence mode="wait">
              {signUpSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <CheckCircle2 className="text-success size-10" />
                  <p className="text-sm font-medium">Check your email to confirm your account</p>
                  <p className="text-muted-foreground text-xs">
                    We sent a confirmation link. Once confirmed, sign in below with the same
                    email and password.
                  </p>
                  <Button variant="outline" className="mt-2 w-full" onClick={toggleMode}>
                    Back to sign in
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key={mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[13px] font-semibold">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email webauthn"
                          placeholder="you@example.com"
                          className="h-12 pl-10"
                          aria-invalid={!!errors.email}
                          {...register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-destructive text-xs">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-[13px] font-semibold">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="password"
                          type="password"
                          autoComplete={mode === "sign-in" ? "current-password webauthn" : "new-password"}
                          placeholder="********"
                          className="h-12 pl-10"
                          aria-invalid={!!errors.password}
                          {...register("password")}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-destructive text-xs">{errors.password.message}</p>
                      )}
                    </div>

                    <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submitting}>
                      {submitting && <Loader2 className="size-4 animate-spin" />}
                      {mode === "sign-in" ? "Sign In" : "Create account"}
                    </Button>
                  </form>

                  {mode === "sign-in" && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="bg-border h-px flex-1" />
                        <span className="text-muted-foreground text-xs">or</span>
                        <div className="bg-border h-px flex-1" />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={onPasskeySignIn}
                        disabled={passkeySubmitting}
                        className="h-12 w-full text-base"
                      >
                        {passkeySubmitting ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <ScanFace className="size-5" />
                        )}
                        Sign in with a passkey
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
        {!signUpSuccess && (
          <p className="text-muted-foreground mt-6 text-center text-[13px]">
            {mode === "sign-in" ? "Don't have an account yet? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary cursor-pointer font-semibold"
            >
              {mode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}

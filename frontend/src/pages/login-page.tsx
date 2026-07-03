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
    <div className="bg-background relative flex min-h-svh items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="bg-primary/20 absolute top-1/4 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <Card className="border-border/60 backdrop-blur-sm">
          <CardHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground mb-2 flex size-12 items-center justify-center rounded-2xl shadow-sm">
              <Snowflake className="size-6" />
            </div>
            <CardTitle className="text-xl">AcController</CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Sign in to control your Carrier AC"
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {signUpSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <CheckCircle2 className="text-primary size-10" />
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email webauthn"
                          placeholder="you@example.com"
                          className="pl-9"
                          aria-invalid={!!errors.email}
                          {...register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-destructive text-xs">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="password"
                          type="password"
                          autoComplete={mode === "sign-in" ? "current-password webauthn" : "new-password"}
                          placeholder="********"
                          className="pl-9"
                          aria-invalid={!!errors.password}
                          {...register("password")}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-destructive text-xs">{errors.password.message}</p>
                      )}
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="size-4 animate-spin" />}
                      {mode === "sign-in" ? "Sign in" : "Create account"}
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
                        size="lg"
                        onClick={onPasskeySignIn}
                        disabled={passkeySubmitting}
                        className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-full shadow-sm"
                      >
                        {passkeySubmitting ? (
                          <Loader2 className="size-4 animate-spin" />
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
          <p className="text-muted-foreground mt-6 text-center text-xs">
            {mode === "sign-in" ? "Don't have an account yet? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-foreground font-medium underline underline-offset-4"
            >
              {mode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}

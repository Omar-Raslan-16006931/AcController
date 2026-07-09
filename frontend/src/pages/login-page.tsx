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
    // No bg-background here: BackgroundPixelStars is mounted once at the
    // App.tsx root and needs this page to stay transparent to show through
    // (the card itself is already translucent via backdrop-blur-sm).
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10 sm:p-6">
      <div
        aria-hidden
        className="bg-glow-orb absolute top-[18%] left-1/2 size-[26rem] -translate-x-1/2 blur-3xl sm:size-[36rem]"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <Card className="card-glow border backdrop-blur-sm">
          <CardHeader className="items-center pt-8 text-center">
            <div className="brand-gradient mb-2 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/25">
              <Snowflake className="size-7" />
            </div>
            <CardTitle className="text-2xl font-bold">AcController</CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Sign in to control your Carrier AC"
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <AnimatePresence mode="wait">
              {signUpSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <CheckCircle2 className="text-mint size-10" />
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
                  className="space-y-5"
                >
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="label-accent">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email webauthn"
                          placeholder="you@example.com"
                          className="bg-foreground/5 h-11 pl-9"
                          aria-invalid={!!errors.email}
                          {...register("email")}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-destructive text-xs">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="label-accent">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="password"
                          type="password"
                          autoComplete={mode === "sign-in" ? "current-password webauthn" : "new-password"}
                          placeholder="********"
                          className="bg-foreground/5 h-11 pl-9"
                          aria-invalid={!!errors.password}
                          {...register("password")}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-destructive text-xs">{errors.password.message}</p>
                      )}
                    </div>

                    <Button type="submit" variant="brand" size="lg" className="h-12 w-full text-base" disabled={submitting}>
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
                        className="border-mint/40 text-mint hover:bg-mint/10 h-12 w-full text-base"
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

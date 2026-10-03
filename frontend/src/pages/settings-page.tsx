import * as React from "react"
import { Link } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ChevronRight, Cpu, History, Loader2, LogOut, Plus, Radar, Save, ScanFace, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { BackgroundCard } from "@/features/settings/background-card"
import { NotificationTestCard } from "@/features/settings/notification-test-card"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings, useUpdateSettings } from "@/features/settings/use-settings"
import {
  usePasskeys,
  useRegisterPasskey,
  useDeletePasskey,
  type Passkey,
} from "@/features/settings/use-passkeys"
import { useTheme } from "@/context/theme-context"
import { modeOrder, fanOrder, modeConfig, fanConfig } from "@/lib/ac-labels"
import { getTimezoneOptions } from "@/lib/timezones"

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1),
  language: z.string().min(1),
  // Restricted to exactly what the real Carrier hardware supports (see
  // ac-labels.ts) — carrier_frequency/duty_cycle/gpio_pin were removed
  // entirely since the production CarrierAC library ignores them.
  default_temperature: z.coerce.number().min(20).max(28),
  default_mode: z.enum(["cool", "heat", "dry"]),
  default_fan: z.enum(["eco", "low", "medium", "high"]),
})

type SettingsFormInput = z.input<typeof settingsSchema>
type SettingsFormOutput = z.output<typeof settingsSchema>

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "tr", label: "Türkçe" },
  { value: "ar", label: "العربية" },
]

function PasskeyRow({ passkey, onDelete, deleting }: { passkey: Passkey; onDelete: () => void; deleting: boolean }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <div className="bg-secondary flex items-center justify-between gap-3 rounded-[1rem] px-3 py-2">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <ScanFace className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{passkey.friendly_name ?? "Passkey"}</p>
          <p className="text-muted-foreground truncate text-[11px]">
            Added {format(new Date(passkey.created_at), "MMM d, yyyy")}
            {passkey.last_used_at &&
              ` · last used ${format(new Date(passkey.last_used_at), "MMM d, yyyy")}`}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={deleting}
        onClick={() => setConfirmOpen(true)}
        aria-label="Remove passkey"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this passkey?"
        description="You won't be able to sign in with this passkey anymore. This can't be undone."
        confirmLabel="Remove"
        onConfirm={onDelete}
      />
    </div>
  )
}

function PasskeysCard() {
  const { data: passkeys, isLoading } = usePasskeys()
  const registerPasskey = useRegisterPasskey()
  const deletePasskey = useDeletePasskey()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (passkeyId: string) => {
    setDeletingId(passkeyId)
    await deletePasskey.mutateAsync(passkeyId)
    setDeletingId(null)
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm">Passkeys</CardTitle>
          <CardDescription className="text-xs">
            Sign in with Face ID, Touch ID, Windows Hello, or a security key.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => registerPasskey.mutate()}
          disabled={registerPasskey.isPending}
          className="bg-foreground text-background hover:bg-foreground/90 h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs"
        >
          {registerPasskey.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          <div className="space-y-1.5">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                deleting={deletingId === passkey.id}
                onDelete={() => handleDelete(passkey.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No passkeys yet. Add one so you can sign in without typing a password.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const LINKS = [
  { to: "/history", icon: History, title: "History", sub: "Every command sent to the AC" },
  { to: "/detect", icon: Radar, title: "Detect & learn AC", sub: "Find a new AC's brand, or learn remote buttons" },
  { to: "/system", icon: Cpu, title: "System", sub: "Pi metrics, restart and shutdown" },
]

function LinksCard() {
  return (
    <div className="glass overflow-hidden rounded-[20px]">
      {LINKS.map((l, i) => {
        const Icon = l.icon
        return (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex min-h-[52px] items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-white/[0.06]",
              i > 0 && "border-t border-white/[0.07]"
            )}
          >
            <Icon className="text-ice size-[18px] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">{l.title}</p>
              <p className="text-muted-foreground truncate text-[11.5px]">{l.sub}</p>
            </div>
            <ChevronRight className="text-faint size-4" />
          </Link>
        )
      })}
    </div>
  )
}

function AccountCard() {
  const { user, signOut } = useAuth()
  return (
    <div className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">Account</p>
        <p className="text-muted-foreground truncate text-[11.5px]">{user?.email ?? "Signed in"}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-destructive flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold"
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const { setTheme } = useTheme()
  const timezones = React.useMemo(() => getTimezoneOptions(), [])

  const { register, handleSubmit, control } = useForm<SettingsFormInput, unknown, SettingsFormOutput>({
    resolver: zodResolver(settingsSchema),
    values: settings
      ? {
          theme: settings.theme,
          timezone: settings.timezone,
          language: settings.language,
          default_temperature: settings.default_temperature,
          default_mode: settings.default_mode,
          default_fan: settings.default_fan,
        }
      : undefined,
  })

  const onSubmit = handleSubmit((values) => {
    setTheme(values.theme)
    updateSettings.mutate(values)
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" description="Defaults, locale, and account security." />
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title="Settings"
        description="Defaults, locale, and account security."
        actions={
          <Button type="submit" size="sm" disabled={updateSettings.isPending} className="gap-1.5">
            {updateSettings.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
        }
      />

      <div className="flex flex-col gap-2.5">
        <BackgroundCard />
        <NotificationTestCard />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Locale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="language" className="text-xs">Language</Label>
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="language" className="h-11 w-full text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="timezone" className="text-xs">Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="timezone" className="h-11 w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-muted-foreground text-[11px]">Used to evaluate when schedules fire.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Default AC state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="default_temperature" className="text-xs">Default temperature (°C)</Label>
              <Input id="default_temperature" type="number" min={20} max={28} inputMode="numeric" className="h-11" {...register("default_temperature")} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="default_mode" className="text-xs">Mode</Label>
                <Controller
                  control={control}
                  name="default_mode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="default_mode" className="h-11 w-full text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {modeOrder.map((mode) => (
                          <SelectItem key={mode} value={mode}>{modeConfig[mode].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="default_fan" className="text-xs">Fan</Label>
                <Controller
                  control={control}
                  name="default_fan"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="default_fan" className="h-11 w-full text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fanOrder.map((fan) => (
                          <SelectItem key={fan} value={fan}>{fanConfig[fan].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <PasskeysCard />
        <LinksCard />
        <AccountCard />
      </div>
    </form>
  )
}

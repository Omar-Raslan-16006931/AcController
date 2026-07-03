import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Loader2, Plus, Save, ScanFace, Trash2 } from "lucide-react"

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
  default_fan: z.enum(["low", "medium", "high"]),
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
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
          <ScanFace className="text-muted-foreground size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{passkey.friendly_name ?? "Passkey"}</p>
          <p className="text-muted-foreground truncate text-xs">
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
        disabled={deleting}
        onClick={() => setConfirmOpen(true)}
        aria-label="Remove passkey"
      >
        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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
          <CardTitle className="text-base">Passkeys</CardTitle>
          <CardDescription>
            Sign in with Face ID, Touch ID, Windows Hello, or a security key instead of a
            password.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => registerPasskey.mutate()}
          disabled={registerPasskey.isPending}
          className="bg-foreground text-background hover:bg-foreground/90 shrink-0 gap-2 rounded-full"
        >
          {registerPasskey.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add passkey
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          <div className="space-y-2">
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
          <p className="text-muted-foreground text-sm">
            No passkeys yet. Add one so you can sign in without typing a password.
          </p>
        )}
      </CardContent>
    </Card>
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
        <PageHeader title="Settings" description="Theme, defaults, and account security." />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title="Settings"
        description="Theme, defaults, and account security."
        actions={
          <Button type="submit" disabled={updateSettings.isPending} className="gap-2">
            {updateSettings.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance &amp; locale</CardTitle>
            <CardDescription>How the app looks, and your timezone/language.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="theme">Theme</Label>
              <Controller
                control={control}
                name="theme"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="theme" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="timezone" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-muted-foreground text-xs">Used to evaluate when your schedules should fire.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">Language</Label>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="language" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default AC state</CardTitle>
            <CardDescription>Applied when turning the AC on without other instructions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="default_temperature">Default temperature (°C)</Label>
              <Input id="default_temperature" type="number" min={20} max={28} {...register("default_temperature")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_mode">Default mode</Label>
              <Controller
                control={control}
                name="default_mode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="default_mode" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {modeOrder.map((mode) => (
                        <SelectItem key={mode} value={mode}>{modeConfig[mode].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_fan">Default fan speed</Label>
              <Controller
                control={control}
                name="default_fan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="default_fan" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fanOrder.map((fan) => (
                        <SelectItem key={fan} value={fan}>{fanConfig[fan].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <PasskeysCard />
      </div>
    </form>
  )
}

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Save } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings, useUpdateSettings } from "@/features/settings/use-settings"
import { useTheme } from "@/context/theme-context"
import { modeOrder, fanOrder, modeConfig, fanConfig } from "@/lib/ac-labels"
import { getTimezoneOptions } from "@/lib/timezones"

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1),
  language: z.string().min(1),
  carrier_frequency: z.coerce.number().min(30000).max(56000),
  duty_cycle: z.coerce.number().min(0.01).max(1),
  gpio_pin: z.coerce.number().min(0).max(27),
  default_temperature: z.coerce.number().min(16).max(32),
  default_mode: z.enum(["cool", "heat", "dry", "fan", "eco"]),
  default_fan: z.enum(["low", "medium", "high", "auto"]),
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
          carrier_frequency: settings.carrier_frequency,
          duty_cycle: settings.duty_cycle,
          gpio_pin: settings.gpio_pin,
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
        <PageHeader title="Settings" description="Theme, defaults, and IR transmission parameters." />
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
        description="Theme, defaults, and IR transmission parameters."
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
              <Input id="default_temperature" type="number" min={16} max={32} {...register("default_temperature")} />
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">IR transmission</CardTitle>
            <CardDescription>
              Advanced — only change these if you know your AC's IR protocol parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="carrier_frequency">Carrier frequency (Hz)</Label>
              <Input id="carrier_frequency" type="number" min={30000} max={56000} {...register("carrier_frequency")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duty_cycle">Duty cycle</Label>
              <Input id="duty_cycle" type="number" step={0.01} min={0.01} max={1} {...register("duty_cycle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gpio_pin">GPIO pin</Label>
              <Input id="gpio_pin" type="number" min={0} max={27} {...register("gpio_pin")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

/**
 * Bridge to the native iOS app (Capacitor shell, see frontend/ios-native).
 *
 * The site is the same everywhere; inside the iOS app Capacitor injects
 * `window.Capacitor`, which lets us call the app's Swift plugin
 * ("LiveActivity") for the Dynamic Island and local notifications. In a
 * normal browser / home-screen web app every native call is skipped and
 * notifications fall back to the Web Notifications API.
 */
import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys"
import { useAuth } from "@/context/auth-context"
import { useStatus } from "@/features/dashboard/use-status"

interface CapacitorBridge {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  nativePromise?: (plugin: string, method: string, options?: unknown) => Promise<unknown>
  Plugins?: Record<string, Record<string, ((options?: unknown) => Promise<unknown>) | undefined> | undefined>
}

function bridge(): CapacitorBridge | undefined {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor
}

export function isNativeApp(): boolean {
  const cap = bridge()
  if (!cap) return false
  if (cap.isNativePlatform) return cap.isNativePlatform()
  return cap.getPlatform?.() === "ios"
}

async function callNative<T = unknown>(method: string, options: Record<string, unknown> = {}): Promise<T> {
  const cap = bridge()
  if (!cap) throw new Error("Not running in the iOS app")
  if (cap.nativePromise) return (await cap.nativePromise("LiveActivity", method, options)) as T
  const fn = cap.Plugins?.LiveActivity?.[method]
  if (fn) return (await fn(options)) as T
  throw new Error("The app's native plugin isn't available. Reinstall the latest .ipa.")
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Schedules a test notification `seconds` from now.
 * iOS app: a real local notification (shows even if the app is closed).
 * Web: the browser / home-screen Notification API (keep the page open).
 */
export async function sendTestNotification(seconds = 5): Promise<"native" | "web"> {
  const title = "AC Controller"
  const body = "Test notification. Notifications work."

  if (isNativeApp()) {
    await callNative("testNotification", { seconds, title, body })
    return "native"
  }

  if (!("Notification" in window)) {
    throw new Error("This browser can't show notifications. On iPhone, add the site to your Home Screen first.")
  }
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Allow them for this site in Settings.")
  }

  await new Promise((resolve) => window.setTimeout(resolve, seconds * 1000))
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registration) {
    await registration.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" })
  } else {
    new Notification(title, { body, icon: "/icons/icon-192.png" })
  }
  return "web"
}

/** Registers the tiny service worker the web notification path needs. */
export function registerServiceWorker() {
  if (isNativeApp() || !("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: notifications fall back to `new Notification()`.
    })
  })
}

// ---------------------------------------------------------------------------
// Live Activity (Dynamic Island + lock screen)
// ---------------------------------------------------------------------------

/** One-line diagnosis for Settings: why the island would or wouldn't show. */
export async function diagnoseLiveActivity(): Promise<string> {
  if (!bridge()) return "Not in the iOS app (Safari / home-screen version can't use the Dynamic Island)."
  if (!isNativeApp()) return "Capacitor found but not running natively."
  try {
    const res = await callNative<{ liveActivities?: boolean }>("availability")
    if (!res?.liveActivities) return "Live Activities are off: iPhone Settings > AC Controller > Live Activities."
    return "Ready. Turn the AC on or start a timer while the app is open."
  } catch (err) {
    return `This app build has no Dynamic Island support yet (${err instanceof Error ? err.message : String(err)}). Install the latest .ipa.`
  }
}

/** Starts a short demo activity (2 minute turn-off countdown) to test the island. */
export async function demoLiveActivity(): Promise<void> {
  await callNative("update", {
    room: "Bedroom",
    power: true,
    temperature: 22,
    mode: "cool",
    fan: "medium",
    timerAction: "turn_off",
    timerEnd: Date.now() + 2 * 60_000,
  })
}

interface PendingTimer {
  action: "turn_on" | "turn_off"
  fires_at: string
}

/**
 * Mirrors the AC into a Live Activity while the iOS app is open:
 *  - AC on, or a timer running  -> start / update the activity
 *  - AC off and no timer        -> end it
 * Timer countdowns keep ticking in the island on their own after the app
 * is closed (iOS counts down to the end time).
 */
export function useLiveActivitySync() {
  const native = React.useMemo(isNativeApp, [])
  const { user } = useAuth()
  const { data: status } = useStatus({ enabled: native })

  // Same cache entry as useTimers(), without opening a second realtime
  // channel for the same table.
  const { data: timers } = useQuery({
    queryKey: user ? queryKeys.timers(user.id) : ["timers", "anonymous"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timers")
        .select("*")
        .eq("status", "pending")
        .order("fires_at", { ascending: true })
      if (error) throw error
      return data as PendingTimer[]
    },
    enabled: native && !!user,
    refetchInterval: 30_000,
  })

  const last = React.useRef<string>("")

  React.useEffect(() => {
    if (!native || !status) return
    const ac = status.ac_state
    const next = (timers ?? []).find((t) => new Date(t.fires_at).getTime() > Date.now())

    const payload = {
      room: "Bedroom",
      power: ac.power,
      temperature: ac.temperature,
      mode: ac.mode,
      fan: ac.fan,
      timerAction: next?.action ?? null,
      timerEnd: next ? new Date(next.fires_at).getTime() : 0,
    }
    const wantActivity = ac.power || !!next
    const key = wantActivity ? JSON.stringify(payload) : "end"
    if (key === last.current) return
    last.current = key

    const run = wantActivity ? callNative("update", payload) : callNative("end")
    run.catch((err) => {
      // Never break the UI over the island; just allow a retry next change.
      last.current = ""
      console.warn("Live Activity:", err)
    })
  }, [native, status, timers])
}

import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 10_000,
      // Keep cached data around long enough to be persisted and reused on
      // the next app open.
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

/*
 * Instant start: the last AC state, week usage, timers and settings are
 * saved to localStorage and restored before the first render, so the app
 * opens showing real data immediately and refreshes it in the background
 * (stale-while-revalidate) instead of showing skeletons for seconds.
 */
const CACHE_KEY = "ac-controller-query-cache-v1"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const PERSISTED_ROOTS = new Set(["status", "ac-usage-detail", "timers", "settings", "schedules", "learn-buttons"])

function shouldPersist(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && PERSISTED_ROOTS.has(queryKey[0])
}

function restore() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { at: number; state: unknown }
    if (!saved?.at || Date.now() - saved.at > MAX_AGE_MS) return
    hydrate(queryClient, saved.state)
  } catch {
    window.localStorage.removeItem(CACHE_KEY)
  }
}

let saveTimer: number | undefined
function scheduleSave() {
  if (saveTimer !== undefined) return
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (q) => q.state.status === "success" && shouldPersist(q.queryKey),
      })
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), state }))
    } catch {
      // Storage full / private mode: persistence is a nice-to-have.
    }
  }, 1000)
}

if (typeof window !== "undefined") {
  restore()
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") scheduleSave()
  })
}

/** Called on sign-out so the next account never sees cached data. */
export function clearPersistedCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
  queryClient.clear()
}

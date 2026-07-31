/** Central registry of TanStack Query keys so invalidation stays consistent. */
export const queryKeys = {
  status: ["status"] as const,
  settings: (userId: string) => ["settings", userId] as const,
  schedules: (userId: string) => ["schedules", userId] as const,
  timers: (userId: string) => ["timers", userId] as const,
  history: (userId: string, params: object) =>
    ["history", userId, params] as const,
  passkeys: (userId: string) => ["passkeys", userId] as const,
  detectStatus: ["detect-status"] as const,
  detectCodes: ["detect-codes"] as const,
  detectSignals: ["detect-signals"] as const,
  learnStatus: ["learn-status"] as const,
  learnButtons: ["learn-buttons"] as const,
}

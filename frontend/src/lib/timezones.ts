export function getTimezoneOptions(): string[] {
  const globalIntl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  if (typeof globalIntl.supportedValuesOf === "function") {
    try {
      return globalIntl.supportedValuesOf("timeZone")
    } catch {
      // fall through to the curated list below
    }
  }
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Istanbul",
    "Africa/Cairo",
    "Africa/Lagos",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
  ]
}

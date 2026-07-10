/**
 * Rough energy/cost estimates for the Dashboard's analytics screen. These
 * are estimates of the AC's own consumption, not a reproduction of a real
 * electricity bill -- the app has no way to know the rest of the
 * household's usage, which is what Egypt's tariff bands are actually keyed
 * off of in a real bill.
 */

/** Typical average power draw of a residential split-unit AC across a mix
 * of fan speeds and compressor duty-cycling. Deliberately a single rough
 * constant rather than per-fan-speed wattages, since we don't have real
 * power-meter data to calibrate those against. */
const AC_AVERAGE_KW = 1.1

export function estimateKwh(onHours: number): number {
  return onHours * AC_AVERAGE_KW
}

export interface TariffBand {
  /** Upper bound of this band in kWh/month, or null for "and above". */
  upTo: number | null
  rate: number
}

/**
 * Egypt's official residential electricity tariff (EgyptERA), as of the
 * April 2026 update -- progressive/cumulative bands, i.e. a 120 kWh month
 * pays band 1's rate on the first 50 kWh, band 2's rate on the next 50,
 * and band 3's rate on the remaining 20. Tiers 1-6 unchanged since
 * September 2024; tier 7 (1000+ kWh) was raised from 2.23 to 2.58 EGP/kWh
 * by ministry decree on April 4, 2026.
 *
 * Madinaty is served by its own distributor ("Madinaty For Power", a
 * Talaat Moustafa Group company) rather than the national utility
 * directly, but retail electricity pricing in Egypt is set nationally by
 * EgyptERA regardless of which company distributes it locally -- there's
 * no public indication Madinaty bills at different per-kWh rates. If your
 * real bill shows different numbers, these bands are the thing to swap.
 */
export const EGYPT_RESIDENTIAL_TARIFF_2026: TariffBand[] = [
  { upTo: 50, rate: 0.68 },
  { upTo: 100, rate: 0.78 },
  { upTo: 200, rate: 0.95 },
  { upTo: 350, rate: 1.55 },
  { upTo: 650, rate: 1.95 },
  { upTo: 1000, rate: 2.1 },
  { upTo: null, rate: 2.58 },
]

/** Progressive cost for a given total kWh over one billing month. */
function progressiveMonthlyCost(kwh: number): number {
  let remaining = kwh
  let cost = 0
  let lowerBound = 0
  for (const band of EGYPT_RESIDENTIAL_TARIFF_2026) {
    const bandCap = band.upTo ?? Infinity
    const bandSize = bandCap - lowerBound
    const used = Math.min(remaining, bandSize)
    if (used > 0) {
      cost += used * band.rate
      remaining -= used
    }
    lowerBound = bandCap
    if (remaining <= 0) break
  }
  return cost
}

/**
 * Estimates EGP cost for `kwh` measured over `periodDays` days. Egypt's
 * tariff bands are a monthly cumulative scale, not a daily/weekly one, so
 * a weekly total can't be looked up in the table directly -- this
 * projects the week to a monthly-equivalent total to find the right
 * marginal tier, derives that tier's blended average rate, and applies it
 * back to the real (non-projected) kWh actually measured.
 */
export function estimateEgpCost(kwh: number, periodDays: number): number {
  if (kwh <= 0 || periodDays <= 0) return 0
  const monthlyEquivalent = kwh * (30 / periodDays)
  const monthlyEquivalentCost = progressiveMonthlyCost(monthlyEquivalent)
  const blendedRate = monthlyEquivalentCost / monthlyEquivalent
  return kwh * blendedRate
}

export function formatEgp(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
}

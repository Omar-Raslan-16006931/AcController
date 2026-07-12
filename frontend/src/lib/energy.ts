/**
 * Energy/cost estimates for the Dashboard's analytics screen. These are
 * estimates of the AC's own consumption/cost, not a reproduction of a real
 * electricity bill.
 */

/** Typical average power draw of a residential split-unit AC across a mix
 * of fan speeds and compressor duty-cycling. Used only for the "Energy"
 * (kWh) row -- deliberately a single rough constant rather than
 * per-fan-speed wattages, since there's no real power-meter data to
 * calibrate those against. */
const AC_AVERAGE_KW = 1.1

export function estimateKwh(onHours: number): number {
  return onHours * AC_AVERAGE_KW
}

/**
 * Real-world running cost as directly reported by the user: ~1 EGP per
 * hour of AC runtime. This is used instead of a modeled
 * kWh-through-tariff-bands estimate -- a directly observed rate is more
 * trustworthy than one derived from an assumed power draw run through
 * EgyptERA's progressive monthly tariff, since it already reflects
 * whatever the real marginal tariff tier and true power draw actually are
 * for this household. If the real per-hour cost changes (e.g. a tariff
 * update or a different AC unit), update this constant.
 */
const AC_HOURLY_COST_EGP = 1

export function estimateEgpCost(onHours: number): number {
  if (onHours <= 0) return 0
  return onHours * AC_HOURLY_COST_EGP
}

export function formatEgp(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
}

/**
 * The living background behind every screen: two slow-drifting glows in the
 * user's chosen colours (Settings > Background), a warm glow whose strength
 * the Remote page raises as the temperature goes up, a vignette and a fine
 * grain. Pure CSS (see .night-field in index.css), so it costs nothing.
 */
export function NightBackground() {
  return (
    <div className="night-field" aria-hidden>
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      <span className="vignette" />
      <span className="grain" />
    </div>
  )
}

/** Sets how much amber shows in the background (0 = none, 1 = full). */
export function setBackgroundWarmth(amount: number) {
  const clamped = Math.max(0, Math.min(1, amount))
  document.documentElement.style.setProperty("--bg-warm-opacity", String(0.06 + clamped * 0.55))
}

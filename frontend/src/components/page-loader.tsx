import { WifiLoader } from "@/components/ui/wifi-loader"

/**
 * Suspense fallback shown for the brief moment a lazy-loaded route chunk is
 * still downloading. Swapped the old skeleton-grid placeholder for the
 * wifi-style loading animation the user asked for.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pb-10">
      <WifiLoader text="Loading" />
    </div>
  )
}

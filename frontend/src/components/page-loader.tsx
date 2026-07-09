import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

/**
 * Suspense fallback shown for the brief moment a lazy-loaded route chunk is
 * still downloading. Replaced the wifi-loader concentric-arc animation with
 * a minimal spinner that simply fades in -- the wifi-loader component and
 * its CSS have been removed entirely.
 */
export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-[50vh] items-center justify-center pb-10"
    >
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
    </motion.div>
  )
}

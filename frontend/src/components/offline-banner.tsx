import { AnimatePresence, motion } from "framer-motion"
import { WifiOff } from "lucide-react"

import { useOnlineStatus } from "@/hooks/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="bg-destructive text-destructive-foreground flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <WifiOff className="size-4" />
            You&apos;re offline — reconnect to control your AC.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

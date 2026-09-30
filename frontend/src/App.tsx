import { RouterProvider } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { queryClient } from "@/lib/query-client"
import { ThemeProvider } from "@/context/theme-context"
import { AuthProvider } from "@/context/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/sonner"
import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars"
import { GlassFilter } from "@/components/ui/glass-filter"
import { router } from "@/routes/router"

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* Mounted once above the router so it covers /login too and
                never remounts on navigation. */}
            <BackgroundPixelStars />
            {/* Shared liquid-glass SVG filter (#container-glass) used by the
                navbar and glass Cards. */}
            <GlassFilter />
            <RouterProvider router={router} />
            <Toaster />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Core chrome (auth, router, query, radix, framer-motion) is shared by
    // every route, so it's intentionally kept in one vendor-ish bundle for
    // now. Route-level code (pages/*) is already split via React.lazy in
    // src/routes/router.tsx.
    chunkSizeWarningLimit: 1000,
  },
})

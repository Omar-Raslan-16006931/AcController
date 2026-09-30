import path from "node:path"
import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/**
 * Publishes the Pi's current backend URL as /pi-url.txt at build time.
 * The Pi's quick tunnel gets a new random address on every boot and pushes
 * it to Vercel (backend/scripts/sync_tunnel_url.sh), which rebuilds the
 * site -- so this file always holds the live address. iPhone Shortcuts read
 * it first, then call the Pi, and never need editing after a reboot.
 */
function piUrlFile(url: string | undefined): Plugin {
  return {
    name: "pi-url-file",
    apply: "build",
    generateBundle() {
      if (!url) return
      this.emitFile({ type: "asset", fileName: "pi-url.txt", source: url.replace(/\/+$/, "") })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const apiUrl = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL

  return {
    plugins: [react(), tailwindcss(), piUrlFile(apiUrl)],
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
  }
})

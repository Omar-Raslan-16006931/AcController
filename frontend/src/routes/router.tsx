import { createBrowserRouter } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { LoginPage } from "@/pages/login-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { lazyWithReload } from "@/lib/lazy-with-reload"

// Wrapped in lazyWithReload instead of plain lazy() -- after a new deploy,
// a tab left open on the old build will try to fetch a chunk hash that no
// longer exists; this catches that failure and does a one-time silent
// reload instead of showing a broken "text/html MIME type" error.
const DashboardPage = lazyWithReload(() =>
  import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage }))
)
const RemotePage = lazyWithReload(() =>
  import("@/pages/remote-page").then((m) => ({ default: m.RemotePage }))
)
const SchedulesPage = lazyWithReload(() =>
  import("@/pages/schedules-page").then((m) => ({ default: m.SchedulesPage }))
)
const HistoryPage = lazyWithReload(() =>
  import("@/pages/history-page").then((m) => ({ default: m.HistoryPage }))
)
const SettingsPage = lazyWithReload(() =>
  import("@/pages/settings-page").then((m) => ({ default: m.SettingsPage }))
)
// Not in the primary nav (kept out to keep the bottom menu to 5 items), but
// still a real route -- linked from the Settings page instead of removed
// outright, since deleting Pi diagnostics/restart/shutdown wasn't asked for.
const SystemPage = lazyWithReload(() =>
  import("@/pages/system-page").then((m) => ({ default: m.SystemPage }))
)

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "remote", element: <RemotePage /> },
      { path: "schedules", element: <SchedulesPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "system", element: <SystemPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])

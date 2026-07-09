import { createBrowserRouter } from "react-router-dom"
import { lazy } from "react"

import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { LoginPage } from "@/pages/login-page"
import { NotFoundPage } from "@/pages/not-found-page"

const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage }))
)
const RemotePage = lazy(() =>
  import("@/pages/remote-page").then((m) => ({ default: m.RemotePage }))
)
const SchedulesPage = lazy(() =>
  import("@/pages/schedules-page").then((m) => ({ default: m.SchedulesPage }))
)
const HistoryPage = lazy(() =>
  import("@/pages/history-page").then((m) => ({ default: m.HistoryPage }))
)
const SettingsPage = lazy(() =>
  import("@/pages/settings-page").then((m) => ({ default: m.SettingsPage }))
)
// Not in the primary nav (kept out to keep the bottom menu to 5 items), but
// still a real route -- linked from the Settings page instead of removed
// outright, since deleting Pi diagnostics/restart/shutdown wasn't asked for.
const SystemPage = lazy(() =>
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

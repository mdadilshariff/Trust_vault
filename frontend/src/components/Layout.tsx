import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'
import LiveTelemetryDrawer from './LiveTelemetryDrawer'

export default function Layout() {
  const [isActivityOpen, setIsActivityOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Unified Workspace Navigation */}
      <AppHeader
        onToggleActivity={() => setIsActivityOpen((v) => !v)}
        isActivityOpen={isActivityOpen}
      />

      {/* Main Content Workspace Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Live Stream Drawer */}
      <LiveTelemetryDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  )
}

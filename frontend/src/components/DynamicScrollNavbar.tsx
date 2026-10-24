import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Activity, Shield, Terminal, RefreshCw, Upload,
  Search, CheckCircle2, ChevronRight, Zap
} from 'lucide-react'
import { useEventStore } from '../store/events'
import { useAuthStore } from '../store/auth'

interface DynamicScrollNavbarProps {
  onToggleTelemetry?: () => void
  isTelemetryOpen?: boolean
}

export default function DynamicScrollNavbar({
  onToggleTelemetry,
  isTelemetryOpen = false,
}: DynamicScrollNavbarProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  const { events, isLive, totalOps, fetchLatestEvents } = useEventStore()
  
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Track dynamic scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolled(scrollY > 16)

      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100))
        setScrollProgress(progress)
      } else {
        setScrollProgress(0)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  // Periodic background telemetry refresh
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      fetchLatestEvents()
    }, 6000)
    return () => clearInterval(interval)
  }, [isLive, fetchLatestEvents])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await fetchLatestEvents()
    // Emit global signal for pages to refetch
    window.dispatchEvent(new CustomEvent('tv:data-changed', { detail: { action: 'MANUAL_SYNC' } }))
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Format breadcrumbs from path
  const pathParts = location.pathname.split('/').filter(Boolean)
  const getBreadcrumbTitle = (part: string) => {
    if (part === 'documents') return 'Documents'
    if (part === 'upload') return 'Upload'
    if (part === 'shared') return 'Shared with Me'
    if (part === 'audit') return 'Activity'
    if (part === 'admin') return 'Admin'
    if (part === 'users') return 'Users'
    if (part === 'integrity') return 'Security Check'
    if (part === 'dashboard') return 'Dashboard'
    if (part.length > 20) return `${part.substring(0, 8)}...`
    return part
  }

  const latestEvent = events[0]

  return (
    <header
      className={`sticky top-0 z-30 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 shadow-card py-2.5'
          : 'bg-zinc-950/40 backdrop-blur-xs border-b border-zinc-900 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        {/* Left: Dynamic Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-sans min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium">TrustVault</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />

          {pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'dashboard') ? (
            <span className="text-zinc-200 font-semibold truncate">Dashboard</span>
          ) : (
            pathParts.map((part, idx) => {
              const isLast = idx === pathParts.length - 1
              const path = `/${pathParts.slice(0, idx + 1).join('/')}`
              return (
                <div key={path} className="flex items-center gap-2 min-w-0">
                  {isLast ? (
                    <span className="text-zinc-200 font-semibold truncate">
                      {getBreadcrumbTitle(part)}
                    </span>
                  ) : (
                    <>
                      <Link
                        to={path}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors truncate"
                      >
                        {getBreadcrumbTitle(part)}
                      </Link>
                      <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Center: Live Flowing Activity Ticker (Compact & Simple) */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-sans">
          <div className="flex items-center gap-1.5">
            <span className="live-dot">
              <span className="live-dot-ping bg-emerald-400"></span>
              <span className="live-dot-core bg-emerald-400"></span>
            </span>
            <span className="text-emerald-400 font-medium">Live Activity</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-1.5 text-zinc-400 truncate max-w-xs">
            <span className="text-zinc-300 truncate">
              {latestEvent?.action ? latestEvent.action.replace(/_/g, ' ') : 'System idle'}
            </span>
          </div>
        </div>

        {/* Right: Dynamic Quick Actions & Stream Drawer Toggle */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Quick Refresh */}
          <button
            onClick={handleManualRefresh}
            title="Refresh data"
            className="p-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zinc-200' : ''}`} />
          </button>

          {/* Quick Upload action */}
          <Link
            to="/upload"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white text-xs font-sans transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload</span>
          </Link>

          {/* Activity Drawer Trigger */}
          <button
            onClick={onToggleTelemetry}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-sans transition-colors ${
              isTelemetryOpen
                ? 'bg-indigo-950/70 text-indigo-200 border-indigo-700/80 shadow-xs'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isTelemetryOpen ? 'text-indigo-400' : 'text-zinc-400'}`} />
            <span className="hidden md:inline">Activity</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">
              {events.length}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Scroll Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-transparent overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </header>
  )
}

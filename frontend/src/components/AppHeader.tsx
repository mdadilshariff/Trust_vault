import { useState, useEffect, useRef } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Shield, Lock, FileText, Upload, Share2, ClipboardList,
  Users, Activity, CheckSquare, Search, LogOut, ChevronDown,
  RefreshCw, CheckCircle2, ShieldCheck, X, Menu, Settings
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useEventStore } from '../store/events'
import { authApi } from '../api'

interface AppHeaderProps {
  onToggleActivity: () => void
  isActivityOpen: boolean
}

export default function AppHeader({ onToggleActivity, isActivityOpen }: AppHeaderProps) {
  const { user, setUser } = useAuthStore()
  const { events, fetchLatestEvents } = useEventStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const adminMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Track dynamic scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolled(scrollY > 12)
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollY / docHeight) * 100)))
      } else {
        setScrollProgress(0)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false)
    setAdminMenuOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setMobileMenuOpen(false)
        setUserMenuOpen(false)
        setAdminMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      navigate('/login')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLatestEvents()
    window.dispatchEvent(new CustomEvent('tv:data-changed', { detail: { action: 'MANUAL_SYNC' } }))
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/documents?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Shield },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/shared', label: 'Shared with Me', icon: Share2 },
    { to: '/audit/my', label: 'Activity Log', icon: ClipboardList },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Overview & Telemetry', icon: ShieldCheck, desc: 'System stats and health', end: true },
    { to: '/admin/users', label: 'User Directory', icon: Users, desc: 'Manage accounts & roles' },
    { to: '/admin/audit', label: 'Audit Ledger', icon: Activity, desc: 'Complete historical logs' },
    { to: '/admin/integrity', label: 'Security & Chain Check', icon: CheckSquare, desc: 'Cryptographic verification' },
  ]

  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-zinc-950/90 backdrop-blur-md border-zinc-850 shadow-md'
            : 'bg-zinc-950/80 backdrop-blur-sm border-zinc-800/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand Identity & Status */}
            <div className="flex items-center gap-3.5 flex-shrink-0">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/70 border border-indigo-700/60 flex items-center justify-center text-indigo-300 shadow-xs group-hover:border-indigo-500/80 group-hover:bg-indigo-950 transition-all">
                  <Lock className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                      TrustVault
                    </span>
                    <span className="badge-indigo text-[10px] py-0 px-1.5 font-mono">
                      v2.4
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-sans hidden sm:block">
                    Zero-Trust Workspace
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Primary Navigation & Clean Admin Console Dropdown */}
            <nav className="hidden lg:flex items-center gap-1.5 bg-zinc-900/70 p-1.5 rounded-xl border border-zinc-800/80 text-xs font-sans">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-lg transition-all duration-150 font-medium ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}

              {/* Clean Admin Dropdown (Prevents horizontal cramping) */}
              {user?.role === 'admin' && (
                <div className="relative pl-1.5 border-l border-zinc-800 ml-1" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((v) => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isAdminRoute || adminMenuOpen
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/70 shadow-xs'
                        : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/40'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin Console</span>
                    <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Admin Popover Menu */}
                  {adminMenuOpen && (
                    <div className="absolute left-0 mt-2.5 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-sans">
                          Administrative Tools
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Elevated security controls & system logs
                        </p>
                      </div>

                      <div className="space-y-1">
                        {adminLinks.map(({ to, label, icon: Icon, desc, end }) => {
                          const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                          return (
                            <Link
                              key={to}
                              to={to}
                              onClick={() => setAdminMenuOpen(false)}
                              className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-amber-950/40 text-amber-200 border border-amber-800/50'
                                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-400">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-xs block">{label}</span>
                                <span className="text-[11px] text-zinc-500 block truncate">{desc}</span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Right: Tools & Utilities Cluster (Uniform Heights & Neatly Padded) */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Quick Search Trigger */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2.5 h-9 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors shadow-xs"
                title="Search vault (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] text-zinc-400 hidden xl:inline">Search vault...</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                  ⌘K
                </kbd>
              </button>

              {/* Cryptographic Chain Status Badge */}
              <Link
                to="/admin/integrity"
                className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-800/60 text-xs text-zinc-300 transition-colors shadow-xs"
                title="Cryptographic chain status: Verified"
              >
                <span className="live-dot">
                  <span className="live-dot-ping bg-emerald-400"></span>
                  <span className="live-dot-core bg-emerald-400"></span>
                </span>
                <span className="text-emerald-400 font-semibold text-xs">Secured</span>
              </Link>

              {/* Refresh Feed */}
              <button
                onClick={handleRefresh}
                title="Sync latest records"
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zinc-100' : ''}`} />
              </button>

              {/* Live Activity Drawer Toggle */}
              <button
                onClick={onToggleActivity}
                className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-medium transition-all shadow-xs ${
                  isActivityOpen
                    ? 'bg-indigo-950/80 text-indigo-200 border-indigo-700/80'
                    : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
                title="Toggle live event stream"
              >
                <Activity className={`w-3.5 h-3.5 ${isActivityOpen ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Feed</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">
                  {events.length}
                </span>
              </button>

              {/* User Profile Popover */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 h-9 pl-2 pr-2.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 flex items-center justify-center text-xs font-bold shadow-xs">
                    {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-2.5 border-b border-zinc-800 mb-1">
                      <p className="font-semibold text-zinc-100 truncate text-xs">{user?.full_name}</p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{user?.email}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[10px] font-medium ${user?.role === 'admin' ? 'badge-amber' : 'badge-indigo'}`}>
                          {user?.role === 'admin' ? 'Administrator' : 'Standard Member'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        to="/documents"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/60 text-zinc-300 hover:text-white transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        <span>My Documents</span>
                      </Link>

                      <Link
                        to="/audit/my"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/60 text-zinc-300 hover:text-white transition-colors"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-zinc-400" />
                        <span>My Activity Log</span>
                      </Link>
                    </div>

                    <div className="border-t border-zinc-800 my-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
                title="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Scroll Progress Bar */}
        <div className="w-full h-[1.5px] bg-transparent overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-75"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Responsive Mobile Drawer Menu (Spacious, No Confusion) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
            {/* Quick Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs py-2"
              />
            </form>

            {/* Main Navigation Group */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3">
                Workspace Navigation
              </span>
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800/40 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            {/* Admin Controls Group (Mobile) */}
            {user?.role === 'admin' && (
              <div className="space-y-1 pt-3 border-t border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-3">
                  Administrative Suite
                </span>
                {adminLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                          : 'text-zinc-300 hover:bg-zinc-800/40 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Quick Search Modal (Ctrl/Cmd + K) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-3.5">
              <div className="flex items-center gap-2.5 text-zinc-200 font-semibold text-xs">
                <div className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-300 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <span>Search Document Vault</span>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3.5">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type document title, filename, or category..."
                className="input text-sm py-2.5"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span>Press Enter to search vault catalog</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[10px]">
                  ESC to close
                </kbd>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

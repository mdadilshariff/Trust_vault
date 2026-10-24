import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, LayoutDashboard, FileText, Upload, Users,
  Share2, ClipboardList, LogOut, Activity, CheckSquare,
  Terminal, Lock
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { authApi } from '../api'

export default function Sidebar() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      navigate('/login')
    }
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/shared', icon: Share2, label: 'Shared with Me' },
    { to: '/audit/my', icon: ClipboardList, label: 'Activity Log' },
  ]

  const adminItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/audit', icon: Activity, label: 'All Activity' },
    { to: '/admin/integrity', icon: CheckSquare, label: 'Security Check' },
  ]

  return (
    <aside className="w-64 h-screen bg-zinc-950 border-r border-zinc-800/80 flex flex-col fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-indigo-950/70 border border-indigo-700/50 flex items-center justify-center text-indigo-300 shadow-xs">
            <Lock className="w-4 h-4 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-bold text-sm tracking-tight font-sans">
                TrustVault
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                v2.4
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="live-dot">
                <span className="live-dot-ping bg-emerald-400"></span>
                <span className="live-dot-core bg-emerald-400"></span>
              </span>
              <span className="text-emerald-400 text-[11px] font-sans font-medium">
                Verified Cloud
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 pb-2 text-[11px] font-sans font-semibold text-zinc-500 uppercase tracking-wider">
            Workspace
          </p>
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-sans transition-colors ${
                    isActive
                      ? 'bg-indigo-950/40 text-indigo-200 font-medium border-l-2 border-indigo-500 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {user?.role === 'admin' && (
          <div>
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-[11px] font-sans font-semibold text-zinc-500 uppercase tracking-wider">
                Admin
              </p>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                ADMIN
              </span>
            </div>
            <div className="space-y-0.5">
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-sans transition-colors ${
                      isActive
                        ? 'bg-indigo-950/40 text-indigo-200 font-medium border-l-2 border-indigo-500 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/60">
        <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-300 font-sans text-xs font-bold flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-zinc-200 text-xs font-medium truncate font-sans">
                  {user?.full_name}
                </p>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 uppercase">
                  {user?.role}
                </span>
              </div>
              <p className="text-zinc-500 text-[11px] truncate font-sans mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-sans text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

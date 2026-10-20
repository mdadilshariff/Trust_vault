import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, LayoutDashboard, FileText, Upload, Users,
  Share2, ClipboardList, Settings, LogOut, Activity,
  CheckSquare,
} from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { authApi } from '../api'
import toast from 'react-hot-toast'

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
    { to: '/documents', icon: FileText, label: 'My Documents' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/shared', icon: Share2, label: 'Shared With Me' },
    { to: '/audit/my', icon: ClipboardList, label: 'My Activity' },
  ]

  const adminItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/audit', icon: Activity, label: 'Audit Log' },
    { to: '/admin/integrity', icon: CheckSquare, label: 'Integrity Check' },
  ]

  return (
    <aside className="w-64 h-screen bg-navy-950 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/25 transition-transform hover:scale-105 duration-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">TrustVault</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="live-dot">
                <span className="live-dot-ping"></span>
                <span className="live-dot-core"></span>
              </span>
              <p className="text-navy-400 text-[11px] font-medium tracking-wide uppercase">Encrypted Vault</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/20 text-accent-light shadow-xs'
                  : 'text-navy-300 hover:bg-navy-900/80 hover:text-white hover:translate-x-0.5'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="pt-5 pb-1 px-3">
              <p className="text-[11px] font-semibold text-navy-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-accent/20 text-accent-light shadow-xs'
                      : 'text-navy-300 hover:bg-navy-900/80 hover:text-white hover:translate-x-0.5'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-navy-800/80 bg-navy-950/40 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light text-sm font-bold flex-shrink-0 shadow-inner">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tracking-wider uppercase ${
                user?.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-slate-700/40 text-slate-300'
              }`}>
                {user?.role}
              </span>
            </div>
            <p className="text-navy-400 text-xs truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-navy-300 hover:bg-navy-900 hover:text-white transition-all active:scale-[0.98] border border-navy-800/60"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

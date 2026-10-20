import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Shield, UserX, UserCheck, Trash2, Mail, Calendar } from 'lucide-react'
import { adminApi } from '../api'
import type { User } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth'

export default function UserManagementPage() {
  const { user: me } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.users({ q: q || undefined })
      setUsers(r.data)
    } catch {}
    setLoading(false)
  }, [q])

  useEffect(() => { load() }, [load])

  const toggleActive = async (u: User) => {
    if (u.id === me?.id && u.is_active) {
      toast.error('Cannot deactivate your own administrator account.')
      return
    }
    try {
      const r = await adminApi.updateUser(u.id, { is_active: !u.is_active })
      setUsers(us => us.map(x => x.id === u.id ? r.data : x))
      toast.success(`Account for ${r.data.username} ${r.data.is_active ? 'activated' : 'deactivated'}.`)
    } catch {
      toast.error('Failed to update account status.')
    }
  }

  const toggleRole = async (u: User) => {
    if (u.id === me?.id) {
      toast.error('Cannot modify your own administrative role.')
      return
    }
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change ${u.username}'s role to ${newRole.toUpperCase()}?`)) return
    try {
      const r = await adminApi.updateUser(u.id, { role: newRole })
      setUsers(us => us.map(x => x.id === u.id ? r.data : x))
      toast.success(`Privilege level updated: ${u.username} is now ${newRole}.`)
    } catch {
      toast.error('Failed to change role.')
    }
  }

  const handleDelete = async (u: User) => {
    if (u.id === me?.id) {
      toast.error('Cannot purge your own account.')
      return
    }
    if (!confirm(`Permanently purge ${u.username}? All owned vault documents and ACL records will be removed.`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers(us => us.filter(x => x.id !== u.id))
      toast.success(`User ${u.username} purged.`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Purge failed.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800">User Identity & Access</h1>
            <span className="badge-blue text-[11px] font-mono">
              {users.length} {users.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Provision roles, manage account lifecycles, and control security status
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="card-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-10 pr-9 text-xs"
            placeholder="Search accounts by username, email, or full name…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading user directory...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-16 px-4">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-800 mb-1">No users matched</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
            No accounts found matching "{q}".
          </p>
          <button onClick={() => setQ('')} className="btn-secondary text-xs inline-flex">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border border-slate-200/70 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th className="table-header">Identity</th>
                <th className="table-header hidden md:table-cell">Role</th>
                <th className="table-header hidden sm:table-cell">Account Status</th>
                <th className="table-header hidden lg:table-cell">Provisioned Date</th>
                <th className="table-header text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                        {u.full_name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {u.full_name}
                          </p>
                          {u.id === me?.id && (
                            <span className="badge-blue text-[9px] py-0 px-1.5 uppercase font-mono">You</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-medium text-slate-500">@{u.username}</span>
                          <span>•</span>
                          <span className="font-mono truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span
                      className={`badge text-[10px] uppercase font-mono font-semibold ${
                        u.role === 'admin' ? 'badge-blue' : 'badge-gray'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span
                      className={`badge text-[10px] uppercase font-mono font-semibold ${
                        u.is_active ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-400 font-mono hidden lg:table-cell">
                    {format(new Date(u.created_at), 'yyyy-MM-dd')}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={u.id === me?.id}
                        className={`btn-ghost p-2 rounded-lg ${
                          u.is_active
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        } disabled:opacity-30`}
                        title={u.is_active ? 'Deactivate account' : 'Reactivate account'}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => toggleRole(u)}
                        disabled={u.id === me?.id}
                        className="btn-ghost p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-30"
                        title={u.role === 'admin' ? 'Demote to regular user' : 'Promote to admin'}
                      >
                        <Shield className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === me?.id}
                        className="btn-ghost p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                        title="Purge user account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

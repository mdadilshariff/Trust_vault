import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Shield, UserX, UserCheck, Trash2 } from 'lucide-react'
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
    try {
      const r = await adminApi.updateUser(u.id, { is_active: !u.is_active })
      setUsers(us => us.map(x => x.id === u.id ? r.data : x))
      toast.success(`User ${r.data.is_active ? 'activated' : 'deactivated'}.`)
    } catch { toast.error('Update failed.') }
  }

  const toggleRole = async (u: User) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change ${u.username}'s role to ${newRole}?`)) return
    try {
      const r = await adminApi.updateUser(u.id, { role: newRole })
      setUsers(us => us.map(x => x.id === u.id ? r.data : x))
      toast.success(`Role updated to ${newRole}.`)
    } catch { toast.error('Update failed.') }
  }

  const handleDelete = async (u: User) => {
    if (u.id === me?.id) { toast.error('Cannot delete your own account.'); return }
    if (!confirm(`Permanently delete ${u.username}? All their documents will also be deleted.`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers(us => us.filter(x => x.id !== u.id))
      toast.success('User deleted.')
    } catch (e: any) { toast.error(e.response?.data?.detail ?? 'Delete failed.') }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage accounts, roles, and access.</p>
      </div>

      <div className="card-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search users by email or username…" value={q}
            onChange={e => { setQ(e.target.value) }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 table-header">User</th>
                <th className="text-left px-4 py-3 table-header hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 table-header hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 table-header hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {u.full_name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{u.full_name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={u.role === 'admin' ? 'badge-blue' : 'badge-gray'}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                      {u.is_active ? 'active' : 'disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                    {format(new Date(u.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleActive(u)}
                        className={`btn-ghost p-1.5 ${u.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        title={u.is_active ? 'Disable' : 'Enable'}>
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleRole(u)}
                        className="btn-ghost p-1.5 text-blue-500 hover:bg-blue-50"
                        title={`Make ${u.role === 'admin' ? 'user' : 'admin'}`}
                        disabled={u.id === me?.id}>
                        <Shield className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u)}
                        className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                        disabled={u.id === me?.id}
                        title="Delete">
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

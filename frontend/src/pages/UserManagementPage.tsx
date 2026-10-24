import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Users, Search, Shield, UserX, UserCheck, Trash2, Check,
  ShieldAlert, UserCheck2, RefreshCw, KeyRound, Mail, Sparkles
} from 'lucide-react'
import { adminApi } from '../api'
import type { User } from '../types'
import { format } from 'date-fns'
import { useAuthStore } from '../store/auth'
import { emitAppUpdate } from '../store/events'
import toast from 'react-hot-toast'

export default function UserManagementPage() {
  const { user: me } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.users({ q: q || undefined })
      setUsers(r.data)
    } catch {}
    setLoading(false)
  }, [q])

  useEffect(() => {
    load()

    const handler = () => load()
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [load])

  const toggleActive = async (u: User) => {
    if (u.id === me?.id && u.is_active) {
      toast.error('You cannot deactivate your own account.')
      return
    }
    try {
      const r = await adminApi.updateUser(u.id, { is_active: !u.is_active })
      setUsers((us) => us.map((x) => (x.id === u.id ? r.data : x)))
      emitAppUpdate({
        action: r.data.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        resource: u.id,
        outcome: 'success',
        details: `Account for ${r.data.username} set to ${r.data.is_active ? 'active' : 'inactive'}.`,
      })
      toast.success(`User ${r.data.username} ${r.data.is_active ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update account status.')
    }
  }

  const toggleRole = async (u: User) => {
    if (u.id === me?.id) {
      toast.error('You cannot change your own role.')
      return
    }
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    const roleLabel = newRole === 'admin' ? 'Administrator' : 'Standard Member'
    if (!confirm(`Change ${u.username}'s authorization level to ${roleLabel}?`)) return
    try {
      const r = await adminApi.updateUser(u.id, { role: newRole })
      setUsers((us) => us.map((x) => (x.id === u.id ? r.data : x)))
      emitAppUpdate({
        action: 'USER_ROLE_CHANGED',
        resource: u.id,
        outcome: 'success',
        details: `Role for ${u.username} set to ${roleLabel}.`,
      })
      toast.success(`Role updated: ${u.username} is now ${newRole === 'admin' ? 'an Administrator' : 'a Member'}`)
    } catch {
      toast.error('Failed to modify role.')
    }
  }

  const handleDelete = async (u: User) => {
    if (u.id === me?.id) {
      toast.error('You cannot delete your own account.')
      return
    }
    if (!confirm(`Are you sure you want to delete ${u.username}? This permanently removes all access.`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers((us) => us.filter((x) => x.id !== u.id))
      emitAppUpdate({
        action: 'USER_DELETED',
        resource: u.id,
        outcome: 'success',
        details: `Deleted user account "${u.username}".`,
      })
      toast.success(`Account ${u.username} permanently removed`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Delete failed.')
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      return true
    })
  }, [users, roleFilter])

  const adminCount = users.filter((u) => u.role === 'admin').length
  const memberCount = users.filter((u) => u.role === 'user').length
  const activeCount = users.filter((u) => u.is_active).length

  return (
    <div className="space-y-6 font-sans">
      {/* Top Command Header */}
      <div className="panel p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                User Accounts & Access Control
              </h1>
              <span className="badge-indigo text-[10px]">
                {users.length} Registered Accounts
              </span>
              <span className="badge-emerald text-[10px]">
                RBAC Active
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
              Directory of system accounts, role privilege delegations, and identity status. Administrative actions take effect across active sessions immediately.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => load()}
              disabled={loading}
              className="btn-secondary text-xs"
              title="Refresh directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Directory KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Total Accounts</span>
            <span className="text-lg font-bold text-zinc-100 tracking-tight font-sans mt-0.5 block">
              {users.length}
            </span>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Administrators</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-amber-300 tracking-tight font-sans">
                {adminCount}
              </span>
              <span className="badge-amber text-[9px] py-0 px-1">Elevated</span>
            </div>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Standard Members</span>
            <span className="text-lg font-bold text-indigo-300 tracking-tight font-sans mt-0.5 block">
              {memberCount}
            </span>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Active Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-emerald-400 tracking-tight font-sans">
                {activeCount}
              </span>
              <span className="text-[10px] text-zinc-500 font-sans">/ {users.length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel-subtle p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            className="input pl-9 text-xs"
            placeholder="Search by full name, username, or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Segmented Filter */}
        <div className="segmented-control w-full md:w-auto">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'admin', label: 'Admins' },
            { id: 'user', label: 'Members' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id as any)}
              className={`segmented-item text-xs ${roleFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="panel p-16 flex flex-col items-center justify-center space-y-3 text-xs text-zinc-500">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
          <p>Querying directory records...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="panel p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-500 mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-200 text-sm mb-1">No user accounts found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4 font-sans">
            No accounts matched your active search query or filter.
          </p>
          <button
            onClick={() => {
              setQ('')
              setRoleFilter('all')
            }}
            className="btn-secondary text-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="panel p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Account Member</th>
                  <th className="py-3 px-4 hidden md:table-cell">Role Privilege</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Account Created</th>
                  <th className="py-3 px-4 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === me?.id
                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors group">
                      {/* Identity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                              u.role === 'admin'
                                ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                                : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
                            }`}
                          >
                            {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-100 truncate text-xs">
                                {u.full_name}
                              </span>
                              {isCurrent && (
                                <span className="badge-indigo text-[9px] py-0 px-1.5 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-sans mt-0.5">
                              <span className="text-zinc-500 font-mono">@{u.username}</span>
                              <span className="text-zinc-600">•</span>
                              <span className="truncate text-zinc-400">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {u.role === 'admin' ? (
                          <span className="badge-amber inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <Shield className="w-3 h-3 text-amber-400" />
                            Administrator
                          </span>
                        ) : (
                          <span className="badge-indigo inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <Users className="w-3 h-3 text-indigo-400" />
                            Standard Member
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {u.is_active ? (
                          <span className="badge-emerald inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="badge-rose inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-zinc-400 text-xs hidden lg:table-cell">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={isCurrent}
                            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title={
                              isCurrent
                                ? 'Cannot modify active state of current account'
                                : u.is_active
                                ? 'Deactivate user'
                                : 'Activate user'
                            }
                          >
                            {u.is_active ? (
                              <UserX className="w-3.5 h-3.5 text-zinc-400 hover:text-amber-400" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>

                          <button
                            onClick={() => toggleRole(u)}
                            disabled={isCurrent}
                            className="p-1.5 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title={
                              isCurrent
                                ? 'Cannot modify own administrative role'
                                : u.role === 'admin'
                                ? 'Demote to regular user'
                                : 'Promote to administrator'
                            }
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete user account'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-800/80 text-xs text-zinc-500 font-sans">
            Displaying {filteredUsers.length} of {users.length} registered accounts
          </div>
        </div>
      )}
    </div>
  )
}

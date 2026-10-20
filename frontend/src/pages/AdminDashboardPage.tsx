import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, FileText, AlertTriangle, ShieldCheck, Activity, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { adminApi } from '../api'
import type { AdminStats } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats().then(r => { setStats(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!stats) return <p className="text-red-500">Failed to load stats.</p>

  const { valid, checked } = stats.audit_integrity

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">System overview — all metrics are live from the database.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Users className="w-6 h-6 text-blue-600" />, label: 'Total Users', value: stats.user_count, bg: 'bg-blue-50', to: '/admin/users' },
          { icon: <FileText className="w-6 h-6 text-accent" />, label: 'Total Documents', value: stats.document_count, bg: 'bg-accent/10', to: '/documents' },
          { icon: <AlertTriangle className="w-6 h-6 text-red-500" />, label: 'Denied Attempts', value: stats.denied_attempt_count, bg: 'bg-red-50', to: '/admin/audit' },
          { icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />, label: 'Audit Events', value: checked, bg: 'bg-emerald-50', to: '/admin/audit' },
        ].map(({ icon, label, value, bg, to }) => (
          <Link key={label} to={to} className="card hover:shadow-card-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{value.toLocaleString()}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Audit integrity */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" /> Audit Chain Integrity
          </h2>
          <Link to="/admin/integrity" className="text-sm text-accent hover:underline flex items-center gap-1">
            Full report <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className={`flex items-center gap-3 p-4 rounded-lg ${valid ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          {valid
            ? <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            : <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${valid ? 'text-emerald-700' : 'text-red-700'}`}>
              {valid ? `Chain intact — ${checked} events verified` : `Chain broken at sequence ${stats.audit_integrity.broken_at}`}
            </p>
            {!valid && <p className="text-xs text-red-500 mt-0.5">Reason: {stats.audit_integrity.reason}</p>}
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> Recent System Events
          </h2>
          <Link to="/admin/audit" className="text-sm text-accent hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {stats.recent_events.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <span className={`badge flex-shrink-0 ${e.outcome === 'success' ? 'badge-green' : e.outcome === 'denied' ? 'badge-red' : 'badge-yellow'}`}>
                {e.outcome}
              </span>
              <p className="font-mono text-xs text-slate-600 flex-1 truncate">{e.action}</p>
              <p className="text-xs text-slate-400 truncate flex-shrink-0 hidden sm:block">{e.actor_email ?? 'anon'}</p>
              <p className="text-xs text-slate-300 flex-shrink-0">
                {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FileText, AlertTriangle, ShieldCheck, Activity,
  CheckCircle2, XCircle, ArrowRight, ShieldAlert, Database, Lock
} from 'lucide-react'
import { adminApi } from '../api'
import type { AdminStats } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats()
      .then(r => { setStats(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Aggregating system security metrics...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card text-center py-16 border-red-200">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800">Telemetry Unavailable</h3>
        <p className="text-sm text-slate-500 mt-1">Failed to query live administrative metrics from database.</p>
      </div>
    )
  }

  const { valid, checked } = stats.audit_integrity

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Live Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800">Admin Control Center</h1>
            <span className="badge-blue text-[11px] font-mono">Privileged Tier</span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time security governance, access control audit, and cryptographic verification
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
          <span className="live-dot"><span className="live-dot-ping"></span><span className="live-dot-core"></span></span>
          <span className="text-xs font-semibold text-slate-700">Database Engine Live</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Users className="w-6 h-6 text-blue-600" />,
            label: 'Total Users',
            value: stats.user_count,
            bg: 'bg-blue-50 text-blue-600',
            border: 'hover:border-blue-200',
            to: '/admin/users',
            desc: 'Registered accounts'
          },
          {
            icon: <FileText className="w-6 h-6 text-accent" />,
            label: 'Vault Documents',
            value: stats.document_count,
            bg: 'bg-accent/10 text-accent',
            border: 'hover:border-accent/30',
            to: '/documents',
            desc: 'Confidential assets'
          },
          {
            icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
            label: 'Denied Attempts',
            value: stats.denied_attempt_count,
            bg: 'bg-amber-50 text-amber-600',
            border: 'hover:border-amber-200',
            to: '/admin/audit',
            desc: 'ACL blocks logged'
          },
          {
            icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
            label: 'Audit Events',
            value: checked,
            bg: 'bg-emerald-50 text-emerald-600',
            border: 'hover:border-emerald-200',
            to: '/admin/integrity',
            desc: 'SHA-256 sealed blocks'
          },
        ].map(({ icon, label, value, bg, border, to, desc }) => (
          <Link
            key={label}
            to={to}
            className={`card-interactive p-5 group flex flex-col justify-between ${border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {label}
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform duration-200 shadow-xs`}>
                {icon}
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-800 tracking-tight font-mono">
                {value.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Cryptographic Chain Integrity Card */}
      <div className="card space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-slate-800 text-sm">Cryptographic Audit Chain Integrity</h2>
          </div>
          <Link
            to="/admin/integrity"
            className="text-xs font-semibold text-accent hover:text-accent-dark inline-flex items-center gap-1 group"
          >
            <span>Inspect Chain Report</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div
          className={`flex items-start sm:items-center justify-between gap-4 p-4 rounded-xl border ${
            valid
              ? 'bg-emerald-50/70 border-emerald-200/80'
              : 'bg-red-50/70 border-red-200/80'
          }`}
        >
          <div className="flex items-center gap-3.5">
            {valid ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className={`font-bold text-sm ${valid ? 'text-emerald-800' : 'text-red-800'}`}>
                {valid ? `Mathematical Chain Verified (${checked} events checked)` : `Integrity Compromise at Seq #${stats.audit_integrity.broken_at}`}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {valid
                  ? 'All serialized payloads strictly correlate with stored SHA-256 digests. Backward hash links unbroken.'
                  : `Reason: ${stats.audit_integrity.reason}`}
              </p>
            </div>
          </div>

          <Link
            to="/admin/integrity"
            className="btn-secondary text-xs whitespace-nowrap self-center hidden sm:inline-flex bg-white shadow-xs"
          >
            Re-verify Now
          </Link>
        </div>
      </div>

      {/* Recent Activity Log Preview */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-slate-800 text-sm">Recent System Security Events</h2>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-semibold text-accent hover:text-accent-dark inline-flex items-center gap-1 group"
          >
            <span>View All Events</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {stats.recent_events.map(e => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`badge text-[10px] font-mono font-semibold uppercase flex-shrink-0 ${
                    e.outcome === 'success'
                      ? 'badge-green'
                      : e.outcome === 'denied'
                      ? 'badge-red'
                      : 'badge-yellow'
                  }`}
                >
                  {e.outcome}
                </span>
                <span className="font-mono text-xs text-slate-800 font-semibold truncate">
                  {e.action}
                </span>
                <span className="text-xs text-slate-400 truncate hidden md:inline">
                  by {e.actor_email ?? 'system/anonymous'}
                </span>
              </div>

              <span className="text-xs text-slate-400 flex-shrink-0 font-normal">
                {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

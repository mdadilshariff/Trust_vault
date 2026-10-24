import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FileText, AlertTriangle, ShieldCheck, Activity,
  CheckCircle2, XCircle, ArrowRight, ShieldAlert, Database, Lock,
  RefreshCw, Layers, Shield, KeyRound, ExternalLink, Cpu
} from 'lucide-react'
import { adminApi } from '../api'
import type { AdminStats } from '../types'
import { formatDistanceToNow, format } from 'date-fns'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const r = await adminApi.stats()
      setStats(r.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()

    const handler = () => loadStats()
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [loadStats])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadStats()
    setTimeout(() => setIsRefreshing(false), 400)
  }

  if (loading) {
    return (
      <div className="panel p-20 flex flex-col items-center justify-center space-y-3 font-sans text-xs text-zinc-500">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
        <p>Connecting to system telemetry engine...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="panel p-16 text-center font-sans">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h3 className="font-semibold text-zinc-200 text-sm">Telemetry Query Offline</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Failed to establish connection with the administrative telemetry backend.
        </p>
        <button onClick={loadStats} className="btn-secondary text-xs mt-4">
          Retry Telemetry Query
        </button>
      </div>
    )
  }

  const { valid, checked } = stats.audit_integrity

  return (
    <div className="space-y-6 font-sans">
      {/* Top Executive Header */}
      <div className="panel p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Executive Command & System Telemetry
              </h1>
              <span className="badge-emerald inline-flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Node Online
              </span>
              <span className="badge-indigo text-[10px]">
                Admin Workspace
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
              Real-time administrative telemetry monitoring identity access management, cryptographic ledger integrity, and document security.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <Link
              to="/admin/integrity"
              className="btn-primary text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Integrity Chain</span>
            </Link>

            <button
              onClick={handleRefresh}
              className="btn-secondary text-xs"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Interactive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Users className="w-4 h-4 text-indigo-400" />,
            badgeBg: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300',
            label: 'Total Accounts',
            value: stats.user_count,
            to: '/admin/users',
            desc: 'Registered identities',
            actionText: 'Manage Users',
          },
          {
            icon: <FileText className="w-4 h-4 text-sky-400" />,
            badgeBg: 'bg-sky-950/60 border-sky-800/60 text-sky-300',
            label: 'Vault Documents',
            value: stats.document_count,
            to: '/documents',
            desc: 'Encrypted items in storage',
            actionText: 'Browse Catalog',
          },
          {
            icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
            badgeBg: 'bg-rose-950/60 border-rose-800/60 text-rose-300',
            label: 'Blocked Attempts',
            value: stats.denied_attempt_count,
            to: '/admin/audit',
            desc: 'Zero-trust policy denials',
            actionText: 'Inspect Denials',
          },
          {
            icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            badgeBg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
            label: 'Verified Records',
            value: checked,
            to: '/admin/integrity',
            desc: 'Cryptographic log blocks',
            actionText: 'Chain Details',
          },
        ].map(({ icon, badgeBg, label, value, to, desc, actionText }) => (
          <Link
            key={label}
            to={to}
            className="panel-interactive p-4 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-400">
                  {label}
                </span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs ${badgeBg}`}>
                  {icon}
                </div>
              </div>

              <div className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
                {value.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">{desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-medium text-zinc-400 group-hover:text-indigo-300 transition-colors">
              <span>{actionText}</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Cryptographic Integrity Status (Left) & Real-Time System Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Cryptographic Verification Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Cryptographic Ledger Seal
                </h2>
              </div>
              <Link
                to="/admin/integrity"
                className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
              >
                <span>Full Audit</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-3">
              <div className="flex items-start gap-3">
                {valid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-semibold text-xs text-zinc-100">
                    {valid
                      ? `Ledger Integrity Verified (${checked} Blocks)`
                      : `Security Alert: Tamper Detected at Block #${stats.audit_integrity.broken_at}`}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {valid
                      ? 'Every historical record in the SHA-256 chain has been checked. Zero records have been modified, skipped, or truncated.'
                      : `Integrity failed: ${stats.audit_integrity.reason}`}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500 font-mono">Algorithm: SHA-256 Merkle Link</span>
                <span className="badge-emerald text-[10px]">Verified</span>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="panel-subtle p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Storage Mode</span>
                <span className="text-xs font-semibold text-zinc-200 mt-0.5 block">Append-Only Immutable</span>
              </div>
              <div className="panel-subtle p-3">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">Policy Enforcement</span>
                <span className="text-xs font-semibold text-zinc-200 mt-0.5 block">Zero-Trust RBAC</span>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to="/admin/integrity"
                className="btn-secondary w-full text-xs justify-center"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Launch Interactive Block Inspector</span>
              </Link>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="panel p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3 pb-3 border-b border-zinc-800/80">
              Quick Administrative Tasks
            </h2>
            <div className="space-y-2">
              <Link
                to="/admin/users"
                className="panel-subtle p-3 flex items-center justify-between hover:border-zinc-700/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-medium text-zinc-200">Manage User Access & Roles</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </Link>

              <Link
                to="/admin/audit"
                className="panel-subtle p-3 flex items-center justify-between hover:border-zinc-700/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-medium text-zinc-200">Inspect Security Audit Ledger</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </Link>

              <Link
                to="/upload"
                className="panel-subtle p-3 flex items-center justify-between hover:border-zinc-700/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-zinc-200">Ingest New Secure Document</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Recent System Activity */}
        <div className="lg:col-span-7">
          <div className="panel p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Live System Activity Ledger
                </h2>
              </div>
              <Link
                to="/admin/audit"
                className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
              >
                <span>View All Activity</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-800/60 mt-2">
              {stats.recent_events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-zinc-800/30 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                        e.outcome === 'success'
                          ? 'badge-emerald'
                          : e.outcome === 'denied'
                          ? 'badge-rose'
                          : 'badge-amber'
                      }`}
                    >
                      {e.outcome}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-200 font-semibold truncate">
                          {e.action}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                          #{e.sequence}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate block mt-0.5">
                        by {e.actor_email ?? 'System Automated Task'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-zinc-500 flex-shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center">
              <Link
                to="/admin/audit"
                className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5 transition-colors font-medium"
              >
                <span>Browse complete historical event stream</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

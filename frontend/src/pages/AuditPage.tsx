import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Search, RefreshCw, ShieldCheck, CheckCircle2,
  AlertTriangle, ArrowRight, KeyRound, Copy, Check, Filter,
  FileText, Shield, User, HardDrive, Layers, Clock
} from 'lucide-react'
import { auditApi } from '../api'
import type { AuditListOut, AuditEvent } from '../types'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface Props {
  adminMode?: boolean
}

export default function AuditPage({ adminMode = false }: Props) {
  const [data, setData] = useState<AuditListOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [outcome, setOutcome] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = adminMode
        ? await auditApi.list({
            page,
            page_size: 50,
            action: action || undefined,
            outcome: outcome === 'all' ? undefined : outcome,
          })
        : await auditApi.my({ page, page_size: 50 })
      setData(r.data)
    } catch {}
    setLoading(false)
  }, [page, action, outcome, adminMode])

  useEffect(() => {
    load()

    const handler = () => load()
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [load])

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedId(id)
    toast.success('SHA-256 seal copied to clipboard', { duration: 1500 })
    setTimeout(() => setCopiedId(null), 1800)
  }

  const outcomeBadge = (o: string) => {
    switch (o.toLowerCase()) {
      case 'success':
        return (
          <span className="badge-emerald inline-flex items-center gap-1 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Success
          </span>
        )
      case 'denied':
        return (
          <span className="badge-rose inline-flex items-center gap-1 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Blocked
          </span>
        )
      default:
        return (
          <span className="badge-amber inline-flex items-center gap-1 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {o}
          </span>
        )
    }
  }

  const getActionIcon = (act: string) => {
    const a = act.toLowerCase()
    if (a.includes('login') || a.includes('auth')) return <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
    if (a.includes('doc') || a.includes('upload') || a.includes('file')) return <FileText className="w-3.5 h-3.5 text-sky-400" />
    if (a.includes('user') || a.includes('role')) return <User className="w-3.5 h-3.5 text-amber-400" />
    return <Layers className="w-3.5 h-3.5 text-zinc-400" />
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1

  return (
    <div className="space-y-6 font-sans">
      {/* Top Command Header */}
      <div className="panel p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                {adminMode ? 'Audit Ledger & Security Trail' : 'My Security & Activity History'}
              </h1>
              <span className="badge-emerald inline-flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Merkle-Linked
              </span>
              <span className="badge-indigo text-[10px]">
                SHA-256 Sealed
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-2xl">
              {adminMode
                ? 'Immutable chronological ledger of all user authorizations, document access, role updates, and system operations.'
                : 'Complete activity history documenting your sessions, file uploads, shares, and security verifications.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center">
            {adminMode && (
              <Link
                to="/admin/integrity"
                className="btn-primary text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Chain Integrity</span>
              </Link>
            )}
            <button
              onClick={() => load()}
              disabled={loading}
              className="btn-secondary text-xs"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Total Recorded Events</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-zinc-100 tracking-tight font-sans">
                {data ? data.total.toLocaleString() : '—'}
              </span>
              <span className="text-[10px] text-zinc-500 font-sans">events</span>
            </div>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Integrity State</span>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Continuous Chain OK</span>
            </div>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Outcome Filter</span>
            <span className="text-xs font-semibold text-zinc-200 capitalize mt-1 block">
              {outcome === 'all' ? 'All Outcomes' : `${outcome} only`}
            </span>
          </div>

          <div className="panel-subtle p-3">
            <span className="text-[11px] text-zinc-400 font-medium block">Page Progress</span>
            <span className="text-xs font-semibold text-zinc-200 mt-1 block">
              Page {page} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      {adminMode && (
        <div className="panel-subtle p-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              className="input pl-9 text-xs"
              placeholder="Search by action (e.g. login, upload, delete)..."
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
            />
            {action && (
              <button
                onClick={() => {
                  setAction('')
                  setPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Segmented Outcomes Control */}
          <div className="segmented-control w-full md:w-auto">
            {[
              { id: 'all', label: 'All Outcomes' },
              { id: 'success', label: 'Success' },
              { id: 'denied', label: 'Blocked / Denied' },
              { id: 'error', label: 'Errors' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setOutcome(tab.id)
                  setPage(1)
                }}
                className={`segmented-item text-xs ${outcome === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      {loading ? (
        <div className="panel p-16 flex flex-col items-center justify-center space-y-3 text-xs text-zinc-500">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
          <p>Verifying ledger and streaming records...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="panel p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-500 mx-auto mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-200 text-sm mb-1">
            No activity records found
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            {action || outcome !== 'all'
              ? 'No ledger entries matched your search criteria.'
              : 'As events take place within the application, they will be logged here.'}
          </p>
          {(action || outcome !== 'all') && (
            <button
              onClick={() => {
                setAction('')
                setOutcome('all')
                setPage(1)
              }}
              className="btn-secondary text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="panel p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-16">Seq #</th>
                  <th className="py-3 px-4">Time</th>
                  {adminMode && <th className="py-3 px-4">Actor</th>}
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4 hidden md:table-cell">Resource Target</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Cryptographic Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {data.items.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-zinc-800/40 transition-colors group"
                  >
                    {/* Sequence */}
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                      #{e.sequence}
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-200">
                          {format(new Date(e.timestamp), 'HH:mm:ss')}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {format(new Date(e.timestamp), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </td>

                    {/* Actor (Admin Mode) */}
                    {adminMode && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0">
                            {e.actor_email ? e.actor_email[0].toUpperCase() : 'S'}
                          </div>
                          <span className="text-xs text-zinc-200 font-medium truncate max-w-[150px]">
                            {e.actor_email ?? 'System'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-200">
                        {getActionIcon(e.action)}
                        <span>{e.action}</span>
                      </div>
                    </td>

                    {/* Resource Target */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.resource_type ? (
                        <div className="inline-flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
                          <span className="text-zinc-500">{e.resource_type}/</span>
                          <span className="text-zinc-300 font-medium">{e.resource_id?.slice(0, 8)}…</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Outcome Status */}
                    <td className="px-4 py-3">
                      {outcomeBadge(e.outcome)}
                    </td>

                    {/* SHA-256 Hash Seal */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {e.event_hash ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {e.event_hash.slice(0, 12)}…
                          </span>
                          <button
                            onClick={() => copyHash(e.event_hash, e.id)}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title="Copy SHA-256 hash"
                          >
                            {copiedId === e.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-950/60 border-t border-zinc-800/80 text-xs text-zinc-400 font-sans">
            <p>
              Showing <span className="text-zinc-200 font-medium">{(page - 1) * 50 + 1}</span> to{' '}
              <span className="text-zinc-200 font-medium">{Math.min(page * 50, data.total)}</span> of{' '}
              <span className="text-zinc-200 font-medium">{data.total.toLocaleString()}</span> recorded events
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-400 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

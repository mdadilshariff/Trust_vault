import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Search, RefreshCw, ShieldCheck, CheckCircle2,
  AlertOctagon, AlertTriangle, ArrowRight, KeyRound
} from 'lucide-react'
import { auditApi } from '../api'
import type { AuditEvent, AuditListOut } from '../types'
import { format } from 'date-fns'

interface Props { adminMode?: boolean }

export default function AuditPage({ adminMode = false }: Props) {
  const [data, setData] = useState<AuditListOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [outcome, setOutcome] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = adminMode
        ? await auditApi.list({ page, page_size: 50, action: action || undefined, outcome: outcome || undefined })
        : await auditApi.my({ page })
      setData(r.data)
    } catch {}
    setLoading(false)
  }, [page, action, outcome, adminMode])

  useEffect(() => { load() }, [load])

  const outcomeBadge = (o: string) => {
    switch (o) {
      case 'success':
        return (
          <span className="badge-green text-[10px] uppercase font-mono font-semibold">
            Success
          </span>
        )
      case 'denied':
        return (
          <span className="badge-red text-[10px] uppercase font-mono font-semibold">
            Denied
          </span>
        )
      default:
        return (
          <span className="badge-yellow text-[10px] uppercase font-mono font-semibold">
            {o}
          </span>
        )
    }
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800">
              {adminMode ? 'System Audit Log' : 'My Activity Log'}
            </h1>
            <span className="badge-blue text-[11px] font-mono">
              Immutable Trail
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {adminMode
              ? 'Complete append-only ledger of all security, authentication, and authorization events'
              : 'Verifiable history of your logins, document access, and permission modifications'}
          </p>
        </div>

        {adminMode && (
          <Link
            to="/admin/integrity"
            className="btn-secondary text-xs self-start sm:self-auto inline-flex items-center gap-1.5 shadow-xs hover:border-emerald-300"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verify Hash Chain</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      {adminMode && (
        <div className="card-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10 pr-9 text-xs"
              placeholder="Filter by action (e.g. document:read, auth:login, permission:grant)…"
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1) }}
            />
            {action && (
              <button
                onClick={() => { setAction(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
          <select
            className="input w-full sm:w-44 text-xs"
            value={outcome}
            onChange={e => { setOutcome(e.target.value); setPage(1) }}
          >
            <option value="">All Outcomes</option>
            <option value="success">Success Only</option>
            <option value="denied">Denied (Forbidden)</option>
            <option value="error">Errors</option>
          </select>
          <button
            onClick={() => load()}
            disabled={loading}
            className="btn-secondary text-xs px-3"
            title="Refresh events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Querying audit records...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No audit events found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
            {action || outcome
              ? 'No records match your active query filters.'
              : 'As actions are performed within the application, cryptographically signed events will appear here.'}
          </p>
          {(action || outcome) && (
            <button
              onClick={() => { setAction(''); setOutcome(''); setPage(1) }}
              className="btn-secondary text-xs inline-flex"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden border border-slate-200/70 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="table-header w-16">Seq #</th>
                  {adminMode && <th className="table-header">Actor</th>}
                  <th className="table-header">Action</th>
                  <th className="table-header hidden md:table-cell">Resource</th>
                  <th className="table-header">Outcome</th>
                  <th className="table-header hidden lg:table-cell">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      #{e.sequence}
                    </td>

                    {adminMode && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                            {(e.actor_email ?? 'A')[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[150px]">
                            {e.actor_email ?? <span className="text-slate-400 italic">anonymous</span>}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-800 font-medium bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60">
                        {e.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell font-mono">
                      {e.resource_type ? (
                        <span className="truncate max-w-[160px] inline-block text-slate-600">
                          {e.resource_type}/{e.resource_id?.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {outcomeBadge(e.outcome)}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400 font-mono hidden lg:table-cell">
                      {format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {data.total} recorded events · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

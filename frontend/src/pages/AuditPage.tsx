import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Search, Filter } from 'lucide-react'
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

  const outcomeClass = (o: string) =>
    o === 'success' ? 'badge-green' : o === 'denied' ? 'badge-red' : 'badge-yellow'

  const totalPages = data ? Math.ceil(data.total / 50) : 1

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {adminMode ? 'System Audit Log' : 'My Activity'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {adminMode ? 'All system events — hash-chained immutable record.' : 'Your personal activity log.'}
        </p>
      </div>

      {adminMode && (
        <div className="card-sm mb-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Filter by action…" value={action}
              onChange={e => { setAction(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-36" value={outcome} onChange={e => { setOutcome(e.target.value); setPage(1) }}>
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="error">Error</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16">
          <ClipboardList className="w-14 h-14 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500">No audit events found.</p>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 table-header">#</th>
                  {adminMode && <th className="text-left px-4 py-3 table-header">Actor</th>}
                  <th className="text-left px-4 py-3 table-header">Action</th>
                  <th className="text-left px-4 py-3 table-header hidden md:table-cell">Resource</th>
                  <th className="text-left px-4 py-3 table-header">Outcome</th>
                  <th className="text-left px-4 py-3 table-header hidden lg:table-cell">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{e.sequence}</td>
                    {adminMode && (
                      <td className="px-4 py-2.5 text-slate-600 text-xs truncate max-w-[140px]">
                        {e.actor_email ?? <span className="text-slate-300">anonymous</span>}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{e.action}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 hidden md:table-cell">
                      {e.resource_type && `${e.resource_type}/${e.resource_id?.slice(0, 8)}…`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={outcomeClass(e.outcome)}>{e.outcome}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono hidden lg:table-cell">
                      {format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">{data.total} events · page {page}/{totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Previous</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

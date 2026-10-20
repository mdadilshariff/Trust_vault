import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2, FileText, Eye, Download, Search } from 'lucide-react'
import { documentsApi } from '../api'
import type { DocumentListOut } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function SharedWithMePage() {
  const [data, setData] = useState<DocumentListOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await documentsApi.sharedWithMe({ page, q: q || undefined })
      setData(r.data)
    } catch {}
    setLoading(false)
  }, [page, q])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Shared With Me</h1>
        <p className="text-slate-500 text-sm mt-0.5">Documents others have shared with you.</p>
      </div>

      <div className="card-sm mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search shared documents…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16">
          <Share2 className="w-14 h-14 mx-auto text-slate-200 mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">No shared documents</h3>
          <p className="text-sm text-slate-400">When someone shares a document with you, it will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.items.map(doc => (
            <div key={doc.id} className="card flex items-center gap-4 hover:shadow-card-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="font-medium text-slate-700 hover:text-accent transition-colors truncate"
                  >
                    {doc.title}
                  </Link>
                  <span className={`badge flex-shrink-0 ${doc.my_permission === 'edit' ? 'badge-yellow' : 'badge-gray'}`}>
                    {doc.my_permission}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  by <span className="font-medium">{doc.owner_username}</span> ·{' '}
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Link to={`/documents/${doc.id}`} className="btn-ghost p-1.5" title="View">
                  <Eye className="w-4 h-4" />
                </Link>
                <a href={documentsApi.downloadUrl(doc.id)} className="btn-ghost p-1.5" title="Download" target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

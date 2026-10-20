import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2, FileText, Eye, Download, Search, User, Calendar, HardDrive } from 'lucide-react'
import { documentsApi } from '../api'
import type { DocumentListOut } from '../types'
import { formatDistanceToNow } from 'date-fns'

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

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

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Shared With Me</h1>
            {data && (
              <span className="badge-blue text-[11px] font-mono">
                {data.total} {data.total === 1 ? 'document' : 'documents'}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Confidential documents authorized for your account by other vault owners
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-10 pr-9"
            placeholder="Search shared documents by title or filename…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
          {q && (
            <button
              onClick={() => { setQ(''); setPage(1) }}
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
          <p className="text-xs text-slate-400 font-medium">Loading authorized documents...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No shared documents</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
            {q
              ? 'No documents matched your search query.'
              : 'When colleagues grant your username read or edit permissions to a vault asset, it will securely appear here.'}
          </p>
          {q && (
            <button
              onClick={() => { setQ(''); setPage(1) }}
              className="btn-secondary text-xs inline-flex"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden border border-slate-200/70 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="text-left table-header">Document</th>
                  <th className="text-left table-header hidden sm:table-cell">Owner</th>
                  <th className="text-left table-header">Your Access</th>
                  <th className="text-left table-header hidden md:table-cell">Size</th>
                  <th className="text-left table-header hidden lg:table-cell">Shared</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-semibold text-slate-800 hover:text-accent transition-colors truncate block max-w-xs sm:max-w-sm"
                          >
                            {doc.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className="font-mono truncate">{doc.original_filename}</span>
                            {doc.category && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{doc.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold">
                          {(doc.owner_username ?? 'O')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {doc.owner_username ?? 'Unknown'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`badge text-[11px] font-semibold ${
                          doc.my_permission === 'edit' ? 'badge-yellow' : 'badge-gray'
                        }`}
                      >
                        {doc.my_permission === 'edit' ? 'CAN EDIT' : 'READ ONLY'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono hidden md:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="btn-ghost p-2 rounded-lg text-slate-500 hover:text-accent"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={documentsApi.downloadUrl(doc.id)}
                          className="btn-ghost p-2 rounded-lg text-slate-500 hover:text-emerald-600"
                          title="Download File"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {data.total} shared items · page {page} of {totalPages}
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

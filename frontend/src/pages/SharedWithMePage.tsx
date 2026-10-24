import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2, FileText, Eye, Download, Search, User, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
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

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [load])

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-sans text-zinc-100 tracking-tight">
              Shared with Me
            </h1>
            <span className="badge-blue text-[10px]">
              {data ? `${data.total} shared files` : 'Loading...'}
            </span>
          </div>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Documents other team members have shared with your account
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            className="input pl-9 text-xs"
            placeholder="Search shared files..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 font-sans text-xs text-zinc-500">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
          <p>Loading shared documents...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl text-center py-20 px-4 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
            <Share2 className="w-6 h-6 text-sky-400" />
          </div>
          <h3 className="font-semibold text-zinc-200 text-sm">No shared documents</h3>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            {q
              ? 'No shared documents match your active search query.'
              : 'When another user grants you read or edit access to a document, it will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Document</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">Owner</th>
                  <th className="py-3 px-4 font-medium">Privilege</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Size</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Shared</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {data.items.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-zinc-850/40 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-sky-400 group-hover:border-sky-800/80 group-hover:bg-sky-950/30 transition-all flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-medium text-zinc-200 hover:text-white transition-colors truncate block max-w-xs sm:max-w-sm text-xs"
                          >
                            {doc.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                            <span className="truncate">{doc.original_filename}</span>
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

                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-zinc-300 text-xs">
                        @{doc.owner_username ?? 'System'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] capitalize font-medium ${
                        doc.my_permission === 'edit' ? 'badge-yellow' : 'badge-blue'
                      }`}>
                        {doc.my_permission === 'edit' ? 'Can Edit' : 'Can View'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>

                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <a
                          href={documentsApi.downloadUrl(doc.id)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                          title="Download file"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400 bg-zinc-950/60">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-30"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

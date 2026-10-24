import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Search, Upload, Trash2, Download, Eye,
  RefreshCw, Copy, Check, Filter, Lock, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react'
import { documentsApi } from '../api'
import type { Document, DocumentListOut } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { emitAppUpdate } from '../store/events'
import toast from 'react-hot-toast'

const CATEGORIES = ['contract', 'report', 'invoice', 'presentation', 'other']

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocumentListOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState<'all' | 'owned' | 'shared'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await documentsApi.list({
        page,
        page_size: 20,
        q: q || undefined,
        category: category || undefined,
        scope,
      })
      setData(r.data)
    } catch {
      toast.error('Failed to load documents')
    }
    setLoading(false)
  }, [page, q, category, scope])

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [load])

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"? This action cannot be undone.`)) return
    setDeleting(doc.id)
    try {
      await documentsApi.delete(doc.id)
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((d) => d.id !== doc.id),
              total: prev.total - 1,
            }
          : prev
      )
      emitAppUpdate({
        action: 'DOC_DELETED',
        resource: doc.id,
        outcome: 'success',
        details: `Deleted document "${doc.title}".`,
      })
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
    setDeleting(null)
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    toast.success('Document ID copied')
    setTimeout(() => setCopiedId(null), 1500)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-sans text-zinc-100 tracking-tight">
              Document Directory
            </h1>
            <span className="badge-blue text-[10px]">
              {data ? `${data.total} files` : 'Loading...'}
            </span>
          </div>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Search, access, manage, and share your encrypted vault assets
          </p>
        </div>
        <Link to="/upload" className="btn-primary text-xs self-start sm:self-auto inline-flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Unified Search & Category Control Toolbar */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-xs">
        {/* Scope Switcher: All Documents vs My Documents vs Shared with Me */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-zinc-800/80">
          <div className="segmented-control">
            <button
              type="button"
              onClick={() => { setScope('all'); setPage(1) }}
              className={`segmented-item ${scope === 'all' ? 'active' : ''}`}
            >
              All Accessible Files
            </button>
            <button
              type="button"
              onClick={() => { setScope('owned'); setPage(1) }}
              className={`segmented-item ${scope === 'owned' ? 'active' : ''}`}
            >
              My Files
            </button>
            <button
              type="button"
              onClick={() => { setScope('shared'); setPage(1) }}
              className={`segmented-item ${scope === 'shared' ? 'active' : ''}`}
            >
              Shared with Me
            </button>
          </div>
          <span className="text-[11px] text-zinc-400">
            {scope === 'all' ? 'Showing all vault assets you can access' : scope === 'owned' ? 'Showing files created by you' : 'Showing files shared with your account'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              className="input pl-9 text-xs"
              placeholder="Search by title or original filename..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
            {q && (
              <button
                onClick={() => {
                  setQ('')
                  setPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => {
                setCategory('')
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                category === ''
                  ? 'bg-indigo-600 text-white font-medium border-indigo-500 shadow-xs'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => {
              const isActive = category === c
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all border ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium border-zinc-600 shadow-xs'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modern High-Density Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 font-sans text-xs text-zinc-500">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
          <p>Loading document directory...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl text-center py-20 px-4 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-200 text-sm">No documents found</h3>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            {q || category
              ? 'No documents matched your search filters.'
              : 'Your vault is currently empty. Upload your first document to begin.'}
          </p>
          {!q && !category && (
            <Link to="/upload" className="btn-primary text-xs inline-flex items-center gap-2 mt-2">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Document</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Category</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Size</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Uploaded</th>
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
                        <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-800/80 group-hover:bg-indigo-950/30 transition-all flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-medium text-zinc-200 hover:text-white transition-colors truncate block max-w-sm text-xs"
                          >
                            {doc.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                            <span className="truncate max-w-[180px]">{doc.original_filename}</span>
                            <span>•</span>
                            {doc.my_permission === 'owner' ? (
                              <span className="text-[10px] text-emerald-400 font-medium">Owned</span>
                            ) : (
                              <span className="badge-blue text-[10px]">
                                Shared ({doc.my_permission || 'view'}) · @{doc.owner_username || 'member'}
                              </span>
                            )}
                            <span>•</span>
                            <button
                              onClick={() => copyId(doc.id)}
                              className="hover:text-zinc-300 underline cursor-pointer inline-flex items-center gap-1 font-mono text-[10px]"
                              title="Copy ID"
                            >
                              <span>{doc.id.slice(0, 8)}…</span>
                              {copiedId === doc.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell">
                      {doc.category ? (
                        <span className={`badge text-[10px] capitalize font-medium ${
                          doc.category === 'contract' ? 'badge-blue' :
                          doc.category === 'report' ? 'badge-green' :
                          doc.category === 'invoice' ? 'badge-yellow' :
                          doc.category === 'presentation' ? 'badge-purple' :
                          'badge-mono'
                        }`}>
                          {doc.category}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>

                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
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
                        {doc.my_permission === 'owner' && (
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deleting === doc.id}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                Page {page} of {totalPages} ({data.total} total)
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

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Search, Upload, Trash2, Download, Eye, Filter } from 'lucide-react'
import { documentsApi } from '../api'
import type { Document, DocumentListOut } from '../types'
import { formatDistanceToNow, format } from 'date-fns'
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
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await documentsApi.list({ page, page_size: 20, q: q || undefined, category: category || undefined })
      setData(r.data)
    } catch { toast.error('Failed to load documents') }
    setLoading(false)
  }, [page, q, category])

  useEffect(() => { load() }, [load])

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    setDeleting(doc.id)
    try {
      await documentsApi.delete(doc.id)
      toast.success('Document deleted')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Delete failed')
    }
    setDeleting(null)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Documents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and share your private files</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload className="w-4 h-4" /> Upload
        </Link>
      </div>

      {/* Filters */}
      <div className="card-sm mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10 pr-9"
              placeholder="Search by title or filename…"
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => { setCategory(''); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === ''
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  category === c
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Filtering documents...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No documents found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
            {q || category ? 'No documents matched your active search query or filter.' : 'Your vault is ready. Upload a confidential document to begin.'}
          </p>
          {q || category ? (
            <button onClick={() => { setQ(''); setCategory(''); setPage(1) }} className="btn-secondary inline-flex text-xs">
              Clear All Filters
            </button>
          ) : (
            <Link to="/upload" className="btn-primary inline-flex text-xs">
              <Upload className="w-4 h-4" /> Upload Document
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden border border-slate-200/70 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="text-left table-header">Document</th>
                  <th className="text-left table-header hidden md:table-cell">Category</th>
                  <th className="text-left table-header hidden lg:table-cell">Size</th>
                  <th className="text-left table-header hidden lg:table-cell">Uploaded</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="font-semibold text-slate-800 hover:text-accent transition-colors truncate block max-w-sm"
                          >
                            {doc.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono truncate">{doc.original_filename}</span>
                            <span className="text-slate-300">•</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(doc.id)
                                toast.success('UUID copied to clipboard', { duration: 1500 })
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-600 font-mono underline cursor-pointer"
                              title="Copy Document ID"
                            >
                              id:{doc.id.slice(0, 8)}…
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {doc.category ? (
                        <span className="badge-blue capitalize">{doc.category}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono hidden lg:table-cell">
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
                          target="_blank" rel="noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="btn-ghost p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {data.total} documents · page {page} of {totalPages}
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

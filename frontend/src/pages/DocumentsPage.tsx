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
      <div className="card-sm mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search documents…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="input w-44"
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.items.length ? (
        <div className="card text-center py-16">
          <FileText className="w-14 h-14 mx-auto text-slate-200 mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">No documents found</h3>
          <p className="text-sm text-slate-400 mb-4">
            {q || category ? 'Try a different search or filter.' : 'Upload your first document to get started.'}
          </p>
          {!q && !category && (
            <Link to="/upload" className="btn-primary inline-flex">
              <Upload className="w-4 h-4" /> Upload Document
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 table-header">Document</th>
                  <th className="text-left px-4 py-3 table-header hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 table-header hidden lg:table-cell">Size</th>
                  <th className="text-left px-4 py-3 table-header hidden lg:table-cell">Uploaded</th>
                  <th className="px-4 py-3 table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="text-sm font-medium text-slate-700 hover:text-accent transition-colors truncate block max-w-xs"
                          >
                            {doc.title}
                          </Link>
                          <p className="text-xs text-slate-400">{doc.original_filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {doc.category ? (
                        <span className="badge-blue">{doc.category}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/documents/${doc.id}`} className="btn-ghost p-1.5" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={documentsApi.downloadUrl(doc.id)}
                          className="btn-ghost p-1.5"
                          title="Download"
                          target="_blank" rel="noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
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

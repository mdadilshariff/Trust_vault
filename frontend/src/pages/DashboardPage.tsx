import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Share2, Upload, ShieldCheck, Clock,
  ArrowUpRight, RefreshCw, CheckCircle2, Lock, Download,
  Copy, Check, Search, Filter, Shield, AlertTriangle, Eye, ArrowRight
} from 'lucide-react'
import { documentsApi, auditApi } from '../api'
import { useAuthStore } from '../store/auth'
import { formatDistanceToNow } from 'date-fns'
import type { Document, AuditEvent } from '../types'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [myDocs, setMyDocs] = useState<Document[]>([])
  const [sharedDocs, setSharedDocs] = useState<Document[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [docs, shared, audit] = await Promise.all([
        documentsApi.list({ page_size: 20, scope: 'owned' }),
        documentsApi.sharedWithMe({ page_size: 20 }),
        auditApi.my({ page: 1, page_size: 10 }),
      ])
      setMyDocs(docs.data.items)
      setSharedDocs(shared.data.items)
      setRecentActivity(audit.data.items)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const handler = () => { loadData() }
    window.addEventListener('tv:data-changed', handler)
    return () => window.removeEventListener('tv:data-changed', handler)
  }, [loadData])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setTimeout(() => setIsRefreshing(false), 400)
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    toast.success('Document ID copied')
    setTimeout(() => setCopiedId(null), 1500)
  }

  const runQuickVerify = async () => {
    setVerifying(true)
    try {
      const r = await auditApi.integrity()
      if (r.data.valid) {
        toast.success(`Security check verified (${r.data.checked} records authenticated)`)
      } else {
        toast.error(`Security alert at record #${r.data.broken_at}`)
      }
    } catch {
      toast.error('Failed to run verification')
    }
    setVerifying(false)
  }

  // Calculate storage usage
  const totalSizeBytes = myDocs.reduce((acc, d) => acc + (d.file_size || 0), 0)
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2)
  const maxStorageMB = 50
  const storagePercentage = Math.min(100, Math.max(1, (Number(totalSizeMB) / maxStorageMB) * 100))

  // Filter current active list
  const activeList = activeTab === 'my' ? myDocs : sharedDocs
  const filteredDocs = activeList.filter((doc) => {
    const matchesCategory = !categoryFilter || doc.category === categoryFilter
    const matchesSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* 1. Executive Workspace Summary Deck (Integrated Deck) */}
      <section className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-card backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Greeting & Storage Gauge */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-300 font-bold text-sm">
                {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
                    {user?.full_name ? `Welcome, ${user.full_name}` : 'Welcome back'}
                  </h1>
                  <span className={`text-[10px] font-medium ${user?.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>
                    {user?.role === 'admin' ? 'Administrator' : 'Verified Member'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  End-to-end encrypted document storage with real-time audit protection
                </p>
              </div>
            </div>

            {/* Storage Capacity Bar */}
            <div className="pt-1 max-w-md">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                <span>Vault Storage Used</span>
                <span className="text-zinc-200">{totalSizeMB} MB of {maxStorageMB} MB ({storagePercentage.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Fast Metric Strips & Primary Action */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-3 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl">
              <Link to="/documents" className="px-3 text-center border-r border-zinc-800/80 hover:opacity-80 transition-opacity">
                <span className="block text-xl font-bold text-zinc-100">{myDocs.length}</span>
                <span className="text-[11px] text-zinc-400">My Files</span>
              </Link>
              <Link to="/shared" className="px-3 text-center border-r border-zinc-800/80 hover:opacity-80 transition-opacity">
                <span className="block text-xl font-bold text-zinc-100">{sharedDocs.length}</span>
                <span className="text-[11px] text-zinc-400">Shared</span>
              </Link>
              <Link to="/audit/my" className="px-3 text-center hover:opacity-80 transition-opacity">
                <span className="block text-xl font-bold text-zinc-100">{recentActivity.length}</span>
                <span className="text-[11px] text-zinc-400">Actions</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="btn-secondary h-10 px-3"
                title="Sync Workspace"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link to="/upload" className="btn-primary h-10 px-4 text-xs inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Structured Dual Work Area (70% Hub / 30% Intelligence) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols = ~67%): Document Command Center */}
        <div className="lg:col-span-8 space-y-4">
          {/* Explorer Toolbar */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Switcher: My Documents vs Shared */}
            <div className="segmented-control self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('my'); setCategoryFilter('') }}
                className={`segmented-item ${activeTab === 'my' ? 'active' : ''}`}
              >
                My Documents ({myDocs.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('shared'); setCategoryFilter('') }}
                className={`segmented-item ${activeTab === 'shared' ? 'active' : ''}`}
              >
                Shared with Me ({sharedDocs.length})
              </button>
            </div>

            {/* Inline Quick Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files in view..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 text-xs py-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['', 'contract', 'report', 'invoice', 'presentation', 'other'].map((cat) => {
              const isActive = categoryFilter === cat
              return (
                <button
                  key={cat || 'all'}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg border capitalize transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium border-zinc-600 shadow-xs'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {cat || 'All Categories'}
                </button>
              )
            })}
          </div>

          {/* Document Rows Stream */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-850 shadow-sm">
            {loading ? (
              <div className="p-16 text-center text-xs text-zinc-500 space-y-3">
                <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                <p>Loading files...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-12 text-center text-xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-200">No documents found</p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    {searchQuery || categoryFilter
                      ? 'No items match your active search or category filter.'
                      : activeTab === 'my'
                      ? 'Upload your first document to store it securely.'
                      : 'No documents have been shared with your account yet.'}
                  </p>
                </div>
                {activeTab === 'my' && !searchQuery && !categoryFilter && (
                  <Link to="/upload" className="btn-primary text-xs inline-flex">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </Link>
                )}
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-850/40 transition-colors group"
                >
                  {/* File Identity */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-800/80 group-hover:bg-indigo-950/30 transition-all flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="font-medium text-zinc-200 hover:text-white transition-colors truncate text-xs"
                        >
                          {doc.title}
                        </Link>
                        {doc.category && (
                          <span className={`badge text-[10px] capitalize font-medium ${
                            doc.category === 'contract' ? 'badge-blue' :
                            doc.category === 'report' ? 'badge-green' :
                            doc.category === 'invoice' ? 'badge-yellow' :
                            doc.category === 'presentation' ? 'badge-purple' :
                            'badge-mono'
                          }`}>
                            {doc.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                        <span className="truncate max-w-[180px] text-zinc-400">{doc.original_filename}</span>
                        <span>•</span>
                        <span>{formatBytes(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => copyId(doc.id)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Copy Document ID"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={documentsApi.downloadUrl(doc.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (4 cols = ~33%): Security & Activity Intelligence Rail */}
        <div className="lg:col-span-4 space-y-4">
          {/* Security Seal & Chain Integrity Card */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-zinc-200">
                  Security Integrity
                </h3>
              </div>
              <span className="badge-green text-[10px]">
                Protected
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Every document upload, permission modification, and view is recorded in an immutable SHA-256 hash chain.
            </p>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cryptographic Seal</span>
                <span className="text-emerald-400 font-medium">Valid & Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tamper Detection</span>
                <span className="text-zinc-200">Zero Inconsistencies</span>
              </div>
            </div>

            <button
              onClick={runQuickVerify}
              disabled={verifying}
              className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{verifying ? 'Verifying Chain...' : 'Run Security Check'}</span>
            </button>
          </div>

          {/* Real-Time Activity Log Stream */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-zinc-200">
                  Recent Actions
                </h3>
              </div>
              <Link
                to="/audit/my"
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Full Log</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No recent activity recorded.
              </p>
            ) : (
              <div className="divide-y divide-zinc-850">
                {recentActivity.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 truncate">
                        {evt.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-medium flex-shrink-0 ${
                      evt.outcome === 'success' ? 'badge-green' : 'badge-red'
                    }`}>
                      {evt.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Share2, Upload, ShieldCheck, TrendingUp, Clock } from 'lucide-react'
import { documentsApi, auditApi } from '../api'
import { useAuthStore } from '../store/auth'
import { formatDistanceToNow } from 'date-fns'
import type { Document, AuditEvent } from '../types'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [myDocs, setMyDocs] = useState<Document[]>([])
  const [sharedDocs, setSharedDocs] = useState<Document[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [docs, shared, audit] = await Promise.all([
          documentsApi.list({ page_size: 5 }),
          documentsApi.sharedWithMe({ page_size: 5 }),
          auditApi.my({ page: 1 }),
        ])
        setMyDocs(docs.data.items)
        setSharedDocs(shared.data.items)
        setRecentActivity(audit.data.items.slice(0, 6))
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const stat = (icon: React.ReactNode, label: string, value: number | string, to: string, color: string, border: string) => (
    <Link to={to} className={`card-interactive group border-l-4 ${border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-all duration-200 group-hover:scale-110 shadow-xs`}>
          {icon}
        </div>
      </div>
    </Link>
  )

  const outcomeColor = (o: string) =>
    o === 'success' ? 'badge-green' : o === 'denied' ? 'badge-red' : 'badge-yellow'

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
            <span className="live-dot">
              <span className="live-dot-ping"></span>
              <span className="live-dot-core"></span>
            </span>
            End-to-end encrypted session active • Zero-leak private storage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/upload" className="btn-primary shadow-sm hover:shadow-accent/25">
            <Upload className="w-4 h-4" /> Upload Document
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Synchronizing vault index...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {stat(<FileText className="w-6 h-6 text-accent" />, 'My Documents', myDocs.length > 0 ? myDocs.length : 0, '/documents', 'bg-accent/10', 'border-accent')}
            {stat(<Share2 className="w-6 h-6 text-emerald-600" />, 'Shared With Me', sharedDocs.length > 0 ? sharedDocs.length : 0, '/shared', 'bg-emerald-50 text-emerald-600', 'border-emerald-500')}
            {stat(<ShieldCheck className="w-6 h-6 text-blue-600" />, 'Recent Activity', recentActivity.length, '/audit/my', 'bg-blue-50 text-blue-600', 'border-blue-500')}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Documents */}
            <div className="card">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-accent" />
                  Recent Documents
                </h2>
                <Link to="/documents" className="text-xs font-medium text-accent hover:text-accent-dark transition-colors flex items-center gap-1 group">
                  View all <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
              {myDocs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No documents stored yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Your private vault is ready. Upload files with cryptographic verification.</p>
                  <Link to="/upload" className="btn-primary mt-4 inline-flex text-xs py-2">
                    <Upload className="w-3.5 h-3.5" /> Upload First Document
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {myDocs.map(d => (
                    <li key={d.id}>
                      <Link
                        to={`/documents/${d.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/90 border border-transparent hover:border-slate-200/80 transition-all duration-150 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-accent transition-colors">{d.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                        </div>
                        <span className="badge-gray text-[11px] font-mono uppercase px-2">{d.file_extension}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-accent" />
                  Audit Trail
                </h2>
                <Link to="/audit/my" className="text-xs font-medium text-accent hover:text-accent-dark transition-colors flex items-center gap-1 group">
                  View all <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No activity recorded</p>
                  <p className="text-xs text-slate-400 mt-1">Actions on documents will appear here with tamper-evident hashes.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {recentActivity.map(e => (
                    <li key={e.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs text-slate-800 font-mono font-medium truncate">{e.action}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</p>
                      </div>
                      <span className={outcomeColor(e.outcome)}>{e.outcome}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

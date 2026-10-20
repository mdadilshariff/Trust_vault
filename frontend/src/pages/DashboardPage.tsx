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

  const stat = (icon: React.ReactNode, label: string, value: number | string, to: string, color: string) => (
    <Link to={to} className="card hover:shadow-card-md transition-shadow group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </Link>
  )

  const outcomeColor = (o: string) =>
    o === 'success' ? 'badge-green' : o === 'denied' ? 'badge-red' : 'badge-yellow'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Here's what's happening in your vault.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stat(<FileText className="w-6 h-6 text-accent" />, 'My Documents', myDocs.length > 0 ? `${myDocs.length}+` : 0, '/documents', 'bg-accent/10')}
            {stat(<Share2 className="w-6 h-6 text-emerald-600" />, 'Shared With Me', sharedDocs.length > 0 ? `${sharedDocs.length}+` : 0, '/shared', 'bg-emerald-100')}
            {stat(<ShieldCheck className="w-6 h-6 text-blue-600" />, 'Recent Events', recentActivity.length, '/audit/my', 'bg-blue-100')}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Documents */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Recent Documents
                </h2>
                <Link to="/documents" className="text-sm text-accent hover:underline">View all →</Link>
              </div>
              {myDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No documents yet</p>
                  <Link to="/upload" className="text-accent text-sm hover:underline mt-1 block">Upload your first document</Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {myDocs.map(d => (
                    <li key={d.id}>
                      <Link
                        to={`/documents/${d.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-accent transition-colors">{d.title}</p>
                          <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                        </div>
                        <span className="badge-gray text-xs uppercase">{d.file_extension}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  Recent Activity
                </h2>
                <Link to="/audit/my" className="text-sm text-accent hover:underline">View all →</Link>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map(e => (
                    <li key={e.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-mono truncate">{e.action}</p>
                        <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</p>
                      </div>
                      <span className={outcomeColor(e.outcome)}>{e.outcome}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <Link to="/upload" className="btn-primary">
              <Upload className="w-4 h-4" /> Upload Document
            </Link>
            <Link to="/documents" className="btn-secondary">
              <FileText className="w-4 h-4" /> Browse Documents
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

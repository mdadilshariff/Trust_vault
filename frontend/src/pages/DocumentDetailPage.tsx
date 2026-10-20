import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText, Download, Trash2, Edit2, Share2, ArrowLeft,
  Calendar, HardDrive, Tag, User, Save, X, Lock,
} from 'lucide-react'
import { documentsApi, permissionsApi } from '../api'
import { useAuthStore } from '../store/auth'
import type { Document, Permission } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function formatBytes(b: number) {
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [doc, setDoc] = useState<Document | null>(null)
  const [perms, setPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [shareForm, setShareForm] = useState({ username: '', permission: 'read' })
  const [sharing, setSharing] = useState(false)

  const isOwner = doc?.my_permission === 'owner'
  const canEdit = doc?.my_permission === 'owner' || doc?.my_permission === 'edit'

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await documentsApi.get(id)
      setDoc(r.data)
      setEditForm({ title: r.data.title, description: r.data.description ?? '', category: r.data.category ?? '' })
      if (r.data.my_permission === 'owner') {
        const p = await permissionsApi.list(id)
        setPerms(p.data)
      }
    } catch (e: any) {
      if (e.response?.status === 403) navigate('/access-denied')
      else if (e.response?.status === 404) navigate('/not-found')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const r = await documentsApi.update(id, editForm)
      setDoc(r.data)
      setEditing(false)
      toast.success('Document updated.')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Update failed.')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!id || !doc) return
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    try {
      await documentsApi.delete(id)
      toast.success('Document deleted.')
      navigate('/documents')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Delete failed.')
    }
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSharing(true)
    try {
      const r = await permissionsApi.grant(id, shareForm)
      setPerms(p => {
        const existing = p.findIndex(x => x.id === r.data.id)
        if (existing >= 0) { const n = [...p]; n[existing] = r.data; return n }
        return [...p, r.data]
      })
      setShareForm({ username: '', permission: 'read' })
      toast.success(`Shared with ${shareForm.username}.`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Share failed.')
    }
    setSharing(false)
  }

  const handleRevoke = async (permId: string, username: string) => {
    if (!id) return
    if (!confirm(`Revoke ${username}'s access? They will be blocked immediately, but cannot un-download files already downloaded.`)) return
    try {
      await permissionsApi.revoke(id, permId)
      setPerms(p => p.filter(x => x.id !== permId))
      toast.success(`Access revoked for ${username}.`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Revoke failed.')
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!doc) return null

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-accent" />
            </div>
            <div>
              {editing ? (
                <input
                  className="input text-xl font-bold"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              ) : (
                <h1 className="text-2xl font-bold text-slate-800">{doc.title}</h1>
              )}
              <p className="text-slate-400 text-sm">{doc.original_filename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
            {editing && (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <a href={documentsApi.downloadUrl(doc.id)} className="btn-primary" target="_blank" rel="noreferrer">
              <Download className="w-4 h-4" /> Download
            </a>
            {isOwner && (
              <button onClick={handleDelete} className="btn-danger">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Description</label>
                {editing ? (
                  <textarea
                    className="input min-h-[80px] resize-none"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="No description"
                  />
                ) : (
                  <p className="text-sm text-slate-600">{doc.description || <span className="text-slate-300">No description</span>}</p>
                )}
              </div>
              <div>
                <label className="label">Category</label>
                {editing ? (
                  <select className="input w-48" value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">None</option>
                    {['contract','report','invoice','presentation','other'].map(c =>
                      <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  doc.category
                    ? <span className="badge-blue">{doc.category}</span>
                    : <span className="text-slate-300 text-sm">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Permissions / sharing */}
          {isOwner && (
            <div className="card">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-accent" /> Sharing & Permissions
              </h2>

              {/* Share form */}
              <form onSubmit={handleShare} className="flex gap-2 mb-4">
                <input
                  className="input flex-1"
                  placeholder="Username to share with"
                  value={shareForm.username}
                  onChange={e => setShareForm(f => ({ ...f, username: e.target.value }))}
                  required
                />
                <select
                  className="input w-28"
                  value={shareForm.permission}
                  onChange={e => setShareForm(f => ({ ...f, permission: e.target.value }))}
                >
                  <option value="read">Read</option>
                  <option value="edit">Edit</option>
                </select>
                <button type="submit" disabled={sharing} className="btn-primary whitespace-nowrap">
                  {sharing ? '…' : 'Share'}
                </button>
              </form>

              {perms.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Not shared with anyone yet.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {perms.map(p => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{p.username}</p>
                        <p className="text-xs text-slate-400">{p.email}</p>
                      </div>
                      <select
                        className="input w-24 text-xs py-1"
                        value={p.permission}
                        onChange={async e => {
                          try {
                            const r = await permissionsApi.update(doc.id, p.id, { permission: e.target.value })
                            setPerms(ps => ps.map(x => x.id === p.id ? r.data : x))
                            toast.success('Permission updated.')
                          } catch { toast.error('Update failed.') }
                        }}
                      >
                        <option value="read">Read</option>
                        <option value="edit">Edit</option>
                      </select>
                      <button
                        onClick={() => handleRevoke(p.id, p.username)}
                        className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Revoke"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-slate-400 mt-3 p-2 rounded-lg bg-amber-50 border border-amber-100">
                ⚠️ Revoking access blocks future requests immediately. It cannot erase copies already downloaded by the recipient.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Metadata</h3>
            <div className="space-y-2.5">
              {[
                { icon: <User className="w-3.5 h-3.5" />, label: 'Owner', value: doc.owner_username ?? '—' },
                { icon: <Tag className="w-3.5 h-3.5" />, label: 'Type', value: doc.file_extension.toUpperCase() },
                { icon: <HardDrive className="w-3.5 h-3.5" />, label: 'Size', value: formatBytes(doc.file_size) },
                { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Uploaded', value: format(new Date(doc.created_at), 'PPp') },
                { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Modified', value: format(new Date(doc.updated_at), 'PPp') },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700 font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold text-slate-600">Access Level</p>
                <span className={`badge mt-0.5 ${
                  doc.my_permission === 'owner' ? 'badge-blue' :
                  doc.my_permission === 'edit' ? 'badge-yellow' : 'badge-gray'
                }`}>
                  {doc.my_permission}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

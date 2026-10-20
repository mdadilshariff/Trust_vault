import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText, Download, Trash2, Edit2, Share2, ArrowLeft,
  Calendar, HardDrive, Tag, User, Save, X, Lock, ShieldCheck,
  Copy, Check, ShieldAlert, KeyRound, Clock, AlertCircle
} from 'lucide-react'
import { documentsApi, permissionsApi } from '../api'
import { useAuthStore } from '../store/auth'
import type { Document, Permission } from '../types'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
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
  const [copiedId, setCopiedId] = useState(false)

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
      else toast.error('Failed to load document')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const copyDocId = () => {
    if (!doc) return
    navigator.clipboard.writeText(doc.id)
    setCopiedId(true)
    toast.success('Document UUID copied to clipboard')
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const r = await documentsApi.update(id, editForm)
      setDoc(r.data)
      setEditing(false)
      toast.success('Document updated successfully')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Update failed')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!id || !doc) return
    if (!confirm(`Permanently delete "${doc.title}"? This action cannot be undone.`)) return
    try {
      await documentsApi.delete(id)
      toast.success('Document securely purged')
      navigate('/documents')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Delete failed')
    }
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !shareForm.username.trim()) return
    setSharing(true)
    try {
      const r = await permissionsApi.grant(id, {
        username: shareForm.username.trim(),
        permission: shareForm.permission
      })
      setPerms(p => {
        const existing = p.findIndex(x => x.id === r.data.id)
        if (existing >= 0) { const n = [...p]; n[existing] = r.data; return n }
        return [...p, r.data]
      })
      const targetUser = shareForm.username.trim()
      setShareForm({ username: '', permission: 'read' })
      toast.success(`Access granted to ${targetUser}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to grant access')
    }
    setSharing(false)
  }

  const handleRevoke = async (permId: string, username: string) => {
    if (!id) return
    if (!confirm(`Revoke ${username}'s access? Future requests will be blocked immediately.`)) return
    try {
      await permissionsApi.revoke(id, permId)
      setPerms(p => p.filter(x => x.id !== permId))
      toast.success(`Access revoked for ${username}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Revocation failed')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Decrypting vault metadata...</p>
      </div>
    )
  }

  if (!doc) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div>
        <button
          onClick={() => navigate('/documents')}
          className="btn-ghost mb-4 -ml-2 text-xs text-slate-500 hover:text-slate-800 group inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Documents</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent shadow-xs">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              {editing ? (
                <input
                  className="input text-xl font-bold max-w-lg mb-1"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Document Title"
                />
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800">{doc.title}</h1>
                  <span className="badge-blue uppercase font-mono text-[11px] tracking-wider font-semibold">
                    .{doc.file_extension}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="font-mono">{doc.original_filename}</span>
                <span>•</span>
                <button
                  onClick={copyDocId}
                  className="inline-flex items-center gap-1 font-mono text-slate-500 hover:text-accent transition-colors"
                  title="Click to copy full UUID"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{doc.id.slice(0, 8)}...</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary text-xs">
                <Edit2 className="w-3.5 h-3.5" /> Edit Metadata
              </button>
            )}
            {editing && (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            )}
            <a
              href={documentsApi.downloadUrl(doc.id)}
              className="btn-primary text-xs shadow-sm hover:shadow-md"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="w-3.5 h-3.5" /> Download File
            </a>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="btn-danger text-xs p-2"
                title="Purge Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details and Permissions Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" /> Document Information
              </h2>
              <span className={`badge ${
                doc.my_permission === 'owner' ? 'badge-blue' :
                doc.my_permission === 'edit' ? 'badge-yellow' : 'badge-gray'
              }`}>
                Your Role: {(doc.my_permission || 'read').toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Description</label>
                {editing ? (
                  <textarea
                    className="input min-h-[90px] resize-none"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Provide context or a brief summary of this confidential document..."
                  />
                ) : (
                  <p className="text-sm text-slate-600 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100/80 leading-relaxed">
                    {doc.description || <span className="text-slate-400 italic">No description provided for this document.</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Category</label>
                {editing ? (
                  <select
                    className="input w-48 text-sm"
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">None</option>
                    {['contract', 'report', 'invoice', 'presentation', 'other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    {doc.category ? (
                      <span className="badge-blue capitalize text-xs px-3 py-1 font-medium">{doc.category}</span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Uncategorized</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Access Control & Collaborators */}
          {isOwner ? (
            <div className="card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-accent" /> Access Control & Sharing
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage who can inspect or modify this secure asset</p>
                </div>
                <span className="badge-gray text-[11px] font-mono">
                  {perms.length} {perms.length === 1 ? 'collaborator' : 'collaborators'}
                </span>
              </div>

              {/* Share form */}
              <form onSubmit={handleShare} className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="input pl-10 text-sm"
                    placeholder="Enter collaborator username (e.g. bob, alice)..."
                    value={shareForm.username}
                    onChange={e => setShareForm(f => ({ ...f, username: e.target.value }))}
                    required
                  />
                </div>
                <select
                  className="input w-28 text-sm"
                  value={shareForm.permission}
                  onChange={e => setShareForm(f => ({ ...f, permission: e.target.value }))}
                >
                  <option value="read">Read Only</option>
                  <option value="edit">Can Edit</option>
                </select>
                <button
                  type="submit"
                  disabled={sharing || !shareForm.username.trim()}
                  className="btn-primary text-xs whitespace-nowrap px-4"
                >
                  {sharing ? 'Granting...' : 'Grant Access'}
                </button>
              </form>

              {/* Collaborators list */}
              {perms.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  <Lock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-slate-600">Strictly Private</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                    Only you have access to this document. Share with a username above to collaborate.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
                  {perms.map(p => (
                    <li key={p.id} className="flex items-center gap-3 p-3.5 bg-white hover:bg-slate-50/70 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                        {p.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{p.username}</p>
                          <span className={`badge text-[10px] ${p.permission === 'edit' ? 'badge-yellow' : 'badge-gray'}`}>
                            {p.permission.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate">{p.email}</p>
                      </div>

                      <select
                        className="input w-28 text-xs py-1.5 px-2.5 h-8"
                        value={p.permission}
                        onChange={async e => {
                          try {
                            const r = await permissionsApi.update(doc.id, p.id, { permission: e.target.value })
                            setPerms(ps => ps.map(x => x.id === p.id ? r.data : x))
                            toast.success(`Updated ${p.username}'s permission to ${e.target.value}`)
                          } catch { toast.error('Permission update failed') }
                        }}
                      >
                        <option value="read">Read Only</option>
                        <option value="edit">Can Edit</option>
                      </select>

                      <button
                        onClick={() => handleRevoke(p.id, p.username)}
                        className="btn-ghost p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Revoke Access"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Security Caveat Disclaimer */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">Security Protocol:</span> Revoking access terminates authorization immediately on all subsequent API requests. In accordance with zero-trust principles, previously downloaded local copies cannot be wiped remotely.
                </div>
              </div>
            </div>
          ) : (
            <div className="card space-y-3">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-accent" /> Shared Access Protocol
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                This document is owned by <span className="font-semibold text-slate-700">{doc.owner_username}</span> and shared with you under <span className="font-semibold text-slate-700">{(doc.my_permission || 'read').toUpperCase()}</span> permissions. All reads and downloads are verified against current database ACLs and recorded in the audit trail.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Information Column */}
        <div className="space-y-6">
          {/* Cryptographic Security Envelope */}
          <div className="card border-accent/20 bg-gradient-to-b from-white to-navy-50/30 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Vault Security Status
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="live-dot"><span className="live-dot-ping"></span><span className="live-dot-core"></span></span>
                <span className="text-[11px] font-semibold text-emerald-700">Protected</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between items-center py-1 border-b border-slate-100/60">
                <span className="text-slate-400">At-Rest Storage</span>
                <span className="font-mono text-slate-700 font-medium">Private Filesystem</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/60">
                <span className="text-slate-400">Authorization</span>
                <span className="badge-blue text-[10px] font-semibold">Strict ACL Checked</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/60">
                <span className="text-slate-400">Audit Status</span>
                <span className="badge-green text-[10px] font-semibold">SHA-256 Chained</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">File ID</span>
                <button
                  onClick={copyDocId}
                  className="font-mono text-[11px] text-slate-700 hover:text-accent font-medium truncate max-w-[130px]"
                  title="Click to copy ID"
                >
                  {doc.id}
                </button>
              </div>
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">File Specifications</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium">Document Owner</p>
                  <p className="text-slate-700 font-semibold">{doc.owner_username ?? 'System'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium">Physical File Size</p>
                  <p className="text-slate-700 font-semibold font-mono">{formatBytes(doc.file_size)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium">Uploaded Date</p>
                  <p className="text-slate-700 font-semibold">{format(new Date(doc.created_at), 'PPpp')}</p>
                  <p className="text-[11px] text-slate-400 font-normal">
                    ({formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })})
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium">Last Modified</p>
                  <p className="text-slate-700 font-semibold">{format(new Date(doc.updated_at), 'PPpp')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

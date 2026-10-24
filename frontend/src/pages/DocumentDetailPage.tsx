import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FileText, ArrowLeft, Download, Trash2, Edit3, Share2,
  Lock, ShieldCheck, User, Calendar, Clock, HardDrive,
  Copy, Check, Save, X, KeyRound, AlertTriangle
} from 'lucide-react'
import { documentsApi, permissionsApi } from '../api'
import type { Document, Permission } from '../types'
import { formatDistanceToNow, format } from 'date-fns'
import { emitAppUpdate } from '../store/events'
import { useAuthStore } from '../store/auth'
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
  const [collaborators, setCollaborators] = useState<Array<{ id: string; username: string; email: string; full_name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [shareForm, setShareForm] = useState({ username: '', permission: 'read' })
  const [sharing, setSharing] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const isOwner = doc?.my_permission === 'owner' || user?.role === 'admin'
  const canEdit = isOwner || doc?.my_permission === 'edit'

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await documentsApi.get(id)
      setDoc(r.data)
      setEditForm({
        title: r.data.title,
        description: r.data.description || '',
        category: r.data.category || '',
      })
      const isUserOwner = r.data.my_permission === 'owner' || user?.role === 'admin'
      if (isUserOwner) {
        const [p, colRes] = await Promise.all([
          permissionsApi.list(id).catch(() => ({ data: [] })),
          documentsApi.collaborators().catch(() => ({ data: [] })),
        ])
        setPerms(p.data)
        setCollaborators(colRes.data)
      }
    } catch (e: any) {
      if (e.response?.status === 403) navigate('/access-denied')
      else if (e.response?.status === 404) navigate('/not-found')
      else toast.error('Failed to load document')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const copyDocId = () => {
    if (!doc) return
    navigator.clipboard.writeText(doc.id)
    setCopiedId(true)
    toast.success('Document UUID copied')
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const r = await documentsApi.update(id, editForm)
      setDoc(r.data)
      setEditing(false)
      emitAppUpdate({
        action: 'DOC_UPDATED',
        resource: id,
        outcome: 'success',
        details: `Updated details for "${r.data.title}".`,
      })
      toast.success('Document updated')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Update failed')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!id || !doc) return
    if (!confirm(`Are you sure you want to delete "${doc.title}"? This cannot be undone.`)) return
    try {
      await documentsApi.delete(id)
      emitAppUpdate({
        action: 'DOC_DELETED',
        resource: id,
        outcome: 'success',
        details: `Deleted document "${doc.title}".`,
      })
      toast.success('Document deleted')
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
        permission: shareForm.permission,
      })
      setPerms((p) => {
        const existing = p.findIndex((x) => x.id === r.data.id)
        if (existing >= 0) {
          const n = [...p]
          n[existing] = r.data
          return n
        }
        return [...p, r.data]
      })
      const targetUser = shareForm.username.trim()
      emitAppUpdate({
        action: 'ACCESS_GRANTED',
        resource: id,
        outcome: 'success',
        details: `Shared "${doc?.title}" with ${targetUser} (${shareForm.permission}).`,
      })
      setShareForm({ username: '', permission: 'read' })
      toast.success(`Access granted to ${targetUser}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to grant access')
    }
    setSharing(false)
  }

  const handleRevoke = async (permId: string, username: string) => {
    if (!id) return
    if (!confirm(`Remove access for ${username}?`)) return
    try {
      await permissionsApi.revoke(id, permId)
      setPerms((p) => p.filter((x) => x.id !== permId))
      emitAppUpdate({
        action: 'ACCESS_REVOKED',
        resource: id,
        outcome: 'success',
        details: `Removed access for ${username} on "${doc?.title}".`,
      })
      toast.success(`Access removed for ${username}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to remove access')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3 text-xs text-zinc-500">
        <div className="w-7 h-7 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
        <p>Loading document details...</p>
      </div>
    )
  }

  if (!doc) return null

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            title="Back to directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-sans text-zinc-100 tracking-tight truncate max-w-md sm:max-w-xl">
                {doc.title}
              </h1>
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
            <p className="text-xs text-zinc-400 mt-0.5">
              Original: <span className="text-zinc-300 font-mono text-[11px]">{doc.original_filename}</span> · {formatBytes(doc.file_size)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href={documentsApi.downloadUrl(doc.id)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </a>

          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Edit Details</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleDelete}
              className="btn-danger text-xs inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Document Overview & Technical Specs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Properties & Description Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Document Details</span>
              </h2>
              {editing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary py-1 px-3 text-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input text-xs"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input text-xs"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">No Category</option>
                    <option value="contract">Contract</option>
                    <option value="report">Report</option>
                    <option value="invoice">Invoice</option>
                    <option value="presentation">Presentation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    rows={3}
                    className="input text-xs leading-relaxed"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of file contents..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-zinc-400 text-[11px] block mb-1.5 font-medium">
                    Description & Notes
                  </span>
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-zinc-300 text-xs leading-relaxed">
                    {doc.description || 'No description provided for this document.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-400 text-[11px] block font-medium">
                      Your Permission
                    </span>
                    <span className="badge-blue text-[11px] uppercase font-semibold mt-1">
                      {doc.my_permission || 'Read'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-400 text-[11px] block font-medium">
                      Owner
                    </span>
                    <span className="text-zinc-200 font-medium block mt-1">
                      @{doc.owner_username ?? 'System'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Technical File Metadata Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-card">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider pb-3 border-b border-zinc-800">
              Storage & Cryptographic Attributes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">Storage UUID</span>
                <p className="font-mono text-[11px] text-zinc-300 truncate">{doc.id}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">MIME Type</span>
                <p className="font-mono text-[11px] text-zinc-300 truncate">{doc.mime_type}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">Uploaded Date</span>
                <p className="text-zinc-300 text-xs">{format(new Date(doc.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">Last Modified</span>
                <p className="text-zinc-300 text-xs">{format(new Date(doc.updated_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Collaborators & Sharing Access Control */}
        <div className="lg:col-span-5 space-y-6">
          {/* Sharing & Access Control Card */}
          {isOwner ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-card">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Access Control List
                  </h2>
                </div>
                <span className="badge-blue text-[10px]">
                  {perms.length} Collaborators
                </span>
              </div>

              {/* Share Form */}
              <form onSubmit={handleShare} className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    list="available-collaborators-list"
                    placeholder="Enter username or email address..."
                    className="input text-xs flex-1"
                    value={shareForm.username}
                    onChange={(e) => setShareForm((f) => ({ ...f, username: e.target.value }))}
                  />
                  <datalist id="available-collaborators-list">
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.username}>
                        {c.full_name} ({c.email})
                      </option>
                    ))}
                  </datalist>
                  <select
                    className="input w-32 text-xs"
                    value={shareForm.permission}
                    onChange={(e) => setShareForm((f) => ({ ...f, permission: e.target.value }))}
                  >
                    <option value="read">Can View</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </div>

                {/* Quick Pick Team Members */}
                {collaborators.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1">
                    <span className="text-[10px] text-zinc-500 font-medium">Quick pick:</span>
                    {collaborators.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setShareForm((f) => ({ ...f, username: c.username }))}
                        className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer"
                        title={`${c.full_name} (${c.email})`}
                      >
                        @{c.username}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sharing || !shareForm.username.trim()}
                  className="btn-primary w-full text-xs py-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{sharing ? 'Granting Access...' : 'Grant Access'}</span>
                </button>
              </form>

              {/* Permissions List */}
              <div className="pt-2">
                {perms.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-dashed border-zinc-800 text-center text-xs text-zinc-400">
                    This document is private. Only you have access.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-850 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
                    {perms.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200">
                              @{p.username}
                            </span>
                            <span className={`badge text-[10px] capitalize font-medium ${
                              p.permission === 'read' ? 'badge-blue' : 'badge-yellow'
                            }`}>
                              {p.permission === 'read' ? 'Can View' : 'Can Edit'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                            {p.email} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevoke(p.id, p.username)}
                          className="px-2 py-1 rounded bg-zinc-900 border border-rose-900/60 text-rose-400 hover:bg-rose-950/40 text-xs transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 text-xs shadow-card">
              <div className="flex items-center gap-2 text-indigo-400">
                <Lock className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase text-zinc-200">
                  Shared Access Active
                </h3>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                This document is owned by <span className="text-zinc-200 font-semibold">@{doc.owner_username}</span> and shared with your account with <span className="text-indigo-300 font-semibold uppercase">{doc.my_permission}</span> privileges.
              </p>
            </div>
          )}

          {/* Security & Instant UUID Copy Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200">Security Verified</span>
              </div>
              <span className="badge-green text-[10px]">Protected</span>
            </div>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                <span>Encryption</span>
                <span className="text-zinc-200">Private Server Vault</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                <span>Audit Status</span>
                <span className="text-emerald-400">Logged & Chained</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Document ID</span>
                <button
                  onClick={copyDocId}
                  className="font-mono text-[11px] text-zinc-300 hover:text-white inline-flex items-center gap-1 underline"
                >
                  <span>{doc.id.slice(0, 8)}…</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

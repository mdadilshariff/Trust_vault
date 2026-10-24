import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload, FileText, X, Check, Lock, ShieldCheck,
  ArrowLeft, AlertCircle, FileCheck, Info
} from 'lucide-react'
import { documentsApi } from '../api'
import { emitAppUpdate } from '../store/events'
import toast from 'react-hot-toast'

const CATEGORIES = ['contract', 'report', 'invoice', 'presentation', 'other']
const MAX_MB = 50

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'contract' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)

  const pickFile = (f: File | null) => {
    if (!f) return
    if (f.size > MAX_MB * 1048576) {
      toast.error(`File size exceeds maximum ${MAX_MB} MB limit.`)
      return
    }
    setFile(f)
    if (!form.title) setForm((v) => ({ ...v, title: f.name.replace(/\.[^.]+$/, '') }))
    setErrors({})
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    pickFile(e.dataTransfer.files[0] ?? null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!file) e.file = 'Please choose a file to upload'
    if (!form.title.trim()) e.title = 'Document title is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file!)
    fd.append('title', form.title.trim())
    if (form.description) fd.append('description', form.description)
    if (form.category) fd.append('category', form.category)

    try {
      const r = await documentsApi.upload(fd)
      emitAppUpdate({
        action: 'DOC_UPLOADED',
        resource: r.data.id,
        outcome: 'success',
        details: `Uploaded "${r.data.title}" (${formatBytes(r.data.file_size)}).`,
      })
      toast.success('Document uploaded successfully')
      navigate(`/documents/${r.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Upload failed.')
      emitAppUpdate({
        action: 'UPLOAD_FAILED',
        outcome: 'error',
        details: `Failed to upload "${form.title}": ${err.response?.data?.detail || 'Validation error'}`,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-sans text-zinc-100 tracking-tight">
              Upload Document
            </h1>
            <span className="badge-blue text-[10px]">
              Secure Ingestion
            </span>
          </div>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Files are cryptographically verified, encrypted, and isolated in storage
          </p>
        </div>
        <Link to="/documents" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Documents</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Interactive Dropzone & Selected File Info */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[280px] ${
              drag
                ? 'border-indigo-500 bg-indigo-950/30 scale-[0.99]'
                : file
                ? 'border-emerald-600/70 bg-emerald-950/20'
                : errors.file
                ? 'border-rose-700 bg-rose-950/20'
                : 'border-zinc-800 hover:border-indigo-500/60 hover:bg-zinc-900/60 bg-zinc-900/40'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="space-y-3 w-full">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center justify-center mx-auto shadow-xs">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-100 text-xs truncate max-w-xs mx-auto">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {formatBytes(file.size)} · Ready to ingest
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] inline-flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Choose different file</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto shadow-xs">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-200 text-xs">
                    Drag and drop file here, or <span className="text-indigo-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Max file payload: {MAX_MB} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {errors.file && (
            <p className="text-rose-400 text-xs flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.file}</span>
            </p>
          )}

          {/* Supported Types Chips */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2 text-xs">
            <span className="text-zinc-400 text-[11px] font-medium block">Supported Formats:</span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'PNG', 'ZIP', 'CSV'].map((ext) => (
                <span key={ext} className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Document Metadata & Ingestion */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-card">
          <div className="pb-3 border-b border-zinc-800">
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Document Properties
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Specify indexing details and security classification
            </p>
          </div>

          {/* Document Title */}
          <div>
            <label className="label">
              Document Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Financial Audit Report"
              className={`input text-xs ${errors.title ? 'input-error' : ''}`}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            {errors.title && (
              <p className="text-rose-400 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Category Selector Chips */}
          <div>
            <label className="label">
              Document Classification
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = form.category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={`py-2 px-2.5 rounded-lg border text-xs capitalize text-center transition-all ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-600 text-indigo-200 font-medium shadow-xs'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add key notes, reference numbers, or context for collaborators..."
              className="input text-xs leading-relaxed"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Security & Hash Assurance Notice */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Automatic Cryptographic Sealing</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Upon upload, a SHA-256 fingerprint will be chained to the immutable audit sequence. The raw payload is stored under a server-generated UUID with access strictly limited to you and designated users.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Encrypting & Ingesting Payload...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document to Vault</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

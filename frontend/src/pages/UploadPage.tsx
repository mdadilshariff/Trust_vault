import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react'
import { documentsApi } from '../api'
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
  const [form, setForm] = useState({ title: '', description: '', category: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [drag, setDrag] = useState(false)

  const pickFile = (f: File | null) => {
    if (!f) return
    if (f.size > MAX_MB * 1048576) {
      toast.error(`File exceeds ${MAX_MB} MB limit.`)
      return
    }
    setFile(f)
    if (!form.title) setForm(v => ({ ...v, title: f.name.replace(/\.[^.]+$/, '') }))
    setErrors({})
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    pickFile(e.dataTransfer.files[0] ?? null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!file) e.file = 'Please select a file'
    if (!form.title.trim()) e.title = 'Title is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setUploading(true)
    setProgress(0)
    const fd = new FormData()
    fd.append('file', file!)
    fd.append('title', form.title.trim())
    if (form.description) fd.append('description', form.description)
    if (form.category) fd.append('category', form.category)
    try {
      const r = await documentsApi.upload(fd)
      toast.success('Document uploaded successfully!')
      navigate(`/documents/${r.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Upload failed.')
    }
    setUploading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="pb-3 border-b border-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Document</h1>
        <p className="text-slate-500 text-sm mt-1">
          Files are validated with magic signature detection and stored in zero-leak private storage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer ${
            drag
              ? 'border-accent bg-accent/5 scale-[1.01] shadow-lg shadow-accent/10'
              : file
              ? 'border-emerald-300 bg-emerald-50/20'
              : errors.file
              ? 'border-red-400 bg-red-50/20'
              : 'border-slate-200 hover:border-accent hover:bg-slate-50/50 hover:shadow-sm'
          }`}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-4 p-2 bg-white rounded-xl shadow-xs border border-emerald-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{file.name}</p>
                  <span className="badge-green text-[11px] font-mono uppercase">
                    <Check className="w-3 h-3 text-emerald-600" /> Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)} • Click to replace</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-slate-800 font-semibold text-sm">Drag and drop file here, or click to browse</p>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP, CSV, MD · up to {MAX_MB} MB
              </p>
              {errors.file && <p className="text-red-500 text-xs font-medium mt-3">{errors.file}</p>}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="card space-y-4">
          <div>
            <label className="label">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              className={`input ${errors.title ? 'input-error' : ''}`}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Q4 Financial Audit Report"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              className="input min-h-[85px] resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Provide context or summary for collaborators…"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input capitalize"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category (optional)</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={uploading} className="btn-primary flex-1 justify-center py-2.5">
            {uploading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Storing Encrypted File…</>
              : <><Upload className="w-4 h-4" /> Upload Document</>}
          </button>
          <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

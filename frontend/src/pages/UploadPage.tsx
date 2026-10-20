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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Upload Document</h1>
        <p className="text-slate-500 text-sm mt-0.5">Files are stored privately and never publicly accessible.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop zone */}
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
            drag ? 'border-accent bg-accent/5' : errors.file ? 'border-red-400' : 'border-slate-200 hover:border-accent/50'
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
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-700">{file.name}</p>
                <p className="text-sm text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Drop a file here, or click to browse</p>
              <p className="text-slate-400 text-sm mt-1">PDF, DOCX, XLSX, PNG, JPG, ZIP, TXT, CSV and more · max {MAX_MB} MB</p>
              {errors.file && <p className="text-red-500 text-sm mt-2">{errors.file}</p>}
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="card space-y-4">
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input
              className={`input ${errors.title ? 'input-error' : ''}`}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Document title"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description…"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">None</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={uploading} className="btn-primary flex-1 justify-center py-2.5">
            {uploading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
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

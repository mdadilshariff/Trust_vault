import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, FileQuestion, ArrowLeft, Home } from 'lucide-react'

export function AccessDeniedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-zinc-800 selection:text-white">
      <div className="card bg-zinc-900 border border-zinc-800 max-w-md w-full text-center py-10 px-6 shadow-terminal">
        <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-rose-900/60 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-950 text-rose-400 border border-rose-900/60 inline-block mb-3">
          Access Denied (403)
        </span>

        <h1 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
          Access Denied
        </h1>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          You don't have permission to view or edit this file. If you need access, please contact the document owner or an administrator.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            to="/dashboard"
            className="btn-primary w-full sm:w-auto text-xs font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-zinc-800 selection:text-white">
      <div className="card bg-zinc-900 border border-zinc-800 max-w-md w-full text-center py-10 px-6 shadow-terminal">
        <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
          <FileQuestion className="w-6 h-6" />
        </div>

        <span className="badge-mono text-[11px] inline-block mb-3">
          Not Found (404)
        </span>

        <h1 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          The page or document you are looking for doesn't exist or may have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            to="/dashboard"
            className="btn-primary w-full sm:w-auto text-xs font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

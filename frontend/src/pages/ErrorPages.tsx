import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, FileQuestion, ArrowLeft, Home, Lock } from 'lucide-react'

export function AccessDeniedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center py-10 px-6 border-slate-200/80 shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center mx-auto mb-5 text-red-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="badge-red text-[10px] font-mono uppercase font-semibold mb-2">
          HTTP 403 · Forbidden
        </span>

        <h1 className="text-2xl font-bold text-slate-800 mt-2 mb-2">
          Access Denied
        </h1>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Your credentials do not possess the required object-level ACL permissions for this vault asset. This unauthorized access attempt has been signed and logged in the immutable audit trail.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
          <Link
            to="/dashboard"
            className="btn-primary w-full sm:w-auto text-xs"
          >
            <Home className="w-3.5 h-3.5" /> Return to Vault
          </Link>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center py-10 px-6 border-slate-200/80 shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xs">
          <FileQuestion className="w-8 h-8" />
        </div>

        <span className="badge-gray text-[10px] font-mono uppercase font-semibold mb-2">
          HTTP 404 · Not Found
        </span>

        <h1 className="text-2xl font-bold text-slate-800 mt-2 mb-2">
          Resource Not Located
        </h1>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The requested document UUID or endpoint route does not exist in the vault directory or may have been purged by its owner.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full sm:w-auto text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
          <Link
            to="/dashboard"
            className="btn-primary w-full sm:w-auto text-xs"
          >
            <Home className="w-3.5 h-3.5" /> Return to Vault
          </Link>
        </div>
      </div>
    </div>
  )
}

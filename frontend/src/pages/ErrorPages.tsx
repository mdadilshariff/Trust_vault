import { Link } from 'react-router-dom'
import { ShieldOff, Home } from 'lucide-react'

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6">You don't have permission to access this resource. If you believe this is an error, contact the document owner.</p>
        <Link to="/dashboard" className="btn-primary inline-flex">
          <Home className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-8xl font-black text-slate-200 mb-4">404</p>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-6">The page or resource you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary inline-flex">
          <Home className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

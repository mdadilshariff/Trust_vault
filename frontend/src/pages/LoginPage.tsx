import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, Terminal, ArrowRight } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import { emitAppUpdate } from '../store/events'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await authApi.login(form)
      if (r.data.access_token) {
        localStorage.setItem('tv_token', r.data.access_token)
      }
      setUser(r.data)
      emitAppUpdate({
        action: 'USER_LOGIN',
        actor: r.data.email,
        outcome: 'success',
        details: `Authenticated user session for ${r.data.email} [${r.data.role}].`,
      })
      toast.success(`Session authenticated: ${r.data.email}`)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Authentication failed. Please verify credentials.')
      emitAppUpdate({
        action: 'AUTH_FAILED',
        actor: form.email || 'anonymous',
        outcome: 'denied',
        details: 'Rejected invalid credentials during session initialization.',
      })
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string, pass: string) => {
    setForm({ email, password: pass })
    setError('')
    toast.success(`Injected credentials: ${email}`, { duration: 1500 })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white font-sans">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-indigo-950/70 border border-indigo-700/50 flex items-center justify-center text-indigo-300 mb-3 shadow-xs">
            <Lock className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-sans tracking-tight text-zinc-100">
              TrustVault
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
              v2.4
            </span>
          </div>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Secure Document Storage
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-terminal">
          <div className="pb-4 mb-4 border-b border-zinc-800">
            <h2 className="text-sm font-sans font-bold text-zinc-200">
              Sign In
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enter your credentials to access your account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-zinc-950 border border-red-900/60 text-red-300 text-xs flex items-start gap-2">
              <span className="font-semibold text-red-400">Error:</span>
              <span className="truncate">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input pr-9"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 font-sans text-xs mt-2"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <p className="text-[11px] font-sans font-medium text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <span>Demo Accounts (click to autofill)</span>
            </p>
            <div className="grid grid-cols-3 gap-2 font-sans">
              <button
                type="button"
                onClick={() => fillDemo('admin@trustvault.dev', 'Admin1234!')}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-700/60 text-left transition-colors group"
              >
                <span className="block text-xs font-semibold text-amber-300 group-hover:text-amber-200">Admin</span>
                <span className="text-[10px] text-zinc-500 block truncate font-mono">admin@dev</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('alice@trustvault.dev', 'Alice1234!')}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-sage-500/60 text-left transition-colors group"
              >
                <span className="block text-xs font-semibold text-sage-300 group-hover:text-cream">Alice (Owner)</span>
                <span className="text-[10px] text-zinc-500 block truncate font-mono">alice@dev</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('bob@trustvault.dev', 'Bob12345!')}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-sage-500/60 text-left transition-colors group"
              >
                <span className="block text-xs font-semibold text-cream group-hover:text-white">Bob (Member)</span>
                <span className="text-[10px] text-zinc-500 block truncate font-mono">bob@dev</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-800 text-center">
            <p className="text-zinc-400 text-xs font-sans">
              Don't have an account?{' '}
              <Link to="/register" className="text-zinc-200 hover:text-white underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Security Tagline */}
        <div className="text-center text-zinc-500 font-sans text-xs mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Protected with end-to-end security & encryption</span>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, Sparkles, UserCheck, ShieldCheck } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
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
      setUser(r.data)
      toast.success(`Welcome back, ${r.data.full_name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string, pass: string) => {
    setForm({ email, password: pass })
    setError('')
    toast.success(`Loaded credentials for ${email}`, { duration: 1500 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-xl shadow-accent/20 mb-3 border border-accent-light/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">TrustVault</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="live-dot"><span className="live-dot-ping"></span><span className="live-dot-core"></span></span>
            <span className="text-navy-300 text-xs font-medium">Enterprise Cryptographic Document Vault</span>
          </div>
        </div>

        {/* Auth Glass Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 shadow-glass">
          <h2 className="text-lg font-bold text-white mb-1">Secure Sign In</h2>
          <p className="text-xs text-navy-300 mb-5">
            Sessions validated by Argon2id & cryptographic session tokens
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
              <span className="font-semibold text-red-100">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1.5">
                Corporate Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-all"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/10 border border-white/15 text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-all"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors p-1"
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold text-sm transition-all active:scale-[0.985] disabled:opacity-60 mt-3 flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>{loading ? 'Authenticating Session…' : 'Enter Vault'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials Autofill Pills */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-300 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-light" /> Quick Demo Personas
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@trustvault.dev', 'Admin1234!')}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white text-[11px] font-medium transition-all text-center group"
              >
                <span className="block font-semibold group-hover:text-accent-light">Admin</span>
                <span className="text-[9px] text-navy-400 block truncate">admin@dev</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('alice@trustvault.dev', 'Alice1234!')}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white text-[11px] font-medium transition-all text-center group"
              >
                <span className="block font-semibold group-hover:text-accent-light">Owner</span>
                <span className="text-[9px] text-navy-400 block truncate">alice@dev</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('bob@trustvault.dev', 'Bob12345!')}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white text-[11px] font-medium transition-all text-center group"
              >
                <span className="block font-semibold group-hover:text-accent-light">Collaborator</span>
                <span className="text-[9px] text-navy-400 block truncate">bob@dev</span>
              </button>
            </div>
          </div>

          <p className="text-center text-navy-300 text-xs mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-light hover:underline font-semibold">
              Create an account
            </Link>
          </p>
        </div>

        {/* Security Guarantee Footer */}
        <div className="text-center text-navy-400 text-xs mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-Knowledge Architecture · Strict Object-Level ACL</span>
        </div>
      </div>
    </div>
  )
}

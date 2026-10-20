import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, UserPlus, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Valid corporate email required'
    }
    if (form.username.length < 3) {
      e.username = 'Minimum 3 characters'
    } else if (!/^[a-zA-Z0-9_\-]+$/.test(form.username)) {
      e.username = 'Alphanumeric, _ and - characters only'
    }
    if (!form.full_name.trim()) {
      e.full_name = 'Full name is required'
    }
    if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.register(form)
      // Auto-login after registration
      const login = await authApi.login({ email: form.email, password: form.password })
      setUser(login.data)
      toast.success(`Account registered! Welcome to TrustVault, ${login.data.full_name}.`)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Registration failed. Please check inputs.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
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
          <p className="text-navy-300 mt-1 text-xs">Provision a New Cryptographic Vault Account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 shadow-glass">
          <h2 className="text-lg font-bold text-white mb-1">Create Account</h2>
          <p className="text-xs text-navy-300 mb-5">
            Passwords hashed with memory-hard Argon2id
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1">
                Full Name
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/10 border text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.full_name
                    ? 'border-red-400/80 focus:ring-red-400/40'
                    : 'border-white/15 focus:ring-accent/60 focus:border-accent'
                }`}
                placeholder="Jane Doe"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
              {errors.full_name && (
                <p className="text-red-300 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1">
                Corporate Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/10 border text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-400/80 focus:ring-red-400/40'
                    : 'border-white/15 focus:ring-accent/60 focus:border-accent'
                }`}
                placeholder="jane@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
              {errors.email && (
                <p className="text-red-300 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1">
                Vault Username
              </label>
              <input
                id="reg-username"
                type="text"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/10 border text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.username
                    ? 'border-red-400/80 focus:ring-red-400/40'
                    : 'border-white/15 focus:ring-accent/60 focus:border-accent'
                }`}
                placeholder="janedoe"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              />
              {errors.username && (
                <p className="text-red-300 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-200 mb-1">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/10 border text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-red-400/80 focus:ring-red-400/40'
                      : 'border-white/15 focus:ring-accent/60 focus:border-accent'
                  }`}
                  placeholder="Min 8 characters"
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
              {errors.password && (
                <p className="text-red-300 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold text-sm transition-all active:scale-[0.985] disabled:opacity-60 mt-3 flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{loading ? 'Provisioning Vault…' : 'Complete Registration'}</span>
            </button>
          </form>

          <p className="text-center text-navy-300 text-xs mt-6">
            Already have an active account?{' '}
            <Link to="/login" className="text-accent-light hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Security Assurance */}
        <div className="text-center text-navy-400 text-xs mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Immutable Audit Logging · End-to-End Cryptographic Chain</span>
        </div>
      </div>
    </div>
  )
}

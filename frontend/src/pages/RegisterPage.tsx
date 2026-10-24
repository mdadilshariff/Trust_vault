import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, UserPlus, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import { emitAppUpdate } from '../store/events'
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
      if (login.data.access_token) {
        localStorage.setItem('tv_token', login.data.access_token)
      }
      setUser(login.data)
      emitAppUpdate({
        action: 'USER_REGISTERED',
        actor: login.data.email,
        outcome: 'success',
        details: `Provisioned cryptographic key pair and user profile for ${login.data.username}.`,
      })
      toast.success(`Vault provisioned for ${login.data.full_name}`)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Registration failed. Please check inputs.'
      toast.error(msg)
      emitAppUpdate({
        action: 'REGISTRATION_FAILED',
        actor: form.email || 'anonymous',
        outcome: 'error',
        details: `Registration rejected: ${msg}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-indigo-950/70 border border-indigo-700/50 flex items-center justify-center text-indigo-300 mb-3 shadow-xs">
            <Lock className="w-5 h-5 text-indigo-300" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            TrustVault
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Secure Document Storage
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-terminal">
          <div className="pb-4 mb-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-100">
              Create an Account
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter your details to create your secure account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                Full Name
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                className={`input ${errors.full_name ? 'input-error' : ''}`}
                placeholder="Jane Doe"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
              {errors.full_name && (
                <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="label">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="label">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                required
                className={`input ${errors.username ? 'input-error' : ''}`}
                placeholder="janedoe"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="label">
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className={`input pr-9 ${errors.password ? 'input-error' : ''}`}
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
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-medium mt-2"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-xs">
              Already have an account?{' '}
              <Link to="/login" className="text-zinc-200 hover:text-white underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="text-center text-zinc-500 text-xs mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Protected with end-to-end security & encryption</span>
        </div>
      </div>
    </div>
  )
}

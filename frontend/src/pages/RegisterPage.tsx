import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, UserPlus } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Required'
    if (form.username.length < 3) e.username = 'Min 3 characters'
    if (!/^[a-zA-Z0-9_\-]+$/.test(form.username)) e.username = 'Letters, numbers, _ and - only'
    if (!form.full_name) e.full_name = 'Required'
    if (form.password.length < 8) e.password = 'Min 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const r = await authApi.register(form)
      // Auto-login after registration
      const login = await authApi.login({ email: form.email, password: form.password })
      setUser(login.data)
      toast.success('Account created! Welcome to TrustVault.')
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Registration failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const field = (
    id: string, label: string, type: string, key: keyof typeof form, placeholder: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-navy-200 mb-1">{label}</label>
      <input
        id={`reg-${id}`}
        type={type}
        required
        className={`w-full px-3 py-2.5 rounded-lg bg-white/10 border text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-2 transition-colors ${
          errors[key]
            ? 'border-red-500/50 focus:ring-red-500/30'
            : 'border-white/20 focus:ring-accent/50 focus:border-accent'
        }`}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <p className="text-red-300 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-xl mb-4">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TrustVault</h1>
          <p className="text-navy-300 mt-1 text-sm">Create your secure account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-glass">
          <h2 className="text-xl font-semibold text-white mb-6">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('email', 'Email', 'email', 'email', 'you@example.com')}
            {field('username', 'Username', 'text', 'username', 'yourname')}
            {field('fullname', 'Full Name', 'text', 'full_name', 'Your Name')}
            {field('password', 'Password', 'password', 'password', '8+ characters')}

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <UserPlus className="w-4 h-4" />}
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-navy-300 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

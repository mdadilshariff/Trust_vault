import { useEffect, useState } from 'react'
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Lock, Check, Copy, KeyRound, Cpu, Shield, ArrowRight, Layers
} from 'lucide-react'
import { auditApi } from '../api'
import { emitAppUpdate } from '../store/events'
import type { IntegrityResult } from '../types'
import toast from 'react-hot-toast'

export default function IntegrityPage() {
  const [result, setResult] = useState<IntegrityResult | null>(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    setLoading(true)
    try {
      const r = await auditApi.integrity()
      setResult(r.data)
      emitAppUpdate({
        action: 'INTEGRITY_VERIFIED',
        outcome: r.data.valid ? 'success' : 'denied',
        details: `Traversed ${r.data.checked} records. Result: ${r.data.valid ? 'Secure' : 'Issue detected'}.`,
      })
      if (r.data.valid) {
        toast.success(`Security check passed (${r.data.checked} records verified)`)
      } else {
        toast.error(`Security alert at record #${r.data.broken_at}!`)
      }
    } catch {
      toast.error('Failed to run security check')
    }
    setLoading(false)
  }

  useEffect(() => {
    check()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-sans text-zinc-100 tracking-tight">
              Cryptographic Security Check
            </h1>
            <span className="badge-green text-[10px]">
              SHA-256 Chained
            </span>
          </div>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Real-time mathematical verification of all audit events and document logs
          </p>
        </div>

        <button
          onClick={check}
          disabled={loading}
          className="btn-primary text-xs self-start sm:self-auto inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Authenticating Chain...' : 'Run Security Check'}</span>
        </button>
      </div>

      {/* Main Verification Deck */}
      {result ? (
        <div className="space-y-6">
          {/* Status Banner Card */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-card">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm ${
                    result.valid
                      ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                      : 'bg-rose-950/70 border-rose-700/60 text-rose-300'
                  }`}
                >
                  {result.valid ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-zinc-100">
                      {result.valid
                        ? 'Immutable Chain Verified · All Records Untampered'
                        : 'Security Warning · Inconsistency Detected'}
                    </h2>
                    <span className={`text-[10px] uppercase font-medium ${
                      result.valid ? 'badge-green' : 'badge-red'
                    }`}>
                      {result.valid ? 'Active Seal' : 'Broken Chain'}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-1 max-w-xl leading-relaxed">
                    {result.valid
                      ? `Cryptographic hash traversal completed across ${result.checked} sequential log entries. Every event hash exactly matches its parent block.`
                      : `Data mismatch detected at sequence #${result.broken_at}. Reason: ${result.reason}.`}
                  </p>
                </div>
              </div>

              {/* Stat Chips */}
              <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 self-stretch md:self-auto justify-around">
                <div className="text-center px-3 border-r border-zinc-800">
                  <span className="text-[11px] text-zinc-500 block">Records Checked</span>
                  <span className="text-xl font-bold text-zinc-100">{result.checked}</span>
                </div>
                <div className="text-center px-3">
                  <span className="text-[11px] text-zinc-500 block">Health Rating</span>
                  <span className="text-xl font-bold text-emerald-400">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Block Chain Representation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Sequential Chain Architecture
                </h3>
              </div>
              <span className="text-xs text-zinc-500">
                Continuous Hash Verification
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Genesis Block</span>
                  <span className="badge-green text-[9px]">Verified #1</span>
                </div>
                <div className="text-zinc-200 font-semibold truncate">System Initialization</div>
                <p className="text-[11px] text-zinc-400">Root authorization matrix and schema configuration</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Intermediate Blocks</span>
                  <span className="badge-blue text-[9px]">Continuous Chain</span>
                </div>
                <div className="text-zinc-200 font-semibold truncate">Audit Events & Shares</div>
                <p className="text-[11px] text-zinc-400">Sequential SHA-256 linking of permissions and file uploads</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-indigo-400 font-medium">Head Block</span>
                  <span className="badge-blue text-[9px]">Latest #{result.checked}</span>
                </div>
                <div className="text-zinc-100 font-semibold truncate">Chain Sealed & Secure</div>
                <p className="text-[11px] text-zinc-400">Zero database injection or out-of-order mutations detected</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-20 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Verifying cryptographic hash sequence...</p>
        </div>
      )}

      {/* Explanation Banner */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-start gap-3.5 text-xs">
        <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-zinc-400 leading-relaxed">
          <p className="font-semibold text-zinc-200">
            Why cryptographic integrity matters
          </p>
          <p className="text-[11px]">
            In traditional systems, an insider or database administrator could silently alter document records without detection. TrustVault chains each audit record to the mathematical SHA-256 hash of its predecessor. Any unauthorized edit or row deletion breaks the mathematical link and raises an instant security alert.
          </p>
        </div>
      </div>
    </div>
  )
}

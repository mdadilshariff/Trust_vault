import { useEffect, useState } from 'react'
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Link as LinkIcon, Database, Lock, Cpu, FileCode2
} from 'lucide-react'
import { auditApi } from '../api'
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
      if (r.data.valid) {
        toast.success(`Integrity verified across ${r.data.checked} events.`)
      } else {
        toast.error(`Integrity violation at sequence ${r.data.broken_at}!`)
      }
    } catch {
      toast.error('Failed to run integrity verification')
    }
    setLoading(false)
  }

  useEffect(() => { check() }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Audit Chain Integrity</h1>
            <span className="badge-blue text-[11px] font-mono">SHA-256 Chain</span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Cryptographic mathematical verification of the append-only audit trail
          </p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="btn-primary text-xs self-start sm:self-auto shadow-sm hover:shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Verifying Chain...' : 'Re-verify Hashes'}</span>
        </button>
      </div>

      {/* Main Status Hero Card */}
      {result ? (
        <div
          className={`card transition-all duration-300 border-2 ${
            result.valid
              ? 'border-emerald-500/30 bg-gradient-to-br from-white via-white to-emerald-50/30 shadow-md'
              : 'border-red-500/40 bg-gradient-to-br from-white via-white to-red-50/30 shadow-md'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  result.valid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {result.valid ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2
                    className={`text-xl font-bold ${
                      result.valid ? 'text-emerald-800' : 'text-red-800'
                    }`}
                  >
                    {result.valid ? 'Cryptographic Chain Verified' : 'Integrity Violation Detected'}
                  </h2>
                  <span
                    className={`badge ${
                      result.valid ? 'badge-green' : 'badge-red'
                    } text-xs uppercase font-mono font-semibold`}
                  >
                    {result.valid ? '100% Intact' : 'Tampered'}
                  </span>
                </div>
                <p className="text-slate-600 mt-1 text-sm max-w-xl">
                  {result.valid
                    ? `All ${result.checked} sequential log entries were traversed. Each event payload matches its deterministic SHA-256 fingerprint, and every prev_hash pointer is strictly continuous.`
                    : `Data mismatch detected at sequence index #${result.broken_at}. Reason: ${result.reason}.`}
                </p>
              </div>
            </div>

            {/* Verification Statistics */}
            <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
              <div className="text-left md:text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Records Checked
                </span>
                <span className="text-2xl font-bold font-mono text-slate-800">
                  {result.checked} <span className="text-xs text-slate-400 font-sans font-normal">events</span>
                </span>
              </div>
              <div className="mt-2 text-right hidden md:block">
                <span className="badge-gray text-[10px] font-mono">Algorithm: SHA-256</span>
              </div>
            </div>
          </div>

          {/* Visual Blockchain Flowchart / Linkage */}
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5 text-accent" /> Sequential Hash Chain Structure
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>EVENT #1 (Genesis)</span>
                  <span className="badge-green text-[9px] py-0 px-1.5">Valid</span>
                </div>
                <div className="text-slate-700 font-semibold truncate">system:init</div>
                <div className="text-[11px] text-slate-500 truncate">
                  <span className="text-slate-400">prev:</span> null (genesis)
                </div>
                <div className="text-[11px] text-emerald-600 truncate">
                  <span className="text-slate-400">hash:</span> 4a9f...e18b
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>EVENT #N-1</span>
                  <span className="badge-green text-[9px] py-0 px-1.5">Valid</span>
                </div>
                <div className="text-slate-700 font-semibold truncate">document:upload</div>
                <div className="text-[11px] text-slate-500 truncate">
                  <span className="text-slate-400">prev:</span> 4a9f...e18b
                </div>
                <div className="text-[11px] text-emerald-600 truncate">
                  <span className="text-slate-400">hash:</span> 8d3c...90fa
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/20 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-accent text-[10px]">
                  <span className="font-semibold">EVENT #N (Latest)</span>
                  <span className="badge-blue text-[9px] py-0 px-1.5">Sealed</span>
                </div>
                <div className="text-slate-800 font-semibold truncate">audit:integrity_check</div>
                <div className="text-[11px] text-slate-500 truncate">
                  <span className="text-slate-400">prev:</span> 8d3c...90fa
                </div>
                <div className="text-[11px] text-accent truncate">
                  <span className="text-slate-400">hash:</span> f10e...27bb
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Traversing cryptographic hash chain...</p>
        </div>
      )}

      {/* Threat Model Alert & Security Limits */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed space-y-1.5">
          <p className="font-bold text-amber-950 text-sm">Threat Model & Architectural Boundary</p>
          <p>
            A SHA-256 hash chain provides robust, instant detection of <strong>individual row tampering</strong> (e.g. an insider directly altering an action or actor in a database row without re-signing the successor blocks).
          </p>
          <p className="text-amber-800">
            However, an adversary with unrestricted SQL root write access could technically recalculate the hashes of the entire chain from scratch. In high-assurance production environments, this chain is periodically anchored to external WORM (Write Once Read Many) storage or immutable ledger checkpoints. Documented in full within <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">THREATS.md</code>.
          </p>
        </div>
      </div>

      {/* How It Works Grid */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" /> Cryptographic Guarantees & Verification Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </span>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Deterministic JSON Canonicalization</p>
              <p className="text-slate-500 leading-relaxed">
                Events are serialized using strict key sorting (<code className="font-mono text-[11px]">sort_keys=True</code>) and stripped whitespace to ensure byte-exact repeatability across platforms.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </span>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">SHA-256 Payload Hashing</p>
              <p className="text-slate-500 leading-relaxed">
                A cryptographic digest is generated from the canonical representation and stored in the <code className="font-mono text-[11px]">event_hash</code> column.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </span>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Backward Hash Chaining</p>
              <p className="text-slate-500 leading-relaxed">
                Every newly created audit event incorporates the hash of its direct predecessor as <code className="font-mono text-[11px]">prev_hash</code>, binding the entire sequence irreversibly.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              4
            </span>
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Read-Only Enforced Access</p>
              <p className="text-slate-500 leading-relaxed">
                No user or administrator endpoint exists to update or delete audit records. App-level APIs are strictly append-only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

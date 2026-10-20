import { useEffect, useState } from 'react'
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { auditApi } from '../api'
import type { IntegrityResult } from '../types'

export default function IntegrityPage() {
  const [result, setResult] = useState<IntegrityResult | null>(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    setLoading(true)
    try {
      const r = await auditApi.integrity()
      setResult(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { check() }, [])

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Integrity Check</h1>
          <p className="text-slate-500 text-sm mt-0.5">Verify the SHA-256 hash chain of all audit events.</p>
        </div>
        <button onClick={check} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-check
        </button>
      </div>

      {result && (
        <div className={`card ${result.valid ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className="flex items-start gap-4">
            {result.valid
              ? <CheckCircle className="w-10 h-10 text-emerald-500 flex-shrink-0 mt-0.5" />
              : <XCircle className="w-10 h-10 text-red-500 flex-shrink-0 mt-0.5" />}
            <div>
              <h2 className={`text-lg font-bold ${result.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.valid ? 'Chain Integrity Verified' : 'Chain Integrity Violation Detected'}
              </h2>
              <p className="text-slate-600 mt-1 text-sm">
                {result.checked} events checked.
                {result.valid
                  ? ' Every event hash matches its serialized content and the chain of previous hashes is intact.'
                  : ` Tampering detected at sequence ${result.broken_at}. Reason: ${result.reason}.`}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-100">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important limitation</p>
                <p>A SHA-256 hash chain detects <strong>single-row tampering</strong> (editing one event without updating the chain). However, an attacker with full database write access could rewrite <em>the entire chain</em> and this check would still pass. Independently protected checkpoints (e.g., external timestamping authorities, write-once storage) would be needed to defeat a full-chain rewrite. See <code>THREATS.md</code> for full risk documentation.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" /> How It Works
        </h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><span className="text-accent font-bold">1.</span> Each audit event is serialized with deterministic JSON (sorted keys, no whitespace).</li>
          <li className="flex gap-2"><span className="text-accent font-bold">2.</span> A SHA-256 hash of the serialized content is stored in <code className="text-xs bg-slate-100 px-1 rounded">event_hash</code>.</li>
          <li className="flex gap-2"><span className="text-accent font-bold">3.</span> The previous event's hash is included in the serialization as <code className="text-xs bg-slate-100 px-1 rounded">prev_hash</code>, chaining the records.</li>
          <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Normal users have no API to modify audit records. Database-level access is protected by OS permissions.</li>
          <li className="flex gap-2"><span className="text-accent font-bold">5.</span> This verification walks every record in sequence order and recomputes all hashes.</li>
        </ul>
      </div>
    </div>
  )
}

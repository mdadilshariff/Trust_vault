import { useState } from 'react'
import {
  Terminal, X, Play, Pause, Trash2, CheckCircle2,
  AlertTriangle, Copy, Check, ExternalLink, Activity
} from 'lucide-react'
import { useEventStore } from '../store/events'
import toast from 'react-hot-toast'

interface LiveTelemetryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function LiveTelemetryDrawer({ isOpen, onClose }: LiveTelemetryDrawerProps) {
  const { events, isLive, toggleLive } = useEventStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!isOpen) return null

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedId(id)
    toast.success('Security ID copied to clipboard', { duration: 1500 })
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col font-sans animate-slide-down">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Live Activity Feed
              </h2>
              <span className="badge-mono text-[10px]">
                {events.length} events
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Real-time feed of actions across your account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleLive}
            title={isLive ? 'Pause feed' : 'Resume feed'}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              isLive
                ? 'bg-zinc-900 border-zinc-700 text-emerald-400 hover:bg-zinc-800'
                : 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stream Status Banner */}
      <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="live-dot">
            <span className={`live-dot-ping ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`live-dot-core ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          </span>
          <span className="font-semibold text-zinc-200">
            {isLive ? 'Live Updates Active' : 'Updates Paused'}
          </span>
        </div>
        <span className="text-zinc-500 text-[10px]">Connected</span>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-zinc-900">
        {events.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            No recent activity recorded yet.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="pt-2.5 first:pt-0 bg-zinc-900/30 hover:bg-zinc-900/70 p-3 rounded-lg border border-zinc-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                      evt.outcome === 'success'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                        : evt.outcome === 'denied'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    }`}
                  >
                    {evt.action.replace(/_/g, ' ')}
                  </span>
                  {evt.latencyMs && (
                    <span className="text-[10px] text-zinc-500">
                      {evt.latencyMs}ms
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {evt.details && (
                <p className="text-[11px] text-zinc-300 font-sans mb-1.5 leading-relaxed">
                  {evt.details}
                </p>
              )}

              <div className="space-y-1 text-[11px] text-zinc-400">
                {evt.actor && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500">User:</span>
                    <span className="text-zinc-300 truncate">{evt.actor}</span>
                  </div>
                )}
                {evt.resource && (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-zinc-500">Item:</span>
                    <span className="text-zinc-400 truncate">{evt.resource}</span>
                  </div>
                )}
                {evt.hash && (
                  <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-zinc-800/60 font-mono text-[10px]">
                    <span className="text-zinc-500 truncate">
                      ID: {evt.hash.substring(0, 16)}…
                    </span>
                    <button
                      onClick={() => copyHash(evt.hash!, evt.id)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      title="Copy security hash"
                    >
                      {copiedId === evt.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>TrustVault Activity Feed</span>
        <span className="text-zinc-400">Protected & Verified</span>
      </div>
    </div>
  )
}

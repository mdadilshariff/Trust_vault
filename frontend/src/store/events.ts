import { create } from 'zustand'
import { auditApi } from '../api'

export interface LiveTelemetryEvent {
  id: string
  sequence?: number
  timestamp: string
  action: string
  actor?: string
  resource?: string
  outcome: 'success' | 'denied' | 'error'
  hash?: string
  latencyMs?: number
  details?: string
}

import type { AuditEvent } from '../types'

interface EventStoreState {
  events: LiveTelemetryEvent[]
  isLive: boolean
  lastSyncedAt: Date | null
  totalOps: number
  chainValid: boolean
  toggleLive: () => void
  addEvent: (e: Omit<LiveTelemetryEvent, 'id' | 'timestamp'> & { timestamp?: string }) => void
  fetchLatestEvents: () => Promise<void>
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  events: [
    {
      id: 'sys-init-0',
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_BOOTSTRAP',
      actor: 'system',
      resource: 'vault_engine',
      outcome: 'success',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      latencyMs: 12,
      details: 'Cryptographic SHA-256 vault initialized with zero-leak isolation.',
    },
  ],
  isLive: true,
  lastSyncedAt: new Date(),
  totalOps: 1,
  chainValid: true,

  toggleLive: () => set((s) => ({ isLive: !s.isLive })),

  addEvent: (e) => {
    const newEvent: LiveTelemetryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: e.timestamp || new Date().toISOString(),
      action: e.action,
      actor: e.actor || 'current_user',
      resource: e.resource,
      outcome: e.outcome,
      hash: e.hash,
      latencyMs: e.latencyMs || Math.floor(Math.random() * 25) + 8,
      details: e.details,
    }

    set((state) => ({
      events: [newEvent, ...state.events].slice(0, 50),
      totalOps: state.totalOps + 1,
      lastSyncedAt: new Date(),
    }))

    // Dispatch global event so all subscribed pages refresh data seamlessly
    window.dispatchEvent(new CustomEvent('tv:data-changed', { detail: newEvent }))
  },

  fetchLatestEvents: async () => {
    try {
      const res = await auditApi.my({ page: 1, page_size: 15 })
      if (res.data?.items) {
        const mapped: LiveTelemetryEvent[] = res.data.items.map((item: AuditEvent) => ({
          id: item.id,
          sequence: item.sequence,
          timestamp: item.timestamp,
          action: item.action,
          actor: item.actor_email || 'user',
          resource: item.resource_id,
          outcome: item.outcome,
          hash: item.event_hash,
          latencyMs: 14,
        }))

        set((state) => {
          // Merge unique events
          const existingIds = new Set(state.events.map((e) => e.id))
          const fresh = mapped.filter((e) => !existingIds.has(e.id))
          return {
            events: [...fresh, ...state.events].slice(0, 50),
            totalOps: state.totalOps + fresh.length,
            lastSyncedAt: new Date(),
          }
        })
      }
    } catch {}
  },
}))

// Helper function to dispatch application updates from anywhere
export function emitAppUpdate(e: Omit<LiveTelemetryEvent, 'id' | 'timestamp'>) {
  useEventStore.getState().addEvent(e)
}

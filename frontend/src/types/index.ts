export interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
}

export interface Document {
  id: string
  owner_id: string
  title: string
  description?: string
  category?: string
  original_filename: string
  file_size: number
  mime_type: string
  file_extension: string
  created_at: string
  updated_at: string
  owner_username?: string
  my_permission?: 'owner' | 'edit' | 'read'
}

export interface DocumentListOut {
  items: Document[]
  total: number
  page: number
  page_size: number
}

export interface Permission {
  id: string
  document_id: string
  user_id: string
  username: string
  email: string
  permission: 'read' | 'edit'
  granted_by_id?: string
  created_at: string
  updated_at: string
}

export interface AuditEvent {
  id: string
  sequence: number
  actor_id?: string
  actor_email?: string
  action: string
  resource_type?: string
  resource_id?: string
  outcome: 'success' | 'denied' | 'error'
  metadata_json?: string
  ip_address?: string
  prev_hash?: string
  event_hash: string
  timestamp: string
}

export interface AuditListOut {
  items: AuditEvent[]
  total: number
  page: number
  page_size: number
}

export interface IntegrityResult {
  valid: boolean
  checked: number
  broken_at?: number
  reason?: string
}

export interface AdminStats {
  user_count: number
  document_count: number
  denied_attempt_count: number
  recent_events: {
    id: string
    sequence: number
    actor_email?: string
    action: string
    outcome: string
    timestamp: string
  }[]
  audit_integrity: IntegrityResult
}

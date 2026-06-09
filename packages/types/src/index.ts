export interface Task {
  id: string
  title: string
  description?: string
  done: boolean
  dueAt?: string
  createdAt: string
  updatedAt: string
}

export interface Schedule {
  id: string
  name: string
  cronExpr: string
  action: string
  enabled: boolean
  createdAt: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  channel: 'whatsapp' | 'telegram' | 'web'
}

export interface Client {
  id: string
  name: string
  contactInfo?: string
  createdAt: string
}

import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export type DependencyStatus = {
  ok: boolean
  status: 'ok' | 'missing' | 'error'
  message?: string
}

export type ReadinessReport = {
  ok: boolean
  service: 'nara-backend'
  timestamp: string
  dependencies: {
    database: DependencyStatus
    redis: DependencyStatus
    openclaw: DependencyStatus
  }
}

export type Task = {
  id: string
  title: string
  description: string | null
  done: boolean
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTaskInput = {
  title: string
  description?: string
  dueAt?: string
}

export type Operator = {
  username: string
  role: 'operator'
}

export type LoginInput = {
  username: string
  password: string
}

export type User = {
  id: string
  displayName: string
  email: string | null
  role: 'admin' | 'user'
  disabled: boolean
  createdAt: string
  updatedAt: string
}

export type CreateUserInput = {
  displayName: string
  email?: string
  role?: 'admin' | 'user'
}

export type UserContact = {
  id: string
  userId: string
  type: 'whatsapp' | 'email'
  value: string
  label: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AddContactInput = {
  type: 'whatsapp' | 'email'
  value: string
  label?: string
}

export type AgentChannelAccess = {
  id: string
  channelId: string
  userId: string
  contactId: string
  status: 'pending_verification' | 'pending_allowlist' | 'allowed' | 'blocked' | 'sync_failed'
  requestedAt: string
  allowedAt: string | null
  blockedAt: string | null
  lastSyncAt: string | null
  syncError: string | null
  createdAt: string
  updatedAt: string
}

export type RequestAgentAccessInput = {
  contactId: string
  channelType?: 'whatsapp' | 'telegram'
}

export type UpdateAgentAccessInput = {
  status: 'pending_verification' | 'pending_allowlist' | 'allowed' | 'blocked' | 'sync_failed'
  syncError?: string
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

export const getReadiness = async () => {
  const response = await api.get<ReadinessReport>('/readiness', {
    validateStatus: (status) => status < 600,
  })
  return response.data
}

export const loginOperator = async (input: LoginInput) => {
  const response = await api.post<{ token: string; operator: Operator }>('/auth/login', input)
  localStorage.setItem('token', response.data.token)
  return response.data
}

export const getCurrentOperator = async () => {
  const response = await api.get<{ operator: Operator }>('/auth/me')
  return response.data.operator
}

export const logoutOperator = () => {
  localStorage.removeItem('token')
}

export const listTasks = async () => {
  const response = await api.get<Task[]>('/tasks')
  return response.data
}

export const createTask = async (input: CreateTaskInput) => {
  const response = await api.post<Task>('/tasks', input)
  return response.data
}

export const completeTask = async (id: string) => {
  const response = await api.patch<Task>(`/tasks/${id}/complete`)
  return response.data
}

export const listUsers = async () => {
  const response = await api.get<User[]>('/users')
  return response.data
}

export const createUser = async (input: CreateUserInput) => {
  const response = await api.post<User>('/users', input)
  return response.data
}

export const getUserById = async (id: string) => {
  const response = await api.get<User>('/users/' + id)
  return response.data
}

export const listUserContacts = async (userId: string) => {
  const response = await api.get<UserContact[]>('/users/' + userId + '/contacts')
  return response.data
}

export const addContact = async (userId: string, input: AddContactInput) => {
  const response = await api.post<UserContact>('/users/' + userId + '/contacts', input)
  return response.data
}

export const requestAgentAccess = async (userId: string, input: RequestAgentAccessInput) => {
  const response = await api.post<AgentChannelAccess>('/users/' + userId + '/agent-access', input)
  return response.data
}

export const listAgentAccess = async () => {
  const response = await api.get<AgentChannelAccess[]>('/agent-access')
  return response.data
}

export const updateAgentAccess = async (id: string, input: UpdateAgentAccessInput) => {
  const response = await api.patch<AgentChannelAccess>('/agent-access/' + id, input)
  return response.data
}

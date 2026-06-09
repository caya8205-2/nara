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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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

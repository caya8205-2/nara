import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Trash2,
} from 'lucide-react'
import {
  completeTask,
  createTask,
  deleteTask,
  getCurrentOperator,
  getReadiness,
  listTasks,
  loginOperator,
  logoutOperator,
  type DependencyStatus,
} from '../lib/api'

const dependencyLabels = {
  backup: 'Backup',
  backupWorker: 'Backup Worker',
  database: 'PostgreSQL',
  redis: 'Redis',
  reminderWorker: 'Reminder Worker',
  openclaw: 'OpenClaw',
} as const

const dependencyIcons = {
  backup: Database,
  backupWorker: Clock3,
  database: Database,
  redis: Activity,
  reminderWorker: Clock3,
  openclaw: Bot,
} as const

const formatDependencyKey = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const statusClasses = (status?: DependencyStatus) => {
  if (status?.ok) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status?.status === 'disabled') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status?.status === 'missing') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

const StatusPill = ({ status }: { status?: DependencyStatus }) => (
  <span
    className={[
      'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold',
      statusClasses(status),
    ].join(' ')}
  >
    <span
      className={[
        'h-1.5 w-1.5 rounded-full',
        status?.ok ? 'bg-emerald-500' : status?.status === 'missing' || status?.status === 'disabled' ? 'bg-amber-500' : 'bg-rose-500',
      ].join(' ')}
    />
    {status?.ok ? 'Online' : status?.status ?? 'Checking'}
  </span>
)

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem('token')))

  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: getReadiness,
    refetchInterval: 15_000,
  })

  const operatorQuery = useQuery({
    queryKey: ['operator'],
    queryFn: getCurrentOperator,
    enabled: hasToken,
    retry: false,
    refetchOnMount: 'always',
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
    enabled: hasToken && operatorQuery.isSuccess,
    retry: false,
  })

  useEffect(() => {
    if (operatorQuery.isError && (operatorQuery.error as any)?.response?.status === 401) {
      logoutOperator()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ['operator'] })
      queryClient.removeQueries({ queryKey: ['tasks'] })
    }
  }, [operatorQuery.error, operatorQuery.isError, queryClient])

  useEffect(() => {
    if (tasksQuery.isError && (tasksQuery.error as any)?.response?.status === 401) {
      logoutOperator()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ['operator'] })
      queryClient.removeQueries({ queryKey: ['tasks'] })
    }
  }, [queryClient, tasksQuery.error, tasksQuery.isError])

  const loginMutation = useMutation({
    mutationFn: loginOperator,
    onSuccess: () => {
      setPassword('')
      setAuthError(null)
      setHasToken(true)
      queryClient.invalidateQueries({ queryKey: ['operator'] })
    },
    onError: () => setAuthError('Login gagal. Periksa username dan password.'),
  })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setTitle('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['readiness'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const tasks = tasksQuery.data ?? []
  const pendingTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks])
  const doneTasks = tasks.length - pendingTasks.length
  const readiness = readinessQuery.data
  const operator = operatorQuery.data
  const isAuthenticated = hasToken && Boolean(operator)

  const backendStatus: DependencyStatus | undefined = readiness
    ? { ok: true, status: readiness.ok ? 'ok' : 'error' }
    : undefined
  const backendLabel = readiness
    ? readiness.ok
      ? 'Ready'
      : 'Degraded'
    : readinessQuery.isLoading
      ? 'Checking'
      : 'Unavailable'

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    createMutation.mutate({
      title: trimmedTitle,
      description: description.trim() || undefined,
    })
  }

  const onLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginMutation.mutate({
      username: username.trim(),
      password,
    })
  }

  const logout = () => {
    logoutOperator()
    setHasToken(false)
    queryClient.removeQueries({ queryKey: ['operator'] })
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['readiness'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const onDeleteTask = (id: string) => {
    if (confirm('Delete this task permanently?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Overview</h1>
            <p className="mt-1 text-sm text-slate-600">
              Backend status, operator session, and task management
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated && (
              <div className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700">
                <Shield className="h-4 w-4" />
                {operator?.username}
              </div>
            )}
            {hasToken && (
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={readinessQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={['h-4 w-4', readinessQuery.isFetching && 'animate-spin'].join(' ')} />
              Refresh
            </button>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-amber-900">Operator Login Required</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Log in to manage tasks and access protected admin features.
                </p>
                <form onSubmit={onLogin} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-amber-900">Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-900">Password</label>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      className="mt-1 h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Login
                  </button>
                  {authError && (
                    <p className="text-sm text-amber-800 sm:col-span-2">{authError}</p>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Server className="h-4 w-4" />
                Backend API
              </div>
              <StatusPill status={backendStatus} />
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-950">
              {backendLabel}
            </p>
            <p className="mt-1 text-sm text-slate-500">API liveness and dependency readiness</p>
          </div>

          {readiness &&
            Object.entries(readiness.dependencies).map(([key, value]) => {
              const Icon = dependencyIcons[key as keyof typeof dependencyIcons] ?? Server
              const label = dependencyLabels[key as keyof typeof dependencyLabels] ?? formatDependencyKey(key)
              return (
                <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                    <StatusPill status={value} />
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-slate-950">
                    {value.ok ? 'Healthy' : value.status.charAt(0).toUpperCase() + value.status.slice(1)}
                  </p>
                  <p className="mt-1 min-h-5 text-sm text-slate-500">{value.message || 'Connection status'}</p>
                </div>
              )
            })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-950">Add Task</h2>
              {!isAuthenticated && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Login required
                </span>
              )}
            </div>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isAuthenticated}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Follow up with supplier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isAuthenticated}
                  className="mt-1 min-h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Optional notes"
                />
              </div>
              <button
                type="submit"
                disabled={!isAuthenticated || createMutation.isPending || !title.trim()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Tasks</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {pendingTasks.length} pending, {doneTasks} completed
                </p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {tasks.length} total
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {pendingTasks.length} open
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tasksQuery.isLoading && (
                <p className="p-4 text-sm text-slate-500">Loading tasks...</p>
              )}
              {!tasksQuery.isLoading && tasks.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No tasks yet. Create one to get started.</p>
              )}
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {task.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Clock3 className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <h3 className="truncate text-sm font-semibold text-slate-950">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!task.done && (
                      <button
                        type="button"
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={!isAuthenticated || completeMutation.isPending}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      disabled={!isAuthenticated || deleteMutation.isPending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Wifi,
} from 'lucide-react'
import {
  completeTask,
  createTask,
  getCurrentOperator,
  getReadiness,
  listTasks,
  loginOperator,
  logoutOperator,
  type DependencyStatus,
} from '../lib/api'

const dependencyLabels = {
  database: 'Database',
  redis: 'Redis',
  openclaw: 'OpenClaw',
} as const

const dependencyIcons = {
  database: Database,
  redis: Activity,
  openclaw: Bot,
} as const

const navItems = ['Overview', 'Health', 'Agent Tools', 'Logs', 'Config', 'Backup']

const statusClasses = (status?: DependencyStatus) => {
  if (status?.ok) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
        status?.ok ? 'bg-emerald-500' : status?.status === 'missing' ? 'bg-amber-500' : 'bg-rose-500',
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

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
  })

  const operatorQuery = useQuery({
    queryKey: ['operator'],
    queryFn: getCurrentOperator,
    enabled: hasToken,
    retry: false,
  })

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

  const tasks = tasksQuery.data ?? []
  const pendingTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks])
  const doneTasks = tasks.length - pendingTasks.length
  const readiness = readinessQuery.data
  const operator = operatorQuery.data
  const isAuthenticated = hasToken && Boolean(operator)

  const backendStatus: DependencyStatus | undefined = readiness
    ? { ok: readiness.ok, status: readiness.ok ? 'ok' : 'error' }
    : undefined

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

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-5 px-4 py-5 sm:px-6">
        <aside className="hidden w-56 shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:block">
          <div className="flex h-11 items-center gap-3 border-b border-slate-100 px-2 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nara Control</p>
              <p className="text-xs text-slate-500">Local Admin</p>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {navItems.map((item, index) => (
              <button
                key={item}
                type="button"
                className={[
                  'flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-medium',
                  index === 0
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Nara Control</h1>
                  <StatusPill status={backendStatus} />
                </div>
                <p className="mt-1 text-sm text-slate-500">Office server dashboard</p>
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
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                )}
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Server className="h-4 w-4" />
                  Backend
                </div>
                <StatusPill status={backendStatus} />
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">
                {readiness?.ok ? 'Ready' : readinessQuery.isLoading ? 'Checking' : 'Attention'}
              </p>
              <p className="mt-1 text-sm text-slate-500">API and service readiness</p>
            </div>

            {readiness &&
              Object.entries(readiness.dependencies).map(([key, value]) => {
                const Icon = dependencyIcons[key as keyof typeof dependencyIcons] ?? Wifi
                return (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Icon className="h-4 w-4" />
                        {dependencyLabels[key as keyof typeof dependencyLabels]}
                      </div>
                      <StatusPill status={value} />
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-950">{value.ok ? 'Healthy' : value.status}</p>
                    <p className="mt-1 min-h-5 text-sm text-slate-500">{value.message ?? 'Last readiness check'}</p>
                  </div>
                )
              })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              {!isAuthenticated && (
                <form onSubmit={onLogin} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-teal-700" />
                    <h2 className="text-base font-semibold text-slate-950">Operator Login</h2>
                  </div>
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Username
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                      autoComplete="username"
                    />
                  </label>
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Password
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                      type="password"
                      autoComplete="current-password"
                    />
                  </label>
                  {authError && <p className="mt-3 text-sm font-medium text-rose-600">{authError}</p>}
                  <button
                    type="submit"
                    disabled={loginMutation.isPending || !username.trim() || !password}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                </form>
              )}

              <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">Create Task</h2>
                  {!isAuthenticated && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Login required
                    </span>
                  )}
                </div>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    placeholder="Follow up supplier"
                  />
                </label>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="mt-2 min-h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    placeholder="Optional notes"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!isAuthenticated || createMutation.isPending || !title.trim()}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Tasks</h2>
                  <p className="text-sm text-slate-500">
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
                {tasksQuery.isLoading && <p className="p-4 text-sm text-slate-500">Loading tasks...</p>}
                {!tasksQuery.isLoading && tasks.length === 0 && (
                  <p className="p-4 text-sm text-slate-500">No tasks yet.</p>
                )}
                {tasks.map((task) => (
                  <article key={task.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
                    <div className="min-w-0">
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
                    {!task.done && (
                      <button
                        type="button"
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={!isAuthenticated}
                        className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

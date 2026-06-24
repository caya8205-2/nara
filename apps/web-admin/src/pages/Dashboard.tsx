import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Bot,
  Clock3,
  Database,
  HardDrive,
  KeyRound,
  LogOut,
  MessageSquare,
  RefreshCw,
  Server,
  Shield,
} from 'lucide-react'
import {
  getCurrentOperator,
  getReadiness,
  loginOperator,
  logoutOperator,
  type DependencyStatus,
} from '../lib/api'
import {
  AdminButton,
  DependencyBadge,
  EmptyState,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
  dependencyTone,
} from '../components/admin-ui'

const dependencyLabels = {
  backup: 'Backup',
  backupWorker: 'Backup Worker',
  database: 'PostgreSQL',
  groupSummaryWorker: 'Group Summary Worker',
  redis: 'Redis',
  reminderWorker: 'Reminder Worker',
  openclaw: 'OpenClaw',
  whatsapp: 'WhatsApp',
} as const

const dependencyIcons = {
  backup: Database,
  backupWorker: Clock3,
  database: Database,
  groupSummaryWorker: Clock3,
  redis: Activity,
  reminderWorker: Clock3,
  openclaw: Bot,
  whatsapp: MessageSquare,
} as const

const operations = [
  {
    title: 'Health',
    description: 'Inspect backend dependencies and worker readiness.',
    href: '/health',
    icon: Activity,
  },
  {
    title: 'WhatsApp Access',
    description: 'Review OpenClaw access state and sync failures.',
    href: '/whatsapp-access',
    icon: MessageSquare,
  },
  {
    title: 'Backup',
    description: 'Check backup storage and worker status.',
    href: '/backup',
    icon: HardDrive,
  },
  {
    title: 'Reports',
    description: 'Review generated reports and schedules.',
    href: '/reports',
    icon: Database,
  },
] as const

const formatDependencyKey = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const statusText = (status?: DependencyStatus) => {
  if (!status) return 'Checking'
  if (status.ok) return 'Healthy'
  return status.status.charAt(0).toUpperCase() + status.status.slice(1)
}

export default function Dashboard() {
  const queryClient = useQueryClient()
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

  useEffect(() => {
    if (operatorQuery.isError && (operatorQuery.error as any)?.response?.status === 401) {
      logoutOperator()
      setHasToken(false)
      queryClient.removeQueries({ queryKey: ['operator'] })
    }
  }, [operatorQuery.error, operatorQuery.isError, queryClient])

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

  const readiness = readinessQuery.data
  const operator = operatorQuery.data
  const isAuthenticated = hasToken && Boolean(operator)
  const dependencies = readiness?.dependencies
  const dependencyEntries = useMemo(() => Object.entries(dependencies ?? {}), [dependencies])
  const unhealthyDependencies = dependencyEntries.filter(([, dependency]) => !dependency.ok)

  const backendStatus: DependencyStatus | undefined = readiness
    ? { ok: readiness.ok, status: readiness.ok ? 'ok' : 'error' }
    : undefined
  const backendLabel = readiness
    ? readiness.ok
      ? 'Ready'
      : 'Needs attention'
    : readinessQuery.isLoading
      ? 'Checking'
      : 'Unavailable'

  const whatsappStatus = dependencies?.whatsapp
  const reminderWorkerStatus = dependencies?.reminderWorker

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
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Overview"
          description="Monitor service readiness, operator access, and the admin areas that need attention."
          actions={
            <>
              {isAuthenticated && (
                <StatusBadge tone="success" className="h-10 px-3">
                  <Shield className="h-4 w-4" />
                  {operator?.username}
                </StatusBadge>
              )}
              {hasToken && (
                <AdminButton onClick={logout} variant="secondary">
                  <LogOut className="h-4 w-4" />
                  Logout
                </AdminButton>
              )}
              <AdminButton onClick={refresh} disabled={readinessQuery.isFetching}>
                <RefreshCw className={['h-4 w-4', readinessQuery.isFetching && 'animate-spin'].join(' ')} />
                Refresh
              </AdminButton>
            </>
          }
        />

        {!isAuthenticated && (
          <InlineNotice tone="warning" title="Operator login required">
            Log in to access protected admin actions.
          </InlineNotice>
        )}

        {!isAuthenticated && (
          <Panel className="mt-4 p-4">
            <form onSubmit={onLogin} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  autoComplete="current-password"
                />
              </div>
              <AdminButton type="submit" disabled={loginMutation.isPending}>
                <KeyRound className="h-4 w-4" />
                Login
              </AdminButton>
              {authError && <p className="text-sm text-amber-700 md:col-span-3">{authError}</p>}
            </form>
          </Panel>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Backend API"
            value={backendLabel}
            description="Readiness endpoint and service dependencies"
            icon={Server}
            tone={dependencyTone(backendStatus)}
            badge={<DependencyBadge status={backendStatus} />}
          />
          <MetricTile
            label="Reminder Worker"
            value={statusText(reminderWorkerStatus)}
            description={reminderWorkerStatus?.message || 'Worker status from readiness'}
            icon={Clock3}
            tone={dependencyTone(reminderWorkerStatus)}
            badge={<DependencyBadge status={reminderWorkerStatus} />}
          />
          <MetricTile
            label="WhatsApp"
            value={statusText(whatsappStatus)}
            description={whatsappStatus?.message || 'OpenClaw WhatsApp bridge readiness'}
            icon={MessageSquare}
            tone={dependencyTone(whatsappStatus)}
            badge={<DependencyBadge status={whatsappStatus} />}
          />
          <MetricTile
            label="Session"
            value={isAuthenticated ? 'Active' : 'Locked'}
            description={isAuthenticated ? `Signed in as ${operator?.username}` : 'Protected actions are disabled'}
            icon={Shield}
            tone={isAuthenticated ? 'success' : 'warning'}
            badge={<StatusBadge tone={isAuthenticated ? 'success' : 'warning'}>{isAuthenticated ? 'Live' : 'Login'}</StatusBadge>}
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel>
            <PanelHeader
              title="Service Readiness"
              description="Critical dependencies used by reminders, WhatsApp access, reports, and backups."
              action={
                <StatusBadge tone={!readiness ? 'neutral' : unhealthyDependencies.length > 0 ? 'warning' : 'success'}>
                  {!readiness ? 'Checking' : `${unhealthyDependencies.length} flagged`}
                </StatusBadge>
              }
            />
            <div className="divide-y divide-slate-100">
              {readinessQuery.isLoading && <p className="p-4 text-sm text-slate-500">Checking service readiness...</p>}
              {!readinessQuery.isLoading && !readiness && (
                <EmptyState icon={Server} title="No readiness data" description="Start the backend server, then refresh this page." />
              )}
              {dependencyEntries.map(([key, value]) => {
                const Icon = dependencyIcons[key as keyof typeof dependencyIcons] ?? Server
                const label = dependencyLabels[key as keyof typeof dependencyLabels] ?? formatDependencyKey(key)
                return (
                  <div key={key} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950">{label}</div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{value.message || 'No issue reported'}</p>
                      </div>
                    </div>
                    <DependencyBadge status={value} />
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Admin Areas"
              description="Jump to the screens that control Nara service operations."
            />
            <div className="divide-y divide-slate-100">
              {operations.map((operation) => {
                const Icon = operation.icon
                return (
                  <Link
                    key={operation.href}
                    to={operation.href}
                    className="group flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 group-hover:border-teal-200 group-hover:text-teal-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950">{operation.title}</div>
                        <p className="mt-0.5 text-sm text-slate-500">{operation.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" />
                  </Link>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  )
}

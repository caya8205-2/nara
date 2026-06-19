import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Database,
  RefreshCw,
  Server,
} from 'lucide-react'
import { getReadiness, type DependencyStatus } from '../lib/api'

const dependencyLabels = {
  backend: 'Backend API',
  database: 'PostgreSQL',
  redis: 'Redis',
  openclaw: 'OpenClaw Gateway',
  whatsapp: 'WhatsApp Bridge',
} as const

const dependencyIcons = {
  backend: Server,
  database: Database,
  redis: Activity,
  openclaw: Bot,
  whatsapp: Bot,
} as const

const suggestedFixes = {
  database: 'Check Docker container: docker ps | grep postgres',
  redis: 'Check Docker container: docker ps | grep redis',
  openclaw: 'Verify OPENCLAW_GATEWAY_URL, gateway token, and OpenClaw Gateway is running',
  whatsapp: 'Verify OpenClaw WhatsApp account, send path, Nara Bot allowlist, and paired session',
} as const

export default function Health() {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: getReadiness,
    refetchInterval: 30_000,
  })

  const readiness = readinessQuery.data
  const lastChecked = readiness?.timestamp
    ? new Date(readiness.timestamp).toLocaleString()
    : 'Never'

  const backendStatus: DependencyStatus | undefined = readiness
    ? { ok: true, status: readiness.ok ? 'ok' : 'error' }
    : undefined

  const allDependencies = useMemo(() => {
    if (!readiness) return []
    return [
      { key: 'backend', status: backendStatus },
      { key: 'database', status: readiness.dependencies.database },
      { key: 'redis', status: readiness.dependencies.redis },
      { key: 'openclaw', status: readiness.dependencies.openclaw },
      { key: 'whatsapp', status: readiness.dependencies.whatsapp },
    ]
  }, [readiness, backendStatus])

  const recheck = () => {
    queryClient.invalidateQueries({ queryKey: ['readiness'] })
  }

  const copyDiagnostics = () => {
    if (!readiness) return

    const diagnostics = [
      'Nara Backend Health Report',
      'Generated: ' + new Date().toISOString(),
      '',
      'Backend: ' + (backendStatus?.ok ? 'OK' : 'ERROR'),
      'Database: ' + readiness.dependencies.database.status.toUpperCase() + ' ' + (readiness.dependencies.database.message || ''),
      'Redis: ' + readiness.dependencies.redis.status.toUpperCase() + ' ' + (readiness.dependencies.redis.message || ''),
      'OpenClaw: ' + readiness.dependencies.openclaw.status.toUpperCase() + ' ' + (readiness.dependencies.openclaw.message || ''),
      'WhatsApp: ' + readiness.dependencies.whatsapp.status.toUpperCase() + ' ' + (readiness.dependencies.whatsapp.message || ''),
      '',
      'Last Checked: ' + lastChecked,
    ].join('\n')

    navigator.clipboard.writeText(diagnostics)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusColor = (status?: DependencyStatus) => {
    if (!status) return 'border-slate-200 bg-slate-50 text-slate-600'
    if (status.ok) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (status.status === 'missing') return 'border-amber-200 bg-amber-50 text-amber-700'
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  const getStatusIcon = (status?: DependencyStatus) => {
    if (!status) return AlertCircle
    if (status.ok) return CheckCircle2
    return AlertCircle
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Health</h1>
            <p className="mt-1 text-sm text-slate-600">
              Backend dependency diagnostics and status checks
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyDiagnostics}
              disabled={!readiness}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy Diagnostics'}
            </button>
            <button
              type="button"
              onClick={recheck}
              disabled={readinessQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={['h-4 w-4', readinessQuery.isFetching && 'animate-spin'].join(' ')} />
              Recheck
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Last Checked</div>
            <div className="text-sm font-semibold text-slate-950">{lastChecked}</div>
          </div>
        </div>

        <div className="space-y-3">
          {allDependencies.map(({ key, status }) => {
            const Icon = dependencyIcons[key as keyof typeof dependencyIcons]
            const StatusIcon = getStatusIcon(status)
            const label = dependencyLabels[key as keyof typeof dependencyLabels]
            const suggestedFix = status && !status.ok && key !== 'backend'
              ? suggestedFixes[key as keyof typeof suggestedFixes]
              : null

            return (
              <div
                key={key}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
                        <span
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            getStatusColor(status),
                          ].join(' ')}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status?.status.toUpperCase() || 'CHECKING'}
                        </span>
                      </div>
                      {status?.message && (
                        <p className="mt-2 text-sm text-slate-600">{status.message}</p>
                      )}
                      {suggestedFix && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-900">Suggested Fix</p>
                          <code className="mt-1 block text-xs text-amber-800">{suggestedFix}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {readinessQuery.isError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900">Failed to fetch health status</h3>
                <p className="mt-1 text-sm text-rose-700">
                  Cannot connect to backend. Make sure the backend server is running on port 4000.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

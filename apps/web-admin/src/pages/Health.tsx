import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  Bot,
  ClipboardCopy,
  Database,
  RefreshCw,
  Server,
} from 'lucide-react'
import { getReadiness, type DependencyStatus } from '../lib/api'
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
  backend: 'Backend API',
  backup: 'Backup Storage',
  backupWorker: 'Backup Worker',
  database: 'PostgreSQL',
  groupSummaryWorker: 'Group Summary Worker',
  redis: 'Redis',
  reminderWorker: 'Reminder Worker',
  openclaw: 'OpenClaw Gateway',
  whatsapp: 'WhatsApp Bridge',
} as const

const dependencyIcons = {
  backend: Server,
  backup: Database,
  backupWorker: RefreshCw,
  database: Database,
  groupSummaryWorker: RefreshCw,
  redis: Activity,
  reminderWorker: RefreshCw,
  openclaw: Bot,
  whatsapp: Bot,
} as const

const suggestedFixes = {
  database: 'Check Docker container: docker ps | grep postgres',
  redis: 'Check Docker container: docker ps | grep redis',
  backup: 'Verify BACKUP_DIR is writable and pg_dump or Docker is available on the server',
  backupWorker: 'Verify BACKUP_WORKER_ENABLED=true, REDIS_URL is set, then restart the backend service',
  groupSummaryWorker: 'Verify GROUP_SUMMARY_WORKER_ENABLED=true, REDIS_URL is set, then restart the backend service',
  reminderWorker: 'Verify REMINDER_WORKER_ENABLED=true, REDIS_URL is set, then restart the backend service',
  openclaw: 'Verify OPENCLAW_GATEWAY_URL, gateway token, and OpenClaw Gateway is running',
  whatsapp: 'Link a dedicated Nara Bot WhatsApp number, then verify OpenClaw account, allowlist, and paired session',
} as const

const formatDependencyKey = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const statusValue = (status?: DependencyStatus) => {
  if (!status) return 'Checking'
  if (status.ok) return 'Healthy'
  return status.status.charAt(0).toUpperCase() + status.status.slice(1)
}

const detailRows = (status: DependencyStatus, key: string): Array<[string, string]> => {
  const details = status.details ?? {}
  if (key === 'reminderWorker' || key === 'backupWorker' || key === 'groupSummaryWorker') {
    return [
      ['Enabled', String(details.enabled ?? 'unknown')],
      ['Started', String(details.started ?? 'unknown')],
      ['Interval', `${details.intervalMs ?? 'unknown'}ms`],
      ['Last Run', String(details.lastRunAt ?? 'Never')],
      ['Last Status', String(details.lastRunStatus ?? 'None')],
      ['Queue', String(details.queueName ?? 'unknown')],
    ]
  }

  if (key === 'whatsapp') {
    return [
      ['Account', String(details.account ?? 'default')],
      ['Host Number', details.configuredHostNumber ? 'Configured' : 'Not configured'],
      ['Ready for Live Use', details.readyForLiveUse ? 'Yes' : 'No'],
      ['Access Count', String(details.allowedRecipientCount ?? 0)],
      ['Policy', String(details.dmPolicy ?? 'allowlist')],
      ['Shared Personal Number', details.selfChatMode ? 'Yes' : 'No'],
    ]
  }

  return []
}

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
    ? { ok: readiness.ok, status: readiness.ok ? 'ok' : 'error' }
    : undefined

  const allDependencies = useMemo(() => {
    if (!readiness) return []
    return [
      { key: 'backend', status: backendStatus },
      { key: 'database', status: readiness.dependencies.database },
      { key: 'redis', status: readiness.dependencies.redis },
      { key: 'backup', status: readiness.dependencies.backup },
      { key: 'backupWorker', status: readiness.dependencies.backupWorker },
      { key: 'reminderWorker', status: readiness.dependencies.reminderWorker },
      { key: 'groupSummaryWorker', status: readiness.dependencies.groupSummaryWorker },
      { key: 'openclaw', status: readiness.dependencies.openclaw },
      { key: 'whatsapp', status: readiness.dependencies.whatsapp },
    ]
  }, [readiness, backendStatus])

  const flaggedDependencies = allDependencies.filter(({ status }) => status && !status.ok)
  const workerStatuses = allDependencies.filter(({ key }) =>
    key === 'backupWorker' || key === 'reminderWorker' || key === 'groupSummaryWorker',
  )
  const workersFlagged = workerStatuses.some(({ status }) => status && !status.ok)

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
      ...Object.entries(readiness.dependencies).map(([key, dependency]) =>
        `${dependencyLabels[key as keyof typeof dependencyLabels] ?? formatDependencyKey(key)}: ${dependency.status.toUpperCase()} ${dependency.message || ''}`,
      ),
      '',
      'Last Checked: ' + lastChecked,
    ].join('\n')

    navigator.clipboard.writeText(diagnostics)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Health"
          description="Operational readiness for the backend, Redis-backed workers, OpenClaw, WhatsApp, and backup storage."
          actions={
            <>
              <AdminButton onClick={copyDiagnostics} disabled={!readiness} variant="secondary">
                <ClipboardCopy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy'}
              </AdminButton>
              <AdminButton onClick={recheck} disabled={readinessQuery.isFetching}>
                <RefreshCw className={['h-4 w-4', readinessQuery.isFetching && 'animate-spin'].join(' ')} />
                Recheck
              </AdminButton>
            </>
          }
        />

        {readinessQuery.isError && (
          <InlineNotice tone="danger" title="Failed to fetch health status">
            Cannot connect to the backend. Make sure the backend server is running on port 4000.
          </InlineNotice>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricTile
            label="Overall"
            value={readiness ? (readiness.ok ? 'Ready' : 'Degraded') : 'Checking'}
            description={`Last checked: ${lastChecked}`}
            icon={Server}
            tone={dependencyTone(backendStatus)}
            badge={<DependencyBadge status={backendStatus} />}
          />
          <MetricTile
            label="Flagged"
            value={flaggedDependencies.length}
            description="Dependencies requiring operator attention"
            icon={AlertCircle}
            tone={flaggedDependencies.length > 0 ? 'warning' : 'success'}
            badge={<StatusBadge tone={flaggedDependencies.length > 0 ? 'warning' : 'success'}>{flaggedDependencies.length > 0 ? 'Review' : 'Clear'}</StatusBadge>}
          />
          <MetricTile
            label="Workers"
            value={readiness ? workerStatuses.filter(({ status }) => status?.ok).length + '/' + workerStatuses.length : 'Checking'}
            description="Reminder, backup, and group digest worker readiness"
            icon={RefreshCw}
            tone={!readiness ? 'neutral' : workersFlagged ? 'warning' : 'success'}
            badge={<StatusBadge tone={!readiness ? 'neutral' : workersFlagged ? 'warning' : 'success'}>BullMQ</StatusBadge>}
          />
        </div>

        <Panel className="mt-5">
          <PanelHeader
            title="Dependency Matrix"
            description="Each row reflects the current readiness report returned by the backend."
            action={<StatusBadge tone={flaggedDependencies.length > 0 ? 'warning' : 'success'}>{allDependencies.length} checks</StatusBadge>}
          />
          <div className="divide-y divide-slate-100">
            {readinessQuery.isLoading && <p className="p-4 text-sm text-slate-500">Checking dependencies...</p>}
            {!readinessQuery.isLoading && allDependencies.length === 0 && (
              <EmptyState icon={Server} title="No health data" description="Start the backend server and run the check again." />
            )}
            {allDependencies.map(({ key, status }) => {
              const Icon = dependencyIcons[key as keyof typeof dependencyIcons] ?? Server
              const label = dependencyLabels[key as keyof typeof dependencyLabels] ?? formatDependencyKey(key)
              const rows = status ? detailRows(status, key) : []
              const suggestedFix = status && !status.ok && key !== 'backend'
                ? suggestedFixes[key as keyof typeof suggestedFixes]
                : null

              return (
                <div key={key} className="px-4 py-4 hover:bg-slate-50">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
                          <DependencyBadge status={status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{status?.message || statusValue(status)}</p>
                        {rows.length > 0 && (
                          <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                            {rows.map(([rowLabel, value]) => (
                              <div key={rowLabel} className="rounded-md border border-slate-100 bg-white px-3 py-2">
                                <dt className="font-semibold text-slate-500">{rowLabel}</dt>
                                <dd className="mt-0.5 truncate font-mono text-slate-800">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {suggestedFix && (
                          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold text-amber-900">Suggested Fix</p>
                            <code className="mt-1 block break-words text-xs text-amber-800">{suggestedFix}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lg:min-w-32">
                      <StatusBadge tone={dependencyTone(status)}>{statusValue(status)}</StatusBadge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </main>
  )
}

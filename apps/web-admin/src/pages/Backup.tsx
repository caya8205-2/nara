import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  Server,
  Settings,
  XCircle,
} from 'lucide-react'
import {
  exportBackup,
  getBackupStatus,
  listBackups,
  runBackup,
  type BackupRecord,
  type BackupType,
} from '../lib/api'
import {
  AdminButton,
  EmptyState,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from '../components/admin-ui'

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const statusIcon = {
  success: CheckCircle2,
  failed: XCircle,
  in_progress: Clock,
}

const statusTone: Record<BackupRecord['status'], 'success' | 'warning' | 'danger'> = {
  success: 'success',
  failed: 'danger',
  in_progress: 'warning',
}

const formatDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : 'Not recorded')

const formatInterval = (intervalMs: number) => {
  const minutes = Math.round(intervalMs / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hours`
  return `${Math.round(hours / 24)} days`
}

const backupTypeLabel = (type: BackupType) => type.charAt(0).toUpperCase() + type.slice(1)

export default function Backup() {
  const queryClient = useQueryClient()
  const [exportError, setExportError] = useState<string | null>(null)

  const backupQuery = useQuery({
    queryKey: ['backups'],
    queryFn: listBackups,
  })

  const statusQuery = useQuery({
    queryKey: ['backup-status'],
    queryFn: getBackupStatus,
  })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['backups'] })
    queryClient.invalidateQueries({ queryKey: ['backup-status'] })
  }

  const runBackupMutation = useMutation({
    mutationFn: runBackup,
    onSuccess: refreshAll,
  })

  const exportMutation = useMutation({
    mutationFn: exportBackup,
    onMutate: () => {
      setExportError(null)
    },
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename)
      refreshAll()
    },
    onError: (error) => {
      setExportError(error instanceof Error ? error.message : String(error))
      refreshAll()
    },
  })

  const backupRecords = backupQuery.data ?? []
  const lastBackup = backupRecords[0] ?? null
  const backupStatus = statusQuery.data ?? null
  const backupStatusOk = backupStatus?.ok ?? false
  const isRefreshing = backupQuery.isFetching || statusQuery.isFetching

  const handleExport = (type: BackupType) => {
    exportMutation.mutate(type)
  }

  const renderBackupRecord = (backup: BackupRecord) => {
    const Icon = statusIcon[backup.status]

    return (
      <div key={backup.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
            <Icon className={['h-4 w-4', backup.status === 'success' && 'text-emerald-600', backup.status === 'failed' && 'text-rose-600', backup.status === 'in_progress' && 'animate-pulse text-amber-600'].filter(Boolean).join(' ')} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-950">{backupTypeLabel(backup.type)} Backup</p>
              <StatusBadge tone={statusTone[backup.status]}>{backup.status.replaceAll('_', ' ')}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(backup.timestamp).toLocaleString()} · {backup.size}
            </p>
            {backup.error ? (
              <p className="mt-1 text-xs text-rose-700">{backup.error}</p>
            ) : (
              <p className="mt-1 break-all font-mono text-xs text-slate-500">{backup.location}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const exportCards: Array<{ type: BackupType; title: string; description: string; icon: typeof Database; tone: 'neutral' | 'success' | 'info' }> = [
    { type: 'database', title: 'Database', description: 'PostgreSQL dump via configured tools', icon: Database, tone: 'info' },
    { type: 'reports', title: 'Reports', description: 'Reports manifest and generated output', icon: FileText, tone: 'success' },
    { type: 'config', title: 'Config', description: 'Redacted environment snapshot', icon: Settings, tone: 'neutral' },
  ]

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Backup"
          description="Run exports, check scheduled backup health, and review recent server protection records."
          actions={
            <AdminButton variant="secondary" onClick={refreshAll} disabled={isRefreshing}>
              <RefreshCw className={['h-4 w-4', isRefreshing && 'animate-spin'].filter(Boolean).join(' ')} />
              Refresh
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile
            label="Scheduled Backup"
            value={backupStatusOk ? 'Ready' : 'Attention'}
            description={backupStatus?.worker.message ?? 'Checking backup worker status...'}
            icon={backupStatusOk ? CheckCircle2 : AlertCircle}
            tone={backupStatusOk ? 'success' : 'warning'}
          />
          <MetricTile
            label="Backup Storage"
            value={backupStatus?.storage.ok ? 'Available' : 'Check'}
            description={backupStatus?.storage.message ?? 'Checking backup folder and dump tools...'}
            icon={Server}
            tone={backupStatus?.storage.ok ? 'success' : 'warning'}
          />
          <MetricTile
            label="Last Automatic Run"
            value={formatDate(backupStatus?.worker.lastRunAt)}
            description={backupStatus ? `Interval: ${formatInterval(backupStatus.worker.intervalMs)}` : 'Loading schedule'}
            icon={Clock}
            tone="neutral"
          />
        </div>

        {backupStatus?.storage.details && (
          <Panel className="mt-5 p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">pg_dump</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {backupStatus.storage.details.pgDumpAvailable ? 'Ready' : 'Missing'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Docker</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {backupStatus.storage.details.dockerAvailable ? 'Ready' : 'Missing'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Last Success</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {formatDate(backupStatus.storage.details.lastSuccessfulBackupAt)}
                </p>
              </div>
            </div>
          </Panel>
        )}

        {backupStatus?.storage.details.lastFailureMessage && (
          <div className="mt-5">
            <InlineNotice tone="danger" title="Last backup failure">
              {backupStatus.storage.details.lastFailureMessage}
            </InlineNotice>
          </div>
        )}

        {(runBackupMutation.error || exportError) && (
          <div className="mt-5">
            <InlineNotice tone="danger" title="Backup action failed">
              {exportError || (runBackupMutation.error instanceof Error ? runBackupMutation.error.message : String(runBackupMutation.error))}
            </InlineNotice>
          </div>
        )}

        <Panel className="mt-5">
          <PanelHeader
            title="Manual Backup"
            description={
              backupQuery.isLoading
                ? 'Loading backup history...'
                : lastBackup
                  ? `Last backup: ${new Date(lastBackup.timestamp).toLocaleString()}`
                  : 'No backup has been recorded yet.'
            }
            action={
              <AdminButton onClick={() => runBackupMutation.mutate()} disabled={runBackupMutation.isPending}>
                <HardDrive className="h-4 w-4" />
                {runBackupMutation.isPending ? 'Backing Up...' : 'Run Backup'}
              </AdminButton>
            }
          />
          <div className="px-4 py-4">
            {backupQuery.isError ? (
              <InlineNotice tone="danger" title="Failed to load backup history">
                Check the operator session and backend connection.
              </InlineNotice>
            ) : lastBackup ? (
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge tone={statusTone[lastBackup.status]}>{lastBackup.status.replaceAll('_', ' ')}</StatusBadge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Size</p>
                  <p className="mt-1 font-semibold text-slate-950">{lastBackup.size}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Location</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{lastBackup.location}</p>
                </div>
              </div>
            ) : (
              <InlineNotice tone="warning" title="No backup recorded">
                Run the first backup before relying on restore records.
              </InlineNotice>
            )}
          </div>
        </Panel>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {exportCards.map(({ type, title, description, icon: Icon, tone }) => (
            <Panel key={type} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                    <StatusBadge tone={tone} withDot={false}>
                      Export
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
              </div>
              <AdminButton
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => handleExport(type)}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4" />
                Download
              </AdminButton>
            </Panel>
          ))}
        </div>

        <Panel className="mt-5">
          <PanelHeader title="Backup History" description={`${backupRecords.length} recent backups`} />
          <div className="divide-y divide-slate-100">
            {backupRecords.length > 0 ? (
              backupRecords.map(renderBackupRecord)
            ) : (
              <EmptyState icon={HardDrive} title="No backup history" description="Backup records will appear here after the first run." />
            )}
          </div>
        </Panel>

        <div className="mt-5">
          <InlineNotice tone="info" title="Restore Procedure">
            Restore remains a server-side runbook action so live data is not overwritten by accident. Stop backend services, restore the database and archived files, verify environment values, restart services, then confirm readiness before resuming operations.
          </InlineNotice>
        </div>
      </div>
    </main>
  )
}

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

const statusColor = {
  success: 'text-emerald-600',
  failed: 'text-rose-600',
  in_progress: 'text-amber-600',
}

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Not recorded'

const formatInterval = (intervalMs: number) => {
  const minutes = Math.round(intervalMs / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hours`
  return `${Math.round(hours / 24)} days`
}

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

  const runBackupMutation = useMutation({
    mutationFn: runBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })

  const exportMutation = useMutation({
    mutationFn: exportBackup,
    onMutate: () => {
      setExportError(null)
    },
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename)
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-status'] })
    },
    onError: (error) => {
      setExportError(error instanceof Error ? error.message : String(error))
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })

  const backupRecords = backupQuery.data ?? []
  const lastBackup = backupRecords[0] ?? null
  const backupStatus = statusQuery.data ?? null
  const backupStatusOk = backupStatus?.ok ?? false

  const handleExport = (type: BackupType) => {
    exportMutation.mutate(type)
  }

  const renderBackupRecord = (backup: BackupRecord) => {
    const Icon = statusIcon[backup.status]

    return (
      <div key={backup.id} className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className={['h-5 w-5 shrink-0', statusColor[backup.status], backup.status === 'in_progress' && 'animate-pulse'].join(' ')} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-950">
              {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)} Backup
            </p>
            <p className="text-xs text-slate-500">
              {new Date(backup.timestamp).toLocaleString()} - {backup.size}
            </p>
            {backup.error ? (
              <p className="mt-1 text-xs text-rose-700">{backup.error}</p>
            ) : (
              <p className="mt-1 truncate font-mono text-xs text-slate-500">{backup.location}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Backup</h1>
            <p className="mt-1 text-sm text-slate-600">
              Export and protect office server data
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['backups'] })
              queryClient.invalidateQueries({ queryKey: ['backup-status'] })
            }}
            disabled={backupQuery.isFetching || statusQuery.isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={['h-4 w-4', (backupQuery.isFetching || statusQuery.isFetching) && 'animate-spin'].join(' ')} />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className={['rounded-lg border p-4 shadow-sm', backupStatusOk ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'].join(' ')}>
            <div className="flex items-start gap-3">
              {backupStatusOk ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <h2 className={['text-sm font-semibold', backupStatusOk ? 'text-emerald-950' : 'text-amber-950'].join(' ')}>
                  Scheduled Backup
                </h2>
                <p className={['mt-1 text-sm', backupStatusOk ? 'text-emerald-800' : 'text-amber-800'].join(' ')}>
                  {backupStatus?.worker.message ?? 'Loading backup worker status...'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                <Server className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Backup Storage</h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  {backupStatus?.storage.message ?? 'Checking backup folder and dump tools...'}
                </p>
              </div>
            </div>
            {backupStatus?.storage.details && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>pg_dump: <strong className="text-slate-950">{backupStatus.storage.details.pgDumpAvailable ? 'ready' : 'missing'}</strong></span>
                <span>Docker: <strong className="text-slate-950">{backupStatus.storage.details.dockerAvailable ? 'ready' : 'missing'}</strong></span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Latest Automatic Run</h2>
            <dl className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between gap-3">
                <dt>Interval</dt>
                <dd className="font-medium text-slate-950">{backupStatus ? formatInterval(backupStatus.worker.intervalMs) : '...'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Last run</dt>
                <dd className="text-right font-medium text-slate-950">{formatDate(backupStatus?.worker.lastRunAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Last success</dt>
                <dd className="text-right font-medium text-slate-950">{formatDate(backupStatus?.storage.details.lastSuccessfulBackupAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {backupStatus?.storage.details.lastFailureMessage && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900">Last backup failure</h3>
                <p className="mt-1 text-sm text-rose-700">{backupStatus.storage.details.lastFailureMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-950">Backup Status</h2>
              {backupQuery.isLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading backup history...</p>
              ) : backupQuery.isError ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <p className="text-xs font-semibold text-rose-900">
                    Failed to load backup history. Check your operator session and backend connection.
                  </p>
                </div>
              ) : lastBackup ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-600">Last Backup:</span>
                    <span className="text-sm font-medium text-slate-950">
                      {new Date(lastBackup.timestamp).toLocaleString()}
                    </span>
                    {lastBackup.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {lastBackup.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-600">Location:</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                      {lastBackup.location}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">No backup recorded</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Run your first backup to protect your data.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => runBackupMutation.mutate()}
              disabled={runBackupMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HardDrive className="h-4 w-4" />
              {runBackupMutation.isPending ? 'Backing Up...' : 'Run Backup'}
            </button>
          </div>
        </div>

        {(runBackupMutation.error || exportError) && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900">Backup action failed</h3>
                <p className="mt-1 text-sm text-rose-700">
                  {exportError || (runBackupMutation.error instanceof Error ? runBackupMutation.error.message : String(runBackupMutation.error))}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100">
                <Database className="h-5 w-5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-950">Database</h3>
                <p className="text-xs text-slate-600">PostgreSQL dump via Docker pg_dump</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('database')}
              disabled={exportMutation.isPending}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100">
                <FileText className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-950">Reports</h3>
                <p className="text-xs text-slate-600">Reports manifest</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('reports')}
              disabled={exportMutation.isPending}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                <Settings className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-950">Config</h3>
                <p className="text-xs text-slate-600">Redacted environment snapshot</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('config')}
              disabled={exportMutation.isPending}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {backupRecords.length > 0 ? (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-950">Backup History</h2>
              <p className="mt-0.5 text-sm text-slate-600">{backupRecords.length} recent backups</p>
            </div>
            <div className="divide-y divide-slate-100">
              {backupRecords.map(renderBackupRecord)}
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <HardDrive className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-sm font-semibold text-slate-950">No backup history</h3>
            <p className="mt-1 text-sm text-slate-600">
              Backup records will appear here after running your first backup.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Restore Procedure</h3>
            <p className="mt-1 text-sm text-blue-700">
                Restore is handled from the server runbook so live data is not overwritten by accident:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-700">
                <li>Stop backend services</li>
                <li>Restore PostgreSQL database from dump file</li>
                <li>Restore reports and config files from archive</li>
                <li>Verify environment variables match backup snapshot</li>
                <li>Restart backend services and verify readiness</li>
                <li>Test core functionality before resuming operations</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

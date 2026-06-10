import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Settings,
  XCircle,
} from 'lucide-react'

type BackupType = 'database' | 'reports' | 'config' | 'full'

type BackupRecord = {
  id: string
  type: BackupType
  timestamp: string
  size: string
  status: 'success' | 'failed' | 'in_progress'
  location: string
}

export default function Backup() {
  const [isBackingUp, setIsBackingUp] = useState(false)

  const backupRecords: BackupRecord[] = []

  const lastBackup = backupRecords.length > 0 ? backupRecords[0] : null

  const handleRunBackup = async () => {
    setIsBackingUp(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsBackingUp(false)
    alert('Backup functionality requires backend implementation at POST /api/backup')
  }

  const handleExport = (type: BackupType) => {
    alert('Export ' + type + ' requires backend implementation at POST /api/backup/export')
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">Backup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Export and protect office server data
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-950">Backup Status</h2>
              {lastBackup ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-2">
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
              onClick={handleRunBackup}
              disabled={isBackingUp}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HardDrive className="h-4 w-4" />
              {isBackingUp ? 'Backing Up...' : 'Run Backup'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100">
                <Database className="h-5 w-5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-950">Database</h3>
                <p className="text-xs text-slate-600">PostgreSQL dump</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('database')}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
                <p className="text-xs text-slate-600">Generated reports</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('reports')}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100">
                <Settings className="h-5 w-5 text-purple-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-950">Config</h3>
                <p className="text-xs text-slate-600">System config</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExport('config')}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
              {backupRecords.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    {backup.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                    {backup.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-rose-600" />
                    )}
                    {backup.status === 'in_progress' && (
                      <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)} Backup
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(backup.timestamp).toLocaleString()} • {backup.size}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Open
                  </button>
                </div>
              ))}
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

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Backend Integration Required</h3>
              <p className="mt-1 text-sm text-amber-700">
                Backup functionality requires backend implementation:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                <li>• POST /api/backup - trigger full backup</li>
                <li>• POST /api/backup/export - export specific data type</li>
                <li>• GET /api/backup/history - list backup records</li>
                <li>• Configure backup storage location in .env</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Backup Best Practices</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Run backups regularly, at least once per day</li>
            <li>• Store backups on separate storage from the main server</li>
            <li>• Test restore procedures periodically to verify backup integrity</li>
            <li>• Keep at least 7 days of backup history before rotation</li>
            <li>• Document backup location and restore steps for disaster recovery</li>
            <li>• Monitor backup job status and investigate failures promptly</li>
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Restore Procedure</h3>
              <p className="mt-1 text-sm text-blue-700">
                Restore from backup is document-only for MVP. For production use:
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

import { useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Search,
  XCircle,
} from 'lucide-react'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogSource = 'backend' | 'database' | 'redis' | 'openclaw' | 'agent' | 'system'

type LogEntry = {
  id: string
  timestamp: string
  source: LogSource
  level: LogLevel
  message: string
  metadata?: Record<string, unknown>
}

const levelConfig = {
  debug: { label: 'DEBUG', color: 'border-slate-200 bg-slate-50 text-slate-600' },
  info: { label: 'INFO', color: 'border-blue-200 bg-blue-50 text-blue-700' },
  warn: { label: 'WARN', color: 'border-amber-200 bg-amber-50 text-amber-700' },
  error: { label: 'ERROR', color: 'border-rose-200 bg-rose-50 text-rose-700' },
}

export default function Logs() {
  const [sourceFilter, setSourceFilter] = useState<LogSource | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const logs: LogEntry[] = []

  const filteredLogs = logs.filter((log) => {
    if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const exportLogs = () => {
    const content = filteredLogs
      .map((log) => {
        const line = [
          new Date(log.timestamp).toISOString(),
          log.source.toUpperCase().padEnd(10),
          log.level.toUpperCase().padEnd(6),
          log.message,
        ].join(' | ')
        return line
      })
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nara-logs-' + new Date().toISOString().split('T')[0] + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSourceFilter('all')
    setLevelFilter('all')
    setSearchQuery('')
  }

  const hasActiveFilters = sourceFilter !== 'all' || levelFilter !== 'all' || searchQuery !== ''

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">Logs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect backend runtime behavior and system events
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as LogSource | 'all')}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="all">All Sources</option>
                <option value="backend">Backend</option>
                <option value="database">Database</option>
                <option value="redis">Redis</option>
                <option value="openclaw">OpenClaw</option>
                <option value="agent">Agent</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Severity</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="all">All Levels</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search log messages..."
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-600">Active filters</span>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <XCircle className="h-3 w-3" />
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Log Entries</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {filteredLogs.length} {hasActiveFilters ? 'filtered' : 'total'} entries
              </p>
            </div>
            <button
              type="button"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No logs available</h3>
              <p className="mt-1 text-sm text-slate-600">
                Log entries will appear here once backend logging endpoint is implemented.
              </p>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-xs font-semibold text-amber-900">Backend Integration Required</p>
                <p className="mt-1 text-xs text-amber-700">
                  Add GET /api/logs endpoint to return log entries with timestamp, source, level, and message fields.
                </p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No matching logs</h3>
              <p className="mt-1 text-sm text-slate-600">
                Try adjusting your filters or search query.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const config = levelConfig[log.level]
                const isExpanded = expandedLog === log.id

                return (
                  <div key={log.id}>
                    <div
                      className="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      {log.metadata ? (
                        <button type="button" className="shrink-0 text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <div className="h-4 w-4 shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            {log.source.toUpperCase()}
                          </span>
                          <span className={['inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', config.color].join(' ')}>
                            {config.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-950">{log.message}</p>
                      </div>
                    </div>

                    {isExpanded && log.metadata && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-700">Metadata</p>
                        <pre className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-950">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Log Management Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Logs are stored locally on the backend server</li>
            <li>• Use filters to narrow down specific events or error conditions</li>
            <li>• Export logs before clearing or rotating log files</li>
            <li>• Error logs should be investigated promptly for system health</li>
            <li>• Backend needs to implement GET /api/logs endpoint for log retrieval</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

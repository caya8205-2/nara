import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { listLogs, type LogLevel, type LogSource } from '../lib/api'
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

const levelConfig: Record<LogLevel, { label: string; tone: 'neutral' | 'info' | 'warning' | 'danger' }> = {
  debug: { label: 'DEBUG', tone: 'neutral' },
  info: { label: 'INFO', tone: 'info' },
  warn: { label: 'WARN', tone: 'warning' },
  error: { label: 'ERROR', tone: 'danger' },
}

const sourceOptions: Array<{ value: LogSource | 'all'; label: string }> = [
  { value: 'all', label: 'All Sources' },
  { value: 'backend', label: 'Backend' },
  { value: 'database', label: 'Database' },
  { value: 'redis', label: 'Redis' },
  { value: 'openclaw', label: 'OpenClaw' },
  { value: 'agent', label: 'Agent' },
  { value: 'system', label: 'System' },
]

const levelOptions: Array<{ value: LogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All Levels' },
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
]

export default function Logs() {
  const queryClient = useQueryClient()
  const [sourceFilter, setSourceFilter] = useState<LogSource | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [timeRange, setTimeRange] = useState<'all' | '1h' | '24h' | '7d'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const from = (() => {
    if (timeRange === 'all') return undefined

    const date = new Date()
    if (timeRange === '1h') date.setHours(date.getHours() - 1)
    if (timeRange === '24h') date.setDate(date.getDate() - 1)
    if (timeRange === '7d') date.setDate(date.getDate() - 7)
    return date.toISOString()
  })()

  const logsQuery = useQuery({
    queryKey: ['logs', sourceFilter, levelFilter, timeRange, searchQuery],
    queryFn: () =>
      listLogs({
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        level: levelFilter === 'all' ? undefined : levelFilter,
        search: searchQuery || undefined,
        from,
        limit: 100,
      }),
  })

  const filteredLogs = logsQuery.data?.logs ?? []
  const totalLogs = logsQuery.data?.total ?? filteredLogs.length
  const errorCount = filteredLogs.filter((log) => log.level === 'error').length
  const warningCount = filteredLogs.filter((log) => log.level === 'warn').length
  const hasActiveFilters = sourceFilter !== 'all' || levelFilter !== 'all' || timeRange !== 'all' || searchQuery !== ''

  const exportLogs = () => {
    const content = filteredLogs
      .map((log) =>
        [
          new Date(log.timestamp).toISOString(),
          log.source.toUpperCase().padEnd(10),
          log.level.toUpperCase().padEnd(6),
          log.message,
        ].join(' | ')
      )
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
    setTimeRange('all')
    setSearchQuery('')
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Logs"
          description="Inspect backend events, narrow incidents quickly, and export the current view for handoff."
          actions={
            <AdminButton
              onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}
              disabled={logsQuery.isFetching}
            >
              <RefreshCw className={['h-4 w-4', logsQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
              Refresh
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile
            label="Visible Entries"
            value={totalLogs}
            description={hasActiveFilters ? 'Matching current filters' : 'Latest available entries'}
            icon={FileText}
            tone="neutral"
          />
          <MetricTile
            label="Errors"
            value={errorCount}
            description="Shown in current view"
            icon={errorCount > 0 ? AlertCircle : FileText}
            tone={errorCount > 0 ? 'danger' : 'success'}
          />
          <MetricTile
            label="Warnings"
            value={warningCount}
            description="Shown in current view"
            icon={AlertCircle}
            tone={warningCount > 0 ? 'warning' : 'success'}
          />
        </div>

        <Panel className="mt-5 p-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-700">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as LogSource | 'all')}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-700">Severity</span>
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value as LogLevel | 'all')}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {levelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="text-xs font-semibold text-slate-700">Time Range</span>
              <select
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value as 'all' | '1h' | '24h' | '7d')}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="all">All Time</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Search</span>
              <span className="relative mt-1 block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search log messages..."
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </span>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-medium text-slate-500">Active filters</span>
              <AdminButton variant="secondary" className="h-8 px-2.5 text-xs" onClick={clearFilters}>
                <XCircle className="h-3 w-3" />
                Clear All
              </AdminButton>
            </div>
          )}
        </Panel>

        <Panel className="mt-5">
          <PanelHeader
            title="Log Entries"
            description={`${totalLogs} ${hasActiveFilters ? 'filtered' : 'total'} entries`}
            action={
              <AdminButton variant="secondary" onClick={exportLogs} disabled={filteredLogs.length === 0}>
                <Download className="h-4 w-4" />
                Export
              </AdminButton>
            }
          />

          {logsQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading logs...</div>
          ) : logsQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load logs">
                Check the operator session and backend connection, then refresh.
              </InlineNotice>
            </div>
          ) : filteredLogs.length === 0 && !hasActiveFilters ? (
            <EmptyState
              icon={FileText}
              title="No logs available"
              description="Log entries will appear after users, access requests, or audited actions are created."
            />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No matching logs"
              description="Adjust filters or clear the search query to widen the result."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const config = levelConfig[log.level]
                const isExpanded = expandedLog === log.id

                return (
                  <div key={log.id}>
                    <button
                      type="button"
                      className="grid w-full cursor-pointer grid-cols-[20px_1fr] gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      {log.metadata ? (
                        <span className="mt-0.5 text-slate-400">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      ) : (
                        <span className="h-4 w-4" />
                      )}

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                          <StatusBadge tone="neutral" withDot={false}>
                            {log.source.toUpperCase()}
                          </StatusBadge>
                          <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                        </span>
                        <span className="mt-1 block text-sm text-slate-950">{log.message}</span>
                      </span>
                    </button>

                    {isExpanded && log.metadata && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Metadata</p>
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
        </Panel>

        <div className="mt-5">
          <InlineNotice tone="info" title="Log handling">
            Export the filtered view when handing off an incident. Backend log retention and rotation should stay managed on the server.
          </InlineNotice>
        </div>
      </div>
    </main>
  )
}

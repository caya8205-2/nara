import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileText,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import {
  createReportSchedule,
  generateReport,
  listReportSchedules,
  listReports,
  processDueReports,
  updateReportSchedule,
  type Report,
  type ReportSchedule,
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

const statusTone: Record<Report['status'], 'neutral' | 'success' | 'warning' | 'danger'> = {
  generated: 'neutral',
  delivered: 'success',
  delivery_failed: 'danger',
  delivery_skipped: 'warning',
  failed: 'danger',
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '-')
const titleCase = (value: string) => value.replaceAll('_', ' ')

export default function Reports() {
  const queryClient = useQueryClient()
  const [scheduleName, setScheduleName] = useState('Daily office report')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [deliver, setDeliver] = useState(true)

  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: listReports,
  })

  const schedulesQuery = useQuery({
    queryKey: ['report-schedules'],
    queryFn: listReportSchedules,
  })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    queryClient.invalidateQueries({ queryKey: ['report-schedules'] })
  }

  const generateMutation = useMutation({
    mutationFn: () => generateReport({ kind: 'manual', deliver }),
    onSuccess: refreshAll,
  })

  const createScheduleMutation = useMutation({
    mutationFn: () =>
      createReportSchedule({
        name: scheduleName,
        frequency,
        timezone: 'Asia/Jakarta',
        enabled: true,
        deliver,
      }),
    onSuccess: refreshAll,
  })

  const processDueMutation = useMutation({
    mutationFn: processDueReports,
    onSuccess: refreshAll,
  })

  const toggleScheduleMutation = useMutation({
    mutationFn: (schedule: ReportSchedule) =>
      updateReportSchedule(schedule.id, {
        enabled: !schedule.enabled,
      }),
    onSuccess: refreshAll,
  })

  const reports = reportsQuery.data ?? []
  const schedules = schedulesQuery.data ?? []
  const latestReport = reports[0]
  const activeSchedules = schedules.filter((schedule) => schedule.enabled).length
  const failedReports = reports.filter((report) => report.status.includes('failed')).length
  const isRefreshing = reportsQuery.isFetching || schedulesQuery.isFetching

  const renderReport = (report: Report) => (
    <div key={report.id} className="px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{report.title}</h3>
            <StatusBadge tone={statusTone[report.status]}>{titleCase(report.status)}</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
          </p>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            {report.summary}
          </pre>
          {report.deliveryMessage && <p className="mt-2 text-xs text-slate-500">{report.deliveryMessage}</p>}
        </div>
      </div>
    </div>
  )

  const renderSchedule = (schedule: ReportSchedule) => (
    <div key={schedule.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-950">{schedule.name}</h3>
          <StatusBadge tone="neutral">{schedule.frequency}</StatusBadge>
          <StatusBadge tone={schedule.enabled ? 'success' : 'neutral'}>
            {schedule.enabled ? 'Enabled' : 'Disabled'}
          </StatusBadge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Next: {formatDate(schedule.nextRunAt)} · Last: {formatDate(schedule.lastRunAt)}
        </p>
        {schedule.lastRunMessage && <p className="mt-1 text-xs text-slate-500">{schedule.lastRunMessage}</p>}
      </div>
      <AdminButton
        variant="secondary"
        onClick={() => toggleScheduleMutation.mutate(schedule)}
        disabled={toggleScheduleMutation.isPending}
      >
        {schedule.enabled ? 'Disable' : 'Enable'}
      </AdminButton>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Reports"
          description="Generate office summaries, review delivery results, and manage scheduled report runs."
          actions={
            <AdminButton variant="secondary" onClick={refreshAll} disabled={isRefreshing}>
              <RefreshCw className={['h-4 w-4', isRefreshing && 'animate-spin'].filter(Boolean).join(' ')} />
              Refresh
            </AdminButton>
          }
        />

        {(reportsQuery.isError ||
          schedulesQuery.isError ||
          generateMutation.isError ||
          createScheduleMutation.isError ||
          processDueMutation.isError) && (
          <InlineNotice tone="danger" title="Report action failed">
            Check the backend session, database state, worker status, and delivery configuration.
          </InlineNotice>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MetricTile
            label="Latest Report"
            value={latestReport ? formatDate(latestReport.createdAt) : 'None'}
            description={latestReport ? latestReport.title : 'No report has been generated yet.'}
            icon={FileText}
            tone={latestReport?.status === 'delivered' ? 'success' : latestReport?.status.includes('failed') ? 'danger' : 'neutral'}
            badge={latestReport ? <StatusBadge tone={statusTone[latestReport.status]}>{titleCase(latestReport.status)}</StatusBadge> : undefined}
          />
          <MetricTile
            label="Active Schedules"
            value={activeSchedules}
            description={`${schedules.length} configured schedules`}
            icon={CalendarClock}
            tone={activeSchedules > 0 ? 'success' : 'neutral'}
          />
          <MetricTile
            label="Delivery Issues"
            value={failedReports}
            description="Reports needing operator attention"
            icon={failedReports > 0 ? XCircle : CheckCircle2}
            tone={failedReports > 0 ? 'danger' : 'success'}
          />
        </div>

        <Panel className="mt-5 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="font-semibold text-slate-700">Schedule Name</span>
                <input
                  value={scheduleName}
                  onChange={(event) => setScheduleName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">Frequency</span>
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly')}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={deliver}
                  onChange={(event) => setDeliver(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Deliver via WhatsApp
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <Send className="h-4 w-4" />
                Generate
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => createScheduleMutation.mutate()}
                disabled={createScheduleMutation.isPending || !scheduleName.trim()}
              >
                <CalendarClock className="h-4 w-4" />
                Add Schedule
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => processDueMutation.mutate()} disabled={processDueMutation.isPending}>
                <RefreshCw className={['h-4 w-4', processDueMutation.isPending && 'animate-spin'].filter(Boolean).join(' ')} />
                Process Due
              </AdminButton>
            </div>
          </div>
        </Panel>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Report History" description={`${reports.length} recent records`} />
            <div className="divide-y divide-slate-100">
              {reports.length > 0 ? (
                reports.map(renderReport)
              ) : (
                <EmptyState icon={FileText} title="No report records" description="Generated reports will appear here." />
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Schedules" description={`${schedules.length} configured schedules`} />
            <div className="divide-y divide-slate-100">
              {schedules.length > 0 ? (
                schedules.map(renderSchedule)
              ) : (
                <EmptyState icon={CalendarClock} title="No report schedules" description="Add a daily or weekly report schedule when needed." />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  )
}

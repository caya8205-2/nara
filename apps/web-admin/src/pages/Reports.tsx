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

const statusColor = {
  generated: 'text-slate-600',
  delivered: 'text-emerald-600',
  delivery_failed: 'text-rose-600',
  delivery_skipped: 'text-amber-600',
  failed: 'text-rose-600',
}

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : '-'

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
    mutationFn: () => createReportSchedule({
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
    mutationFn: (schedule: ReportSchedule) => updateReportSchedule(schedule.id, {
      enabled: !schedule.enabled,
    }),
    onSuccess: refreshAll,
  })

  const reports = reportsQuery.data ?? []
  const schedules = schedulesQuery.data ?? []
  const latestReport = reports[0]

  const renderReport = (report: Report) => (
    <div key={report.id} className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{report.title}</h3>
            <span className={['text-xs font-semibold', statusColor[report.status]].join(' ')}>
              {report.status.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
            {report.summary}
          </pre>
          {report.deliveryMessage && (
            <p className="mt-2 text-xs text-slate-500">{report.deliveryMessage}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderSchedule = (schedule: ReportSchedule) => (
    <div key={schedule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-950">{schedule.name}</h3>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {schedule.frequency}
          </span>
          <span className={schedule.enabled ? 'text-xs font-semibold text-emerald-600' : 'text-xs font-semibold text-slate-500'}>
            {schedule.enabled ? 'enabled' : 'disabled'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Next: {formatDate(schedule.nextRunAt)} · Last: {formatDate(schedule.lastRunAt)}
        </p>
        {schedule.lastRunMessage && (
          <p className="mt-1 text-xs text-slate-500">{schedule.lastRunMessage}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => toggleScheduleMutation.mutate(schedule)}
        disabled={toggleScheduleMutation.isPending}
        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {schedule.enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Reports</h1>
            <p className="mt-1 text-sm text-slate-600">
              Generate operational summaries and monitor scheduled delivery
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={reportsQuery.isFetching || schedulesQuery.isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={['h-4 w-4', (reportsQuery.isFetching || schedulesQuery.isFetching) && 'animate-spin'].join(' ')} />
            Refresh
          </button>
        </div>

        {(reportsQuery.isError || schedulesQuery.isError || generateMutation.isError || createScheduleMutation.isError || processDueMutation.isError) && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h2 className="text-sm font-semibold text-rose-900">Report action failed</h2>
                <p className="mt-1 text-sm text-rose-700">
                  Check the backend session, database migration, Redis worker, and OpenClaw delivery config.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-100">
                <FileText className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Latest Report</h2>
                <p className="text-xs text-slate-600">{latestReport ? formatDate(latestReport.createdAt) : 'No report yet'}</p>
              </div>
            </div>
            {latestReport && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                {latestReport.status === 'delivered' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : latestReport.status.includes('failed') ? (
                  <XCircle className="h-4 w-4 text-rose-600" />
                ) : (
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                )}
                <span className="font-medium text-slate-700">{latestReport.status.replaceAll('_', ' ')}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="font-semibold text-slate-700">Schedule Name</span>
                  <input
                    value={scheduleName}
                    onChange={(event) => setScheduleName(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="font-semibold text-slate-700">Frequency</span>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly')}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
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
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Deliver via WhatsApp
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => createScheduleMutation.mutate()}
                  disabled={createScheduleMutation.isPending || !scheduleName.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarClock className="h-4 w-4" />
                  Add Schedule
                </button>
                <button
                  type="button"
                  onClick={() => processDueMutation.mutate()}
                  disabled={processDueMutation.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={['h-4 w-4', processDueMutation.isPending && 'animate-spin'].join(' ')} />
                  Process Due
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-950">Report History</h2>
              <p className="mt-0.5 text-sm text-slate-600">{reports.length} recent records</p>
            </div>
            <div className="divide-y divide-slate-100">
              {reports.length > 0 ? reports.map(renderReport) : (
                <div className="p-6 text-sm text-slate-500">No report records yet.</div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-950">Schedules</h2>
              <p className="mt-0.5 text-sm text-slate-600">{schedules.length} configured schedules</p>
            </div>
            <div className="divide-y divide-slate-100">
              {schedules.length > 0 ? schedules.map(renderSchedule) : (
                <div className="p-6 text-sm text-slate-500">No report schedules yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

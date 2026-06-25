import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { listTasks, type Task } from '../lib/api'
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

const priorityTone: Record<Task['priority'], 'neutral' | 'info' | 'warning' | 'danger'> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
}

const sourceTone: Record<Task['source'], 'neutral' | 'info' | 'warning' | 'success'> = {
  manual: 'neutral',
  admin: 'warning',
  agent: 'info',
  scheduled: 'success',
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '-')

export default function Tasks() {
  const queryClient = useQueryClient()

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
  })

  const tasks = tasksQuery.data ?? []
  const openTasks = tasks.filter((task) => !task.done)
  const completedTasks = tasks.filter((task) => task.done)
  const userScopedTasks = tasks.filter((task) => task.userId)
  const overdueTasks = openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now())

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Tasks"
          description="Read-only task inspection for operator diagnostics. Create and edit tasks from user-scoped app or agent flows."
          actions={
            <AdminButton
              variant="secondary"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
              disabled={tasksQuery.isFetching}
            >
              <RefreshCw className={['h-4 w-4', tasksQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
              Refresh
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricTile label="Open" value={openTasks.length} description="Pending task records" icon={ListChecks} tone="info" />
          <MetricTile label="Overdue" value={overdueTasks.length} description="Due date has passed" icon={Clock} tone={overdueTasks.length > 0 ? 'danger' : 'success'} />
          <MetricTile label="User Scoped" value={userScopedTasks.length} description="Attached to app users" icon={UserRound} tone="neutral" />
          <MetricTile label="Completed" value={completedTasks.length} description="Finished records" icon={CheckCircle2} tone="success" />
        </div>

        <div className="mt-5">
          <InlineNotice tone="info" title="Task ownership">
            This admin page intentionally does not create tasks. Task changes should happen through the mobile app or Nara Bot after user context is resolved.
          </InlineNotice>
        </div>

        <Panel className="mt-5">
          <PanelHeader title="Task Records" description={`${tasks.length} total tasks`} />

          {tasksQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading tasks...</div>
          ) : tasksQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load tasks">
                Check the operator session and backend connection.
              </InlineNotice>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={ListChecks} title="No task records" description="Tasks will appear here after users or Nara Bot create them." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Task</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                        {task.description && <p className="mt-1 text-xs text-slate-500">{task.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={task.userId ? 'info' : 'neutral'} withDot={false}>
                          {task.userId ? 'User' : 'Global'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={sourceTone[task.source]} withDot={false}>
                          {task.source}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">{formatDate(task.dueAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={task.done ? 'success' : 'warning'}>
                          {task.done ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {task.done ? 'Done' : 'Open'}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </main>
  )
}

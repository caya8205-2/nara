import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Plus, RefreshCw, Server, Wifi } from 'lucide-react'
import {
  completeTask,
  createTask,
  getReadiness,
  listTasks,
  type DependencyStatus,
} from '../lib/api'

const dependencyLabels = {
  database: 'Database',
  redis: 'Redis',
  openclaw: 'OpenClaw',
} as const

const StatusDot = ({ status }: { status?: DependencyStatus }) => (
  <span
    className={[
      'h-2.5 w-2.5 rounded-full',
      status?.ok ? 'bg-emerald-500' : 'bg-rose-500',
    ].join(' ')}
  />
)

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: getReadiness,
    refetchInterval: 15_000,
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
  })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setTitle('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['readiness'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const tasks = tasksQuery.data ?? []
  const pendingTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks])
  const doneTasks = tasks.length - pendingTasks.length
  const readiness = readinessQuery.data

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    createMutation.mutate({
      title: trimmedTitle,
      description: description.trim() || undefined,
    })
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['readiness'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Nara Control</h1>
            <p className="mt-1 text-sm text-slate-400">
              Backend, agent tools, and task operations in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Server className="h-4 w-4" />
              Backend
            </div>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold">
              <StatusDot status={readiness ? { ok: readiness.ok, status: readiness.ok ? 'ok' : 'error' } : undefined} />
              {readiness?.ok ? 'Ready' : readinessQuery.isLoading ? 'Checking' : 'Needs attention'}
            </div>
          </div>

          {readiness &&
            Object.entries(readiness.dependencies).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Wifi className="h-4 w-4" />
                  {dependencyLabels[key as keyof typeof dependencyLabels]}
                </div>
                <div className="mt-3 flex items-center gap-2 text-lg font-semibold">
                  <StatusDot status={value} />
                  {value.ok ? 'Online' : value.status}
                </div>
                {value.message && <p className="mt-2 text-xs text-slate-500">{value.message}</p>}
              </div>
            ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={onSubmit} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-base font-semibold">Create Task</h2>
            <label className="mt-4 block text-sm text-slate-300">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500"
                placeholder="Follow up supplier"
              />
            </label>
            <label className="mt-4 block text-sm text-slate-300">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 min-h-24 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="Optional notes"
              />
            </label>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </form>

          <div className="rounded-lg border border-slate-800 bg-slate-900">
            <div className="flex flex-col gap-2 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Tasks</h2>
                <p className="text-sm text-slate-400">
                  {pendingTasks.length} pending, {doneTasks} completed
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {tasksQuery.isLoading && <p className="p-4 text-sm text-slate-400">Loading tasks...</p>}
              {!tasksQuery.isLoading && tasks.length === 0 && (
                <p className="p-4 text-sm text-slate-400">No tasks yet.</p>
              )}
              {tasks.map((task) => (
                <article key={task.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {task.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock3 className="h-4 w-4 text-amber-300" />
                      )}
                      <h3 className="text-sm font-semibold">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-400">{task.description}</p>
                    )}
                  </div>
                  {!task.done && (
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate(task.id)}
                      className="h-9 shrink-0 rounded-md border border-slate-700 px-3 text-sm font-medium hover:bg-slate-800"
                    >
                      Complete
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Brain,
  Pin,
  Plus,
  RefreshCw,
} from 'lucide-react'
import {
  createContextEntry,
  listContextEntries,
  updateContextEntry,
  type ContextEntry,
  type CreateContextInput,
} from '../lib/api'

const kindClass = {
  note: 'border-slate-200 bg-slate-50 text-slate-700',
  preference: 'border-blue-200 bg-blue-50 text-blue-700',
  summary: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  instruction: 'border-amber-200 bg-amber-50 text-amber-700',
}

export default function Context() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [kind, setKind] = useState<CreateContextInput['kind']>('note')
  const [importance, setImportance] = useState<CreateContextInput['importance']>('normal')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const contextQuery = useQuery({
    queryKey: ['context-entries'],
    queryFn: listContextEntries,
  })

  const refreshContext = () => queryClient.invalidateQueries({ queryKey: ['context-entries'] })

  const createMutation = useMutation({
    mutationFn: createContextEntry,
    onSuccess: () => {
      setTitle('')
      setBody('')
      setKind('note')
      setImportance('normal')
      setPinned(false)
      setShowCreateForm(false)
      setFormError(null)
      refreshContext()
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.error || 'Failed to create context entry')
    },
  })

  const togglePinnedMutation = useMutation({
    mutationFn: (entry: ContextEntry) => updateContextEntry(entry.id, { pinned: !entry.pinned }),
    onSuccess: refreshContext,
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!title.trim() || !body.trim()) {
      setFormError('Title and body are required')
      return
    }

    createMutation.mutate({
      kind,
      title: title.trim(),
      body: body.trim(),
      source: 'manual',
      importance,
      pinned,
    })
  }

  const entries = contextQuery.data ?? []

  const renderEntry = (entry: ContextEntry) => (
    <div key={entry.id} className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{entry.title}</h3>
            <span className={['rounded-full border px-2 py-0.5 text-xs font-semibold', kindClass[entry.kind]].join(' ')}>
              {entry.kind}
            </span>
            <span className="text-xs font-semibold text-slate-500">{entry.importance}</span>
            {entry.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.body}</p>
          <p className="mt-2 text-xs text-slate-500">
            Updated {new Date(entry.updatedAt).toLocaleString()} · Source {entry.source}
          </p>
        </div>
        <button
          type="button"
          onClick={() => togglePinnedMutation.mutate(entry)}
          disabled={togglePinnedMutation.isPending}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pin className="h-4 w-4" />
          {entry.pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Context</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage business memory used by Nara Bot
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshContext}
              disabled={contextQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={['h-4 w-4', contextQuery.isFetching && 'animate-spin'].join(' ')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              New Context
            </button>
          </div>
        </div>

        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm font-semibold text-rose-800">{formError}</p>
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">New Context Entry</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Kind
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as CreateContextInput['kind'])}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="note">Note</option>
                  <option value="preference">Preference</option>
                  <option value="summary">Summary</option>
                  <option value="instruction">Instruction</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Importance
                <select
                  value={importance}
                  onChange={(event) => setImportance(event.target.value as CreateContextInput['importance'])}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(event) => setPinned(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Pinned
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                Body
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="mt-1 min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  required
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Save Context
              </button>
            </div>
          </form>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-950">Business Memory</h2>
            <p className="mt-0.5 text-sm text-slate-600">{entries.length} context entries</p>
          </div>

          {contextQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading context...</div>
          ) : contextQuery.isError ? (
            <div className="p-8">
              <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm font-semibold text-rose-800">Failed to load context entries.</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <Brain className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No context yet</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add important preferences, notes, or instructions for Nara Bot.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map(renderEntry)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

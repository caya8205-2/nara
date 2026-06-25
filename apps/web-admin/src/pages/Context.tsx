import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Brain,
  Pin,
  Plus,
  RefreshCw,
  Star,
} from 'lucide-react'
import {
  createContextEntry,
  listContextEntries,
  updateContextEntry,
  type ContextEntry,
  type CreateContextInput,
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

const kindTone: Record<NonNullable<CreateContextInput['kind']>, 'neutral' | 'info' | 'success' | 'warning'> = {
  note: 'neutral',
  preference: 'info',
  summary: 'success',
  instruction: 'warning',
}

const importanceTone: Record<NonNullable<CreateContextInput['importance']>, 'neutral' | 'info' | 'warning'> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    return response?.data?.error ?? fallback
  }
  return fallback
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
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, 'Failed to create context entry'))
    },
  })

  const togglePinnedMutation = useMutation({
    mutationFn: (entry: ContextEntry) => updateContextEntry(entry.id, { pinned: !entry.pinned }),
    onSuccess: refreshContext,
  })

  const handleSubmit = (event: FormEvent) => {
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
  const pinnedCount = entries.filter((entry) => entry.pinned).length
  const highCount = entries.filter((entry) => entry.importance === 'high').length
  const instructionCount = entries.filter((entry) => entry.kind === 'instruction').length

  const renderEntry = (entry: ContextEntry) => (
    <div key={entry.id} className="px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{entry.title}</h3>
            <StatusBadge tone={kindTone[entry.kind]}>{entry.kind}</StatusBadge>
            <StatusBadge tone={importanceTone[entry.importance]} withDot={false}>
              {entry.importance}
            </StatusBadge>
            {entry.pinned && (
              <StatusBadge tone="warning">
                <Pin className="h-3 w-3" />
                Pinned
              </StatusBadge>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.body}</p>
          <p className="mt-2 text-xs text-slate-500">
            Updated {new Date(entry.updatedAt).toLocaleString()} - Source {entry.source}
          </p>
        </div>
        <AdminButton
          variant="secondary"
          onClick={() => togglePinnedMutation.mutate(entry)}
          disabled={togglePinnedMutation.isPending}
        >
          <Pin className="h-4 w-4" />
          {entry.pinned ? 'Unpin' : 'Pin'}
        </AdminButton>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Context"
          description="Review and maintain business memory that can guide Nara Bot in user-scoped conversations."
          actions={
            <>
              <AdminButton variant="secondary" onClick={refreshContext} disabled={contextQuery.isFetching}>
                <RefreshCw className={['h-4 w-4', contextQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
                Refresh
              </AdminButton>
              <AdminButton onClick={() => setShowCreateForm((value) => !value)}>
                <Plus className="h-4 w-4" />
                New Context
              </AdminButton>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile label="Entries" value={entries.length} description="Saved memory records" icon={Brain} tone="neutral" />
          <MetricTile label="Pinned" value={pinnedCount} description="Always surfaced first" icon={Pin} tone={pinnedCount > 0 ? 'warning' : 'neutral'} />
          <MetricTile label="Instructions" value={instructionCount} description={`${highCount} high-importance entries`} icon={Star} tone={instructionCount > 0 ? 'info' : 'neutral'} />
        </div>

        {formError && (
          <div className="mt-5">
            <InlineNotice tone="danger" title="Context action failed">
              {formError}
            </InlineNotice>
          </div>
        )}

        {showCreateForm && (
          <Panel className="mt-5">
            <PanelHeader title="New Context Entry" description="Save a note, preference, summary, or instruction." />
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Kind
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as CreateContextInput['kind'])}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Pinned
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                  Title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-3">
                  Body
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    className="mt-1 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <AdminButton type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit" disabled={createMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Save Context
                </AdminButton>
              </div>
            </form>
          </Panel>
        )}

        <Panel className="mt-5">
          <PanelHeader title="Business Memory" description={`${entries.length} context entries`} />

          {contextQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading context...</div>
          ) : contextQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load context entries">
                Check the operator session and backend connection.
              </InlineNotice>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState icon={Brain} title="No context yet" description="Add important preferences, notes, or instructions for Nara Bot." />
          ) : (
            <div className="divide-y divide-slate-100">{entries.map(renderEntry)}</div>
          )}
        </Panel>
      </div>
    </main>
  )
}

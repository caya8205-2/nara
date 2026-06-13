import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  deleteAgentAccess,
  listAgentAccess,
  updateAgentAccess,
  type AgentChannelAccess,
} from '../lib/api'

const statusConfig = {
  pending_verification: {
    label: 'Pending Verification',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  pending_allowlist: {
    label: 'Pending Allowlist',
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: Clock,
  },
  allowed: {
    label: 'Allowed',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  blocked: {
    label: 'Blocked',
    color: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
  sync_failed: {
    label: 'Sync Failed',
    color: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: AlertCircle,
  },
}

export default function WhatsAppAccess() {
  const queryClient = useQueryClient()
  const [selectedAccess, setSelectedAccess] = useState<AgentChannelAccess | null>(null)

  const accessQuery = useQuery({
    queryKey: ['agent-access'],
    queryFn: listAgentAccess,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgentChannelAccess['status'] }) =>
      updateAgentAccess(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-access'] })
      setSelectedAccess(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAgentAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-access'] })
      setSelectedAccess(null)
    },
  })

  const accessRecords = accessQuery.data ?? []

  const getUserName = (access: AgentChannelAccess) => {
    return access.user?.displayName || access.userId.slice(0, 8)
  }

  const getContactLabel = (access: AgentChannelAccess) => {
    return access.contact?.value || access.contactId.slice(0, 8)
  }

  const handleApprove = (access: AgentChannelAccess) => {
    if (confirm('Approve this WhatsApp number for Nara Bot access?')) {
      updateMutation.mutate({ id: access.id, status: 'allowed' })
    }
  }

  const handleBlock = (access: AgentChannelAccess) => {
    if (confirm('Block this WhatsApp number from Nara Bot access?')) {
      updateMutation.mutate({ id: access.id, status: 'blocked' })
    }
  }

  const handleRetry = (access: AgentChannelAccess) => {
    updateMutation.mutate({ id: access.id, status: 'pending_allowlist' })
  }

  const handleDelete = (access: AgentChannelAccess) => {
    if (confirm('Delete this WhatsApp access request permanently?')) {
      deleteMutation.mutate(access.id)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">WhatsApp Access</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage Nara Bot allowlist and WhatsApp channel access
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['agent-access'] })
            }}
            disabled={accessQuery.isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={['h-4 w-4', accessQuery.isFetching && 'animate-spin'].join(' ')} />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">WhatsApp Access Management</h3>
              <p className="mt-1 text-sm text-blue-700">
                Users request access by adding their WhatsApp number in the app. Approve requests here to sync with OpenClaw allowlist.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-950">Access Requests</h2>
            <p className="mt-0.5 text-sm text-slate-600">{accessRecords.length} total requests</p>
          </div>

          {accessQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading access requests...</div>
          ) : accessQuery.isError ? (
            <div className="p-8">
              <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <h3 className="text-sm font-semibold text-rose-900">Failed to load access requests</h3>
                  <p className="mt-1 text-sm text-rose-700">
                    Could not fetch WhatsApp access data. Make sure you are logged in.
                  </p>
                </div>
              </div>
            </div>
          ) : accessRecords.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-950">No access requests yet</h3>
              <p className="mt-1 text-sm text-slate-600">
                WhatsApp access requests will appear here when users add their phone numbers in the app.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">WhatsApp Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Requested</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Sync</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accessRecords.map((access) => {
                    const config = statusConfig[access.status]
                    const Icon = config.icon

                    return (
                      <tr key={access.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-950">
                            {getUserName(access)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {getContactLabel(access)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={['inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold', config.color].join(' ')}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">
                            {new Date(access.requestedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">
                            {access.lastSyncAt ? new Date(access.lastSyncAt).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {access.status === 'pending_allowlist' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(access)}
                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </button>
                            )}
                            {access.status === 'sync_failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetry(access)}
                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Retry
                              </button>
                            )}
                            {access.status !== 'blocked' && (
                              <button
                                type="button"
                                onClick={() => handleBlock(access)}
                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle className="h-3 w-3" />
                                Block
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(access)}
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {accessRecords.some((a) => a.syncError) && (
          <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-orange-900">Sync Errors Detected</h3>
                <div className="mt-2 space-y-2">
                  {accessRecords
                    .filter((a) => a.syncError)
                    .map((access) => (
                      <div key={access.id} className="rounded-md border border-orange-300 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-950">
                              {getUserName(access)} - {getContactLabel(access)}
                            </p>
                            <p className="mt-1 text-xs text-orange-800">{access.syncError}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetry(access)}
                            className="shrink-0 text-xs font-semibold text-orange-700 hover:text-orange-800"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Access Status Guide</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-slate-950">Pending Verification</p>
                <p className="text-xs text-slate-600">User added number, awaiting initial check</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-slate-950">Pending Allowlist</p>
                <p className="text-xs text-slate-600">Ready for admin approval and OpenClaw sync</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold text-slate-950">Allowed</p>
                <p className="text-xs text-slate-600">Synced with OpenClaw, can message Nara Bot</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="text-xs font-semibold text-slate-950">Blocked</p>
                <p className="text-xs text-slate-600">Access denied, cannot message Nara Bot</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-xs font-semibold text-slate-950">Sync Failed</p>
                <p className="text-xs text-slate-600">
                  OpenClaw sync error, check logs and retry. May need OpenClaw runtime restart.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

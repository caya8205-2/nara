import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  deleteAgentAccess,
  getReadiness,
  listAgentAccess,
  retryAgentAccessSync,
  updateAgentAccess,
  type AgentChannelAccess,
} from '../lib/api'
import {
  AdminButton,
  DependencyBadge,
  EmptyState,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from '../components/admin-ui'

const statusConfig: Record<
  AgentChannelAccess['status'],
  {
    label: string
    tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
    icon: typeof Clock
  }
> = {
  pending_verification: {
    label: 'Pending Verification',
    tone: 'warning',
    icon: Clock,
  },
  pending_allowlist: {
    label: 'Pending Allowlist',
    tone: 'info',
    icon: Clock,
  },
  allowed: {
    label: 'Allowed',
    tone: 'success',
    icon: CheckCircle2,
  },
  blocked: {
    label: 'Blocked',
    tone: 'danger',
    icon: XCircle,
  },
  sync_failed: {
    label: 'Sync Failed',
    tone: 'danger',
    icon: AlertCircle,
  },
}

const formatDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : '-')

export default function WhatsAppAccess() {
  const queryClient = useQueryClient()
  const [selectedAccess, setSelectedAccess] = useState<AgentChannelAccess | null>(null)

  const accessQuery = useQuery({
    queryKey: ['agent-access'],
    queryFn: listAgentAccess,
  })

  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: getReadiness,
    refetchInterval: 30_000,
  })

  const refreshAccess = () => {
    queryClient.invalidateQueries({ queryKey: ['agent-access'] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgentChannelAccess['status'] }) => updateAgentAccess(id, { status }),
    onSuccess: () => {
      refreshAccess()
      setSelectedAccess(null)
    },
  })

  const retryMutation = useMutation({
    mutationFn: retryAgentAccessSync,
    onSuccess: () => {
      refreshAccess()
      setSelectedAccess(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAgentAccess,
    onSuccess: () => {
      refreshAccess()
      setSelectedAccess(null)
    },
  })

  const accessRecords = accessQuery.data ?? []
  const whatsAppReadiness = readinessQuery.data?.dependencies.whatsapp
  const pendingCount = accessRecords.filter((access) => access.status === 'pending_allowlist').length
  const allowedCount = accessRecords.filter((access) => access.status === 'allowed').length
  const failedCount = accessRecords.filter((access) => access.status === 'sync_failed' || access.syncError).length
  const actionPending = updateMutation.isPending || retryMutation.isPending || deleteMutation.isPending

  const getUserName = (access: AgentChannelAccess) => access.user?.displayName || access.userId.slice(0, 8)
  const getContactLabel = (access: AgentChannelAccess) => access.contact?.value || access.contactId.slice(0, 8)

  const handleApprove = (access: AgentChannelAccess) => {
    if (confirm('Approve this WhatsApp number for Nara Bot access?')) {
      setSelectedAccess(access)
      updateMutation.mutate({ id: access.id, status: 'allowed' })
    }
  }

  const handleBlock = (access: AgentChannelAccess) => {
    if (confirm('Block this WhatsApp number from Nara Bot access?')) {
      setSelectedAccess(access)
      updateMutation.mutate({ id: access.id, status: 'blocked' })
    }
  }

  const handleRetry = (access: AgentChannelAccess) => {
    setSelectedAccess(access)
    retryMutation.mutate(access.id)
  }

  const handleDelete = (access: AgentChannelAccess) => {
    if (confirm('Delete this WhatsApp access request permanently?')) {
      setSelectedAccess(access)
      deleteMutation.mutate(access.id)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="WhatsApp Access"
          description="Review access requests, approve allowed numbers, and watch OpenClaw sync state."
          actions={
            <AdminButton variant="secondary" onClick={refreshAccess} disabled={accessQuery.isFetching}>
              <RefreshCw className={['h-4 w-4', accessQuery.isFetching && 'animate-spin'].filter(Boolean).join(' ')} />
              Refresh
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricTile
            label="Pending"
            value={pendingCount}
            description="Ready for review"
            icon={Clock}
            tone={pendingCount > 0 ? 'warning' : 'neutral'}
          />
          <MetricTile
            label="Allowed"
            value={allowedCount}
            description="Approved numbers"
            icon={ShieldCheck}
            tone="success"
          />
          <MetricTile
            label="Sync Issues"
            value={failedCount}
            description="Needs retry or runtime check"
            icon={failedCount > 0 ? AlertCircle : CheckCircle2}
            tone={failedCount > 0 ? 'danger' : 'success'}
          />
          <MetricTile
            label="WhatsApp Runtime"
            value={<DependencyBadge status={whatsAppReadiness} />}
            description={whatsAppReadiness?.message ?? 'Checking readiness...'}
            icon={MessageSquare}
            tone={whatsAppReadiness?.ok ? 'success' : 'warning'}
          />
        </div>

        {whatsAppReadiness && !whatsAppReadiness.ok && (
          <div className="mt-5">
            <InlineNotice tone="warning" title="WhatsApp channel is not ready">
              <p>{whatsAppReadiness.message || 'Link a dedicated WhatsApp number before approving live access.'}</p>
              {whatsAppReadiness.details && (
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                    <p className="font-semibold text-amber-900">Account</p>
                    <p className="mt-0.5 text-amber-800">{String(whatsAppReadiness.details.account ?? 'default')}</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                    <p className="font-semibold text-amber-900">Dedicated Number</p>
                    <p className="mt-0.5 text-amber-800">
                      {whatsAppReadiness.details.hostNumberConfigured ? 'Configured' : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-white px-3 py-2">
                    <p className="font-semibold text-amber-900">Live Ready</p>
                    <p className="mt-0.5 text-amber-800">{whatsAppReadiness.details.readyForLiveUse ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
            </InlineNotice>
          </div>
        )}

        <Panel className="mt-5">
          <PanelHeader title="Access Requests" description={`${accessRecords.length} total requests`} />

          {accessQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading access requests...</div>
          ) : accessQuery.isError ? (
            <div className="p-4">
              <InlineNotice tone="danger" title="Failed to load access requests">
                Could not fetch WhatsApp access data. Make sure the operator session is active.
              </InlineNotice>
            </div>
          ) : accessRecords.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No access requests"
              description="Requests will appear here after users add WhatsApp numbers in the mobile app."
            />
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
                    const isSelected = selectedAccess?.id === access.id

                    return (
                      <tr key={access.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-950">{getUserName(access)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{getContactLabel(access)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={config.tone}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{new Date(access.requestedAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDate(access.lastSyncAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {access.status === 'pending_allowlist' && (
                              <AdminButton
                                className="h-8 px-2.5 text-xs"
                                onClick={() => handleApprove(access)}
                                disabled={actionPending}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </AdminButton>
                            )}
                            {access.status === 'sync_failed' && (
                              <AdminButton
                                variant="secondary"
                                className="h-8 px-2.5 text-xs"
                                onClick={() => handleRetry(access)}
                                disabled={actionPending}
                              >
                                <RefreshCw className={['h-3 w-3', isSelected && retryMutation.isPending && 'animate-spin'].filter(Boolean).join(' ')} />
                                Retry
                              </AdminButton>
                            )}
                            {access.status !== 'blocked' && (
                              <AdminButton
                                variant="danger"
                                className="h-8 px-2.5 text-xs"
                                onClick={() => handleBlock(access)}
                                disabled={actionPending}
                              >
                                <XCircle className="h-3 w-3" />
                                Block
                              </AdminButton>
                            )}
                            <AdminButton
                              variant="secondary"
                              className="h-8 px-2.5 text-xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => handleDelete(access)}
                              disabled={actionPending}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {accessRecords.some((access) => access.syncError) && (
          <Panel className="mt-5">
            <PanelHeader title="Sync Errors" description="Records with OpenClaw sync failures" />
            <div className="divide-y divide-orange-100">
              {accessRecords
                .filter((access) => access.syncError)
                .map((access) => (
                  <div key={access.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {getUserName(access)} · {getContactLabel(access)}
                      </p>
                      <p className="mt-1 text-sm text-orange-800">{access.syncError}</p>
                    </div>
                    <AdminButton variant="secondary" onClick={() => handleRetry(access)} disabled={actionPending}>
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </AdminButton>
                  </div>
                ))}
            </div>
          </Panel>
        )}

        <Panel className="mt-5">
          <PanelHeader title="Status Guide" description="What each access state means" />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon
              return (
                <div key={status} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </span>
                  <div>
                    <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                    <p className="mt-1 text-xs text-slate-500">
                      {status === 'pending_verification' && 'User added a number and is waiting for the next check.'}
                      {status === 'pending_allowlist' && 'Ready for admin approval and allowlist sync.'}
                      {status === 'allowed' && 'Approved and synced for WhatsApp access.'}
                      {status === 'blocked' && 'Access is denied for this number.'}
                      {status === 'sync_failed' && 'Sync failed and needs retry after the runtime is checked.'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </main>
  )
}

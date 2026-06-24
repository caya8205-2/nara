import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Bot,
  Clock3,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react'
import {
  listGroupDigests,
  processDueGroupDigests,
  type AgentGroupDigestStatus,
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

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : '-'

const statusTone = (group: AgentGroupDigestStatus) => {
  if (!group.summaryEnabled) return 'neutral'
  if (group.digestDue) return 'warning'
  if (group.latestSummaryStatus === 'failed') return 'danger'
  return 'success'
}

export default function GroupDigests() {
  const queryClient = useQueryClient()

  const digestsQuery = useQuery({
    queryKey: ['group-digests'],
    queryFn: listGroupDigests,
    refetchInterval: 30_000,
  })

  const processMutation = useMutation({
    mutationFn: processDueGroupDigests,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-digests'] })
      queryClient.invalidateQueries({ queryKey: ['readiness'] })
    },
  })

  const data = digestsQuery.data
  const groups = data?.groups ?? []
  const latestProcessed = processMutation.data

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['group-digests'] })
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Group Digests"
          description="Monitor WhatsApp group context, digest schedules, and saved summaries from recorded Nara Bot group messages."
          actions={
            <>
              <AdminButton onClick={refresh} disabled={digestsQuery.isFetching} variant="secondary">
                <RefreshCw className={['h-4 w-4', digestsQuery.isFetching && 'animate-spin'].join(' ')} />
                Refresh
              </AdminButton>
              <AdminButton onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
                <Send className="h-4 w-4" />
                Process Due
              </AdminButton>
            </>
          }
        />

        <InlineNotice tone="info" title="Group message ingestion is runtime-driven">
          This page shows group messages already recorded by Nara tools. It does not fetch WhatsApp history directly.
        </InlineNotice>

        {(digestsQuery.isError || processMutation.isError) && (
          <div className="mt-4">
            <InlineNotice tone="danger" title="Group digest action failed">
              Check operator login, database migration, Redis worker state, and the backend logs.
            </InlineNotice>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Tracked Groups"
            value={data?.total ?? '...'}
            description="Active group records in Nara"
            icon={MessageSquare}
            tone="info"
            badge={<StatusBadge tone="info">{data?.total ?? 0} total</StatusBadge>}
          />
          <MetricTile
            label="Digest Enabled"
            value={data?.enabled ?? '...'}
            description="Groups with scheduled digest enabled"
            icon={Clock3}
            tone={(data?.enabled ?? 0) > 0 ? 'success' : 'neutral'}
            badge={<StatusBadge tone={(data?.enabled ?? 0) > 0 ? 'success' : 'neutral'}>{data?.enabled ?? 0} enabled</StatusBadge>}
          />
          <MetricTile
            label="Due Now"
            value={data?.due ?? '...'}
            description="Digest schedules ready to process"
            icon={AlertCircle}
            tone={(data?.due ?? 0) > 0 ? 'warning' : 'success'}
            badge={<StatusBadge tone={(data?.due ?? 0) > 0 ? 'warning' : 'success'}>{data?.due ?? 0} due</StatusBadge>}
          />
          <MetricTile
            label="Last Manual Run"
            value={latestProcessed ? latestProcessed.processed : '-'}
            description={latestProcessed ? `Checked ${formatDate(latestProcessed.checkedAt)}` : 'No manual run this session'}
            icon={RefreshCw}
            tone={latestProcessed ? 'success' : 'neutral'}
            badge={<StatusBadge tone={latestProcessed ? 'success' : 'neutral'}>{latestProcessed ? 'Complete' : 'Idle'}</StatusBadge>}
          />
        </div>

        <Panel className="mt-5">
          <PanelHeader
            title="Group Digest Status"
            description="Scheduled summaries generated from recorded group messages."
            action={<StatusBadge tone={(data?.due ?? 0) > 0 ? 'warning' : 'success'}>{data?.due ?? 0} due</StatusBadge>}
          />
          {digestsQuery.isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading group digest status...</p>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No group context yet"
              description="Groups will appear here after Nara Bot records group context from OpenClaw group messages."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Group</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Messages</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Summary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((group) => (
                    <tr key={group.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex min-w-64 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-950">{group.name}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-500">{group.externalId}</div>
                            <div className="mt-2">
                              <StatusBadge tone={statusTone(group)}>
                                {group.summaryEnabled ? group.digestDue ? 'Due' : 'Scheduled' : 'Disabled'}
                              </StatusBadge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="font-mono text-xs text-slate-800">{group.summaryCronExpr ?? '-'}</div>
                        <div className="mt-1 text-xs text-slate-500">{group.summaryTimezone}</div>
                        <div className="mt-1 text-xs text-slate-500">Next: {formatDate(group.nextRunAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="font-semibold text-slate-950">{group.messageCount}</div>
                        <div className="mt-1 text-xs text-slate-500">Last: {formatDate(group.lastMessageAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {group.latestSummary ? (
                          <div className="max-w-md">
                            <div className="text-sm font-semibold text-slate-950">{group.latestSummary.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDate(group.latestSummary.createdAt)} · {group.latestSummary.messageCount} messages
                            </div>
                            <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md border border-slate-100 bg-white p-2 text-xs leading-5 text-slate-600">
                              {group.latestSummary.summary}
                            </pre>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">No summary yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={group.latestDeliveryStatus === 'delivery_failed' ? 'danger' : group.latestDeliveryStatus === 'delivery_skipped' ? 'warning' : 'neutral'}>
                          {group.latestDeliveryStatus?.replaceAll('_', ' ') ?? 'not sent'}
                        </StatusBadge>
                        {group.latestDeliveryMessage && (
                          <p className="mt-2 max-w-xs text-xs text-slate-500">{group.latestDeliveryMessage}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {latestProcessed && latestProcessed.groups.length > 0 && (
          <Panel className="mt-4">
            <PanelHeader
              title="Latest Manual Processing"
              description={`${latestProcessed.processed} group digest schedule(s) processed.`}
            />
            <div className="divide-y divide-slate-100">
              {latestProcessed.groups.map((group) => (
                <div key={`${group.groupId}-${group.periodEnd}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{group.groupName}</div>
                    <p className="mt-0.5 text-sm text-slate-500">{group.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(group.periodStart)} - {formatDate(group.periodEnd)}
                    </p>
                  </div>
                  <StatusBadge tone={group.status === 'failed' ? 'danger' : group.status === 'skipped' ? 'warning' : 'success'}>
                    {group.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </main>
  )
}

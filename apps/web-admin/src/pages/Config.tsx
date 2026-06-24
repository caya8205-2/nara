import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  Database,
  Key,
  Server,
  Settings,
  ShieldCheck,
  Wifi,
  XCircle,
} from 'lucide-react'
import { getReadiness } from '../lib/api'
import {
  AdminButton,
  DependencyBadge,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from '../components/admin-ui'

type ConfigItem = {
  key: string
  label: string
  value: string
  required: boolean
  present: boolean
  category: 'backend' | 'database' | 'redis' | 'openclaw' | 'agent' | 'frontend'
  helpText: string
}

const categories = [
  { id: 'backend', label: 'Backend', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'redis', label: 'Redis', icon: Wifi },
  { id: 'openclaw', label: 'OpenClaw', icon: Server },
  { id: 'agent', label: 'Agent Tools', icon: Key },
  { id: 'frontend', label: 'Frontend', icon: Settings },
] as const

export default function Config() {
  const [copied, setCopied] = useState(false)

  const readinessQuery = useQuery({
    queryKey: ['readiness'],
    queryFn: getReadiness,
  })

  const readiness = readinessQuery.data
  const agentSecretPresent = Boolean(localStorage.getItem('agentSecret'))
  const operatorTokenPresent = Boolean(localStorage.getItem('token'))

  const configItems: ConfigItem[] = [
    {
      key: 'BACKEND_URL',
      label: 'Backend API URL',
      value: window.location.origin,
      required: true,
      present: true,
      category: 'backend',
      helpText: 'Base URL used by the admin app for API calls.',
    },
    {
      key: 'BACKEND_STATUS',
      label: 'Backend Connection',
      value: readiness ? (readiness.ok ? 'Ready' : 'Degraded') : 'Disconnected',
      required: true,
      present: Boolean(readiness),
      category: 'backend',
      helpText: 'Backend API reachability and dependency report.',
    },
    {
      key: 'DATABASE_URL',
      label: 'PostgreSQL Connection',
      value: readiness?.dependencies.database.ok ? 'Configured' : 'Not available',
      required: true,
      present: Boolean(readiness?.dependencies.database.ok),
      category: 'database',
      helpText: 'Primary database connection for users, records, tasks, and audit data.',
    },
    {
      key: 'REDIS_URL',
      label: 'Redis Connection',
      value: readiness?.dependencies.redis.ok ? 'Configured' : 'Not available',
      required: true,
      present: Boolean(readiness?.dependencies.redis.ok),
      category: 'redis',
      helpText: 'Redis is used by queues and reminder/group summary workers.',
    },
    {
      key: 'OPENCLAW_API_TOKEN',
      label: 'OpenClaw API Token',
      value: readiness?.dependencies.openclaw.ok ? 'Configured' : 'Missing or unreachable',
      required: false,
      present: Boolean(readiness?.dependencies.openclaw.ok),
      category: 'openclaw',
      helpText: 'Required for agent runtime checks and WhatsApp access sync.',
    },
    {
      key: 'OPENCLAW_GATEWAY',
      label: 'OpenClaw Gateway',
      value: readiness?.dependencies.openclaw.ok ? 'Reachable' : 'Not reachable',
      required: false,
      present: Boolean(readiness?.dependencies.openclaw.ok),
      category: 'openclaw',
      helpText: 'Runtime endpoint used by backend services.',
    },
    {
      key: 'AGENT_API_SECRET',
      label: 'Agent API Secret',
      value: agentSecretPresent ? 'Present in browser' : 'Not set',
      required: true,
      present: agentSecretPresent,
      category: 'agent',
      helpText: 'Local browser value used by the Agent Tools page.',
    },
    {
      key: 'OPERATOR_TOKEN',
      label: 'Operator Session',
      value: operatorTokenPresent ? 'Active' : 'Not logged in',
      required: true,
      present: operatorTokenPresent,
      category: 'frontend',
      helpText: 'Admin session token for protected backend endpoints.',
    },
  ]

  const copyConfig = () => {
    const report = [
      'Nara Configuration Report',
      'Generated: ' + new Date().toISOString(),
      '',
      ...configItems.map((item) => {
        const status = item.present ? 'OK' : 'MISSING'
        const requirement = item.required ? 'REQUIRED' : 'OPTIONAL'
        return `[${status}] ${item.label} (${requirement}): ${item.value}`
      }),
    ].join('\n')

    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requiredMissing = configItems.filter((item) => item.required && !item.present)
  const optionalMissing = configItems.filter((item) => !item.required && !item.present)
  const allRequiredPresent = requiredMissing.length === 0

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Config"
          description="Verify setup values without exposing secrets, and copy a safe diagnostic report when needed."
          actions={
            <AdminButton variant="secondary" onClick={copyConfig}>
              <ClipboardCopy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy Report'}
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricTile
            label="Required Config"
            value={allRequiredPresent ? 'Ready' : requiredMissing.length}
            description={allRequiredPresent ? 'Required items are present' : 'Required items missing'}
            icon={allRequiredPresent ? CheckCircle2 : AlertCircle}
            tone={allRequiredPresent ? 'success' : 'warning'}
          />
          <MetricTile
            label="Backend"
            value={<DependencyBadge status={readiness?.dependencies.database} />}
            description={readiness ? 'Readiness report loaded' : 'Waiting for readiness'}
            icon={Server}
            tone={readiness?.ok ? 'success' : 'warning'}
          />
          <MetricTile
            label="OpenClaw"
            value={<DependencyBadge status={readiness?.dependencies.openclaw} />}
            description={readiness?.dependencies.openclaw.message ?? 'Runtime dependency'}
            icon={ShieldCheck}
            tone={readiness?.dependencies.openclaw.ok ? 'success' : 'warning'}
          />
          <MetricTile
            label="Optional Missing"
            value={optionalMissing.length}
            description="Optional setup items not ready"
            icon={Settings}
            tone={optionalMissing.length > 0 ? 'neutral' : 'success'}
          />
        </div>

        <div className="mt-5">
          {allRequiredPresent ? (
            <InlineNotice tone="success" title="Required setup is ready">
              Required configuration is available. Optional integrations can still be checked below.
            </InlineNotice>
          ) : (
            <InlineNotice tone="warning" title={`${requiredMissing.length} required item${requiredMissing.length === 1 ? '' : 's'} missing`}>
              <div className="space-y-1">
                {requiredMissing.map((item) => (
                  <p key={item.key}>{item.label}</p>
                ))}
              </div>
            </InlineNotice>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {categories.map((category) => {
            const items = configItems.filter((item) => item.category === category.id)
            if (items.length === 0) return null

            const Icon = category.icon
            const missingCount = items.filter((item) => !item.present).length

            return (
              <Panel key={category.id}>
                <PanelHeader
                  title={category.label}
                  description={missingCount > 0 ? `${missingCount} item${missingCount === 1 ? '' : 's'} need attention` : 'All items present'}
                  action={
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                  }
                />

                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.key} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_220px_120px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-950">{item.label}</h3>
                          <StatusBadge tone={item.required ? 'danger' : 'neutral'} withDot={false}>
                            {item.required ? 'Required' : 'Optional'}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{item.helpText}</p>
                        <p className="mt-2 break-all font-mono text-xs text-slate-500">{item.key}</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="break-all text-sm font-medium text-slate-700">{item.value}</p>
                      </div>
                      <div className="flex justify-start lg:justify-end">
                        <StatusBadge tone={item.present ? 'success' : item.required ? 'warning' : 'neutral'}>
                          {item.present ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {item.present ? 'Present' : 'Missing'}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )
          })}
        </div>

        <div className="mt-5">
          <InlineNotice tone="info" title="Setup notes">
            Backend environment changes require a service restart. Secret values stay masked here; use the copied report for status only, not for credential sharing.
          </InlineNotice>
        </div>
      </div>
    </main>
  )
}

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
  XCircle,
} from 'lucide-react'
import { getReadiness } from '../lib/api'

type ConfigItem = {
  key: string
  label: string
  value: string
  required: boolean
  present: boolean
  category: 'backend' | 'database' | 'redis' | 'openclaw' | 'agent' | 'frontend'
  helpText: string
}

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
      helpText: 'Base URL for backend API endpoints',
    },
    {
      key: 'BACKEND_STATUS',
      label: 'Backend Connection',
      value: readiness ? (readiness.ok ? 'Ready' : 'Degraded') : 'Disconnected',
      required: true,
      present: Boolean(readiness),
      category: 'backend',
      helpText: 'Backend API is reachable; dependency status is listed below',
    },
    {
      key: 'DATABASE_URL',
      label: 'PostgreSQL Connection',
      value: readiness?.dependencies.database.ok ? 'Configured' : 'Not Available',
      required: true,
      present: Boolean(readiness?.dependencies.database.ok),
      category: 'database',
      helpText: 'PostgreSQL database with pgvector extension',
    },
    {
      key: 'REDIS_URL',
      label: 'Redis Connection',
      value: readiness?.dependencies.redis.ok ? 'Configured' : 'Not Available',
      required: true,
      present: Boolean(readiness?.dependencies.redis.ok),
      category: 'redis',
      helpText: 'Redis for job queues and caching',
    },
    {
      key: 'OPENCLAW_API_TOKEN',
      label: 'OpenClaw API Token',
      value: readiness?.dependencies.openclaw.ok ? 'Configured' : 'Missing',
      required: false,
      present: Boolean(readiness?.dependencies.openclaw.ok),
      category: 'openclaw',
      helpText: 'Required for agent runtime and WhatsApp integration',
    },
    {
      key: 'OPENCLAW_GATEWAY',
      label: 'OpenClaw Gateway URL',
      value: readiness?.dependencies.openclaw.ok ? 'Reachable' : 'Not Reachable',
      required: false,
      present: Boolean(readiness?.dependencies.openclaw.ok),
      category: 'openclaw',
      helpText: 'OpenClaw Gateway endpoint for agent tools',
    },
    {
      key: 'AGENT_API_SECRET',
      label: 'Agent API Secret',
      value: agentSecretPresent ? 'Present (stored locally)' : 'Not Set',
      required: true,
      present: agentSecretPresent,
      category: 'agent',
      helpText: 'Secret for agent tool endpoint authentication (stored in browser)',
    },
    {
      key: 'OPERATOR_TOKEN',
      label: 'Operator Session',
      value: operatorTokenPresent ? 'Active' : 'Not Logged In',
      required: true,
      present: operatorTokenPresent,
      category: 'frontend',
      helpText: 'JWT token for operator authentication',
    },
  ]

  const categories = [
    { id: 'backend', label: 'Backend', icon: Server },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'redis', label: 'Redis', icon: Settings },
    { id: 'openclaw', label: 'OpenClaw', icon: Server },
    { id: 'agent', label: 'Agent Tools', icon: Key },
    { id: 'frontend', label: 'Frontend', icon: Settings },
  ] as const

  const copyConfig = () => {
    const report = [
      'Nara Configuration Report',
      'Generated: ' + new Date().toISOString(),
      '',
      ...configItems.map((item) => {
        const status = item.present ? '✓' : '✗'
        const req = item.required ? 'REQUIRED' : 'OPTIONAL'
        return '[' + status + '] ' + item.label + ' (' + req + '): ' + item.value
      }),
    ].join('\n')

    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requiredMissing = configItems.filter((item) => item.required && !item.present)
  const allRequiredPresent = requiredMissing.length === 0

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Config</h1>
            <p className="mt-1 text-sm text-slate-600">
              Verify environment and connection configuration
            </p>
          </div>
          <button
            type="button"
            onClick={copyConfig}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ClipboardCopy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            {allRequiredPresent ? (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">All Required Config Present</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Required configuration items are available. Optional items may be configured later.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    {requiredMissing.length} Required Item{requiredMissing.length !== 1 && 's'} Missing
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Some required configuration is missing. Features may not work correctly.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {requiredMissing.map((item) => (
                      <li key={item.key}>• {item.label}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const items = configItems.filter((item) => item.category === category.id)
            if (items.length === 0) return null

            const Icon = category.icon

            return (
              <div key={category.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">{category.label}</h2>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.key} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-950">{item.label}</h3>
                            {item.required ? (
                              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                Required
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{item.helpText}</p>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="font-mono text-slate-500">{item.key}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">{item.value}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {item.present ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Configuration Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Backend configuration is managed via environment variables in <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env</code> file</li>
            <li>• Agent API Secret is stored in browser localStorage for testing purposes</li>
            <li>• PostgreSQL and Redis should be running via Docker: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">npm run infra:up</code></li>
            <li>• OpenClaw integration is optional for Phase 3, required for Phase 8</li>
            <li>• Configuration changes require backend restart to take effect</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

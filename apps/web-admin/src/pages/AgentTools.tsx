import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Play,
  RotateCcw,
  TerminalSquare,
  Wrench,
} from 'lucide-react'
import {
  AdminButton,
  InlineNotice,
  MetricTile,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
} from '../components/admin-ui'

type ToolCategory = 'Context' | 'Tasks' | 'Reminders' | 'Groups' | 'Summary'

type Tool = {
  id: string
  name: string
  endpoint: string
  description: string
  category: ToolCategory
  examplePayload: string
  requiresAuth: boolean
}

const tools: Tool[] = [
  {
    id: 'get_user_context',
    name: 'get_user_context',
    endpoint: '/api/agent/users/context',
    category: 'Context',
    description: 'Resolve one Nara user before running user-scoped tools.',
    examplePayload: JSON.stringify({ contactValue: '+6281234567890', channelType: 'whatsapp' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'create_task',
    name: 'create_task',
    endpoint: '/api/agent/tasks/create',
    category: 'Tasks',
    description: 'Create a task after user context is known.',
    examplePayload: JSON.stringify(
      { userId: 'user-uuid-here', title: 'Follow up with supplier', description: 'Check delivery status' },
      null,
      2
    ),
    requiresAuth: true,
  },
  {
    id: 'list_tasks',
    name: 'list_tasks',
    endpoint: '/api/agent/tasks/list',
    category: 'Tasks',
    description: 'List tasks inside a resolved user scope.',
    examplePayload: JSON.stringify({ userId: 'user-uuid-here', done: false }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'complete_task',
    name: 'complete_task',
    endpoint: '/api/agent/tasks/complete',
    category: 'Tasks',
    description: 'Mark a task as completed after confirmation rules pass.',
    examplePayload: JSON.stringify({ userId: 'user-uuid-here', id: 'task-uuid-here' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'delete_task',
    name: 'delete_task',
    endpoint: '/api/agent/tasks/delete',
    category: 'Tasks',
    description: 'Delete a user-scoped task after confirmation.',
    examplePayload: JSON.stringify({ userId: 'user-uuid-here', id: 'task-uuid-here', confirmed: true }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'summary',
    name: 'summary',
    endpoint: '/api/agent/summary',
    category: 'Summary',
    description: 'Get a compact operational summary for an agent session.',
    examplePayload: JSON.stringify({ userId: 'user-uuid-here' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'create_reminder',
    name: 'create_reminder',
    endpoint: '/api/agent/reminders/create',
    category: 'Reminders',
    description: 'Create a one-time or recurring reminder in one user scope.',
    examplePayload: JSON.stringify(
      {
        userId: 'user-uuid-here',
        name: 'Follow up with supplier',
        kind: 'once',
        scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
        confirmed: true,
      },
      null,
      2
    ),
    requiresAuth: true,
  },
  {
    id: 'list_reminders',
    name: 'list_reminders',
    endpoint: '/api/agent/reminders/list',
    category: 'Reminders',
    description: 'List reminders inside one user scope.',
    examplePayload: JSON.stringify({ userId: 'user-uuid-here' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'update_reminder',
    name: 'update_reminder',
    endpoint: '/api/agent/reminders/update',
    category: 'Reminders',
    description: 'Edit, pause, or resume a reminder after confirmation.',
    examplePayload: JSON.stringify(
      { userId: 'user-uuid-here', id: 'reminder-uuid-here', enabled: false, confirmed: true },
      null,
      2
    ),
    requiresAuth: true,
  },
  {
    id: 'delete_reminder',
    name: 'delete_reminder',
    endpoint: '/api/agent/reminders/delete',
    category: 'Reminders',
    description: 'Delete a user-scoped reminder after confirmation.',
    examplePayload: JSON.stringify(
      { userId: 'user-uuid-here', id: 'reminder-uuid-here', confirmed: true },
      null,
      2
    ),
    requiresAuth: true,
  },
  {
    id: 'get_group_context',
    name: 'get_group_context',
    endpoint: '/api/agent/groups/context',
    category: 'Groups',
    description: 'Resolve a WhatsApp group before group summary tools run.',
    examplePayload: JSON.stringify({ externalId: 'whatsapp-group-id', name: 'Work Group' }, null, 2),
    requiresAuth: true,
  },
]

type TestResult = {
  ok: boolean
  status: number
  duration: number
  response: unknown
  timestamp: string
}

const categories: ToolCategory[] = ['Context', 'Tasks', 'Reminders', 'Groups', 'Summary']

export default function AgentTools() {
  const [selectedTool, setSelectedTool] = useState<Tool>(tools[0])
  const [payload, setPayload] = useState(tools[0].examplePayload)
  const [agentSecret, setAgentSecret] = useState(() => localStorage.getItem('agentSecret') || '')
  const [result, setResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [payloadError, setPayloadError] = useState<string | null>(null)

  const selectTool = (tool: Tool) => {
    setSelectedTool(tool)
    setPayload(tool.examplePayload)
    setResult(null)
    setPayloadError(null)
  }

  const runTool = async () => {
    setPayloadError(null)
    setIsRunning(true)
    const startTime = Date.now()

    try {
      let parsedPayload: unknown
      try {
        parsedPayload = JSON.parse(payload)
      } catch {
        setPayloadError('Invalid JSON syntax')
        setIsRunning(false)
        return
      }

      if (agentSecret) {
        localStorage.setItem('agentSecret', agentSecret)
      }

      const response = await fetch(selectedTool.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-secret': agentSecret,
        },
        body: JSON.stringify(parsedPayload),
      })

      const duration = Date.now() - startTime
      const responseData = await response.json()

      setResult({
        ok: response.ok && responseData.ok,
        status: response.status,
        duration,
        response: responseData,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const duration = Date.now() - startTime
      setResult({
        ok: false,
        status: 0,
        duration,
        response: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsRunning(false)
    }
  }

  const reset = () => {
    setPayload(selectedTool.examplePayload)
    setResult(null)
    setPayloadError(null)
  }

  const authReady = agentSecret.trim().length > 0

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Agent Tools"
          description="Run backend tool endpoints with explicit payloads and inspect responses before connecting them to OpenClaw."
          actions={
            <AdminButton onClick={runTool} disabled={isRunning || !authReady}>
              <Play className="h-4 w-4" />
              {isRunning ? 'Running' : 'Run Tool'}
            </AdminButton>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTile
            label="Available Tools"
            value={tools.length}
            description={`${categories.length} tool groups`}
            icon={Wrench}
            tone="neutral"
          />
          <MetricTile
            label="Selected Tool"
            value={selectedTool.name}
            description={selectedTool.endpoint}
            icon={TerminalSquare}
            tone="info"
          />
          <MetricTile
            label="Agent Secret"
            value={authReady ? 'Set' : 'Missing'}
            description="Stored only in this browser"
            icon={KeyRound}
            tone={authReady ? 'success' : 'warning'}
          />
        </div>

        <div className="mt-5">
          <InlineNotice tone={authReady ? 'info' : 'warning'} title="Agent API authentication">
            These calls use the `x-agent-secret` header. Keep this page for operator diagnostics, not daily user task work.
          </InlineNotice>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[320px_1fr_420px]">
          <Panel>
            <PanelHeader title="Tools" description="Select one endpoint to test" />
            <div className="max-h-[720px] overflow-y-auto p-3">
              {categories.map((category) => (
                <div key={category} className="mb-4 last:mb-0">
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{category}</p>
                  <div className="mt-2 space-y-1">
                    {tools
                      .filter((tool) => tool.category === category)
                      .map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => selectTool(tool)}
                          className={[
                            'w-full rounded-md border px-3 py-2 text-left transition',
                            selectedTool.id === tool.id
                              ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{tool.name}</span>
                            {tool.requiresAuth && <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                          </div>
                          <p className={['mt-1 text-xs', selectedTool.id === tool.id ? 'text-slate-300' : 'text-slate-500'].join(' ')}>
                            {tool.description}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Request"
              description={`POST ${selectedTool.endpoint}`}
              action={
                <AdminButton variant="secondary" className="h-8 px-2.5 text-xs" onClick={reset}>
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </AdminButton>
              }
            />
            <div className="space-y-4 p-4">
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">AGENT_API_SECRET</span>
                <input
                  type="password"
                  value={agentSecret}
                  onChange={(event) => setAgentSecret(event.target.value)}
                  placeholder="Enter agent secret from .env"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <label className="block text-sm">
                <span className="font-semibold text-slate-700">JSON Payload</span>
                <textarea
                  value={payload}
                  onChange={(event) => setPayload(event.target.value)}
                  className="mt-1 min-h-80 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  spellCheck={false}
                />
              </label>

              {payloadError && (
                <InlineNotice tone="danger" title="Payload error">
                  {payloadError}
                </InlineNotice>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Response"
              description={result ? `${result.status} in ${result.duration}ms` : 'Run a tool to inspect response'}
              action={
                result ? (
                  <StatusBadge tone={result.ok ? 'success' : 'danger'}>
                    {result.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {result.ok ? 'Success' : 'Error'}
                  </StatusBadge>
                ) : undefined
              }
            />
            {result ? (
              <div className="p-4">
                <p className="mb-2 text-xs text-slate-500">{new Date(result.timestamp).toLocaleString()}</p>
                <pre className="max-h-[620px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-950">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Tool responses will appear here.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}

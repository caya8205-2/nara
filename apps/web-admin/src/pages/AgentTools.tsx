import { useState } from 'react'
import { AlertCircle, CheckCircle2, Play, RotateCcw } from 'lucide-react'

type Tool = {
  id: string
  name: string
  endpoint: string
  description: string
  examplePayload: string
  requiresAuth: boolean
}

const tools: Tool[] = [
  {
    id: 'create_task',
    name: 'create_task',
    endpoint: '/api/agent/tasks/create',
    description: 'Create a new task',
    examplePayload: JSON.stringify(
      { title: 'Follow up with supplier', description: 'Check delivery status' },
      null,
      2
    ),
    requiresAuth: true,
  },
  {
    id: 'list_tasks',
    name: 'list_tasks',
    endpoint: '/api/agent/tasks/list',
    description: 'List tasks with optional filters',
    examplePayload: JSON.stringify({ done: false }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'complete_task',
    name: 'complete_task',
    endpoint: '/api/agent/tasks/complete',
    description: 'Mark a task as completed',
    examplePayload: JSON.stringify({ id: 'task-uuid-here' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'delete_task',
    name: 'delete_task',
    endpoint: '/api/agent/tasks/delete',
    description: 'Delete a task permanently',
    examplePayload: JSON.stringify({ id: 'task-uuid-here' }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'summary',
    name: 'summary',
    endpoint: '/api/agent/summary',
    description: 'Get operational summary for agent',
    examplePayload: '{}',
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

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">Agent Tools</h1>
          <p className="mt-1 text-sm text-slate-600">
            Test and debug agent tool endpoints before OpenClaw integration
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Agent Secret Required</p>
              <p className="mt-1 text-sm text-amber-700">
                All agent tool endpoints require x-agent-secret header authentication.
              </p>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-amber-900">AGENT_API_SECRET</span>
                <input
                  type="password"
                  value={agentSecret}
                  onChange={(e) => setAgentSecret(e.target.value)}
                  placeholder="Enter agent secret from .env"
                  className="mt-1 h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Available Tools</h2>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => selectTool(tool)}
                className={[
                  'w-full rounded-lg border p-3 text-left transition',
                  selectedTool.id === tool.id
                    ? 'border-teal-600 bg-teal-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <div className="text-sm font-semibold text-slate-950">{tool.name}</div>
                <div className="mt-1 text-xs text-slate-600">{tool.description}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">Request Payload</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={runTool}
                    disabled={isRunning || !agentSecret}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    Run Tool
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-2">
                POST {selectedTool.endpoint}
              </div>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="min-h-32 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                spellCheck={false}
              />
              {payloadError && (
                <div className="mt-2 text-xs text-rose-600">{payloadError}</div>
              )}
            </div>

            {result && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Response</h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      <span>Status: {result.status}</span>
                      <span>•</span>
                      <span>{result.duration}ms</span>
                      <span>•</span>
                      <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                      result.ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700',
                    ].join(' ')}
                  >
                    {result.ok ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        SUCCESS
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        ERROR
                      </>
                    )}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-950">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

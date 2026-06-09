import { env } from '../config/env.js'

type AgentResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type Task = {
  id: string
  title: string
  done: boolean
}

const backendUrl = process.env.NARA_BACKEND_URL ?? `http://127.0.0.1:${env.PORT}`
const cleanup = process.argv.includes('--cleanup')

async function callTool<T>(path: string, body: unknown = {}) {
  const response = await fetch(`${backendUrl}/api/agent${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-secret': env.AGENT_API_SECRET,
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as AgentResponse<T>

  if (!response.ok || !payload.ok) {
    const error = payload.ok ? `HTTP ${response.status}` : payload.error
    throw new Error(`${path} failed: ${error}`)
  }

  return payload.data
}

async function main() {
  const title = `Agent smoke test ${new Date().toISOString()}`

  console.log(`Backend: ${backendUrl}`)

  const created = await callTool<{ task: Task; message: string }>('/tasks/create', {
    title,
    description: 'Created by local agent smoke test.',
  })
  console.log(`Created: ${created.task.id}`)

  const listed = await callTool<{ tasks: Task[]; count: number }>('/tasks/list', {
    done: false,
  })
  const found = listed.tasks.some((task) => task.id === created.task.id)
  if (!found) throw new Error('Created task was not returned by list_tasks')
  console.log(`Pending tasks: ${listed.count}`)

  const completed = await callTool<{ task: Task; message: string }>('/tasks/complete', {
    id: created.task.id,
  })
  if (!completed.task.done) throw new Error('Completed task is not marked done')
  console.log(`Completed: ${completed.task.id}`)

  const summary = await callTool<{ summary: unknown }>('/summary')
  console.log(`Summary: ${JSON.stringify(summary.summary)}`)

  if (cleanup) {
    await callTool('/tasks/delete', { id: created.task.id })
    console.log(`Deleted: ${created.task.id}`)
  }

  console.log('Agent smoke test passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

/**
 * Nara Bot simulate harness (Milestone 4).
 *
 * Dev-only CLI that accepts a natural-language message plus a user identity,
 * resolves intent via rule-based keywords (Indonesian + English), and routes
 * the resulting tool calls through the SAME Nara Bot contract used in
 * production: get_user_context → respect assistantProfile.autonomy → call
 * /api/agent/* tools → audit log. Backend stays source of truth; this script
 * only hits HTTP endpoints (plus one direct audit-log insert for visibility).
 *
 * Usage:
 *   npm run agent:simulate -- --user-id <uuid> --message "ingatkan follow up invoice besok jam 9"
 *   npm run agent:simulate -- --contact-value +6281xxxxxxxx --message "buat task cek proposal sore ini"
 *
 * Flags: --dry-run  --json  --cleanup
 */
import { env } from '../config/env.js'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'

type AgentResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type Task = { id: string; title: string; done: boolean; userId?: string }
type Reminder = { id: string; name: string; enabled: boolean; kind: 'once' | 'recurring'; userId?: string }
type User = { id: string; displayName: string; email?: string; token?: string }

type AssistantProfile = {
  tone: string
  autonomy: 'Suggest' | 'Confirm' | 'Act'
  allowTaskCreation: boolean
  allowReminderDrafts: boolean
  allowSensitiveActions: boolean
}

type AgentContext = {
  user: Record<string, unknown>
  channelType: string
  assistantProfile: AssistantProfile
  taskSummary: { pendingTasks: number; overdueTasks: number; nextDue: string | null }
  reminderSummary: { activeReminders: number; pausedReminders: number; nextRunAt: string | null }
  instructions: string[]
  toolContext: { userId: string; channelType: string; contactValue: string | null }
}

type Subject = { userId?: string; contactValue?: string; channelType: 'whatsapp' | 'telegram' }

type ToolName =
  | 'get_user_context'
  | 'create_task'
  | 'list_tasks'
  | 'complete_task'
  | 'create_reminder'
  | 'get_summary'

interface SimulatedToolCall {
  tool: ToolName
  endpoint: string
  params: Record<string, unknown>
  mutating: boolean
}

interface IntentResolution {
  calls: SimulatedToolCall[]
  confidence: 'high' | 'low'
  fallback: boolean
}

interface ToolCallResult {
  tool: string
  ok: boolean
  result?: unknown
  error?: string
}

interface SimulationReport {
  startedAt: string
  subject: { label: string; userId?: string; contactValue?: string }
  message: string
  autonomy: string
  dryRun: boolean
  cleanup: boolean
  intent: { confidence: 'high' | 'low'; fallback: boolean; planned: SimulatedToolCall[] }
  contextSummary?: {
    pendingTasks?: number
    overdueTasks?: number
    activeReminders?: number
  }
  steps: Array<{ kind: string; message: string; data?: unknown }>
  toolsCalled: ToolCallResult[]
  cleanupActions: string[]
  reply: string
}

// ---------------------------------------------------------------------------
// CLI args + HTTP helpers (adapted from agent-smoke.ts)
// ---------------------------------------------------------------------------

const backendUrl = process.env.NARA_BACKEND_URL ?? `http://127.0.0.1:${env.PORT}`
const dryRun = process.argv.includes('--dry-run')
const jsonMode = process.argv.includes('--json')
const cleanup = process.argv.includes('--cleanup')

const argValue = (name: string) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function callJson<T>(path: string, body: unknown = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { response, payload: (await response.json()) as T }
}

async function ensureUser(): Promise<User> {
  const explicitUserId = argValue('--user-id')
  if (explicitUserId) return { id: explicitUserId, displayName: 'Existing simulate user' }

  const suffix = Date.now()
  const email = `agent-simulate-${suffix}@nara.local`
  const { response, payload } = await callJson<{ token: string; user: User }>('/api/auth/register', {
    displayName: 'Agent Simulate User',
    email,
    password: 'agent-simulate-password',
  })

  if (!response.ok) {
    throw new Error(`Failed to create simulate user: HTTP ${response.status}`)
  }

  return { ...payload.user, token: payload.token }
}

function resolveSubject(user: User | null): { subject: Subject; label: string } {
  const contactValue = argValue('--contact-value')
  if (contactValue) {
    return {
      subject: { contactValue, channelType: 'whatsapp' },
      label: `WhatsApp contact ${contactValue}`,
    }
  }
  if (!user) throw new Error('Simulate harness needs either --contact-value or --user-id')
  return {
    subject: { userId: user.id, channelType: 'whatsapp' },
    label: `user ${user.id}`,
  }
}

async function callTool<T>(path: string, body: unknown = {}): Promise<T> {
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

// ---------------------------------------------------------------------------
// Time extractor (Indonesian + English → ISO datetime, Asia/Jakarta)
// ---------------------------------------------------------------------------

const JAKARTA_OFFSET_HOURS = 7

function jakartaISO(year: number, month: number, day: number, hour: number, minute: number) {
  // Wall-clock (hour:minute) in UTC+7 → UTC instant = hour - 7.
  // Date.UTC normalises overflow (negative hour rolls back a day automatically).
  return new Date(Date.UTC(year, month - 1, day, hour - JAKARTA_OFFSET_HOURS, minute)).toISOString()
}

function nowInJakarta() {
  const now = new Date()
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours() + JAKARTA_OFFSET_HOURS,
    minute: now.getUTCMinutes(),
  }
}

const DAY_PART_HOURS: Record<string, number> = {
  pagi: 8, morning: 8,
  siang: 12, noon: 12,
  sore: 15, afternoon: 15,
  malam: 19, evening: 19, night: 19,
}

function extractTime(message: string): string | null {
  const text = message.toLowerCase()
  const now = new Date()
  const today = nowInJakarta()

  // Relative units: "N menit/jam/hari", "N minutes/hours/days"
  const relative = text.match(/(\d+)\s*(menit|minute|min|jam|hour|hr|hari|day)/)
  if (relative) {
    const n = Number(relative[1])
    const unit = relative[2]
    let ms = 0
    if (unit.startsWith('menit') || unit.startsWith('minute') || unit === 'min') ms = n * 60_000
    else if (unit.startsWith('jam') || unit.startsWith('hour') || unit === 'hr') ms = n * 3_600_000
    else ms = n * 86_400_000
    return new Date(now.getTime() + ms).toISOString()
  }

  // "nanti" / "later"
  if (/\bnanti\b|\blater\b/.test(text)) {
    return new Date(now.getTime() + 60 * 60_000).toISOString()
  }

  // Compute base day offset
  let dayOffset = 0
  if (/\bbesok\b|\btomorrow\b/.test(text)) dayOffset = 1
  else if (/\blusa\b/.test(text)) dayOffset = 2
  else if (/\bhari ini\b|\btoday\b/.test(text)) dayOffset = 0

  // "jam N" / "pukul N" / "at N"
  const atHour = text.match(/(?:jam|pukul|at)\s*(\d{1,2})(?:[:.](\d{2}))?/)
  if (atHour) {
    const hour = Number(atHour[1])
    const minute = atHour[2] ? Number(atHour[2]) : 0
    const baseDay = new Date(Date.UTC(today.year, today.month - 1, today.day) + dayOffset * 86_400_000)
    const target = jakartaISO(
      baseDay.getUTCFullYear(),
      baseDay.getUTCMonth() + 1,
      baseDay.getUTCDate(),
      hour,
      minute,
    )
    // If today and already past that time, push to tomorrow.
    if (dayOffset === 0 && Date.parse(target) < now.getTime()) {
      const next = new Date(Date.parse(target) + 86_400_000)
      return next.toISOString()
    }
    return target
  }

  // Day-part only: "pagi/siang/sore/malam ini" or "besok pagi"
  const dayPart = text.match(/\b(pagi|siang|sore|malam|morning|noon|afternoon|evening|night)\b/)
  if (dayPart && dayOffset >= 0) {
    const hour = DAY_PART_HOURS[dayPart[1]] ?? 9
    const baseDay = new Date(Date.UTC(today.year, today.month - 1, today.day) + dayOffset * 86_400_000)
    return jakartaISO(
      baseDay.getUTCFullYear(),
      baseDay.getUTCMonth() + 1,
      baseDay.getUTCDate(),
      hour,
      0,
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Intent resolver (rule-based NL → tool calls)
// ---------------------------------------------------------------------------

const stripLeading = (text: string, patterns: RegExp[]) => {
  let out = text.trim()
  for (const pattern of patterns) {
    out = out.replace(pattern, '').trim()
  }
  return out || text.trim()
}

function resolveIntent(message: string): IntentResolution {
  const text = message.toLowerCase()
  const calls: SimulatedToolCall[] = []

  // 1) Reminder intent
  if (/\b(ingat|inget|remind|pengingat|jangan lupa)\b/.test(text)) {
    const name = stripLeading(message, [
      /^(ingatkan|ingetin|ingat|inget|remind me to|remind|pengingat|jangan lupa)\s+/i,
    ])
    const scheduledAt = extractTime(message) ?? new Date(Date.now() + 60 * 60_000).toISOString()
    calls.push({
      tool: 'create_reminder',
      endpoint: '/reminders/create',
      params: { name, kind: 'once', scheduledAt },
      mutating: true,
    })
    return { calls, confidence: 'high', fallback: false }
  }

  // 2) Complete task intent
  if (/\b(udah selesai|selesaikan|done|complete|kelar|beres|mark done)\b/.test(text)) {
    // Needs an id — we resolve via list_tasks at runtime; placeholder call.
    calls.push({
      tool: 'complete_task',
      endpoint: '/tasks/complete',
      params: { resolveByList: true },
      mutating: true,
    })
    return { calls, confidence: 'high', fallback: false }
  }

  // 3) List tasks intent
  if (/\b(apa aja|apa saja|list|daftar|belum selesai|tampilkan|lihat|show)\b/.test(text)) {
    calls.push({
      tool: 'list_tasks',
      endpoint: '/tasks/list',
      params: { done: false },
      mutating: false,
    })
    return { calls, confidence: 'high', fallback: false }
  }

  // 4) Create task intent
  if (/\b(task|tugas|buat|bikin|follow.?up|kerjakan|add)\b/.test(text)) {
    const title = stripLeading(message, [
      /^(buatkan|buat|bikin|tambahkan|tambah|add|kerjakan|follow up|follow-up|task|tugas)\s+/i,
    ])
    calls.push({
      tool: 'create_task',
      endpoint: '/tasks/create',
      params: { title, description: 'Created by local agent simulation.' },
      mutating: true,
    })
    return { calls, confidence: 'high', fallback: false }
  }

  // 5) Summary intent (also default fallback)
  const isSummary = /\b(ringkas|status|summary|overview|gimana|gimana hari|how am i)\b/.test(text)
  calls.push({
    tool: 'get_summary',
    endpoint: '/summary',
    params: {},
    mutating: false,
  })
  return { calls, confidence: isSummary ? 'high' : 'low', fallback: !isSummary }
}

// ---------------------------------------------------------------------------
// Autonomy-aware contract execution
// ---------------------------------------------------------------------------

function autonomyNeedsConfirmation(autonomy: string) {
  return autonomy === 'Confirm' || autonomy === 'Suggest'
}

async function rejectApproval(id: string, token?: string) {
  if (!token) return false
  const response = await fetch(`${backendUrl}/api/approvals/${id}/reject`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error(`Failed to reject simulate approval ${id}: HTTP ${response.status}`)
  }
  return true
}

interface ExecContext {
  subject: Subject
  profile: AssistantProfile
  dryRun: boolean
  cleanup: boolean
  user: User | null
}

async function executePlanned(
  intent: IntentResolution,
  ctx: ExecContext,
  steps: SimulationReport['steps'],
  toolsCalled: ToolCallResult[],
  cleanupActions: string[],
): Promise<string> {
  const { subject, profile, dryRun } = ctx
  const createdTaskIds: string[] = []
  const createdReminderIds: string[] = []
  const createdApprovalIds: string[] = []

  for (const call of intent.calls) {
    if (call.mutating && profile.autonomy === 'Suggest') {
      const msg = `Autonomy=Suggest → skipping ${call.tool}; suggesting instead.`
      steps.push({ kind: 'suggest', message: msg, data: { tool: call.tool, params: call.params } })
      toolsCalled.push({ tool: call.tool, ok: true, result: { suggested: true, skipped: true } })
      continue
    }

    if (call.mutating && !dryRun) {
      // Check feature gates.
      if (call.tool === 'create_task' && !profile.allowTaskCreation) {
        const msg = `Task creation disabled for this user → suggesting instead.`
        steps.push({ kind: 'gate', message: msg })
        toolsCalled.push({ tool: call.tool, ok: false, error: 'task_creation_disabled' })
        continue
      }
      if (call.tool === 'create_reminder' && !profile.allowReminderDrafts) {
        const msg = `Reminder drafts disabled for this user → suggesting instead.`
        steps.push({ kind: 'gate', message: msg })
        toolsCalled.push({ tool: call.tool, ok: false, error: 'reminder_drafts_disabled' })
        continue
      }
    }

    // Build the actual request body (subject merged in).
    const body: Record<string, unknown> = { ...call.params, ...subject }
    delete body.resolveByList

    // Dry-run: print intended call without executing.
    if (dryRun) {
      steps.push({
        kind: 'planned',
        message: `PLANNED ${call.tool} → ${call.endpoint}`,
        data: { params: body },
      })
      toolsCalled.push({ tool: call.tool, ok: true, result: { planned: true } })
      continue
    }

    // complete_task needs an id resolved via list_tasks.
    if (call.tool === 'complete_task') {
      const listed = await callTool<{ tasks: Task[]; count: number }>('/tasks/list', { ...subject, done: false })
      const target = listed.tasks[0]
      if (!target) {
        steps.push({ kind: 'noop', message: 'No pending task to complete.' })
        toolsCalled.push({ tool: call.tool, ok: false, error: 'no_pending_task' })
        continue
      }
      body.id = target.id
      steps.push({ kind: 'resolve', message: `Resolved target task ${target.id} ("${target.title}") for completion.` })
    }

    // Autonomy → set confirmed flag appropriately.
    if (call.mutating) {
      if (profile.autonomy === 'Act') {
        body.confirmed = true
      } else {
        // Confirm: omit confirmed → backend returns approvalRequired.
      }
    }

    try {
      const result = await callTool<Record<string, unknown>>(call.endpoint, body)

      // Track created records for cleanup.
      if (call.tool === 'create_task') {
        const task = (result as { task?: Task }).task
        if (task?.id) createdTaskIds.push(task.id)
      }
      if (call.tool === 'create_reminder') {
        const reminder = (result as { reminder?: Reminder }).reminder
        if (reminder?.id) createdReminderIds.push(reminder.id)
      }
      // Confirm flow may return approvalRequired instead of the record.
      const approvalRequired = (result as { approvalRequired?: boolean }).approvalRequired
      const approval = (result as { approval?: { id: string } }).approval
      if (approvalRequired && approval?.id) {
        createdApprovalIds.push(approval.id)
        steps.push({
          kind: 'approval',
          message: `Approval requested (autonomy=${profile.autonomy}): ${approval.id}`,
          data: result,
        })
      } else {
        steps.push({
          kind: 'call',
          message: `${call.tool} ok`,
          data: result,
        })
      }
      toolsCalled.push({ tool: call.tool, ok: true, result })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      steps.push({ kind: 'error', message: `${call.tool} failed: ${message}` })
      toolsCalled.push({ tool: call.tool, ok: false, error: message })
    }
  }

  // Cleanup phase.
  if (ctx.cleanup && !ctx.dryRun) {
    for (const id of createdTaskIds) {
      try {
        await callTool('/tasks/delete', { ...subject, id, confirmed: true })
        cleanupActions.push(`Deleted task ${id}`)
      } catch (error) {
        cleanupActions.push(`Failed to delete task ${id}: ${error instanceof Error ? error.message : error}`)
      }
    }
    for (const id of createdReminderIds) {
      try {
        await callTool('/reminders/delete', { ...subject, id, confirmed: true })
        cleanupActions.push(`Deleted reminder ${id}`)
      } catch (error) {
        cleanupActions.push(`Failed to delete reminder ${id}: ${error instanceof Error ? error.message : error}`)
      }
    }
    for (const id of createdApprovalIds) {
      try {
        const rejected = await rejectApproval(id, ctx.user?.token)
        cleanupActions.push(rejected ? `Rejected approval ${id}` : `Approval ${id} left pending (no token)`)
      } catch (error) {
        cleanupActions.push(`Failed to reject approval ${id}: ${error instanceof Error ? error.message : error}`)
      }
    }
  }

  // Compose Nara-facing reply.
  const okCalls = toolsCalled.filter((t) => t.ok)
  const failedCalls = toolsCalled.filter((t) => !t.ok)
  const suggested = toolsCalled.filter((t) => (t.result as { suggested?: boolean })?.suggested)

  let reply: string
  if (dryRun) {
    reply = `Dry-run: planned ${intent.calls.length} tool call(s). No records created.`
  } else if (suggested.length > 0) {
    reply = `I've noted your request. Based on your current preference (Suggest mode), here's what I'd do: ${intent.calls.map((c) => c.tool).join(', ')}. Confirm if you'd like me to proceed.`
  } else if (createdApprovalIds.length > 0) {
    reply = `Done — I've prepared ${createdApprovalIds.length} action(s) awaiting your approval in Nara (Confirm mode).`
  } else if (failedCalls.length === toolsCalled.length && toolsCalled.length > 0) {
    reply = `I couldn't complete that request. Please check the simulation log for details.`
  } else {
    reply = `Done — ${okCalls.length} action(s) completed${failedCalls.length ? `, ${failedCalls.length} failed` : ''}.`
  }
  return reply
}

// ---------------------------------------------------------------------------
// Audit log (direct DB insert; same pattern as reminder.service.audit)
// ---------------------------------------------------------------------------

async function writeSimulationAudit(report: SimulationReport) {
  try {
    await db.insert(auditLogs).values({
      actorType: 'system',
      action: 'simulation.run',
      targetType: 'simulation',
      targetId: report.subject.userId ?? null,
      metadata: JSON.stringify({
        userId: report.subject.userId,
        contactValue: report.subject.contactValue,
        message: report.message,
        autonomy: report.autonomy,
        dryRun: report.dryRun,
        cleanup: report.cleanup,
        intentConfidence: report.intent.confidence,
        intentFallback: report.intent.fallback,
        toolsCalled: report.toolsCalled,
        cleanupActions: report.cleanupActions,
        reply: report.reply,
        timestamp: report.startedAt,
      }),
    })
  } catch (error) {
    // Audit failure must not mask the simulation result.
    report.steps.push({
      kind: 'audit',
      message: `Audit log insert failed: ${error instanceof Error ? error.message : error}`,
    })
  }
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printHuman(report: SimulationReport) {
  const line = (s: string) => console.log(`[SIMULATION] ${s}`)
  line(`Started: ${report.startedAt}`)
  line(`Subject: ${report.subject.label}`)
  line(`Message: ${report.message}`)
  line(`Autonomy: ${report.autonomy} | dry-run=${report.dryRun} cleanup=${report.cleanup}`)
  line(`Intent: confidence=${report.intent.confidence} fallback=${report.intent.fallback}`)
  for (const call of report.intent.planned) {
    line(`  planned: ${call.tool} → ${call.endpoint} (mutating=${call.mutating})`)
  }
  if (report.contextSummary) {
    line(
      `Context: pendingTasks=${report.contextSummary.pendingTasks ?? 'n/a'} ` +
      `overdue=${report.contextSummary.overdueTasks ?? 'n/a'} ` +
      `activeReminders=${report.contextSummary.activeReminders ?? 'n/a'}`,
    )
  }
  for (const step of report.steps) {
    line(`[${step.kind}] ${step.message}`)
  }
  if (report.cleanupActions.length) {
    line('Cleanup:')
    for (const action of report.cleanupActions) line(`  - ${action}`)
  }
  line(`Reply: ${report.reply}`)
  line('Simulation complete.')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const message = argValue('--message')
  if (!message) {
    throw new Error('--message is required (e.g. --message "ingatkan follow up besok jam 9")')
  }

  const contactValue = argValue('--contact-value')
  const user = contactValue ? null : await ensureUser()
  const { subject, label } = resolveSubject(user)

  const report: SimulationReport = {
    startedAt: new Date().toISOString(),
    subject: { label, userId: subject.userId, contactValue: subject.contactValue },
    message,
    autonomy: 'unknown',
    dryRun,
    cleanup,
    intent: { confidence: 'low', fallback: true, planned: [] },
    steps: [],
    toolsCalled: [],
    cleanupActions: [],
    reply: '',
  }

  if (!jsonMode) {
    console.log(`[SIMULATION] Backend: ${backendUrl}`)
    console.log(`[SIMULATION] Subject: ${label}`)
  }

  // Contract step 1: get_user_context (required first call).
  const context = await callTool<AgentContext>('/users/context', subject)
  const profile = context.assistantProfile
  report.autonomy = profile.autonomy

  report.contextSummary = {
    pendingTasks: context.taskSummary?.pendingTasks,
    overdueTasks: context.taskSummary?.overdueTasks,
    activeReminders: context.reminderSummary?.activeReminders,
  }

  report.steps.push({
    kind: 'context',
    message: `Resolved user context (autonomy=${profile.autonomy}, tone=${profile.tone}).`,
  })

  // Contract step 2: resolve intent from natural-language message.
  const intent = resolveIntent(message)
  report.intent = {
    confidence: intent.confidence,
    fallback: intent.fallback,
    planned: intent.calls,
  }

  if (intent.fallback) {
    report.steps.push({
      kind: 'intent',
      message: `No high-confidence intent matched; defaulting to get_summary.`,
    })
  }

  // Contract step 3: execute autonomy-aware tool calls.
  report.reply = await executePlanned(
    intent,
    { subject, profile, dryRun, cleanup, user },
    report.steps,
    report.toolsCalled,
    report.cleanupActions,
  )

  // M5: simulation audit log entry (admin-visible via /api/logs?search=simulation).
  await writeSimulationAudit(report)

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHuman(report)
  }
}

main().catch((error) => {
  console.error(`[SIMULATION] Error: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})

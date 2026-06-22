import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import { env } from '../config/env.js'
import { db } from '../db/index.js'
import { agentChannelAccess, agentChannels, userContacts } from '../db/schema.js'

type AllowlistOverride = {
  accessId: string
  status: 'allowed' | 'blocked'
}

type OpenClawConfig = {
  channels?: Record<string, unknown>
  meta?: Record<string, unknown>
}

type WhatsAppAccountConfig = {
  exists: boolean
  name?: string
  enabled?: boolean
  dmPolicy?: string
  selfChatMode?: boolean
  hostNumber?: string | null
  allowFrom: string[]
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class OpenClawService {
  async getWhatsAppReadiness() {
    if (!env.OPENCLAW_GATEWAY_URL) {
      return {
        ok: false,
        status: 'missing' as const,
        message: 'OPENCLAW_GATEWAY_URL is not configured',
      }
    }

    if (!env.OPENCLAW_WHATSAPP_ACCOUNT) {
      return {
        ok: false,
        status: 'missing' as const,
        message: 'OPENCLAW_WHATSAPP_ACCOUNT is not configured',
      }
    }

    if (!env.OPENCLAW_WHATSAPP_SEND_PATH) {
      return {
        ok: false,
        status: 'missing' as const,
        message: 'OPENCLAW_WHATSAPP_SEND_PATH is not configured',
      }
    }

    try {
      const allowedNumbers = await this.getAllowedWhatsAppNumbers()
      const account = await this.getWhatsAppAccountConfig()
      const expectedHostNumber = env.OPENCLAW_WHATSAPP_HOST_NUMBER
        ? this.normalizePhone(env.OPENCLAW_WHATSAPP_HOST_NUMBER)
        : null
      const configuredHostNumber = account.hostNumber
        ? this.normalizePhone(account.hostNumber)
        : null
      const hostReady = Boolean(configuredHostNumber) &&
        (!expectedHostNumber || configuredHostNumber === expectedHostNumber) &&
        account.selfChatMode !== true

      if (!account.exists) {
        return {
          ok: false,
          status: 'missing' as const,
          message: `WhatsApp account ${env.OPENCLAW_WHATSAPP_ACCOUNT} is not present in OpenClaw config.`,
          details: {
            account: env.OPENCLAW_WHATSAPP_ACCOUNT,
            allowedRecipientCount: allowedNumbers.length,
            hostNumberConfigured: Boolean(configuredHostNumber),
            selfChatMode: false,
            readyForLiveUse: false,
          },
        }
      }

      if (account.selfChatMode) {
        return {
          ok: false,
          status: 'error' as const,
          message: 'WhatsApp is using a shared personal-number mode. Link a dedicated Nara Bot number before live use.',
          details: {
            account: env.OPENCLAW_WHATSAPP_ACCOUNT,
            accountName: account.name ?? null,
            dmPolicy: account.dmPolicy ?? env.OPENCLAW_WHATSAPP_DM_POLICY,
            allowedRecipientCount: allowedNumbers.length,
            hostNumberConfigured: Boolean(configuredHostNumber),
            configuredHostNumber,
            expectedHostNumber,
            selfChatMode: true,
            readyForLiveUse: false,
          },
        }
      }

      if (!configuredHostNumber) {
        return {
          ok: false,
          status: 'missing' as const,
          message: 'Dedicated Nara Bot WhatsApp number is not configured yet.',
          details: {
            account: env.OPENCLAW_WHATSAPP_ACCOUNT,
            accountName: account.name ?? null,
            dmPolicy: account.dmPolicy ?? env.OPENCLAW_WHATSAPP_DM_POLICY,
            allowedRecipientCount: allowedNumbers.length,
            hostNumberConfigured: false,
            expectedHostNumber,
            selfChatMode: false,
            readyForLiveUse: false,
          },
        }
      }

      if (!hostReady) {
        return {
          ok: false,
          status: 'error' as const,
          message: 'Configured WhatsApp host number does not match OPENCLAW_WHATSAPP_HOST_NUMBER.',
          details: {
            account: env.OPENCLAW_WHATSAPP_ACCOUNT,
            accountName: account.name ?? null,
            dmPolicy: account.dmPolicy ?? env.OPENCLAW_WHATSAPP_DM_POLICY,
            allowedRecipientCount: allowedNumbers.length,
            hostNumberConfigured: true,
            configuredHostNumber,
            expectedHostNumber,
            selfChatMode: false,
            readyForLiveUse: false,
          },
        }
      }

      return {
        ok: true,
        status: 'ok' as const,
        message: `${allowedNumbers.length} allowed WhatsApp recipient(s); dedicated Nara Bot number configured.`,
        details: {
          account: env.OPENCLAW_WHATSAPP_ACCOUNT,
          accountName: account.name ?? null,
          dmPolicy: account.dmPolicy ?? env.OPENCLAW_WHATSAPP_DM_POLICY,
          allowedRecipientCount: allowedNumbers.length,
          hostNumberConfigured: true,
          configuredHostNumber,
          expectedHostNumber,
          selfChatMode: false,
          readyForLiveUse: true,
        },
      }
    } catch (error) {
      return {
        ok: false,
        status: 'error' as const,
        message: `WhatsApp readiness failed: ${errorMessage(error)}`,
      }
    }
  }

  async syncWhatsAppAllowlist(input: { override?: AllowlistOverride } = {}) {
    const numbers = await this.getAllowedWhatsAppNumbers(input.override)
    if (env.OPENCLAW_ALLOWLIST_SYNC_MODE !== 'config') {
      const apiResult = await this.trySyncAllowlistViaGateway(numbers)
      if (apiResult.ok || env.OPENCLAW_ALLOWLIST_SYNC_MODE === 'api') {
        return apiResult
      }
    }

    try {
      return await this.syncAllowlistConfig(numbers)
    } catch (error) {
      return {
        ok: false,
        status: 'sync_failed',
        message: `OpenClaw config sync failed: ${errorMessage(error)}`,
      }
    }
  }

  async sendWhatsAppMessage(input: {
    to: string
    text: string
    metadata?: Record<string, unknown>
  }) {
    const url = this.gatewayUrl(env.OPENCLAW_WHATSAPP_SEND_PATH)
    if (!url) {
      return {
        ok: false,
        status: 'delivery_failed',
        message: 'OPENCLAW_GATEWAY_URL is not configured',
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.gatewayHeaders(),
        body: JSON.stringify({
          channel: 'whatsapp',
          account: env.OPENCLAW_WHATSAPP_ACCOUNT,
          to: this.normalizePhone(input.to),
          text: input.text,
          metadata: input.metadata ?? {},
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        return {
          ok: false,
          status: 'delivery_failed',
          message: `OpenClaw delivery failed with HTTP ${response.status}`,
        }
      }

      return {
        ok: true,
        status: 'delivered',
        message: 'Reminder delivered through OpenClaw WhatsApp.',
      }
    } catch (error) {
      return {
        ok: false,
        status: 'delivery_failed',
        message: `OpenClaw delivery failed: ${errorMessage(error)}`,
      }
    }
  }

  private async getAllowedWhatsAppNumbers(override?: AllowlistOverride) {
    const rows = await db
      .select({
        accessId: agentChannelAccess.id,
        status: agentChannelAccess.status,
        channelType: agentChannels.type,
        contactType: userContacts.type,
        contactValue: userContacts.value,
      })
      .from(agentChannelAccess)
      .innerJoin(agentChannels, eq(agentChannelAccess.channelId, agentChannels.id))
      .innerJoin(userContacts, eq(agentChannelAccess.contactId, userContacts.id))
      .where(and(
        eq(agentChannels.type, 'whatsapp'),
        eq(userContacts.type, 'whatsapp'),
      ))

    const numbers = new Set<string>()
    for (const row of rows) {
      const status = row.accessId === override?.accessId ? override.status : row.status
      if (status !== 'allowed') continue
      numbers.add(this.normalizePhone(row.contactValue))
    }

    return Array.from(numbers).sort()
  }

  private async getWhatsAppAccountConfig(): Promise<WhatsAppAccountConfig> {
    const configPath = this.configPath()
    const raw = await readFile(configPath, 'utf8')
    const config = JSON.parse(raw) as OpenClawConfig
    const channels = config.channels && typeof config.channels === 'object'
      ? config.channels
      : {}
    const whatsapp = this.record(channels.whatsapp)
    const accounts = this.record(whatsapp?.accounts)
    const account = this.record(accounts?.[env.OPENCLAW_WHATSAPP_ACCOUNT])

    if (!account) {
      return {
        exists: false,
        allowFrom: [],
      }
    }

    return {
      exists: true,
      name: typeof account.name === 'string' ? account.name : undefined,
      enabled: typeof account.enabled === 'boolean' ? account.enabled : undefined,
      dmPolicy: typeof account.dmPolicy === 'string' ? account.dmPolicy : undefined,
      selfChatMode: account.selfChatMode === true,
      hostNumber: typeof account.hostNumber === 'string'
        ? account.hostNumber
        : typeof account.ownerPhone === 'string'
          ? account.ownerPhone
          : null,
      allowFrom: this.stringArray(account.allowFrom),
    }
  }

  private async trySyncAllowlistViaGateway(numbers: string[]) {
    const url = this.gatewayUrl(env.OPENCLAW_ALLOWLIST_SYNC_PATH)
    if (!url) {
      return {
        ok: false,
        status: 'sync_failed',
        message: 'OpenClaw allowlist API path is not configured; falling back to config sync',
      }
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.gatewayHeaders(),
        body: JSON.stringify({
          channel: 'whatsapp',
          account: env.OPENCLAW_WHATSAPP_ACCOUNT,
          allowFrom: numbers,
          dmPolicy: 'allowlist',
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        return {
          ok: false,
          status: 'sync_failed',
          message: `OpenClaw allowlist API failed with HTTP ${response.status}`,
        }
      }

      return {
        ok: true,
        status: 'synced',
        mode: 'api',
        allowFrom: numbers,
        message: `Synced ${numbers.length} WhatsApp allowlist number(s) through OpenClaw API.`,
      }
    } catch (error) {
      return {
        ok: false,
        status: 'sync_failed',
        message: `OpenClaw allowlist API failed: ${errorMessage(error)}`,
      }
    }
  }

  private async syncAllowlistConfig(numbers: string[]) {
    const configPath = this.configPath()
    const raw = await readFile(configPath, 'utf8')
    const config = JSON.parse(raw) as OpenClawConfig
    const backupPath = `${configPath}.before-nara-allowlist-${this.timestamp()}`

    await copyFile(configPath, backupPath)

    const channels = this.ensureRecord(config, 'channels')
    const whatsapp = this.ensureRecord(channels, 'whatsapp')
    whatsapp.enabled = true
    whatsapp.defaultAccount = env.OPENCLAW_WHATSAPP_ACCOUNT

    const accounts = this.ensureRecord(whatsapp, 'accounts')
    const account = this.ensureRecord(accounts, env.OPENCLAW_WHATSAPP_ACCOUNT)
    const meta = this.ensureRecord(config as Record<string, unknown>, 'meta')
    const previousManaged = this.stringArray(meta.naraManagedAllowFrom)
    const currentAllowFrom = this.stringArray(account.allowFrom)
    const manualAllowFrom = currentAllowFrom.filter((phone) => !previousManaged.includes(phone))
    const nextAllowFrom = Array.from(new Set([...manualAllowFrom, ...numbers])).sort()

    account.enabled = true
    account.dmPolicy = env.OPENCLAW_WHATSAPP_DM_POLICY
    account.allowFrom = nextAllowFrom
    meta.naraManagedAllowFrom = numbers
    meta.naraAllowlistSyncedAt = new Date().toISOString()

    if (config.meta && typeof config.meta === 'object') {
      config.meta.lastTouchedAt = new Date().toISOString()
    }

    await mkdir(path.dirname(configPath), { recursive: true })
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

    return {
      ok: true,
      status: 'synced',
      mode: 'config',
      allowFrom: nextAllowFrom,
      backupPath,
      message: `Synced ${numbers.length} Nara-managed WhatsApp allowlist number(s) to OpenClaw config.`,
    }
  }

  private gatewayUrl(pathname?: string) {
    if (!env.OPENCLAW_GATEWAY_URL || !pathname) return null
    const url = new URL(env.OPENCLAW_GATEWAY_URL)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = pathname.startsWith('/') ? pathname : `/${pathname}`
    url.search = ''
    url.hash = ''
    return url.toString()
  }

  private gatewayHeaders() {
    return {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(env.OPENCLAW_GATEWAY_TOKEN
        ? { authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}` }
        : {}),
    }
  }

  private normalizePhone(value: string) {
    const compact = value.trim().replace(/[\s().-]/g, '')
    const normalized = compact.startsWith('+')
      ? compact
      : compact.startsWith('62')
        ? `+${compact}`
        : compact.startsWith('0')
          ? `+62${compact.slice(1)}`
          : compact

    if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
      throw new Error(`Invalid WhatsApp number for OpenClaw allowlist: ${value}`)
    }

    return normalized
  }

  private configPath() {
    return env.OPENCLAW_CONFIG_PATH ??
      path.join(os.homedir(), '.openclaw', 'openclaw.json')
  }

  private timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-')
  }

  private ensureRecord(parent: Record<string, unknown>, key: string) {
    const value = parent[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    const next: Record<string, unknown> = {}
    parent[key] = next
    return next
  }

  private record(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return null
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) return []
    return value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  }
}

export const openClawService = new OpenClawService()

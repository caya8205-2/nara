import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

import { env } from '../config/env.js'

type JsonObject = Record<string, unknown>

export interface OpenClawAllowlistEntry {
  channelType: string
  contactType: string
  contactValue: string
  status: string
}

export interface OpenClawAllowlistSyncResult {
  configPath: string
  account: string
  allowFrom: string[]
  managedAllowFrom: string[]
}

const defaultConfigPath = () => join(homedir(), '.openclaw', 'openclaw.json')

export class OpenClawAllowlistService {
  async syncWhatsApp(entries: OpenClawAllowlistEntry[]): Promise<OpenClawAllowlistSyncResult> {
    const configPath = env.OPENCLAW_CONFIG_PATH || defaultConfigPath()
    const account = env.OPENCLAW_WHATSAPP_ACCOUNT

    if (!existsSync(configPath)) {
      throw new Error(`OpenClaw config not found: ${configPath}`)
    }

    const cfg = JSON.parse(await readFile(configPath, 'utf8')) as JsonObject
    const desired = this.normalizedAllowedPhones(entries)
    const wa = this.ensureObject(this.ensureObject(cfg, 'channels'), 'whatsapp')
    const accounts = this.ensureObject(wa, 'accounts')
    const acct = this.ensureObject(accounts, account)
    const meta = this.ensureObject(cfg, 'meta')

    const previousManaged = this.stringArray(meta.naraManagedAllowFrom)
    const currentAllowFrom = this.stringArray(acct.allowFrom)
    const manualAllowFrom = currentAllowFrom.filter((phone) => !previousManaged.includes(phone))
    const nextAllowFrom = this.unique([...manualAllowFrom, ...desired])

    wa.enabled = true
    wa.defaultAccount = account
    acct.name = typeof acct.name === 'string' && acct.name.trim() ? acct.name : 'Nara Bot'
    acct.enabled = true
    acct.dmPolicy = env.OPENCLAW_WHATSAPP_DM_POLICY
    acct.allowFrom = nextAllowFrom
    meta.naraManagedAllowFrom = desired
    meta.naraAllowlistSyncedAt = new Date().toISOString()

    const backupPath = `${configPath}.before-nara-allowlist-sync-${this.timestamp()}`
    await copyFile(configPath, backupPath)
    await this.writeJsonAtomic(configPath, cfg)

    return {
      configPath,
      account,
      allowFrom: nextAllowFrom,
      managedAllowFrom: desired,
    }
  }

  private normalizedAllowedPhones(entries: OpenClawAllowlistEntry[]) {
    return this.unique(
      entries
        .filter((entry) =>
          entry.channelType === 'whatsapp' &&
          entry.contactType === 'whatsapp' &&
          entry.status === 'allowed',
        )
        .map((entry) => this.normalizePhone(entry.contactValue))
        .filter((phone): phone is string => Boolean(phone)),
    )
  }

  private normalizePhone(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('+')) return trimmed
    const digits = trimmed.replace(/[^\d]/g, '')
    if (!digits) return null
    if (digits.startsWith('0')) return `+62${digits.slice(1)}`
    if (digits.startsWith('62')) return `+${digits}`
    return `+${digits}`
  }

  private ensureObject(parent: JsonObject, key: string): JsonObject {
    const value = parent[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as JsonObject
    }

    const next: JsonObject = {}
    parent[key] = next
    return next
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) return []
    return value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  }

  private unique(values: string[]) {
    return Array.from(new Set(values))
  }

  private async writeJsonAtomic(path: string, value: JsonObject) {
    const tmpPath = `${path}.tmp-${process.pid}-${Date.now()}`
    await mkdir(dirname(path), { recursive: true })
    await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(tmpPath, path)
  }

  private timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-')
  }
}

export const openClawAllowlistService = new OpenClawAllowlistService()

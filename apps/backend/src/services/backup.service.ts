import { spawn } from 'node:child_process'
import { constants, createReadStream, createWriteStream } from 'node:fs'
import { access, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'

export type BackupType = 'database' | 'reports' | 'config' | 'full'
export type BackupStatus = 'success' | 'failed' | 'in_progress'

export interface BackupRecord {
  id: string
  type: BackupType
  timestamp: string
  size: string
  status: BackupStatus
  location: string
  error?: string
}

export interface BackupStorageStatus {
  ok: boolean
  status: 'ok' | 'missing' | 'error' | 'disabled'
  message?: string
  details: {
    backupDir: string
    reportsDir: string
    historyPath: string
    pgDumpAvailable: boolean
    dockerAvailable: boolean
    postgresContainerName: string
    lastBackupAt: string | null
    lastSuccessfulBackupAt: string | null
    lastFailureAt: string | null
    lastFailureMessage: string | null
  }
}

const backupDir = path.resolve(env.BACKUP_DIR ?? './data/backups')
const reportsDir = path.resolve(env.REPORTS_DIR ?? './data/reports')
const historyPath = path.join(backupDir, 'history.json')

const secretPattern = /(SECRET|TOKEN|PASSWORD|KEY|DATABASE_URL|REDIS_URL)/i

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const getTimestampSlug = () => new Date().toISOString().replace(/[:.]/g, '-')

const createId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const redactEnv = () => Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => [
      'NODE_ENV',
      'PORT',
      'TRUST_PROXY',
      'CORS_ORIGINS',
      'DATABASE_URL',
      'REDIS_URL',
      'OPENCLAW_GATEWAY_URL',
      'OPENCLAW_GATEWAY_TOKEN',
      'BACKUP_DIR',
      'REPORTS_DIR',
      'JWT_SECRET',
      'AGENT_API_SECRET',
      'OPERATOR_USERNAME',
      'OPERATOR_PASSWORD',
    ].includes(key))
    .map(([key, value]) => [key, secretPattern.test(key) && value ? 'configured' : value ?? null])
)

const walkFiles = async (dir: string, base = dir): Promise<Array<{ path: string; size: number }>> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkFiles(absolute, base)
    if (!entry.isFile()) return []

    const info = await stat(absolute)
    return [{ path: path.relative(base, absolute), size: info.size }]
  }))

  return files.flat()
}

export class BackupService {
  private async ensureBackupDir() {
    await mkdir(backupDir, { recursive: true })
  }

  private async readHistory() {
    await this.ensureBackupDir()

    try {
      const raw = await readFile(historyPath, 'utf8')
      return JSON.parse(raw) as BackupRecord[]
    } catch {
      return []
    }
  }

  private async writeHistory(records: BackupRecord[]) {
    await this.ensureBackupDir()
    await writeFile(historyPath, `${JSON.stringify(records.slice(0, 50), null, 2)}\n`, 'utf8')
  }

  private async addRecord(record: BackupRecord) {
    const records = await this.readHistory()
    await this.writeHistory([record, ...records])

    await db.insert(auditLogs).values({
      actorType: 'admin',
      action: `backup.${record.status}`,
      targetType: 'backup',
      targetId: null,
      metadata: JSON.stringify({
        backupId: record.id,
        type: record.type,
        location: record.location,
        error: record.error,
      }),
    })

    return record
  }

  async listHistory(limit = 20) {
    const records = await this.readHistory()
    return { backups: records.slice(0, Math.min(limit, 50)) }
  }

  async getStatus(): Promise<BackupStorageStatus> {
    let records: BackupRecord[] = []
    try {
      records = await this.readHistory()
    } catch {
      records = []
    }

    const lastBackup = records[0] ?? null
    const lastSuccessfulBackup = records.find((record) => record.status === 'success') ?? null
    const lastFailure = records.find((record) => record.status === 'failed') ?? null
    const baseDetails = {
      backupDir,
      reportsDir,
      historyPath,
      pgDumpAvailable: false,
      dockerAvailable: false,
      postgresContainerName: env.POSTGRES_CONTAINER_NAME,
      lastBackupAt: lastBackup?.timestamp ?? null,
      lastSuccessfulBackupAt: lastSuccessfulBackup?.timestamp ?? null,
      lastFailureAt: lastFailure?.timestamp ?? null,
      lastFailureMessage: lastFailure?.error ?? null,
    }

    try {
      await this.ensureBackupDir()
      await access(backupDir, constants.R_OK | constants.W_OK)
      const probePath = path.join(backupDir, `.nara-backup-write-check-${process.pid}.tmp`)
      await writeFile(probePath, 'ok', 'utf8')
      await unlink(probePath)
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: `Backup directory is not writable: ${errorMessage(error)}`,
        details: baseDetails,
      }
    }

    const pgDumpAvailable = await this.commandAvailable('pg_dump', ['--version'])
    const dockerAvailable = await this.commandAvailable('docker', [
      'exec',
      env.POSTGRES_CONTAINER_NAME,
      'pg_dump',
      '--version',
    ])
    const details = {
      ...baseDetails,
      pgDumpAvailable,
      dockerAvailable,
    }

    if (!pgDumpAvailable && !dockerAvailable) {
      return {
        ok: false,
        status: 'missing',
        message: 'Neither host pg_dump nor Docker is available for database backups.',
        details,
      }
    }

    return {
      ok: true,
      status: 'ok',
      message: pgDumpAvailable
        ? 'Backup storage is writable and host pg_dump is available.'
        : 'Backup storage is writable and Docker fallback is available.',
      details,
    }
  }

  async createBackup(type: BackupType = 'full') {
    try {
      const filePath = await this.createBackupFile(type)
      const info = await stat(filePath)
      return this.addRecord({
        id: createId(),
        type,
        timestamp: new Date().toISOString(),
        size: formatSize(info.size),
        status: 'success',
        location: filePath,
      })
    } catch (error) {
      return this.addRecord({
        id: createId(),
        type,
        timestamp: new Date().toISOString(),
        size: '0 B',
        status: 'failed',
        location: backupDir,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async createExport(type: BackupType) {
    const record = await this.createBackup(type)
    if (record.status === 'failed') {
      throw new Error(record.error ?? `Failed to create ${type} export`)
    }

    return {
      record,
      stream: createReadStream(record.location),
      filename: path.basename(record.location),
    }
  }

  private async createBackupFile(type: BackupType) {
    await this.ensureBackupDir()

    if (type === 'database') return this.createDatabaseDump()
    if (type === 'reports') return this.createReportsManifest()
    if (type === 'config') return this.createConfigSnapshot()
    return this.createFullSnapshot()
  }

  private async createConfigSnapshot() {
    const filePath = path.join(backupDir, `config-${getTimestampSlug()}.json`)
    await writeFile(filePath, `${JSON.stringify({
      createdAt: new Date().toISOString(),
      env: redactEnv(),
    }, null, 2)}\n`, 'utf8')
    return filePath
  }

  private async createReportsManifest() {
    const filePath = path.join(backupDir, `reports-${getTimestampSlug()}.json`)
    let files: Array<{ path: string; size: number }> = []
    let missing = false

    try {
      files = await walkFiles(reportsDir)
    } catch {
      missing = true
    }

    await writeFile(filePath, `${JSON.stringify({
      createdAt: new Date().toISOString(),
      reportsDir,
      missing,
      files,
    }, null, 2)}\n`, 'utf8')
    return filePath
  }

  private async createFullSnapshot() {
    const filePath = path.join(backupDir, `full-${getTimestampSlug()}.json`)
    const databaseDumpPath = await this.createDatabaseDump()
    const databaseDumpInfo = await stat(databaseDumpPath)
    let reports: Array<{ path: string; size: number }> = []
    let reportsMissing = false

    try {
      reports = await walkFiles(reportsDir)
    } catch {
      reportsMissing = true
    }

    await writeFile(filePath, `${JSON.stringify({
      createdAt: new Date().toISOString(),
      backupDir,
      reportsDir,
      database: {
        dumpPath: databaseDumpPath,
        size: databaseDumpInfo.size,
      },
      config: redactEnv(),
      reports: {
        missing: reportsMissing,
        files: reports,
      },
    }, null, 2)}\n`, 'utf8')
    return filePath
  }

  private async createDatabaseDump() {
    const databaseUrl = new URL(env.DATABASE_URL)
    const filePath = path.join(backupDir, `database-${getTimestampSlug()}.sql`)

    try {
      await this.createHostDatabaseDump(databaseUrl, filePath)
    } catch (hostError) {
      try {
        await this.createDockerDatabaseDump(databaseUrl, filePath)
      } catch (dockerError) {
        throw new Error([
          'Database backup failed.',
          `Host pg_dump: ${hostError instanceof Error ? hostError.message : String(hostError)}`,
          `Docker pg_dump: ${dockerError instanceof Error ? dockerError.message : String(dockerError)}`,
        ].join(' '))
      }
    }

    return filePath
  }

  private async createHostDatabaseDump(databaseUrl: URL, filePath: string) {
    await this.runCommand('pg_dump', [
      '--dbname',
      env.DATABASE_URL,
      '--file',
      filePath,
      '--no-owner',
      '--no-privileges',
    ], {
      env: {
        ...process.env,
        PGPASSWORD: databaseUrl.password,
      },
    })
  }

  private async createDockerDatabaseDump(databaseUrl: URL, filePath: string) {
    const output = createWriteStream(filePath)

    await new Promise<void>((resolve, reject) => {
      const child = spawn('docker', [
        'exec',
        '-e',
        `PGPASSWORD=${databaseUrl.password}`,
        env.POSTGRES_CONTAINER_NAME,
        'pg_dump',
        '-U',
        decodeURIComponent(databaseUrl.username),
        '-d',
        databaseUrl.pathname.replace(/^\//, ''),
        '--no-owner',
        '--no-privileges',
      ], {
        env: {
          ...process.env,
        },
        windowsHide: true,
      })

      let errorOutput = ''
      child.stdout.pipe(output)
      child.stderr.on('data', (chunk) => {
        errorOutput += String(chunk)
      })
      child.on('error', (error) => {
        output.close()
        reject(new Error(`docker exec pg_dump failed to start: ${error.message}`))
      })
      child.on('close', (code) => {
        output.close()
        if (code === 0) resolve()
        else reject(new Error(errorOutput.trim() || `docker exec pg_dump exited with code ${code}`))
      })
    })
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { env?: NodeJS.ProcessEnv } = {},
  ) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        env: options.env ?? process.env,
        windowsHide: true,
      })

      let errorOutput = ''
      child.stderr.on('data', (chunk) => {
        errorOutput += String(chunk)
      })
      child.on('error', (error) => {
        reject(new Error(`${command} failed to start: ${error.message}`))
      })
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(errorOutput.trim() || `${command} exited with code ${code}`))
      })
    })
  }

  private async commandAvailable(command: string, args: string[]) {
    try {
      await this.runCommand(command, args)
      return true
    } catch {
      return false
    }
  }
}

export const backupService = new BackupService()

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

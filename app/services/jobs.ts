import { setTimeout as sleep } from 'node:timers/promises'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job, Worker } from '@adonisjs/queue'
import type { QueueConfig } from '@adonisjs/queue/types'
import type { AdapterFactory } from '@adonisjs/queue/types'
import { loadPluginState } from '#services/plugin_setup'

const LOCK_ATTEMPTS = 5

export function isDatabaseLocked(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  return (
    code === 'SQLITE_BUSY' ||
    code === 'SQLITE_LOCKED' ||
    code === 'SQLITE_BUSY_SNAPSHOT' ||
    /database is locked|database table is locked/i.test(message ?? '')
  )
}

export function isRecordGone(error: unknown) {
  return (error as { code?: string } | null)?.code === 'E_ROW_NOT_FOUND'
}

export abstract class BaseJob<Payload = Record<string, never>> extends Job<Payload> {
  abstract handle(): Promise<void>

  async execute() {
    for (let attempt = 1; ; attempt++) {
      try {
        await loadPluginState()
        return await this.handle()
      } catch (error) {
        if (isRecordGone(error)) {
          logger.warn({ job: this.context.name, payload: this.payload }, 'Job dropped: record gone')
          return
        }
        if (isDatabaseLocked(error) && attempt < LOCK_ATTEMPTS) {
          logger.warn({ job: this.context.name, attempt }, 'Database locked, retrying job')
          await sleep(250 * 2 ** attempt)
          continue
        }
        logger.warn(
          { err: error, job: this.context.name, attempt: this.context.attempt },
          'Job attempt failed'
        )
        throw error
      }
    }
  }

  async failed(error: Error) {
    logger.error({ err: error, job: this.context.name, payload: this.payload }, 'Job failed')
  }
}

let worker: Worker | null = null

async function workerConfig() {
  const config = app.config.get<QueueConfig>('queue')
  const adapters: Record<string, AdapterFactory> = {}
  for (const [name, adapter] of Object.entries(config.adapters)) {
    adapters[name] = typeof adapter === 'function' ? adapter : await adapter.resolver(app)
  }
  return {
    ...config,
    adapters,
    autoLoadJobs: false,
    logger: config.logger ?? logger,
    jobFactory: config.jobFactory ?? ((JobClass) => app.container.make(JobClass)),
    worker: { ...config.worker, gracefulShutdown: false },
  } satisfies ConstructorParameters<typeof Worker>[0]
}

export async function startWorker(queues = ['default']) {
  if (worker) return
  worker = new Worker(await workerConfig())
  const running = worker
  logger.info({ queues }, 'Queue worker started in-process')
  running.start(queues).catch((error) => {
    logger.error({ err: error }, 'Queue worker stopped unexpectedly')
    if (worker === running) worker = null
  })
}

export async function stopWorker() {
  if (!worker) return
  const running = worker
  worker = null
  await running.stop()
}

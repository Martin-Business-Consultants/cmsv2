import { defineConfig, drivers, exponentialBackoff } from '@adonisjs/queue'

export default defineConfig({
  default: 'database',

  adapters: {
    database: drivers.database({
      connectionName: 'sqlite',
    }),
    sync: drivers.sync(),
  },

  retry: {
    maxRetries: 4,
    backoff: exponentialBackoff({
      baseDelay: '10s',
      maxDelay: '15m',
      multiplier: 3,
      jitter: true,
    }),
  },

  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500, age: '30d' },
  },

  worker: {
    concurrency: 2,
    idleDelay: '2s',
    stalledThreshold: '5m',
    stalledInterval: '1m',
  },

  locations: ['./app/jobs/**/*.{ts,js}', './plugins/*/app/jobs/**/*.{ts,js}'],
})

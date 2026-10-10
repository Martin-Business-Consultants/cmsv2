import { defineConfig } from '@adonisjs/cors'
import { corsOrigin } from '#services/public_origins'

const corsConfig = defineConfig({
  enabled: true,

  origin: corsOrigin,

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],

  headers: true,

  exposeHeaders: [],

  credentials: true,

  maxAge: 90,
})

export default corsConfig

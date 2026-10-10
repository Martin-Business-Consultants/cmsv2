import emitter from '@adonisjs/core/services/emitter'
import { WEBHOOK_EVENTS } from '#services/events'
import { scheduleDeploy } from '#services/deploys'

emitter.on('cms:announced', async (announcement) => {
  if (!(WEBHOOK_EVENTS as string[]).includes(announcement.event)) return
  await scheduleDeploy(announcement.event, announcement.record)
})

emitter.on('cms:site_settings_changed', async () => {
  await scheduleDeploy('settings.general_updated', 'settings')
})

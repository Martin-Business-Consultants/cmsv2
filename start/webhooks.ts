import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import { queueAnnouncement, queuePluginEvent } from '#services/webhooks'
import '#start/collection_notifications'

emitter.on('cms:announced', async (announcement) => {
  try {
    await queueAnnouncement(announcement)
  } catch (error) {
    logger.error({ err: error, event: announcement.event }, 'Could not queue webhooks')
  }
})

emitter.on('cms:plugin_event', async (action) => {
  try {
    await queuePluginEvent(action)
  } catch (error) {
    logger.error({ err: error, event: action.action }, 'Could not queue webhooks')
  }
})

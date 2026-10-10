import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import { notificationFor } from '#services/collection_notifications'
import NotifyCollectionSubscribersJob from '#jobs/notify_collection_subscribers_job'

emitter.on('cms:announced', async (announcement) => {
  try {
    const payload = await notificationFor(announcement)
    if (payload) await NotifyCollectionSubscribersJob.dispatch(payload)
  } catch (error) {
    logger.error({ err: error, event: announcement.event }, 'Could not queue collection emails')
  }
})

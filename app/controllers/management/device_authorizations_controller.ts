import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import DeviceAuthorization from '#models/device_authorization'
import ServiceToken from '#models/service_token'
import { siteKey } from '#services/webhooks'
import { audit } from '#services/audit'

export const POLL_INTERVAL = 3

function baseUrl({ request }: HttpContext) {
  return `${request.protocol()}://${request.host()}`
}

function failure(ctx: HttpContext, status: number, error: string) {
  return ctx.response.status(status).json({ status: 'error', error })
}

export default class DeviceAuthorizationsController {
  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const authorization = await DeviceAuthorization.mint({
      hostname: request.input('hostname'),
      purpose: request.input('purpose'),
      label: request.input('label'),
    })
    return response.status(201).json({
      status: 'ok',
      user_code: authorization.userCode,
      device_code: authorization.deviceCode,
      verification_url: `${baseUrl(ctx)}/connect?code=${encodeURIComponent(authorization.userCode)}`,
      interval: POLL_INTERVAL,
      expires_in: Math.trunc(authorization.expiresAt.diff(DateTime.now(), 'seconds').seconds),
      account: siteKey(),
    })
  }

  async token(ctx: HttpContext) {
    const deviceCode = String(ctx.request.input('device_code') ?? '')
    const authorization = deviceCode
      ? await DeviceAuthorization.findBy('deviceCode', deviceCode)
      : null

    if (!authorization || authorization.expired) return failure(ctx, 410, 'expired_or_unknown')
    if (authorization.denied) return failure(ctx, 403, 'denied')
    if (!authorization.approved) {
      return ctx.response.status(202).json({ status: 'pending', interval: POLL_INTERVAL })
    }

    let claimed: Awaited<ReturnType<DeviceAuthorization['claim']>>
    try {
      claimed = await authorization.claim()
    } catch {
      return failure(ctx, 410, 'expired_or_unknown')
    }
    const { token, plaintext, user } = claimed
    const origin = {
      via: 'api' as const,
      userId: user.id,
      actorType: 'User' as const,
      actorId: user.id,
      actorLabel: user.displayName,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent')?.slice(0, 512) ?? null,
    }
    const site = token instanceof ServiceToken
    if (site) {
      await audit(origin, 'service_token.issued', token, {
        name: token.name,
        role: token.role?.name ?? null,
      })
    }

    return {
      status: 'ok',
      token: plaintext,
      purpose: site ? 'site' : 'user',
      ...(site ? { token_name: token.name } : {}),
      user: { name: user.fullName, email: user.email },
      account: siteKey(),
      api_url: baseUrl(ctx),
    }
  }
}

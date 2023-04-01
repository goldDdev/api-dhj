import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { DateTime } from 'luxon'
export default class Timezone {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    const currDate = DateTime.now().setZone('UTC+7')
    ctx.now = currDate.toFormat('yyyy-MM-dd')
    ctx.month = currDate.month
    ctx.year = currDate.year
    ctx.day = currDate.day
    ctx.time = currDate.toFormat('HH:mm')
    await next()
  }
}

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Tracking from 'App/Models/Tracking'

export default class TrackingsController {
  public async index({ request, response }: HttpContextContract) {
    // NOTE : list tracking map all project employee, by date by project to show on web map
    const tracks = await Tracking.query()
      .where('projectId', request.input('projectId'))
      .where(Database.raw('DATE(created_at)'), request.input('date'))
    // .preload('user')
    return response.send(tracks)
  }
}

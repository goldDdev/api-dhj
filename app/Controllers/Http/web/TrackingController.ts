import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
// import Tracking from 'App/Models/Tracking'

export default class TrackingsController {
  public async index({ response }: HttpContextContract) {
    // TODO : list tracking map all project employee, by date by project to show on web map
    return response.send({})
  }
}

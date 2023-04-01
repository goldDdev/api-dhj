import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'
import Tracking from 'App/Models/Tracking'

export default class TrackingsController {
  public async index({ request, response }: HttpContextContract) {
    if (!request.input('projectId') || !request.input('date')) return response.send({ data: [] })
    const project = await Project.findOrFail(request.input('projectId'))

    const tracks = await Tracking.query()
      .where('projectId', request.input('projectId'))
      .where(Database.raw('DATE(created_at)'), request.input('date'))
    // TODO : need preload join project & employee

    // TODO : need send center location => should be coordinate project

    return response.send({
      data: tracks,
      meta: { center: { latitude: project.latitude, longitude: project.longitude } },
    })
  }
}

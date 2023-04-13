import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'

export default class TrackingsController {
  public async index({ request, response }: HttpContextContract) {
    if (!request.input('projectId') || !request.input('date')) return response.send({ data: [] })
    const project = await Project.findOrFail(request.input('projectId'))

    const tracks = await Database.from('trackings')
      .select(
        'project_id',
        'projects.latitude AS project_latitude',
        'projects.longitude AS project_longitude',
        'employee_id',
        'employees.name',
        'employees.role',
        'trackings.latitude',
        'trackings.longitude'
      )
      .joinRaw('JOIN projects ON projects.id = trackings.project_id')
      .joinRaw('JOIN employees ON employees.id = trackings.employee_id')
      .where('trackings.project_id', request.input('projectId'))
      .where(Database.raw('DATE(trackings.created_at)'), request.input('date'))
      .orderBy('trackings.created_at', 'desc')
    // TODO : how to get group emp get last
    // .groupBy('employeeId')

    // TODO : employee project but not in trackings ?

    return response.send({
      data: tracks,
      meta: { center: { latitude: project.latitude, longitude: project.longitude } },
    })
  }
}

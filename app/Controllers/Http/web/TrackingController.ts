import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'

export default class TrackingsController {
  public async index({ request, response, now }: HttpContextContract) {
    if (!request.input('projectId') || !request.input('date')) return response.send({ data: [] })
    const project = await Project.findOrFail(request.input('projectId'))
    console.log('input >', request.input('date'))
    console.log('project >', project.id)

    const tracks = (
      await Database.rawQuery(
        `SELECT 
          DISTINCT ON(employee_id)
          tr.id,
          project_id,
          projects.latitude AS project_latitude,
          projects.longitude AS project_longitude,
          employee_id,
          employees.name,
          employees.role,
          tr.latitude,
          tr.longitude,
          tr.created_at
        FROM
          (SELECT * FROM trackings ORDER BY id DESC) as tr
        JOIN projects ON projects.id = tr.project_id
        JOIN employees ON employees.id = tr.employee_id
        WHERE DATE(tr.created_at) = :date
        AND project_id = :projectId
      `,
        { date: request.input('date', now), projectId: project.id }
      )
    ).rows
    console.log('tracks >', tracks, request.input('date', now))
    console.log(
      'cek >',
      (
        await Database.rawQuery(`
          SELECT * FROM trackings as tr 
          WHERE DATE(tr.created_at) = '2023-05-14'
          AND project_id = 19
          ORDER BY id desc;
        `)
      ).rows
    )

    // TODO : employee project but not in trackings ?

    return response.send({
      data: tracks,
      meta: { center: { latitude: project.latitude, longitude: project.longitude } },
    })
  }
}

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import CenterLocation from 'App/Models/CenterLocation'
import Project from 'App/Models/Project'

export default class TrackingsController {
  public async index({ request, response, now }: HttpContextContract) {
    if (!request.input('projectId') || !request.input('date')) return response.send({ data: [] })
    const project = await Project.findOrFail(request.input('projectId'))

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
          tr.latitude::float,
          tr.longitude::float,
          tr.created_at
        FROM
          (SELECT * FROM trackings WHERE DATE(created_at) = :date
          AND project_id = :projectId ORDER BY id DESC) as tr
        LEFT JOIN projects ON projects.id = tr.project_id
        LEFT JOIN employees ON employees.id = tr.employee_id
        
      `,
        { date: request.input('date', now), projectId: project.id }
      )
    ).rows
    return response.send({
      data: tracks,
      meta: { center: { latitude: project.latitude, longitude: project.longitude } },
    })
  }

  public async location({ request, response, now }: HttpContextContract) {
    if (!request.input('locationId') || !request.input('date')) return response.send({ data: [] })
    const project = await CenterLocation.findOrFail(request.input('locationId'))

    const tracks = (
      await Database.rawQuery(
        `SELECT 
          DISTINCT ON(employee_id)
          tr.id,
          location_id,
          center_locations.latitude AS project_latitude,
          center_locations.longitude AS project_longitude,
          employee_id,
          employees.name,
          employees.role,
          tr.latitude::float,
          tr.longitude::float,
          tr.created_at
        FROM
          (SELECT * FROM trackings WHERE DATE(created_at) = :date
          AND location_id = :locationId ORDER BY id DESC) as tr
        LEFT JOIN center_locations ON center_locations.id = tr.location_id
        LEFT JOIN employees ON employees.id = tr.employee_id
        
      `,
        { date: request.input('date', now), locationId: project.id }
      )
    ).rows
    return response.send({
      data: tracks,
      meta: { center: { latitude: project.latitude, longitude: project.longitude } },
    })
  }
}

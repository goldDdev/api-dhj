import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

export default class ProgressController {
  public async progres({ request, response, month, year }: HttpContextContract) {
    const query = await Database.query()
      .from('project_progres')
      .select(
        'project_progres.id',
        'project_progres.project_boq_id AS projectBoqId',
        'project_boqs.name',
        'project_boqs.type_unit AS typeUnit',
        'project_boqs.code',
        Database.raw('COALESCE(project_boqs.type, project_boqs.description) AS type'),
        'progres',
        Database.raw(`TO_CHAR(progres_at::DATE, 'yyyy-mm-dd') AS progresAt`),
        'submited_progres as submitedProgres',
        'project_progres.created_at AS createdAt',
        'submit.name AS submitedName',
        'aprove.name AS approveName'
      )
      .join('project_boqs', 'project_boqs.id', 'project_progres.project_boq_id')
      .joinRaw(
        'LEFT JOIN (SELECT name, users.id FROM users INNER JOIN employees ON employees.id = users.employee_id) AS submit ON submit.id = project_progres.submited_by'
      )
      .joinRaw(
        'LEFT JOIN (SELECT name, users.id FROM users INNER JOIN employees ON employees.id = users.employee_id) AS aprove ON aprove.id = project_progres.aproved_by'
      )
      .where('project_progres.project_id', request.param('id'))
      .andWhere('project_boqs.id', request.input('id'))
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw('EXTRACT(MONTH FROM project_progres.progres_at) = :month ', {
            month: request.input('month'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(MONTH FROM project_progres.progres_at) = :month ', {
            month: month,
          })
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw('EXTRACT(YEAR FROM project_progres.progres_at) = :year ', {
            year: request.input('year'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(YEAR FROM project_progres.progres_at) = :year ', {
            year: year,
          })
      )
      .if(request.input('sort', 'asc'), (query) =>
        query.orderBy('progres_at', request.input('sort', 'asc'))
      )

    return response.ok(query)
  }
}

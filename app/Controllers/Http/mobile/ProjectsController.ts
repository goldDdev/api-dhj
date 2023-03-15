import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'
import codeError from 'Config/codeError'
import moment from 'moment'

export default class ProjectsController {
  public async index({ auth, response, request }: HttpContextContract) {
    const query = await Project.query()
      .select(
        'projects.id',
        'name',
        'companyName',
        'projects.status',
        'finishAt',
        'startAt',
        'location',
        'contact'
      )
      .leftJoin('project_workers', 'project_workers.project_id', 'projects.id')
      .where('project_workers.employee_id', auth.user!.employeeId)
      .andWhereNotIn('projects.status', ['DRAFT', 'CANCELLED', 'PENDING', 'REVIEW'])
      .if(request.input('name'), (query) =>
        query.whereILike('projects.name', `%${request.input('name')}%`)
      )
      .if(request.input('status'), (query) =>
        query.andWhere('projects.status', request.input('status'))
      )
      .orderBy(request.input('orderBy', 'id'), request.input('groupBy', 'desc'))
      .paginate(request.input('page', 1), request.input('perPage', 15))
    return response.send(query.serialize().data)
  }

  public async view({ auth, request, response }: HttpContextContract) {
    try {
      const model = await Project.query()
        .select(
          'projects.id',
          'projects.status',
          'projects.name',
          'projects.company_name',
          'projects.contact',
          'projects.duration',
          'projects.start_at',
          'projects.finish_at'
        )
        .leftJoin('project_workers', 'project_workers.project_id', 'projects.id')
        .preload('workers', (query) => {
          query.join('employees', 'employees.id', '=', 'project_workers.employee_id')
        })

        .where('projects.id', request.param('id', auth.user!.employee.work.projectId))
        .andWhere('project_workers.employee_id', auth.user!.employeeId)
        .orderBy('projects.id', 'asc')
        .firstOrFail()
      return response.ok(
        model.serialize({
          relations: {
            workers: {
              fields: {
                omit: ['parentId', 'projectId'],
              },
            },
          },
        })
      )
    } catch (error) {
      return response.notFound({
        code: codeError.notFound,
        type: 'notFound',
        fields: 'id',
        value: request.param('id', 0),
      })
    }
  }

  public async absent({ response, request }: HttpContextContract) {
    const query = await Database.from('project_absents')
      .select(
        'project_workers.parent_id as parentId',
        'emp.name',
        'emp.role',
        Database.raw('TO_CHAR(absent_at, \'YYYY-MM-DD\') as "absentAt"'),
        Database.raw('count(*)::int as total'),
        Database.raw("sum(case when absent = 'P' then 1 else 0 end)::int as present"),
        Database.raw("sum(case when absent = 'A' then 1 else 0 end)::int as absent"),
        Database.raw('sum(case when absent = NULL then 1 else 0 end)::int as "noAbsent"')
      )
      .joinRaw(
        'INNER JOIN project_workers ON project_absents.project_id = project_workers.project_id AND project_absents.employee_id = project_workers.employee_id'
      )
      .joinRaw(
        'LEFT JOIN (SELECT name, parent.role, parent.id FROM employees INNER JOIN project_workers AS parent ON employees.id = parent.employee_id) AS emp ON emp.id = project_workers.parent_id'
      )
      .where('project_absents.project_id', request.param('id', 0))
      .orderBy(request.input('orderBy', 'absent_at'), request.input('order', 'asc'))
      .groupBy('absent_at', 'project_workers.parent_id', 'emp.name', 'emp.role')
      .andHavingRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })

    return response.ok({
      data: query,
    })
  }
}

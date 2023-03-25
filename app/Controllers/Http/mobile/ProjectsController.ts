import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'
import ProjectProgres from 'App/Models/ProjectProgres'
import codeError from 'Config/codeError'
import moment from 'moment'
import Logger from '@ioc:Adonis/Core/Logger'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
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
        'contact',
        Database.raw(
          '(SELECT COUNT(*) FROM project_workers a1 WHERE a1.project_id = projects.id AND a1.parent_id = project_workers.id AND a1.status = \'ACTIVE\')::int AS "totalWoker"'
        )
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
      const work = await ProjectWorker.query()
        .where({
          project_id: request.param('id'),
          employee_id: auth.user?.employeeId,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .first()

      const model = await Project.query()
        .select(
          'projects.id',
          'projects.status',
          'projects.name',
          'projects.company_name',
          'projects.contact',
          'projects.duration',
          'projects.location',
          'projects.latitude',
          'projects.longitude',
          'projects.start_at',
          'projects.finish_at'
        )
        .where('projects.id', request.param('id'))
        .orderBy('projects.id', 'asc')
        .firstOrFail()

      await model.load('workers', (query) => {
        query
          .join('employees', 'employees.id', '=', 'project_workers.employee_id')
          .andWhere('project_workers.parent_id', work?.id || 0)
      })

      model.$extras.totalWoker = model.workers.length
      return response.ok(model.serialize())
    } catch (error) {
      Logger.info(error)
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

  public async scoping({ auth, response, request }: HttpContextContract) {
    try {
      await auth.use('api').authenticate()
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          latitude: schema.number(),
          longitude: schema.number(),
        }),
      })
      const { projectId, latitude, longitude } = payload
      const model = await Project.query().where('id', projectId).first()
      if (model) {
        await model.merge({ latitude, longitude }).save()
      } else {
        return response.notFound({
          code: codeError.notFound,
          type: 'notFound',
          fields: 'id',
          value: projectId,
        })
      }

      return response.status(204)
    } catch (error) {
      return response.badGateway({
        code: codeError.badRequest,
        type: 'server error',
      })
    }
  }

  public async progres({ auth, response, request }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          boqId: schema.number(),
          progres: schema.number(),
        }),
      })
      const { projectId, boqId, progres } = payload
      await ProjectProgres.create(
        {
          projectId,
          projectBoqId: boqId,
          progres,
          submitedProgres: progres,
          submitedBy: currentUser.id,
        },
        { client: trx }
      )
      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.notFound({ code: codeError.badRequest, type: 'Server error' })
    }
  }

  public async test({ auth, response, request }: HttpContextContract) {
    return response.ok(auth.user)
  }
}

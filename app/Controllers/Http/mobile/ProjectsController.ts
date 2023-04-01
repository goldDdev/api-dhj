import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Project from 'App/Models/Project'
import ProjectProgres from 'App/Models/ProjectProgres'
import codeError from 'Config/codeError'
import Logger from '@ioc:Adonis/Core/Logger'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import ProjectBoq from 'App/Models/ProjectBoq'
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

  public async view({ auth, request, now, response }: HttpContextContract) {
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
          .select('*', 'project_workers.id')
          .join('employees', 'employees.id', '=', 'project_workers.employee_id')
          .andWhere('project_workers.parent_id', work?.id || 0)
      })

      await model.load('boqs', (query) => {
        query
          .select('*', 'project_boqs.id')
          .joinRaw(
            "LEFT JOIN (SELECT TO_CHAR(progres_at, 'YYYY-MM-DD') AS progres_at,progres,project_boq_id FROM project_progres ORDER BY progres_at DESC) AS progres ON progres.project_boq_id = project_boqs.id"
          )
      })

      const models = await ProjectAbsent.query()
        .select(
          '*',
          'employees.name',
          Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
          'project_absents.id',
          'employees.card_id as cardID',
          'employees.phone_number as phoneNumber',
          'project_workers.role',
          'project_absents.project_id'
        )
        .join('employees', 'employees.id', '=', 'project_absents.employee_id')
        .joinRaw(
          'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .preload('replaceEmployee')
        .where('project_absents.project_id', request.param('id', 0))

        .andWhere('absent_at', now)
        .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
          id: work?.id || 0,
        })
      const summary = models.reduce(
        (p, n) => ({
          present: p.present + Number(n.absent === AbsentType.P),
          absent: p.absent + Number(n.absent === AbsentType.A),
          noAbsent: p.noAbsent + Number(n.absent === null),
        }),
        { present: 0, absent: 0, noAbsent: 0 }
      )
      summary['total'] = models.length

      model.$extras.totalWoker = model.workers.length
      return response.ok({
        ...model.serialize({
          relations: {
            boqs: {
              fields: {
                omit: ['additionalUnit', 'price', 'additionalPrice'],
              },
            },
          },
        }),
        absents: models,
        summary,
        absentAt: models.length > 0 ? now : null,
      })
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

  public async absent({ response, request, year, month }: HttpContextContract) {
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
        month: request.input('month', month),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', year),
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

  public async progres({ auth, now, response, request }: HttpContextContract) {
    let isAvailable = false

    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          progres: schema.number(),
          date: schema.string.optional(),
        }),
      })

      const last = await ProjectProgres.query()
        .where({
          project_id: request.param('id'),
          project_boq_id: payload.id,
        })
        .andWhere('progres_at', request.input('date', now))
        .first()

      if (!last) {
        isAvailable = true
      }

      if (isAvailable) {
        await ProjectProgres.create({
          projectId: request.param('id'),
          projectBoqId: payload.id,
          progres: payload.progres,
          submitedProgres: payload.progres,
          submitedBy: auth.user?.id,
          progresAt: request.input('date', now),
        })
        return response.noContent()
      }

      return response.unprocessableEntity({ code: codeError.entity, type: 'exists' })
    } catch (error) {
      Logger.info(error)
      return response.notFound({ code: codeError.badRequest, type: 'badRequest' })
    }
  }

  public async listProgres({ response, request }: HttpContextContract) {
    const query = await ProjectProgres.query()
      .select(
        'project_progres.id',
        'project_boqs.name',
        'project_boqs.type_unit',
        'progres',
        'progres_at',
        'submited_progres',
        'project_progres.created_at'
      )
      .join('project_boqs', 'project_boqs.id', 'project_progres.project_boq_id')
      .join('bill_of_quantities', 'bill_of_quantities.id', 'project_boqs.boq_id')
      .if(request.input('name'), (query) => {
        query.whereILike('project_boqs.name', `%${request.input('name')}%`)
      })
      .if(request.input('date'), (query) => {
        query.andWhere('project_progres.progres_at', request.input('date'))
      })
      .orderBy(request.input('orderBy', 'project_progres.id'), request.input('order', 'desc'))

    return response.ok(query)
  }

  public async listBoq({ response, request }: HttpContextContract) {
    const query = await ProjectBoq.query()
      .select(
        'project_boqs.name',
        'project_boqs.id',
        'project_boqs.boq_id',
        'price',
        'unit',
        'project_boqs.type_unit',
        'project_boqs.updated_at',
        'progres.progres_at',
        'progres.progres'
      )
      .innerJoin('bill_of_quantities', 'bill_of_quantities.id', 'project_boqs.boq_id')
      .joinRaw(
        "LEFT JOIN (SELECT TO_CHAR(progres_at, 'YYYY-MM-DD') AS progres_at,progres,project_boq_id FROM project_progres ORDER BY progres_at DESC) AS progres ON progres.project_boq_id = project_boqs.id"
      )
      .where('project_id', request.param('id'))
      .if(request.input('name'), (query) => {
        query.whereILike('project_boqs.name', `%${request.input('name')}%`)
      })
      .if(
        request.input('orderBy'),
        (query) => {
          query.orderBy('project_boqs.name', request.input('order', 'asc'))
        },
        (query) => {
          query.orderBy(
            `project_boqs.${request.input('orderBy', 'id')}`,
            request.input('order', 'asc')
          )
        }
      )

    return response.send(query)
  }
}

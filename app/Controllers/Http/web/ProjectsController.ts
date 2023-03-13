import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Project, { ProjectStatus } from 'App/Models/Project'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import moment from 'moment'
import Logger from '@ioc:Adonis/Core/Logger'
export default class ProjectsController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Project.query()
        .select(['id', 'name', 'companyName', 'status', 'duration', 'finishAt', 'startAt'])
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ request, response }: HttpContextContract) {
    try {
      const model = await Project.findOrFail(request.param('id'))
      return response.ok({
        data: model.serialize(),
      })
    } catch (error) {
      console.log(error)
      return response.notFound({ error })
    }
  }

  public async create({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string(),
          companyName: schema.string(),
          noSpk: schema.string.optional([
            rules.unique({
              table: 'projects',
              column: 'no_spk',
            }),
          ]),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
          status: schema.enum.optional(Object.keys(ProjectStatus)),
          contact: schema.string.optional(),
          startAt: schema.date.optional({}, [rules.afterOrEqual('today')]),
          finishAt: schema.date.optional({}, [rules.afterOrEqual('today')]),
          note: schema.string.optional(),
          location: schema.string.optional(),
        }),
      })

      if (!!payload.startAt && !!payload.finishAt) {
        Object.assign(payload, {
          duration: moment(request.input('finishAt'), true).diff(request.input('startAt'), 'day'),
        })
      }

      const model = await Project.create(payload)
      await model.refresh()

      return response.created({
        data: request.all(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string(),
          companyName: schema.string(),
          noSpk: schema.string.optional([
            rules.unique({
              table: 'projects',
              column: 'no_spk',
              whereNot: {
                id: request.input('id'),
              },
            }),
          ]),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
          status: schema.enum.optional(Object.keys(ProjectStatus)),
          contact: schema.string.optional(),
          startAt: schema.date.optional({}),
          finishAt: schema.date.optional({}),
          note: schema.string.optional(),
          location: schema.string.optional(),
        }),
      })

      if (!!payload.startAt && !!payload.finishAt) {
        Object.assign(payload, {
          duration: moment(request.input('finishAt'), true).diff(request.input('startAt'), 'day'),
        })
      }
      const model = await Project.find(request.input('id'))
      if (!model) {
        return response.notFound({
          error: 'id',
        })
      }

      await model.merge(payload).save()
      return response.ok({
        data: model.serialize(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async status({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          status: schema.enum.optional(Object.keys(ProjectStatus)),
        }),
      })

      const model = await Project.find(request.input('id'))
      if (!model) {
        return response.notFound({
          error: 'id',
        })
      }

      await model.merge(payload).save()
      return response.ok({
        data: model.serialize(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async listWorker({ request, response }: HttpContextContract) {
    const query = await ProjectWorker.query()
      .select(
        '*',
        'project_workers.id',
        'project_workers.role',
        'employees.card_id as cardID',
        'employees.phone_number as phoneNumber'
      )
      .preload('members', (query) => {
        query
          .select(
            '*',
            'project_workers.id',
            'project_workers.role',
            'employees.card_id as cardID',
            'employees.phone_number as phoneNumber'
          )
          .join('employees', 'employees.id', '=', 'project_workers.employee_id')
      })
      .join('employees', 'employees.id', '=', 'project_workers.employee_id')
      .whereNull('parent_id')
      .where('project_id', request.param('id'))

    return response.send({ data: query })
  }

  public async addWorker({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          employeeId: schema.number([
            rules.unique({
              table: 'project_workers',
              column: 'employee_id',
              where: {
                project_id: request.input('projectId'),
                employee_id: request.input('employeeId'),
              },
            }),
          ]),
          role: schema.string(),
          parentId: schema.number.optional(),
        }),
      })

      const model = await ProjectWorker.create({ ...payload, status: ProjectWorkerStatus.ACTIVE })
      const worker = model.serialize()
      await model.load('employee')

      return response.created({
        data: {
          ...worker,
          name: model.employee.name,
          cardID: model.employee.cardID,
          phoneNumber: model.employee.phoneNumber,
        },
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async removeWorker({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectWorker.findOrFail(request.param('id'))
      await model.load('employee')
      const current = model.employee.serialize()
      await model.delete()
      return response.ok({ data: current })
    } catch (error) {
      return response.unprocessableEntity({ error })
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

  public async viewAbsent({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectAbsent.query()
        .select(
          '*',
          Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
          'employees.name',
          'project_absents.id',
          'employees.card_id as cardID',
          'employees.phone_number as phoneNumber',
          'project_workers.role',
          'project_absents.project_id'
        )
        .join('employees', 'employees.id', '=', 'project_absents.employee_id')
        .joinRaw(
          'INNER JOIN project_workers ON employees.id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .preload('replaceEmployee')
        .where('project_absents.project_id', request.param('id', 0))
        .andWhere('project_workers.parent_id', request.param('parent', 0))
        .andWhere('absent_at', request.input('date', moment().format('yyyy-MM-DD')))

      const summary = model.reduce(
        (p, n) => ({
          present: p.present + Number(n.absent === AbsentType.P),
          absent: p.absent + Number(n.absent === AbsentType.A),
          noAbsent: p.noAbsent + Number(!n.absent),
        }),
        { present: 0, absent: 0, noAbsent: 0 }
      )
      summary['total'] = model.length

      return response.ok({
        data: {
          absentAt: request.input('date', moment().format('yyyy-MM-DD')),
          projectId: +request.param('project', 0),
          parentId: +request.param('parent', 0),
          summary,
          members: model.map((v) =>
            v.serialize({
              fields: {
                omit: ['created_at', 'updated_at', 'latitude', 'longitude'],
              },
            })
          ),
        },
      })
    } catch (err) {
      Logger.warn(err)
    }
  }
}

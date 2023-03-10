import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Project, { ProjectStatus } from 'App/Models/Project'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import moment from 'moment'

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
      await model.load('workers', (q) =>
        q
          .select('*', 'project_workers.id as id', 'project_workers.role as role')
          .leftJoin('employees', 'employees.id', '=', 'project_workers.employee_id')
      )

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
        }),
      })

      const model = await ProjectWorker.create({ ...payload, status: ProjectWorkerStatus.ACTIVE })
      await model.refresh()

      return response.created({ data: model.serialize() })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async removeWorker({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectWorker.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Project, { ProjectStatus } from 'App/Models/Project'
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
      return response.ok({ data: model.serialize() })
    } catch (error) {
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
}

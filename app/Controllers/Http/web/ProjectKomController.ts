import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import ProjectKom, { KomStatus } from 'App/Models/ProjectKom'

export default class ProjectsController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await ProjectKom.query()
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectKom.findOrFail(request.param('id'))
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
          projectId: schema.number(),
          title: schema.string(),
          datePlan: schema.string(),
          timePlan: schema.string.optional(),
          description: schema.string.optional(),
          status: schema.string.optional(),
        }),
      })

      const model = await ProjectKom.create(payload)
      await model.refresh()

      return response.created({
        data: model.serialize(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          projectId: schema.number(),
          title: schema.string(),
          datePlan: schema.string(),
          timePlan: schema.string.optional(),
          actualDate: schema.string.optional(),
          actualTime: schema.string.optional(),
          description: schema.string.optional(),
          result: schema.string.optional(),
          status: schema.string.optional(),
        }),
      })

      const model = await ProjectKom.findOrFail(request.input('id'))
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
          id: schema.number(),
          status: schema.enum.optional(Object.keys(KomStatus)),
        }),
      })

      const model = await ProjectKom.find(request.input('id'))
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

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectKom.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

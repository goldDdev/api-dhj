import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import ProjectBoq from 'App/Models/ProjectBoq'

export default class ProjectsController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await ProjectBoq.query()
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectBoq.findOrFail(request.param('id'))
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
          boqId: schema.number(),
          typeUnit: schema.string(),
          unit: schema.number(),
          price: schema.number.optional(),
        }),
      })

      const model = await ProjectBoq.create(payload)
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
          boqId: schema.number(),
          typeUnit: schema.string(),
          unit: schema.number(),
          price: schema.number.optional(),
          additionalUnit: schema.number.optional(),
          additionalPrice: schema.number.optional(),
        }),
      })

      const model = await ProjectBoq.findOrFail(request.input('id'))
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
      const model = await ProjectBoq.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

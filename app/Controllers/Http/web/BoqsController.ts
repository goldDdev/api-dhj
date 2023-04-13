import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as vld from '@ioc:Adonis/Core/Validator'
import Boq from 'App/Models/Boq'

export default class BoqsController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Boq.query()
        .select(['id', 'name', 'typeUnit'])
        .if(request.input('name'), (query) =>
          query
            .whereILike('name', `%${request.input('name')}%`)
            .orWhereILike('typeUnit', `%${request.input('name')}%`)
        )
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async store({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: vld.schema.create({
          name: vld.schema.string([vld.rules.minLength(3)]),
          typeUnit: vld.schema.string([vld.rules.minLength(1)]),
        }),
      })

      const { name, typeUnit } = request.body()
      const boq = await Boq.create({
        name,
        typeUnit,
      })
      return response.created({ data: boq })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const boq = await Boq.findOrFail(request.param('id'))
      return response.created({ data: boq })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: vld.schema.create({
          name: vld.schema.string([vld.rules.minLength(3)]),
          typeUnit: vld.schema.string([vld.rules.minLength(1)]),
        }),
      })

      const boq = await Boq.find(request.input('id'))
      if (boq) {
        const { name, typeUnit } = request.body()
        await boq.merge({ name, typeUnit }).save()
      }
      return response.status(200).json({ data: boq })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const boq = await Boq.findOrFail(request.param('id'))
      await boq.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

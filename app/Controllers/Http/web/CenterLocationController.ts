import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import CenterLocation from 'App/Models/CenterLocation'
import omit from 'lodash/omit'

export default class CenterLocationController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await CenterLocation.query()
        .select()
        .if(request.input('name'), (query) =>
          query.whereILike('name', `%${request.input('name')}%`)
        )
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async all({ response, request }: HttpContextContract) {
    const projects = await Database.from('projects')
      .select(
        'id',
        'name',
        Database.raw('latitude::float'),
        Database.raw('longitude::float'),
        Database.raw("COALESCE(null, 'PROJECT') AS type")
      )
      .if(request.input('name'), (query) => query.whereILike('name', `%${request.input('name')}%`))
      .orderBy('id', 'desc')
      .unionAll((query) => {
        query
          .from('center_locations')
          .select(
            'id',
            'name',
            Database.raw('latitude::float'),
            Database.raw('longitude::float'),
            Database.raw("COALESCE(null, 'LOCATION') AS type")
          )
          .if(request.input('name'), (query) =>
            query.whereILike('name', `%${request.input('name')}%`)
          )
      })
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.json(projects)
  }

  public async store({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string(),
          description: schema.string.optional(),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
        }),
      })

      const model = await CenterLocation.create(payload)
      return response.created({ data: model })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const model = await CenterLocation.findOrFail(request.param('id'))
      return response.created({ data: model })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          name: schema.string(),
          description: schema.string.optional(),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
        }),
      })

      const model = await CenterLocation.find(payload.id)
      if (model) {
        await model.merge(omit(payload, ['id'])).save()
      }
      return response.status(200).json({ data: model })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await CenterLocation.findOrFail(request.param('id'))
      await model.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Boq from 'App/Models/Boq'
import ProjectBoq from 'App/Models/ProjectBoq'

export default class ProjectBoqController {
  public async index({ response, request }: HttpContextContract) {
    return response.send({
      data: await ProjectBoq.query()
        .select(
          'project_boqs.id',
          'project_boqs.boq_id',
          'bill_of_quantities.name',
          'price',
          'unit',
          'project_boqs.type_unit',
          'additional_unit',
          'additionalPrice',
          'project_boqs.updated_at'
        )
        .join('bill_of_quantities', 'bill_of_quantities.id', '=', 'project_boqs.boq_id')
        .if(request.input('name'), (query) => {
          query.whereILike('bill_of_quantities.name', `%${request.input('name')}%`)
        })
        .if(
          request.input('orderBy') === 'name',
          (query) => {
            query.orderBy('bill_of_quantities.name', request.input('order', 'asc'))
          },
          (query) => {
            query.orderBy(`project_boqs.${request.input('orderBy')}`, request.input('order', 'asc'))
          }
        ),
    })
  }

  public async search({ response, request }: HttpContextContract) {
    return response.send(
      await Boq.query()
        .select(['id', 'name', 'typeUnit'])
        .if(request.input('name'), (query) =>
          query.whereILike('name', `%${request.input('name')}%`)
        )
        .whereNotIn(
          'id',
          Database.raw('SELECT boq_id FROM project_boqs WHERE project_id = :id', {
            id: request.param('id', 0),
          })
        )
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ request, response }: HttpContextContract) {
    try {
      const model = await ProjectBoq.findOrFail(request.param('id'))
      return response.ok({
        data: model.serialize({
          relations: {
            boq: {
              fields: [],
            },
          },
        }),
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
          unit: schema.number.optional(),
          price: schema.number.optional(),
        }),
      })

      const boq = await Boq.findOrFail(payload.boqId)
      const model = await ProjectBoq.create({ ...payload, typeUnit: boq?.typeUnit })
      await model.refresh()
      await model.load('boq')
      model.$extras.name = model.boq.name

      return response.created({
        data: model.serialize({
          relations: {
            boq: { fields: [] },
          },
        }),
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
          boqId: schema.number(),
          unit: schema.number.optional(),
          price: schema.number.optional(),
          additionalUnit: schema.number.optional(),
          additionalPrice: schema.number.optional(),
        }),
      })

      const boq = await Boq.findOrFail(payload.boqId)
      const model = await ProjectBoq.findOrFail(payload.id)
      if (!model) {
        return response.notFound({
          error: 'id',
        })
      }

      await model.merge({ ...payload, typeUnit: boq?.typeUnit }).save()
      await model.refresh()
      await model.load('boq')
      model.$extras.name = model.boq.name

      return response.created({
        data: model.serialize({
          relations: {
            boq: { fields: [] },
          },
        }),
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

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as vld from '@ioc:Adonis/Core/Validator'
import Inventory from 'App/Models/Inventory'

export default class InventorysController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Inventory.query()
        .select(['id', 'type', 'name', 'unit', 'qty', 'minQty'])
        .if(request.input('type'), (query) => query.where('type', request.input('type')))
        .if(request.input('name'), (query) =>
          query
            .whereILike('name', `%${request.input('name')}%`)
            .orWhereILike('unit', `%${request.input('name')}%`)
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
          unit: vld.schema.string([vld.rules.required()]),
          type: vld.schema.string([vld.rules.required()]),
          qty: vld.schema.string([vld.rules.required()]),
        }),
      })

      const { name, unit, minQty, qty, type } = request.body()
      const inventory = await Inventory.create({
        name,
        unit,
        qty,
        minQty,
        type,
      })
      return response.created({ data: inventory })
    } catch (error) {
      console.error(error)
      return response.unprocessableEntity({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const inventory = await Inventory.findOrFail(request.param('id'))
      return response.created({ data: inventory })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: vld.schema.create({
          name: vld.schema.string([vld.rules.minLength(3)]),
          unit: vld.schema.string([vld.rules.required()]),
          type: vld.schema.string([vld.rules.required()]),
          qty: vld.schema.string([vld.rules.required()]),
        }),
      })

      const inventory = await Inventory.find(request.input('id'))
      if (inventory) {
        const { name, unit, minQty, qty, type } = request.body()
        await inventory.merge({ name, unit, minQty, qty, type }).save()
      }
      return response.status(200).json({ data: inventory })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const inventory = await Inventory.findOrFail(request.param('id'))
      await inventory.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

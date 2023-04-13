import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import codeError from 'Config/codeError'
import Inventory from 'App/Models/Inventory'

export default class InventoryController {
  public async listMaterial({ request, response }: HttpContextContract) {
    try {
      const query = await Database.from('inventories')
        .select('name', 'unit', 'qty')
        .if(request.input('query'), (query) =>
          query.whereILike('name', `%${request.input('query')}%`)
        )
        .where('type', 'MATERIAL')
        .orderBy(request.input('orderBy', 'name'), request.input('order', 'asc'))

      return response.ok(query)
    } catch (error) {
      console.error(error)
      return response.notFound({ code: codeError.badRequest, type: 'Server error' })
    }
  }

  public async listEquipment({ request, response }: HttpContextContract) {
    try {
      const query = await Database.from('inventories')
        .select('name', 'unit', 'qty')
        .if(request.input('query'), (query) =>
          query.whereILike('name', `%${request.input('query')}%`)
        )
        .where('type', 'EQUIPMENT')
        .orderBy(request.input('orderBy', 'name'), request.input('order', 'asc'))

      return response.ok(query)
    } catch (error) {
      console.error(error)
      return response.notFound({ code: codeError.badRequest, type: 'Server error' })
    }
  }
}

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { schema } from '@ioc:Adonis/Core/Validator'
import codeError from 'Config/codeError'
import Inventory from 'App/Models/Inventory'
import InventoryRequest from 'App/Models/InventoryRequest'
import InventoryRequestDetail from 'App/Models/InventoryRequestDetail'

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
      return response.internalServerError({ code: codeError.badRequest, type: 'Server error' })
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
      return response.internalServerError({ code: codeError.badRequest, type: 'Server error' })
    }
  }

  public async create({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          startDate: schema.string(),
          endDate: schema.string(),
        }),
      })
      const { projectId, startDate, endDate } = payload
      const body = request.body()
      const materials = body.materials
      const equipments = body.equipments
      const totalMaterial =
        materials && materials.length > 0
          ? materials.map((val) => val.qty).reduce((acc, crr) => acc + crr, 0)
          : 0
      const totalEquipment =
        equipments && equipments.length > 0
          ? equipments.map((val) => val.qty).reduce((acc, crr) => acc + crr, 0)
          : 0

      const invRequest = await InventoryRequest.create(
        {
          projectId,
          startDate,
          endDate,
          totalMaterial,
          totalEquipment,
          createdBy: currentUser.employeeId,
          status: 'PENDING',
        },
        { client: trx }
      )

      if (materials) {
        await Promise.all(
          materials.map(async (mtrl) => {
            const inven = await Inventory.findOrFail(mtrl.id)
            await InventoryRequestDetail.create(
              {
                requestId: invRequest.id,
                inventoryId: inven.id,
                type: inven.type,
                name: inven.name,
                unit: inven.unit,
                qty: mtrl.qty,
              },
              { client: trx }
            )
          })
        )
      }

      if (equipments) {
        await Promise.all(
          equipments.map(async (eqp) => {
            const inven = await Inventory.findOrFail(eqp.id)
            await InventoryRequestDetail.create(
              {
                requestId: invRequest.id,
                inventoryId: inven.id,
                type: inven.type,
                name: inven.name,
                unit: inven.unit,
                qty: eqp.qty,
              },
              { client: trx }
            )
          })
        )
      }

      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ code: codeError.badRequest, type: 'Server error' })
    }
  }

  public async view({ request, response }: HttpContextContract) {
    try {
      const query = await Database.from('inventory_requests')
        // .select('name', 'unit', 'qty')
        // .join('inventory_request_details', 'inventory_request_details.request_id', '=', 'inventory_requests.id')
        // .where('status', 'PENDING')
        .where('project_id', request.param('id'))
        .orderBy(request.input('orderBy', 'id'), request.input('order', 'asc'))

      return response.ok(query)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ code: codeError.badRequest, type: 'Server error' })
    }
  }
}

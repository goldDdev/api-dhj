import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import InventoryRequest from 'App/Models/InventoryRequest'
import codeError from 'Config/codeError'

export default class InventoryRequestController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await InventoryRequest.query()
        .select([
          '*',
          'inventory_requests.id',
          'inventory_requests.status',
          'projects.name as project_name',
        ])
        .join('projects', 'project_id', 'projects.id')
        .join('employees', 'created_by', 'employees.id')
        .orderBy('inventory_requests.id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async items({ request, response }: HttpContextContract) {
    try {
      const query = await Database.from('inventory_request_details')
        .where('request_id', request.param('id'))
        .orderBy(request.input('orderBy', 'id'), request.input('order', 'asc'))

      return response.ok(query)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ code: codeError.badRequest, type: 'Server error' })
    }
  }
}

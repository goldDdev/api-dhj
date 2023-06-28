import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Payrol from 'App/Models/Payrol'

export default class PayrolController {
  public async index({ auth, year, request, response }: HttpContextContract) {
    const query = await Payrol.query()
      .select('*', 'payrols.id')
      .where({
        year: request.input('year', year),
        employee_id: auth.user!.employeeId,
      })
      .withScopes((scope) => scope.withEmployee())
    return response.ok(query)
  }

  public async view({ request, response }: HttpContextContract) {
    const query = await Payrol.query()
      .select('*', 'payrols.id')

      .withScopes((scope) => scope.withEmployee())
      .where({ 'payrols.id': request.param('id') })
      .first()
    return response.ok(query)
  }
}

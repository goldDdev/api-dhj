import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as vld from '@ioc:Adonis/Core/Validator'
import Employee from 'App/Models/Employee'
// import moment from 'moment'

export default class EmployeesController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Employee.query()
        .select(['id', 'name', 'phoneNumber', 'role', 'card_id', 'inactive_at'])
        .if(request.input('name'), (query) =>
          query
            .whereILike('name', `%${request.input('name')}%`)
            .orWhereILike('card_id', `%${request.input('name')}%`)
            .orWhereILike('phone_number', `%${request.input('name')}%`)
        )
        .if(request.input('role'), (query) => query.where('role', request.input('role')))
        .if(request.input('status'), (query) => {
          if (request.input('status') === 'ACTIVE') {
            query.whereNull('inactive_at')
          } else {
            query.whereNotNull('inactive_at')
          }
        })
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      const employee = await Employee.findOrFail(request.param('id'))
      return response.created({ data: employee })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async create({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: vld.schema.create({
          name: vld.schema.string([vld.rules.minLength(3)]),
          phoneNumber: vld.schema.string([
            vld.rules.minLength(10),
            vld.rules.unique({
              table: 'employees',
              column: 'phone_number',
            }),
          ]),
          cardID: vld.schema.string([
            vld.rules.minLength(8),
            vld.rules.unique({
              table: 'employees',
              column: 'card_id',
            }),
          ]),
        }),
      })

      const employee = await Employee.create(request.body())
      return response.created({ data: employee })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: vld.schema.create({
          id: vld.schema.number([vld.rules.exists({ table: 'employees', column: 'id' })]),
          name: vld.schema.string([vld.rules.minLength(3)]),
          phoneNumber: vld.schema.string([
            vld.rules.minLength(10),
            vld.rules.unique({
              table: 'employees',
              column: 'phone_number',
              whereNot: { id: request.input('id') },
            }),
          ]),
          cardID: vld.schema.string([
            vld.rules.minLength(8),
            vld.rules.unique({
              table: 'employees',
              column: 'card_id',
              whereNot: { id: request.input('id') },
            }),
          ]),
        }),
      })

      const employee = await Employee.find(request.input('id'))
      if (employee) {
        await employee.merge(request.body()).save()
      }
      return response.status(200).json({ data: employee })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async status({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: vld.schema.create({
          id: vld.schema.number([vld.rules.exists({ table: 'employees', column: 'id' })]),
          invoiceNote: vld.schema.string.nullable(),
        }),
      })

      const employee = await Employee.find(request.input('id'))
      if (employee) {
        // employee.inactiveAt = employee.inactiveAt ? null : moment().format()
        employee.inactiveNote = request.input('invoiceNote')
        await employee.save()
      }
      return response.status(200).json({ data: employee })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

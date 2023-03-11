import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee, { EmployeeType } from 'App/Models/Employee'
import Logger from '@ioc:Adonis/Core/Logger'
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
    const trx = await Database.transaction()
    try {
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
            }),
          ]),
          cardID: schema.string([
            rules.minLength(8),
            rules.unique({
              table: 'employees',
              column: 'card_id',
            }),
          ]),
          role: schema.string(),
          hourlyWages: schema.number.optional(),
          salary: schema.number.optional(),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
              },
            }),
          ]),
        }),
      })

      const { email, ...emp } = payload
      const model = await Employee.create(emp, { client: trx })
      if (payload.role !== EmployeeType.WORKER) {
        await model.related('user').create({ email, password: model.phoneNumber })
      }
      await trx.commit()
      return response.created({ data: { ...model.serialize(), email } })
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
              whereNot: {
                id: request.input('id'),
              },
            }),
          ]),
          cardID: schema.string([
            rules.minLength(8),
            rules.unique({
              table: 'employees',
              column: 'card_id',
              whereNot: {
                id: request.input('id'),
              },
            }),
          ]),
          role: schema.string(),
          hourlyWages: schema.number.optional(),
          salary: schema.number.optional(),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
                employee_id: request.input('id'),
              },
            }),
          ]),
        }),
      })

      const { email, ...emp } = payload
      const model = await Employee.find(request.input('id'), { client: trx })
      if (model) {
        const current = model
        await model.load('user')
        await model.merge(emp).save()
        if (email) {
          await model.user.merge({ email }).save()
        }
        await trx.commit()
        return response
          .status(200)
          .json({ data: { ...current.serialize(), email: model.user.email } })
      }
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async status({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: schema.create({
          id: schema.number([rules.exists({ table: 'employees', column: 'id' })]),
          invoiceNote: schema.string.nullable(),
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

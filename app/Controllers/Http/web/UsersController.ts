import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import Employee from 'App/Models/Employee'
import Database from '@ioc:Adonis/Lucid/Database'

export default class UsersController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Employee.query()
        .select([
          'employees.id',
          'name',
          'phoneNumber',
          'role',
          'card_id',
          'inactive_at',
          'users.email',
        ])
        .leftJoin('users', 'users.employee_id', 'employees.id')
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
        .where('role', 'IN', ['ADMIN', 'OWNER', 'PM', 'PCC', 'QCC', 'SUP'])
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async store({ request, response }: HttpContextContract) {
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
          role: schema.string(),
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
      await model.related('user').create({ email, password: model.phoneNumber })
      await trx.commit()
      return response.created({ data: { ...model.serialize(), email } })
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const userEmployee = await Employee.query()
        .where('id', request.param('id'))
        .preload('user')
        .firstOrFail()
      return response.created({ data: userEmployee })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
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
          role: schema.string(),
          password: schema.string.optional(),
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

      const { email, password, ...emp } = payload
      const model = await Employee.find(request.input('id'), { client: trx })
      if (model) {
        const current = model
        await model.load('user')
        await model.merge(emp).save()
        if (email) {
          await model.user.merge({ email }).save()
        }

        if (password) {
          await model.user.merge({ password }).save()
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

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const user = await User.findOrFail(request.param('id'))
      await user.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async status({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          id: schema.number([rules.exists({ table: 'employees', column: 'id' })]),
          inactiveNote: schema.string.nullable(),
        }),
      })

      const employee = await Employee.find(request.input('id'))
      if (employee) {
        // employee.inactiveAt = employee.inactiveAt ? null : moment().format()
        employee.inactiveNote = request.input('inactiveNote')
        await employee.save()
      }
      return response.status(200).json({ data: employee })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async current({ auth, response }: HttpContextContract) {
    return response.ok({
      data: auth.user?.serialize(),
    })
  }

  public async validation({ request, response }: HttpContextContract) {
    const error = {}
    const model = await Database.query()
      .from('users')
      .select('users.id', 'users.email', 'employees.phone_number AS phoneNumber', 'employee_id')
      .leftJoin('employees', 'employees.id', 'users.employee_id')
      .where('employee_id', '!=', request.input('id'))
      .if(request.input('email'), (query) => {
        query.where('email', '=', request.input('email'))
      })
      .if(request.input('phoneNumber'), (query) => {
        query.where('employees.phone_number', request.input('phoneNumber'))
      })
      .first()

    if (model) {
      if (model.email === request.input('email')) {
        Object.assign(error, { email: 'Email ini sudah digunakan' })
      }

      if (model.phoneNumber === request.input('phoneNumber')) {
        Object.assign(error, { phoneNumber: 'No Handphone ini sudah digunakan' })
      }
    }

    return response.json(error)
  }
}

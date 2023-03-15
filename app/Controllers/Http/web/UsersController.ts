import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import Employee from 'App/Models/Employee'

export default class UsersController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Employee.query()
        .select(['id', 'name', 'phoneNumber', 'role', 'card_id', 'inactive_at'])
        .preload('user')
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
        .where('role', 'IN', ['ADMIN', 'OWNER'])
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async store({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          email: schema.string([rules.minLength(3)]),
          password: schema.string([rules.minLength(3)]),
        }),
      })

      const { email, password } = request.body()
      const user = await User.create({
        email,
        password,
      })
      return response.created({ data: user })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const user = await User.query().where('employee_id', request.param('id')).firstOrFail()
      return response.created({ data: user })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          email: schema.string([rules.minLength(3)]),
          password: schema.string([rules.minLength(3)]),
        }),
      })

      const user = await User.find(request.input('id'))
      if (user) {
        const { email, password } = request.body()
        await user.merge({ email, password }).save()
      }
      return response.status(200).json({ data: user })
    } catch (error) {
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
}

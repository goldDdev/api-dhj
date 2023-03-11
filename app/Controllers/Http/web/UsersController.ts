import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as vld from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'

export default class UsersController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await User.query()
        .select(['id', 'email'])
        .if(request.input('email'), (query) =>
          query.whereILike('email', `%${request.input('email')}%`)
        )
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async store({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: vld.schema.create({
          email: vld.schema.string([vld.rules.minLength(3)]),
          password: vld.schema.string([vld.rules.minLength(3)]),
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

  public async show({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      const user = await User.findOrFail(request.param('id'))
      return response.created({ data: user })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      await request.validate({
        schema: vld.schema.create({
          email: vld.schema.string([vld.rules.minLength(3)]),
          password: vld.schema.string([vld.rules.minLength(3)]),
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

  public async destroy({ auth, request, response }: HttpContextContract) {
    try {
      console.log(auth)
      const user = await User.findOrFail(request.param('id'))
      await user.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

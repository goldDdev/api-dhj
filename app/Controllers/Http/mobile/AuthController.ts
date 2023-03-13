// @ts-nocheck
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee from 'App/Models/Employee'
import User from 'App/Models/User'

export default class AuthController {
  public async login({ auth, request, response }: HttpContextContract) {
    try {
      const { email, password } = request.body()
      const { token } = await auth.use('api').attempt(email, password)
      return response.send({
        token,
        // user: auth.user?.serialize(),
      })
    } catch {
      return response.badRequest({ error: 'Invalid credentials' })
    }
  }

  public async logout({ auth, request, response }: HttpContextContract) {
    try {
      await auth.use('api').revoke()
      return response.status(204)
    } catch {
      return response.badRequest({ error: 'Invalid credentials' })
    }
  }

  public async current({ auth, request, response }: HttpContextContract) {
    try {
      await auth.use('api').authenticate()
      const user = await User.query()
        .where('id', auth.use('api').user!.id)
        .preload('employee')
        .firstOrFail()
      return response.send(user)
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async editProfile({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
              whereNot: {
                phone_number: null,
                id: currentUser.employee.id,
              },
            }),
          ]),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
                id: currentUser.id,
              },
            }),
          ]),
        }),
      })

      const { email, ...emp } = payload
      const model = await Employee.find(currentUser.employeeId, { client: trx })
      if (model) {
        await model.load('user')
        await model.merge(emp).save()
        if (email) {
          await model.user.merge({ email }).save()
        }
        await trx.commit()
        const user = await User.query()
          .where('id', auth.use('api').user!.id)
          .preload('employee')
          .firstOrFail()
        return response.send(user)
      }
    } catch (error) {
      console.log(error)
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async changePassword({ auth, request, response }: HttpContextContract) {
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      await request.validate({
        schema: schema.create({
          password: schema.string([rules.minLength(3)]),
        }),
      })

      const user = await User.findOrFail(currentUser.id)
      // TODO : current password validation
      const { currentPassword, password } = request.body()
      await user.merge({ password }).save()
      // TODO : send to user.email
      return response.status(204)
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

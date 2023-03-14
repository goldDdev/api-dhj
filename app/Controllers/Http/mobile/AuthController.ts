import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee from 'App/Models/Employee'
import User from 'App/Models/User'
import codeError from '../../../../config/codeError'
export default class AuthController {
  public async login({ auth, request, response }: HttpContextContract) {
    try {
      const { email, password } = request.body()
      const { token } = await auth.use('api').attempt(email, password)
      const model = await User.findOrFail(auth.user?.id)
      await model.load('employee', (query) => query.preload('work'))

      return response.send({
        data: {
          token,
          id: model.id,
          employeeId: model.employeeId,
          email: model.email,
          ...model.employee.serialize({
            fields: {
              omit: ['id'],
            },
            relations: {
              work: {
                fields: {
                  omit: ['parentId', 'employeeId'],
                },
              },
            },
          }),
        },
      })
    } catch {
      return response.unprocessableEntity({ code: codeError.entity, type: 'validation' })
    }
  }

  public async logout({ auth, response }: HttpContextContract) {
    try {
      await auth.use('api').revoke()
      return response.send(204)
    } catch {
      return response.badRequest({ error: 'Invalid credentials' })
    }
  }

  public async current({ auth, response }: HttpContextContract) {
    try {
      await auth.use('api').authenticate()
      const model = await User.findOrFail(auth.user?.id)
      await model.load('employee', (query) => query.preload('work'))
      return response.send({
        id: model.id,
        employeeId: model.employeeId,
        email: model.email,
        ...model.employee.serialize({
          fields: {
            omit: ['id'],
          },
          relations: {
            work: {
              fields: {
                omit: ['parentId', 'employeeId'],
              },
            },
          },
        }),
      })
    } catch (error) {
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
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
                id: currentUser.id,
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
        return response.status(204)
      }
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async changePassword({ auth, request, response }: HttpContextContract) {
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      console.log('cel')
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

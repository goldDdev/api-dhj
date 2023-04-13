import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { schema } from '@ioc:Adonis/Core/Validator'
import codeError from 'Config/codeError'
import Tracking from 'App/Models/Tracking'

export default class TrackingController {
  public async create({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      await auth.use('api').authenticate()
      const currentUser = auth.use('api').user!
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          latitude: schema.number(),
          longitude: schema.number(),
        }),
      })
      const { projectId, latitude, longitude } = payload
      await Tracking.create(
        { projectId, latitude, longitude, employeeId: currentUser.employeeId },
        { client: trx }
      )
      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.notFound({ code: codeError.badRequest, type: 'Server error' })
    }
  }
}

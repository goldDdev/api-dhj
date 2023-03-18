import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Setting from 'App/Models/Setting'

export default class SettingController {
  public async index({ response }: HttpContextContract) {
    return response.send({
      data: await Setting.query().orderBy('id', 'asc'),
    })
  }

  public async update({ response, request }: HttpContextContract) {
    try {
      Object.entries(request.body()).forEach(async ([k, v]) =>
        Database.from('settings').where('code', k).update({ value: v })
      )
      return response.send({
        data: await Setting.query().orderBy('id', 'asc'),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

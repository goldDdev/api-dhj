import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Setting from 'App/Models/Setting'

export default class SettingController {
  public async index({ response }: HttpContextContract) {
    const setting = await Setting.query().orderBy('id', 'asc')
    return response.send(setting)
  }
}

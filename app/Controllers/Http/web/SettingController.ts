import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
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

  public async upload({ response, request }: HttpContextContract) {
    try {
      const apk = request.file('file')

      if (apk) {
        await apk.move(Application.tmpPath('uploads'))
      }
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async download({ response }: HttpContextContract) {
    const filePath = Application.tmpPath('uploads/apk-dhj.apk')
    response.download(filePath)
  }
}

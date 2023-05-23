import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { schema } from '@ioc:Adonis/Core/Validator'
import codeError from 'Config/codeError'
import Tracking from 'App/Models/Tracking'
import { DateTime } from 'luxon'
import Project from 'App/Models/Project'
import Setting, { SettingCode } from 'App/Models/Setting'
import ProjectAbsent from 'App/Models/ProjectAbsent'
import DailyPlan from 'App/Models/DailyPlan'

export default class TrackingController {
  public async create({ auth, request, response, now }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          latitude: schema.number(),
          longitude: schema.number(),
        }),
      })
      const { projectId, latitude, longitude } = payload
      await Tracking.create(
        {
          projectId,
          latitude,
          longitude,
          employeeId: auth.user?.employeeId,
          createdAt: DateTime.local({ zone: 'UTC+7' }),
        },
        { client: trx }
      )

      // cek jika ada ot dan diluar dari radius lokasi maka ot akan selesai
      // if (auth.user?.employee.role === EmployeeType.MANDOR) {
      //   const ot = await RequestOvertime.query()
      //     .where({
      //       employee_id: auth.user?.employeeId,
      //       absent_at: now,
      //       status: RequestOTStatus.CONFIRM,
      //       confirm_sttus: RequestOTStatus.CONFIRM,
      //     })
      //     .first()

      //   if (ot) {
      //     const currentTime = DateTime.local({ zone: 'UTC+7' })
      //   }
      // }
      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.notFound({ code: codeError.badRequest, type: 'Server error' })
    }
  }

  public async daily({ auth, request, response, now }: HttpContextContract) {
    try {
      const { value } = await Setting.query().where('code', SettingCode.RADIUS).firstOrFail()
      if (value) {
        const project = await Project.query()
          .whereRaw(
            `calculate_distance(projects.latitude, projects.longitude, :lat, :long, 'MTR') <= :radius`,
            {
              radius: value || 0,
              lat: request.input('latitude', 0),
              long: request.input('longitude', 0),
            }
          )
          .first()

        if (project) {
          // const track = await Tracking.query()
          //   .where({
          //     project_id: project.id,
          //     employee_id: auth.user?.employeeId,
          //   })
          //   .andWhereRaw('DATE(created_at) = :date', {
          //     date: now,
          //   })
          //   .first()

          const daily = await DailyPlan.query()
            .where({
              project_id: project.id,
              employee_id: auth.user?.employeeId || 0,
              date: now,
            })
            .first()

          if (daily) {
            await daily
              .merge({
                locationAt: DateTime.local({ zone: 'UTC+7' }).toFormat('HH:mm'),
                latitude: request.input('latitude', 0),
                longitude: request.input('longitude', 0),
              })
              .save()
          }

          // if (!track) {
          //   await Tracking.create({
          //     projectId: project.id,
          //     employeeId: auth.user?.employeeId,
          //     latitude: request.input('latitude'),
          //     longitude: request.input('longitude'),
          //     createdAt: DateTime.now(),
          //   })
          // }
        }
      }

      return response.noContent()
    } catch (error) {}
  }
}

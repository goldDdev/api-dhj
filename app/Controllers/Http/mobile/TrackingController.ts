import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import codeError from 'Config/codeError'
import Tracking from 'App/Models/Tracking'
import { DateTime } from 'luxon'
import Project from 'App/Models/Project'
import Setting, { SettingCode } from 'App/Models/Setting'
import DailyPlan from 'App/Models/DailyPlan'
import CenterLocation from 'App/Models/CenterLocation'
import { EmployeeType } from 'App/Models/Employee'
import Database from '@ioc:Adonis/Lucid/Database'
import AdditionalHour from 'App/Models/AdditionalHour'
import Logger from '@ioc:Adonis/Core/Logger'
import { RequestOTStatus } from 'App/Models/RequestOvertime'

export default class TrackingController {
  public async create({ auth, request, response, now, time }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number.optional(),
          latitude: schema.number(),
          longitude: schema.number(),
        }),
      })
      const { projectId, latitude, longitude } = payload
      const { value } = await Setting.query().where('code', SettingCode.RADIUS).firstOrFail()

      if (projectId) {
        await Tracking.create({
          projectId,
          latitude,
          longitude,
          employeeId: auth.user?.employeeId,
          createdAt: DateTime.local({ zone: 'UTC+7' }),
        })

        const project = await Project.find(projectId)

        if (project) {
          if (auth.user?.employee.role === EmployeeType.MANDOR) {
            const ot = await Database.from('request_overtimes')
              .select(
                '*',
                Database.raw(
                  'EXTRACT(hour from "come_at"::time)::int AS hour,EXTRACT(minute from "come_at"::time)::int AS minute'
                )
              )
              .where({
                employee_id: auth.user?.employeeId,
                absent_at: now,
                status: RequestOTStatus.CONFIRM,
                confirm_status: RequestOTStatus.CONFIRM,
              })
              .first()

            if (ot) {
              const distance = this.haversine(
                this.LatLong(latitude, longitude),
                this.LatLong(project.latitude, project.longitude)
              )

              if (distance > +value) {
                if (ot.close_at > time && ot.come_at < time) {
                  const duration = Math.round(
                    Math.abs(
                      DateTime.fromObject(
                        {
                          hour: ot.hour,
                          minute: ot.minute,
                        },
                        { zone: 'UTC+7' }
                      ).diffNow('minutes').minutes
                    )
                  )

                  await AdditionalHour.query()
                    .where({ parent_id: ot.id })
                    .andWhereNull('actual_close')
                    .update({
                      actualClose: time,
                      actualDuration: duration,
                      totalEarn: Math.round(+ot.overtime_price / 60) * duration,
                    })
                }
              }
            }
          }
        }
      } else {
        const location = await CenterLocation.query()
          .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
            radius: +(value || 0),
            lat: latitude,
            long: longitude,
          })
          .first()

        const project = await Project.query()
          .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
            radius: +(value || 0),
            lat: latitude,
            long: longitude,
          })
          .first()

        if (value) {
          const project = await Project.query()
            .whereRaw(
              `calculate_distance(projects.latitude, projects.longitude, :lat, :long, 'MTR') <= :radius`,
              {
                radius: value || 0,
                lat: latitude,
                long: longitude,
              }
            )
            .first()

          if (project) {
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
                  latitude,
                  longitude,
                })
                .save()
            }
          }
        }

        await Tracking.create({
          locationId: location?.id,
          projectId: project?.id,
          longitude,
          latitude,
          employeeId: auth.user?.employeeId,
          createdAt: DateTime.local({ zone: 'UTC+7' }),
        })
      }

      return response.noContent()
    } catch (error) {
      Logger.error(error)
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

  public toRad(v) {
    return (v * Math.PI) / 180
  }

  public LatLong(lat, lon) {
    return { Latitude: lat, Longitude: lon }
  }

  public haversine(l1, l2) {
    var R = 6371 // km
    var x1 = l2.Latitude - l1.Latitude
    var dLat = this.toRad(x1)
    var x2 = l2.Longitude - l1.Longitude
    var dLon = this.toRad(x2)
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(l1.Latitude)) *
        Math.cos(this.toRad(l2.Latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    var d = Math.round(R * c * 1609.34)
    return d
  }
}

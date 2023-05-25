import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent from 'App/Models/ProjectAbsent'

import { SettingCode } from 'App/Models/Setting'
import codeError from 'Config/codeError'
import { DateTime } from 'luxon'
import moment from 'moment'

export default class AbsentController {
  public async index({ response, request }: HttpContextContract) {
    const model = await Database.query()
      .from('project_absents')
      .select(
        Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
        'employees.name',
        'project_absents.employee_id',
        'project_absents.absent',
        'project_workers.role',
        'come_at',
        'close_at',
        'project_absents.note',
        'latitude',
        'longitude'
      )
      .join('employees', 'employees.id', '=', 'project_absents.employee_id')
      .joinRaw(
        'LEFT JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
            month: request.input('month'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
            month: moment().month() + 1,
          })
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
            year: request.input('year'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
            year: moment().year(),
          })
      )
      .if(request.input('id'), (query) => {
        query.andWhere('project_absents.project_id', request.input('id'))
      })
      .orderBy('parent_id', 'desc')

    return response.ok({
      data: model.reduce((group: any[], absent) => {
        const index = group.findIndex((v) => v && v.employeeId === absent.employee_id)
        if (index > -1) {
          group[index]['data'].push({
            absent: absent.absent,
            absentAt: absent.absent_at,
            comeAt: absent.come_at,
            closeAt: absent.close_at,
            note: absent.note,
            latitude: absent.latitude,
            longitude: absent.longitude,
            day: +moment(absent.absent_at).format('D'),
          })
        } else {
          group.push({
            name: absent.name,
            employeeId: absent.employee_id,
            role: absent.role,
            data: [
              {
                absent: absent.absent,
                absentAt: absent.absent_at,
                comeAt: absent.come_at,
                closeAt: absent.close_at,
                note: absent.note,
                latitude: absent.latitude,
                longitude: absent.longitude,
                day: +moment(absent.absent_at).format('D'),
              },
            ],
          })
        }
        return group
      }, []),
    })
  }

  public async addClose({ now, time, response }: HttpContextContract) {
    try {
      await Database.table('runs').insert({
        created_at: DateTime.now().setZone('UTC+7').toISO(),
        updated_at: DateTime.now().setZone('UTC+7').toISO(),
      })

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()

      const closeWork = DateTime.fromObject(
        { hour: hour, minute: minute },
        { zone: 'UTC+7' }
      ).toFormat('HH:mm')

      if (time >= closeWork) {
        await ProjectAbsent.query()
          .where({ absent_at: now, absent: 'P' })
          .andWhereNull('close_at')
          .update({ closeAt: closeWork })

        await ProjectAbsent.query()
          .where({ absent_at: now, absent: 'P' })
          .andWhereNull('close_at')
          .andWhereNull('project_id')
          .update({ closeAt: closeWork })
      }

      return response.noContent()
    } catch (error) {
      return response.notFound({ code: codeError.notFound, type: 'notFound', error })
    }
  }
}

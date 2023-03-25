import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import codeError from 'Config/codeError'
import moment from 'moment'
import Logger from '@ioc:Adonis/Core/Logger'
import RequestOvertime, { RequestOTStatus } from 'App/Models/RequestOvertime'
import Setting, { SettingCode } from 'App/Models/Setting'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import { DateTime } from 'luxon'

export default class AbsentController {
  public async index({ auth, response, request }: HttpContextContract) {
    const query = await Database.from('project_absents')
      .select(
        'projects.name',
        'project_workers.parent_id as parentId',
        'project_absents.project_id as projectId',
        Database.raw('TO_CHAR(absent_at, \'YYYY-MM-DD\') as "absentAt"'),
        Database.raw('count(*)::int as total'),
        Database.raw("sum(case when absent = 'P' then 1 else 0 end)::int as present"),
        Database.raw("sum(case when absent = 'A' then 1 else 0 end)::int as absent"),
        Database.raw('sum(case when absent = NULL then 1 else 0 end)::int as "noAbsent"')
      )
      .join('employees', 'employees.id', '=', 'project_absents.employee_id')
      .leftJoin('projects', 'projects.id', '=', 'project_absents.project_id')
      .joinRaw(
        'INNER JOIN project_workers ON employees.id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .orderBy(request.input('orderBy', 'absent_at'), request.input('order', 'asc'))
      .groupBy(
        'project_absents.project_id',
        'absent_at',
        'project_workers.parent_id',
        'projects.name'
      )
      .having('project_workers.parent_id', '=', auth.user!.employee.work.id)
      .andHavingRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .if(request.input('projectId'), (query) => {
        query.andHaving('project_absents.project_id', '=', request.input('projectId'))
      })

    return response.ok(query)
  }

  public async view({ auth, request, response }: HttpContextContract) {
    const models = await ProjectAbsent.query()
      .select(
        '*',
        'employees.name',
        Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
        'project_absents.id',
        'employees.card_id as cardID',
        'employees.phone_number as phoneNumber',
        'project_workers.role',
        'project_absents.project_id'
      )
      .join('employees', 'employees.id', '=', 'project_absents.employee_id')
      .joinRaw(
        'INNER JOIN project_workers ON employees.id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .preload('replaceEmployee')
      .where('project_absents.project_id', request.param('id', 0))
      .andWhere('project_workers.parent_id', auth.user!.employee.work.id)
      .andWhere('absent_at', request.input('date', moment().format('yyyy-MM-DD')))

    const summary = models.reduce(
      (p, n) => ({
        present: p.present + Number(n.absent === AbsentType.P),
        absent: p.absent + Number(n.absent === AbsentType.A),
        noAbsent: p.noAbsent + Number(n.absent === null),
      }),
      { present: 0, absent: 0, noAbsent: 0 }
    )
    summary['total'] = models.length

    return response.ok({
      absentAt: request.input('date', moment().format('yyyy-MM-DD')),
      summary,
      members: models.map((v) =>
        v.serialize({
          fields: {
            omit: ['created_at', 'updated_at', 'latitude', 'longitude'],
          },
        })
      ),
    })
  }

  public async addCome({ auth, request, response }: HttpContextContract) {
    try {
      const currentDate = moment().format('yyyy-MM-DD')

      const work = await ProjectWorker.query()
        .where({
          project_id: request.input('projectId'),
          employee_id: auth.user?.employeeId,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .first()

      const inputWorkers = request.input('workers', [])
      const workers = await ProjectWorker.query()
        .where({
          project_id: request.input('projectId'),
          parent_id: work?.id || 0,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .whereIn('id', inputWorkers)

      const [{ count }] = await Database.query()
        .from('project_absents')
        .joinRaw(
          'INNER JOIN project_workers ON project_workers.employee_id = project_absents.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .where('project_absents.project_id', request.input('projectId'))
        .andWhere('project_workers.parent_id', work?.id || 0)
        .andWhere('absent_at', currentDate)
        .count('*')

      if (+count === 0) {
        const model = auth.user!.employee.work
        await model?.load('members', (query) => {
          query.where('status', ProjectWorkerStatus.ACTIVE)
        })

        const { hour, minute } = (await Database.from('settings')
          .select(
            Database.raw(
              'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
            )
          )
          .where('code', SettingCode.START_TIME)
          .first()) || { hour: 7, minute: 0 }

        const { value: latePrice } = (await Database.from('settings')
          .where('code', SettingCode.LATETIME_PRICE_PER_MINUTE)
          .first()) || { value: 0 }

        const comeAt = DateTime.local({ zone: 'Asia/Jakarta' }).toFormat('HH:mm')
        const startWork = DateTime.fromObject(
          { hour: hour, minute: minute },
          { zone: 'Asia/Jakarta' }
        )

        const lateDuration = Math.round(startWork.diffNow('minutes').minutes)

        await ProjectAbsent.createMany(
          (inputWorkers.length > 0 ? workers : [])
            .map((value) => ({
              absentAt: currentDate,
              absentBy: auth.user?.employeeId,
              projectId: request.input('projectId'),
              employeeId: value.employeeId,
              latitude: request.input('latitude', 0),
              longitude: request.input('longitude', 0),
              comeAt: lateDuration >= 0 ? startWork.toFormat('HH:mm') : comeAt,
              lateDuration: lateDuration >= 0 ? 0 : Math.abs(lateDuration),
              latePrice: lateDuration >= 0 ? 0 : Math.abs(lateDuration) * +latePrice,
              absent: request.input('absent', 'P'),
            }))
            .concat({
              absentAt: currentDate,
              absentBy: auth.user?.employeeId,
              projectId: request.input('projectId'),
              employeeId: work!.employeeId,
              latitude: request.input('latitude', 0),
              longitude: request.input('longitude', 0),
              comeAt: lateDuration >= 0 ? startWork.toFormat('HH:mm') : comeAt,
              lateDuration: lateDuration >= 0 ? 0 : Math.abs(lateDuration),
              latePrice: lateDuration >= 0 ? 0 : Math.abs(lateDuration) * +latePrice,
              absent: request.input('absent', 'P'),
            })
        )
      }

      return response.noContent()
    } catch (error) {
      Logger.info(error)
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async addClose({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const work = await ProjectWorker.query({ client: trx })
        .where({
          project_id: request.input('projectId'),
          employee_id: auth.user?.employeeId,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .first()
      const currentDate = moment().format('yyyy-MM-DD')
      const setting = await Setting.findByOrFail('code', SettingCode.OVERTIME_PRICE_PER_MINUTE)

      const getAbsent = await Database.from('project_absents')
        .select(
          Database.raw(
            'EXTRACT(hour from "come_at"::time)::int AS hour,EXTRACT(minute from "come_at"::time)::int AS minute'
          )
        )
        .joinRaw(
          'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .where('project_absents.absent_at', currentDate)
        .andWhere('project_absents.project_id', request.input('projectId'))
        .andWhere('project_workers.parent_id', work?.id || 0)
        .andWhereNotNull('absent')
        .first()

      const { hour, minute } = (await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()) || { hour: 17, minute: 0 }

      const closeWork = DateTime.fromObject(
        { hour: hour, minute: minute },
        { zone: 'Asia/Jakarta' }
      )

      const closeTreshold = DateTime.fromObject(
        { hour: hour, minute: 15 },
        { zone: 'Asia/Jakarta' }
      )

      const comeAt = DateTime.fromObject(
        { hour: getAbsent.hour, minute: getAbsent.minute },
        { zone: 'Asia/Jakarta' }
      )
      const currentTime = DateTime.local({ zone: 'Asia/Jakarta' })

      const duration = Math.round(
        (currentTime.toSeconds() < closeWork.toSeconds() ? currentTime : closeWork).diff(
          comeAt,
          'minutes'
        ).minutes
      )

      const closeAt = currentTime.toSeconds() < closeWork.toSeconds() ? currentTime : closeWork
      const closeTime = closeAt.toFormat('HH:mm')

      const workers = (
        (await ProjectAbsent.query()
          .select('project_absents.id')
          .joinRaw(
            'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
          )
          .where('project_absents.project_id', request.input('projectId'))
          .andWhere('project_workers.parent_id', work?.id || 0)
          .andWhereNull('project_absents.close_at')
          .andWhere('project_absents.absent', 'P')
          .andWhere('absent_at', currentDate)) || []
      ).map((v) => v.id)

      // NOTE: Create Additional Hour if absent > 15minutes
      if (currentTime.toSeconds() > closeTreshold.toSeconds()) {
        const [{ count }] = await Database.query()
          .from('request_overtimes')
          .where({
            employee_id: auth.user!.employeeId,
            project_id: request.input('projectId'),
            absent_at: currentDate,
          })
          .andWhere('status', '!=', RequestOTStatus.REJECT)
          .count('*')

        if (+count === 0) {
          const overtimeDuration = Math.round(currentTime.diff(closeAt, 'minutes').minutes)
          const totalEarn = overtimeDuration * +setting.value
          await RequestOvertime.create(
            {
              absentAt: currentDate,
              closeAt: currentTime.toFormat('HH:mm'),
              comeAt: closeTime,
              employeeId: auth.user!.employeeId,
              projectId: request.input('projectId'),
              overtimeDuration,
              overtimePrice: +setting.value,
              totalEarn: totalEarn * workers.length,
            },
            { client: trx }
          )
        }
      }

      await ProjectAbsent.query({ client: trx })
        .whereIn('id', workers)
        .update({ closeAt: closeTime, duration })

      await ProjectAbsent.query({ client: trx })
        .where({
          employee_id: auth.user?.employeeId,
          project_id: request.input('projectId'),
          absent_at: currentDate,
        })
        .andWhereNull('close_at')
        .update({ closeAt: closeTime, duration })

      await trx.commit()
      return response.noContent()
    } catch (error) {
      Logger.error(error)
      await trx.rollback()
      return response.notFound({ code: codeError.notFound, type: 'notFound', error })
    }
  }
}

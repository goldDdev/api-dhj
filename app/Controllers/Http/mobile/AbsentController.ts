import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import codeError from 'Config/codeError'
import moment from 'moment'
import { DateTime } from 'luxon'
import { SettingCode } from 'App/Models/Setting'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { ProjectWorkerStatus } from 'App/Models/ProjectWorker'

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

  public async current({ auth, response }: HttpContextContract) {
    const currentDate = moment().format('yyyy-MM-DD')
    const [{ count }] = await Database.query()
      .from('project_absents')
      .joinRaw(
        'INNER JOIN project_workers ON project_workers.employee_id = project_absents.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .where('project_absents.project_id', auth.user!.employee.work.projectId)
      .andWhere('project_workers.parent_id', auth.user!.employee.work.id)
      .andWhere('absent_at', currentDate)
      .count('*')

    if (+count === 0) {
      const model = auth.user!.employee.work
      await model?.load('members', (query) => {
        query.where('status', ProjectWorkerStatus.ACTIVE)
      })

      await ProjectAbsent.createMany(
        model?.members
          .filter((v) => v.status === ProjectWorkerStatus.ACTIVE)
          .map((value) => ({
            absentAt: currentDate,
            absentBy: auth.user?.employeeId,
            projectId: value.projectId,
            employeeId: value.employeeId,
          }))
      )
    }

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
      .where('project_absents.project_id', auth.user!.employee.work.projectId)
      .andWhere('project_workers.parent_id', auth.user!.employee.work.id)
      .andWhere('absent_at', currentDate)

    if (models.length === 0) {
    }

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
      absentAt: currentDate,
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

  public async create({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const currentDate = moment().format('yyyy-MM-DD')
      request.updateBody({
        absentAt: currentDate,
      })

      if (auth.user) {
        await request.validate({
          schema: schema.create({
            absentAt: schema.date({}, [
              rules.unique({
                table: 'project_absents',
                column: 'absent_at',
                where: {
                  project_id: auth.user?.employee.work.projectId,
                  absent_by: auth.user?.employeeId,
                },
              }),
            ]),
          }),
        })

        const model = auth.user.employee.work
        await model?.load('members', (query) => {
          query.where('status', ProjectWorkerStatus.ACTIVE)
        })
        const data = model?.members
          .filter((v) => v.status === ProjectWorkerStatus.ACTIVE)
          .map((value) => ({
            absentAt: currentDate,
            absentBy: auth.user?.employeeId,
            projectId: value.projectId,
            employeeId: value.employeeId,
          }))

        const absents = await ProjectAbsent.createMany(data, { client: trx })
        await trx.commit()
        return response.created(absents)
      }
      await trx.rollback()
    } catch (error) {
      await trx.rollback()
      return response.ok({
        error: [
          {
            code: codeError.exists,
            fields: 'absentAt',
            type: 'exists',
            value: request.input('absentAt'),
          },
        ],
      })
    }
  }

  public async addCome({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          absent: schema.string(),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
        }),
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

      const model = await ProjectAbsent.query()
        .whereNull('come_at')
        .andWhere('id', payload.id)
        .firstOrFail()

      const comeAt = DateTime.local({ zone: 'Asia/Jakarta' }).toFormat('HH:mm')
      const startWork = DateTime.fromObject(
        { hour: hour, minute: minute },
        { zone: 'Asia/Jakarta' }
      )
      const lateDuration = Math.round(startWork.diffNow('minutes').minutes)

      if (model) {
        model.merge({
          absentBy: auth.user?.employeeId,
          comeAt: lateDuration >= 0 ? startWork.toFormat('HH:mm') : comeAt,
          lateDuration: lateDuration >= 0 ? 0 : Math.abs(lateDuration),
          latePrice: lateDuration >= 0 ? 0 : Math.abs(lateDuration) * +latePrice,
          latitude: payload.latitude,
          longitude: payload.longitude,
        })

        await model.save()
        return response.ok({
          id: model.id,
          absent: model.absent,
          comeAt: model.comeAt,
          closeAt: model.closeAt,
        })
      }
    } catch (error) {
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async addMultiple({ auth, request, response }: HttpContextContract) {
    try {
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

      const absents = request.input('absents', []).map((v) => ({
        absentBy: auth.user?.employeeId,
        comeAt: lateDuration >= 0 ? startWork.toFormat('HH:mm') : comeAt,
        lateDuration: lateDuration >= 0 ? 0 : Math.abs(lateDuration),
        latePrice: lateDuration >= 0 ? 0 : Math.abs(lateDuration) * +latePrice,
        latitude: request.input('latitude', 0),
        longitude: request.input('longitude', 0),
        absent: v.absent,
        id: v.id,
      }))

      absents.forEach(async ({ id, ...other }) => {
        await ProjectAbsent.query().where('id', id).andWhereNull('absent').update(other)
      })

      return response.ok(absents)
      // }
    } catch (error) {
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async addClose({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
        }),
      })

      const { hour, minute } = (await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()) || { hour: 17, minute: 0 }

      const getAbsent = await Database.from('project_absents')
        .select(
          '*',
          Database.raw(
            'EXTRACT(hour from "come_at"::time)::int AS hour,EXTRACT(minute from "come_at"::time)::int AS minute'
          )
        )
        .where('id', payload.id)
        .andWhereNull('close_at')
        .firstOrFail()

      const closeWork = DateTime.fromObject(
        { hour: hour, minute: minute },
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

      const closeAt =
        currentTime.toSeconds() < closeWork.toSeconds()
          ? currentTime.toFormat('HH:mm')
          : closeWork.toFormat('HH:mm')

      await ProjectAbsent.query().where('id', payload.id).update({ closeAt, duration })

      return response.ok({
        id: payload.id,
        closeAt: closeAt,
        duration: duration,
      })
    } catch (error) {
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }
}

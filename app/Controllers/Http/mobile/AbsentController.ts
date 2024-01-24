import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import codeError from 'Config/codeError'
import Logger from '@ioc:Adonis/Core/Logger'
import Setting, { SettingCode } from 'App/Models/Setting'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import { DateTime } from 'luxon'
import CenterLocation from 'App/Models/CenterLocation'
import Tracking from 'App/Models/Tracking'
import Project from 'App/Models/Project'
import { EmployeeType } from 'App/Models/Employee'
import DailyPlan from 'App/Models/DailyPlan'
import WeeklyPlans from 'App/Models/WeeklyPlan'

export default class AbsentController {
  public async index({ auth, response, month, year, request }: HttpContextContract) {
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
        month: request.input('month', month),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', year),
      })
      .if(request.input('projectId'), (query) => {
        query.andHaving('project_absents.project_id', '=', request.input('projectId'))
      })

    return response.ok(query)
  }

  public async view({ auth, request, now, response }: HttpContextContract) {
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
      .withScopes((scopes) => {
        scopes.withEmployee()
        scopes.withWorker()
      })
      .where('project_absents.project_id', request.param('id', 0))
      .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
        id: auth.user!.employee.work.id,
      })
      .andWhere('absent_at', request.input('date', now))

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
      absentAt: request.input('date', now),
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

  public async addCome({ auth, request, now, response }: HttpContextContract) {
    try {
      const inputWorkers = request.input('workers', [])
      const { value: RADIUS } = await Setting.query()
        .where('code', SettingCode.RADIUS)
        .firstOrFail()

      const { value: latePrice } = await Database.from('settings')
        .where('code', SettingCode.LATETIME_PRICE_PER_MINUTE)
        .first()

      const { value: lateTreshold } = await Database.from('settings')
        .where('code', SettingCode.LATE_TRESHOLD)
        .first()

      const location = await CenterLocation.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(RADIUS || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const project = await Project.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(RADIUS || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const work = await ProjectWorker.query()
        .where({
          project_id: request.input('projectId'),
          employee_id: auth.user?.employeeId,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .firstOrFail()

      const workers = await ProjectWorker.query()
        .where({
          project_id: request.input('projectId'),
          status: ProjectWorkerStatus.ACTIVE,
        })
        .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
          id: work.id,
        })
        .whereIn('id', inputWorkers.map((v) => v.id).concat([work.id]))

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.START_TIME)
        .first()

      const comeAt = DateTime.local({ zone: 'UTC+7' }).toFormat('HH:mm')
      const startWork = DateTime.fromObject({ hour: hour, minute: minute }, { zone: 'UTC+7' })
      const startWorkLate = DateTime.fromObject(
        { hour: hour, minute: lateTreshold },
        { zone: 'UTC+7' }
      )
      const lateDuration = Math.round(startWorkLate.diffNow('minutes').minutes)

      workers.forEach(async (value) => {
        const ket = inputWorkers.find((v) => v.id === value.id)
        const findWork = await ProjectAbsent.query()
          .withScopes((scopes) => scopes.withWorker())
          .andWhere('project_workers.id', value.id)
          .andWhere('absent_at', now)
          .first()

        if (!findWork) {
          await ProjectAbsent.create({
            absentAt: now,
            absentBy: auth.user?.employeeId,
            projectId: request.input('projectId'),
            employeeId: value.employeeId,
            latitude: request.input('latitude', 0),
            longitude: request.input('longitude', 0),
            comeAt: ket
              ? ket.absent === 'A'
                ? undefined
                : lateDuration >= 0
                ? startWork.toFormat('HH:mm')
                : comeAt
              : comeAt,
            lateDuration: ket
              ? ket.absent === 'A'
                ? 0
                : lateDuration >= 0
                ? 0
                : Math.abs(lateDuration)
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration),
            latePrice: ket
              ? ket.absent === 'A'
                ? 0
                : lateDuration >= 0
                ? 0
                : Math.abs(lateDuration) * +latePrice
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration) * +latePrice,
            absent: ket ? ket.absent : 'P',
          })
        } else {
          if (findWork.absent === 'A' && ket && ket.absent === 'P') {
            await findWork
              .merge({
                comeAt: ket
                  ? ket.absent === 'A'
                    ? undefined
                    : lateDuration >= 0
                    ? startWork.toFormat('HH:mm')
                    : comeAt
                  : comeAt,
                lateDuration: ket
                  ? ket.absent === 'A'
                    ? 0
                    : lateDuration >= 0
                    ? 0
                    : Math.abs(lateDuration)
                  : lateDuration >= 0
                  ? 0
                  : Math.abs(lateDuration),
                latePrice: ket
                  ? ket.absent === 'A'
                    ? 0
                    : lateDuration >= 0
                    ? 0
                    : Math.abs(lateDuration) * +latePrice
                  : lateDuration >= 0
                  ? 0
                  : Math.abs(lateDuration) * +latePrice,
                absent: ket ? ket.absent : 'P',
              })
              .save()
          }
        }

        await Tracking.create({
          locationId: location?.id,
          projectId: project?.id,
          latitude: request.input('latitude', 0),
          longitude: request.input('longitude', 0),
          employeeId: auth.user?.employeeId,
          createdAt: DateTime.local({ zone: 'UTC+7' }),
        })
      })
      return response.noContent()
    } catch (error) {
      Logger.info(error)
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async project({ auth, request, now, response }: HttpContextContract) {
    if (request.input('projectId', []).length === 0) {
      return response.unprocessableEntity({
        code: codeError.entity,
        type: 'required',
        field: 'projectId',
      })
    }

    if (!Array.isArray(request.input('projectId', []))) {
      return response.unprocessableEntity({
        code: codeError.entity,
        type: 'required',
        field: 'projectId',
      })
    }

    const workers = await ProjectWorker.query()
      .where({
        status: ProjectWorkerStatus.ACTIVE,
        employee_id: auth.user?.employeeId,
      })
      .andWhereIn('project_id', request.input('projectId'))

    const { hour, minute } = await Database.from('settings')
      .select(
        Database.raw(
          'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
        )
      )
      .where('code', SettingCode.START_TIME)
      .first()

    const { value: latePrice } = await Database.from('settings')
      .where('code', SettingCode.LATETIME_PRICE_PER_MINUTE)
      .first()

    const { value: lateTreshold } = await Database.from('settings')
      .where('code', SettingCode.LATE_TRESHOLD)
      .first()

    const comeAt = DateTime.local({ zone: 'UTC+7' }).toFormat('HH:mm')
    const startWork = DateTime.fromObject({ hour: hour, minute: minute }, { zone: 'UTC+7' })
    const startWorkLate = DateTime.fromObject(
      { hour: hour, minute: lateTreshold },
      { zone: 'UTC+7' }
    )
    const lateDuration = Math.round(startWorkLate.diffNow('minutes').minutes)

    workers.forEach(async (value) => {
      const findWork = await ProjectAbsent.query()
        .withScopes((scopes) => scopes.withWorker())
        .where({
          absent_at: now,
          ['project_absents.project_id']: value.projectId,
          ['project_absents.employee_id']: auth.user?.employeeId,
        })
        .first()

      if (!findWork) {
        await ProjectAbsent.create({
          absentAt: now,
          absentBy: auth.user?.employeeId,
          projectId: value.projectId,
          employeeId: auth.user?.employeeId,
          latitude: request.input('latitude', 0),
          longitude: request.input('longitude', 0),
          comeAt: lateDuration >= 0 ? startWork.toFormat('HH:mm') : comeAt,
          lateDuration: lateDuration >= 0 ? 0 : Math.abs(lateDuration),
          latePrice: lateDuration >= 0 ? 0 : Math.abs(lateDuration) * +latePrice,
          absent: request.input('absent', 'P'),
        })
      }
    })

    return response.json({ workers, now, user: auth.user })
  }

  public async updateProject({ auth, request, time, response }: HttpContextContract) {
    if (request.input('projectId', 0) === 0) {
      return response.unprocessableEntity({
        code: codeError.entity,
        type: 'required',
        field: 'projectId',
      })
    }

    const model = await ProjectAbsent.query()
      .where({
        project_id: request.input('projectId'),
        employee_id: auth.user?.employeeId,
        absent: 'P',
      })
      .andWhereNull('close_at')
      .andWhereNull('location_at')
      .first()

    if (model) {
      await model
        .merge({
          locationAt: time,
          latitude: request.input('latitude', model.latitude),
          longitude: request.input('longitude', model.longitude),
        })
        .save()
    }

    return response.noContent()
  }

  public async addClose({ auth, request, now, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const work = await ProjectWorker.query({ client: trx })
        .where({
          project_id: request.input('projectId'),
          employee_id: auth.user?.employeeId,
          status: ProjectWorkerStatus.ACTIVE,
        })
        .firstOrFail()

      // const setting = await Setting.findByOrFail('code', SettingCode.OVERTIME_PRICE_PER_MINUTE)

      const getAbsent = await Database.from('project_absents')
        .select(
          Database.raw(
            'EXTRACT(hour from "come_at"::time)::int AS hour,EXTRACT(minute from "come_at"::time)::int AS minute'
          )
        )
        .joinRaw(
          'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .where('project_absents.absent_at', now)
        .andWhere('project_absents.project_id', request.input('projectId'))
        .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
          id: work.id,
        })
        .andWhereNotNull('absent')
        .first()

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()

      const closeWork = DateTime.fromObject({ hour: hour, minute: minute }, { zone: 'UTC+7' })

      // const closeTreshold = DateTime.fromObject({ hour: hour, minute: 15 }, { zone: 'UTC+7' })

      const comeAt = DateTime.fromObject(
        { hour: getAbsent.hour, minute: getAbsent.minute },
        { zone: 'UTC+7' }
      )
      const currentTime = DateTime.local({ zone: 'UTC+7' })

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
          .withScopes((scopes) => scopes.withWorker())
          .where('project_absents.project_id', request.input('projectId'))
          .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
            id: work.id,
          })
          .andWhereNull('project_absents.close_at')
          .andWhere('project_absents.absent', 'P')
          .andWhere('absent_at', now)) || []
      ).map((v) => v.id)

      // NOTE: Create Additional Hour if absent > 15minutes
      // if (currentTime.toSeconds() > closeTreshold.toSeconds()) {
      //   const [{ count }] = await Database.query()
      //     .from('request_overtimes')
      //     .where({
      //       employee_id: auth.user!.employeeId,
      //       project_id: request.input('projectId'),
      //       absent_at: now,
      //     })
      //     .andWhere('status', '!=', RequestOTStatus.REJECT)
      //     .count('*')

      //   if (+count === 0) {
      //     const overtimeDuration = Math.round(currentTime.diff(closeAt, 'minutes').minutes)
      //     const totalEarn = overtimeDuration * +setting.value
      //     await RequestOvertime.create(
      //       {
      //         absentAt: now,
      //         closeAt: currentTime.toFormat('HH:mm'),
      //         comeAt: closeTime,
      //         employeeId: auth.user!.employeeId,
      //         projectId: request.input('projectId'),
      //         overtimeDuration,
      //         overtimePrice: +setting.value,
      //         totalEarn: totalEarn * workers.length,
      //       },
      //       { client: trx }
      //     )
      //   }
      // }

      await ProjectAbsent.query({ client: trx })
        .whereIn('id', workers)
        .andWhereNull('close_at')
        .update({
          closeAt: closeTime,
          duration,
          closeLatitude: request.input('latitude', 0),
          closeLongitude: request.input('longitude', 0),
        })

      await trx.commit()
      return response.noContent()
    } catch (error) {
      Logger.error(error)
      await trx.rollback()
      return response.notFound({ code: codeError.notFound, type: 'notFound', error })
    }
  }

  public async addSingle({ auth, request, now, response }: HttpContextContract) {
    try {
      const radius = await Setting.query().where({ code: SettingCode.RADIUS }).first()
      const location = await CenterLocation.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(radius?.value || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const project = await Project.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(radius?.value || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.START_TIME)
        .first()

      const { value: latePrice } = await Database.from('settings')
        .where('code', SettingCode.LATETIME_PRICE_PER_MINUTE)
        .first()

      const { value: lateTreshold } = await Database.from('settings')
        .where('code', SettingCode.LATE_TRESHOLD)
        .first()

      const comeAt = DateTime.local({ zone: 'UTC+7' }).toFormat('HH:mm')
      const startWork = DateTime.fromObject({ hour: hour, minute: minute }, { zone: 'UTC+7' })
      const startWorkLate = DateTime.fromObject(
        { hour: hour, minute: lateTreshold },
        { zone: 'UTC+7' }
      )
      const lateDuration = Math.round(startWorkLate.diffNow('minutes').minutes)

      const findAbsent = await ProjectAbsent.query()
        .where({
          employee_id: auth.user?.employeeId,
          absent_at: now,
        })
        .first()

      if (!findAbsent) {
        await ProjectAbsent.create({
          absentAt: now,
          absentBy: auth.user?.employeeId,
          employeeId: auth?.user?.employeeId,
          latitude: request.input('latitude', 0),
          longitude: request.input('longitude', 0),
          comeAt: request.input('absent')
            ? request.input('absent') === 'A'
              ? undefined
              : lateDuration >= 0
              ? startWork.toFormat('HH:mm')
              : comeAt
            : comeAt,
          lateDuration: request.input('absent')
            ? request.input('absent') === 'A'
              ? 0
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration)
            : lateDuration >= 0
            ? 0
            : Math.abs(lateDuration),
          latePrice: request.input('absent')
            ? request.input('absent') === 'A'
              ? 0
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration) * +latePrice
            : lateDuration >= 0
            ? 0
            : Math.abs(lateDuration) * +latePrice,
          absent: request.input('absent', 'P'),
          ...(location ? { note: location.name } : {}),
        })
      }

      await Tracking.create({
        locationId: location?.id,
        projectId: project?.id,
        latitude: request.input('latitude', 0),
        longitude: request.input('longitude', 0),
        employeeId: auth.user?.employeeId,
        createdAt: DateTime.local({ zone: 'UTC+7' }),
      })
      return response.noContent()
    } catch (error) {
      Logger.info(error)
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async offlineAbsent({ auth, request, now, time, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      let absents: any[] = []

      const [date, times] = request.input('time').split(' ')

      const radius = await Setting.query().where({ code: SettingCode.RADIUS }).first()
      const location = await CenterLocation.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(radius?.value || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const project = await Project.query()
        .whereRaw(`calculate_distance(latitude, longitude, :lat, :long, 'MTR') <= :radius`, {
          radius: +(radius?.value || 0),
          lat: request.input('latitude', 0),
          long: request.input('longitude', 0),
        })
        .first()

      const { value: latePrice } = await Database.from('settings')
        .where('code', SettingCode.LATETIME_PRICE_PER_MINUTE)
        .first()

      const { value: lateTreshold } = await Database.from('settings')
        .where('code', SettingCode.LATE_TRESHOLD)
        .first()

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.START_TIME)
        .first()

      const comeAt = times || time
      const absentAt = DateTime.fromISO(`${date || now}T${times || time}`)
      const startWork = DateTime.fromObject(
        {
          year: absentAt.year,
          month: absentAt.month,
          day: absentAt.day,
          hour: hour,
          minute: minute,
        },
        { zone: 'UTC+7' }
      )
      const startWorkLate = DateTime.fromObject(
        {
          year: absentAt.year,
          month: absentAt.month,
          day: absentAt.day,
          hour: hour,
          minute: lateTreshold,
        },
        { zone: 'UTC+7' }
      )
      const lateDuration = Math.round(
        startWorkLate.diff(DateTime.fromISO(`${date || now}T${times || time}`), 'minutes').minutes
      )

      if (auth.user!.employee.role === EmployeeType.MANDOR) {
        await ProjectWorker.query()
          .where({
            project_id: auth.user?.employee?.work?.projectId,
            status: ProjectWorkerStatus.ACTIVE,
          })
          .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
            id: auth.user?.employee?.work?.id!,
          })
          .then(async (workers) => {
            const currentAbsents: number[] = await ProjectAbsent.query()
              .whereIn(
                'employee_id',
                workers.map((v) => v.employeeId)
              )
              .where({
                projectId: auth.user?.employee?.work?.projectId,
                absentAt: date || now,
              })
              .then((abs) => {
                return abs.map((v) => v.employeeId)
              })
              .catch(() => {
                return []
              })

            absents = workers
              .filter((v) => !currentAbsents.includes(v.employeeId))
              .map((v) => ({
                projectId: v.projectId,
                employeeId: v.employeeId,
              }))
          })
      } else {
        let projects: number[] = []
        await DailyPlan.query()
          .where({
            employee_id: auth.user?.employeeId,
            date: date || now,
          })
          .then((value) => {
            value.forEach((v) => projects.push(v.projectId))
          })

        await WeeklyPlans.query()
          .where('employee_id', auth.user!.employeeId)
          .andWhereRaw(
            '((start_date >= :start_date AND end_date <= :end_date) OR (end_date >= :start_date AND end_date <= :end_date))',
            {
              start_date: date || now,
              end_date: date || now,
            }
          )
          .then((value) => {
            value.forEach((v) => projects.push(v.projectId))
          })

        await ProjectAbsent.query()
          .where({
            employee_id: auth.user?.employeeId,
            absent_at: date || now,
          })
          .then((value) => {
            projects = projects.filter((v) => !value.map((_v) => _v.projectId).includes(v))
          })

        projects = Array.from(new Set(projects))
        absents = projects.map((v) => ({ projectId: v, employeeId: auth.user?.employeeId }))
      }

      if (absents.length > 0) {
        await ProjectAbsent.createMany(
          absents.map((abs) => ({
            absentAt: date || now,
            absentBy: auth.user?.employeeId,
            projectId: abs.projectId,
            employeeId: abs.employeeId,
            latitude: request.input('latitude', 0),
            longitude: request.input('longitude', 0),
            comeAt: request.input('absent')
              ? request.input('absent') === 'A'
                ? undefined
                : lateDuration >= 0
                ? startWork.toFormat('HH:mm')
                : comeAt
              : comeAt,
            lateDuration: request.input('absent')
              ? request.input('absent') === 'A'
                ? 0
                : lateDuration >= 0
                ? 0
                : Math.abs(lateDuration)
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration),
            latePrice: request.input('absent')
              ? request.input('absent') === 'A'
                ? 0
                : lateDuration >= 0
                ? 0
                : Math.abs(lateDuration) * +latePrice
              : lateDuration >= 0
              ? 0
              : Math.abs(lateDuration) * +latePrice,
            absent: request.input('absent', 'P'),
          })),
          { client: trx }
        )

        await Tracking.create(
          {
            locationId: location?.id,
            projectId: project?.id,
            latitude: request.input('latitude', 0),
            longitude: request.input('longitude', 0),
            employeeId: auth.user?.employeeId,
            createdAt: DateTime.local({ zone: 'UTC+7' }),
          },
          { client: trx }
        )
      }
      await trx.commit()
      return response.noContent()
    } catch (err) {
      Logger.info(err)
      await trx.rollback()
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async offlineAbsentClose({ auth, request, now, time, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const [date, times] = request.input('time').split(' ')
      let absents: any[] = []
      let workers: number[] = []
      let updateData = {
        closeAt: '',
        duration: 0,
        closeLatitude: request.input('latitude', 0),
        closeLongitude: request.input('longitude', 0),
      }
      const absentAt = DateTime.fromISO(`${date || now}T${times || time}`)
      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()

      if (auth?.user?.employee?.role === EmployeeType.MANDOR) {
        await ProjectWorker.query()
          .where({
            project_id: auth.user?.employee?.work?.projectId,
            status: ProjectWorkerStatus.ACTIVE,
          })
          .andWhereRaw('(project_workers.id = :id OR project_workers.parent_id = :id)', {
            id: auth.user?.employee?.work?.id!,
          })
          .then((values) => {
            workers = values.map((v) => v.employeeId)
          })
      } else {
        workers = [auth.user!.employeeId]
      }

      await Database.from('project_absents')
        .select(
          'id',
          Database.raw(
            `EXTRACT(hour from "come_at"::time)::int AS hour,
            EXTRACT(minute from "come_at"::time)::int AS minute,
            EXTRACT(day from "absent_at"::date)::int AS day,
            EXTRACT(month from "absent_at"::date)::int AS month,
            EXTRACT(year from "absent_at"::date)::int AS year
            `
          ),
          'absent_at'
        )
        .where({
          absent_at: date || now,
        })
        .andWhereIn('employee_id', workers)
        .andWhereNotNull('absent')
        .andWhereNull('close_at')
        .then((values) => {
          values.forEach((value, i) => {
            if (i === 0) {
              const comeAt = DateTime.fromObject(
                {
                  year: value.year,
                  month: value.month,
                  day: value.day,
                  hour: value.hour,
                  minute: value.minute,
                },
                { zone: 'UTC+7' }
              )

              const closeWork = DateTime.fromObject(
                {
                  year: value.year,
                  month: value.month,
                  day: value.day,
                  hour: hour,
                  minute: minute,
                },
                { zone: 'UTC+7' }
              )

              const duration = Math.round(
                (absentAt.toSeconds() < closeWork.toSeconds() ? absentAt : closeWork).diff(
                  comeAt,
                  'minutes'
                ).minutes
              )
              const closeAt = absentAt.toSeconds() < closeWork.toSeconds() ? absentAt : closeWork
              const closeTime = closeAt.toFormat('HH:mm')
              updateData = { ...updateData, closeAt: closeTime, duration }
            }

            absents.push(value.id)
          })
        })

      if (absents.length > 0) {
        await ProjectAbsent.query({ client: trx })
          .whereIn('id', absents)
          .andWhereNull('close_at')
          .update(updateData)
      }

      await trx.commit()
      return response.json({ absents })
    } catch (err) {
      Logger.info(err)
      await trx.rollback()
      return response.notFound({ code: codeError.notFound, type: 'notFound' })
    }
  }

  public async closeSingle({ auth, request, now, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const currentAbsent = await Database.from('project_absents')
        .select(
          'id',
          Database.raw(
            'EXTRACT(hour from "come_at"::time)::int AS hour,EXTRACT(minute from "come_at"::time)::int AS minute'
          )
        )
        .where({
          absent_at: now,
          employee_id: auth.user?.employeeId,
        })
        .andWhereNull('project_absents.project_id')
        .andWhereNotNull('absent')
        .first()

      const { hour, minute } = await Database.from('settings')
        .select(
          Database.raw(
            'EXTRACT(hour from "value"::time)::int AS hour,EXTRACT(minute from "value"::time)::int AS minute'
          )
        )
        .where('code', SettingCode.CLOSE_TIME)
        .first()

      const closeWork = DateTime.fromObject({ hour: hour, minute: minute }, { zone: 'UTC+7' })

      const comeAt = DateTime.fromObject(
        { hour: currentAbsent.hour, minute: currentAbsent.minute },
        { zone: 'UTC+7' }
      )
      const currentTime = DateTime.local({ zone: 'UTC+7' })

      const duration = Math.round(
        (currentTime.toSeconds() < closeWork.toSeconds() ? currentTime : closeWork).diff(
          comeAt,
          'minutes'
        ).minutes
      )

      const closeAt = currentTime.toSeconds() < closeWork.toSeconds() ? currentTime : closeWork
      const closeTime = closeAt.toFormat('HH:mm')

      if (currentAbsent) {
        await ProjectAbsent.query({ client: trx })
          .where('id', currentAbsent.id)
          .andWhereNull('close_at')
          .andWhere('absent', 'P')
          .update({
            closeAt: closeTime,
            duration,
            closeLatitude: request.input('latitude', 0),
            closeLongitude: request.input('longitude', 0),
          })
      }

      await trx.commit()
      return response.noContent()
    } catch (error) {
      Logger.error(error)
      await trx.rollback()
      return response.notFound({ code: codeError.notFound, type: 'notFound', error })
    }
  }
}

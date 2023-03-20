import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import codeError from 'Config/codeError'
import moment from 'moment'
import { DateTime } from 'luxon'
import { schema } from '@ioc:Adonis/Core/Validator'
import Setting, { SettingCode } from 'App/Models/Setting'
import AdditionalHour, { AdditionalStatus } from 'App/Models/AdditionalHour'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'

export default class ProjectsController {
  public async index({ auth, response, request }: HttpContextContract) {
    const query = await Database.from('additional_hours')
      .select(
        'additional_hours.id',
        'projects.name AS projectName',
        'employees.name',
        'project_workers.parent_id as parentId',
        'additional_hours.project_id as projectId',
        'additional_hours.status',
        Database.raw('to_char(additional_hours.absent_at, \'YYYY-MM-DD\') AS "absentAt"'),
        'additional_hours.come_at AS comeAt',
        'additional_hours.close_at AS closeAt'
      )
      .join('employees', 'employees.id', '=', 'additional_hours.employee_id')
      .leftJoin('projects', 'projects.id', '=', 'additional_hours.project_id')
      .joinRaw(
        'INNER JOIN project_workers ON employees.id = project_workers.employee_id AND additional_hours.project_id = project_workers.project_id'
      )
      .orderBy(request.input('orderBy', 'absent_at'), request.input('order', 'asc'))
      .groupBy(
        'additional_hours.id',
        'additional_hours.project_id',
        'absent_at',
        'project_workers.parent_id',
        'projects.name',
        'employees.name',
        'additional_hours.status',
        'additional_hours.absent_at',
        'additional_hours.come_at',
        'additional_hours.close_at'
      )
      .having('project_workers.parent_id', '=', auth.user!.employee.work.id)
      .andHavingRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .if(request.input('projectId'), (query) => {
        query.andHaving('additional_hours.project_id', '=', request.input('projectId'))
      })
      .if(request.input('status'), (query) => {
        query.andHaving('additional_hours.status', '=', request.input('status'))
      })
      .if(request.input('absentAt'), (query) => {
        query.andHaving('additional_hours.absent_at', '=', request.input('absentAt'))
      })
      .if(request.input('startDate'), (query) => {
        query.andHaving('additional_hours.absent_at', '>=', request.input('startDate'))
      })
      .if(request.input('endDate'), (query) => {
        query.andHaving('additional_hours.absent_at', '<=', request.input('endDate'))
      })
      .paginate(request.input('page'), request.input('perPage', 15))

    return response.ok(query.all())
  }

  public async view({ auth, request, response }: HttpContextContract) {
    const model = await AdditionalHour.query()
      .select(
        '*',
        'employees.name',
        Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
        'additional_hours.id',
        'employees.card_id as cardID',
        'employees.phone_number as phoneNumber',
        'additional_hours.project_id'
      )
      .join('employees', 'employees.id', '=', 'additional_hours.employee_id')
      .preload('requestEmployee')
      .preload('actionEmployee')
      .preload('project')
      .where('additional_hours.id', request.param('id'))
      .firstOrFail()

    return response.ok(
      model.serialize({
        relations: {
          actionEmployee: {
            fields: {
              pick: ['name', 'cardID', 'role'],
            },
          },
          requestEmployee: {
            fields: {
              pick: ['name', 'cardID', 'role'],
            },
          },
          project: {
            fields: {
              pick: ['name', 'status', 'companyName'],
            },
          },
        },
      })
    )
  }

  public async create({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          employeeId: schema.number(),
          projectId: schema.number(),
          absentAt: schema.string(),
          comeAt: schema.string(),
          closeAt: schema.string(),
          note: schema.string.optional(),
        }),
      })

      const startTime = DateTime.fromFormat(
        `${payload.absentAt} ${payload.comeAt}`,
        'yyyy-mm-dd HH:mm',
        {
          zone: 'Asia/Jakarta',
        }
      )

      const endTime = DateTime.fromFormat(
        `${payload.absentAt} ${payload.closeAt}`,
        'yyyy-mm-dd HH:mm',
        {
          zone: 'Asia/Jakarta',
        }
      )

      const overtimeDuration = endTime.diff(startTime, 'minutes').minutes
      const setting = await Setting.findByOrFail('code', SettingCode.OVERTIME_PRICE_PER_MINUTE)
      const workerExist = await ProjectWorker.query().where({
        employee_id: payload.employeeId,
        project_id: payload.projectId,
        status: ProjectWorkerStatus.ACTIVE,
      })

      if (workerExist.length === 0) {
        return response.notFound({ code: codeError.notFound, type: 'notFound' })
      }

      const model = await AdditionalHour.create({
        ...payload,
        requestBy: auth.user?.employeeId,
        overtimePrice: +setting.value,
        overtimeDuration,
        totalEarn: overtimeDuration * +setting.value,
      })
      await model.refresh()
      return response.ok(model.serialize())
    } catch (error) {
      return response.unprocessableEntity(error)
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          absentAt: schema.string(),
          comeAt: schema.string(),
          closeAt: schema.string(),
          note: schema.string.optional(),
        }),
      })
      const startTime = DateTime.fromFormat(
        `${payload.absentAt} ${payload.comeAt}`,
        'yyyy-mm-dd HH:mm',
        {
          zone: 'Asia/Jakarta',
        }
      )

      const endTime = DateTime.fromFormat(
        `${payload.absentAt} ${payload.closeAt}`,
        'yyyy-mm-dd HH:mm',
        {
          zone: 'Asia/Jakarta',
        }
      )

      const overtimeDuration = endTime.diff(startTime, 'minutes').minutes
      const model = await AdditionalHour.findOrFail(payload.id)
      if (model.status !== AdditionalStatus.PENDING) {
        return response.forbidden({ coder: codeError.forbidden, type: 'forbidden' })
      }
      model
        .merge({
          ...payload,
          overtimeDuration,
          totalEarn: overtimeDuration * model.overtimePrice,
        })
        .save()
      return response.ok(model.serialize())
    } catch (error) {}
  }

  public async status({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          status: schema.string(),
        }),
      })

      const model = await AdditionalHour.findOrFail(payload.id)
      if (model.status !== AdditionalStatus.PENDING) {
        return response.forbidden({ coder: codeError.forbidden, type: 'forbidden' })
      }
      model.merge({ status: payload.status, actionBy: auth.user?.employeeId }).save()
      return response.ok(model.serialize())
    } catch (error) {}
  }
}

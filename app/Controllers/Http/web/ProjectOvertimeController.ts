import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import codeError from 'Config/codeError'
import moment from 'moment'
import { DateTime } from 'luxon'
import { schema } from '@ioc:Adonis/Core/Validator'
import Setting, { SettingCode } from 'App/Models/Setting'
import AdditionalHour, { AdditionalStatus } from 'App/Models/AdditionalHour'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import RequestOvertime, { RequestOTStatus } from 'App/Models/RequestOvertime'
import ProjectAbsent from 'App/Models/ProjectAbsent'

export default class ProjectOvertimeController {
  public async index({ response, request }: HttpContextContract) {
    const query = await RequestOvertime.query()
      .select(
        '*',
        'request_overtimes.id',
        'request_overtimes.status',
        'projects.name AS project_name',
        'projects.status AS project_status',
        'employees.name AS request_name',
        Database.raw(
          `(SELECT 
            COUNT(*)
          FROM project_workers a1 
          INNER JOIN 
            project_absents ON project_absents.employee_id = a1.employee_id  AND project_absents.project_id = request_overtimes.project_id AND project_absents.absent_at = request_overtimes.absent_at
          WHERE 
            a1.project_id = request_overtimes.project_id 
            AND a1.parent_id = (SELECT id FROM project_workers WHERE project_workers.employee_id = request_overtimes.employee_id LIMIT 1) 
            AND a1.status = 'ACTIVE' 
            AND project_absents.absent = 'P')::int 
          AS total_worker`
        )
      )
      .join('projects', 'projects.id', '=', 'request_overtimes.project_id')
      .join('employees', 'employees.id', '=', 'request_overtimes.employee_id')
      .preload('actionEmployee')
      .whereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .andWhere('project_id', request.param('id', 0))
      .if(request.input('projectId'), (query) => {
        query.andWhere('project_id', '=', request.input('projectId'))
      })
      .if(request.input('status'), (query) => {
        query.andWhere('request_overtimes.status', '=', request.input('status'))
      })
      .if(request.input('absentAt'), (query) => {
        query.andWhere('absent_at', '=', request.input('absentAt'))
      })
      .if(request.input('startDate'), (query) => {
        query.andWhere('absent_at', '>=', request.input('startDate'))
      })
      .if(request.input('endDate'), (query) => {
        query.andWhere('absent_at', '<=', request.input('endDate'))
      })
      .paginate(request.input('page'), request.input('perPage', 15))

    return response.ok(
      query.serialize({
        relations: {
          actionEmployee: {
            fields: {
              pick: ['name', 'role'],
            },
          },
        },
      })
    )
  }

  public async view({ request, response }: HttpContextContract) {
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

      const model = await RequestOvertime.findOrFail(payload.id)
      await model.load('employee', (q) => q.preload('work'))

      if (payload.status === RequestOTStatus.CONFIRM) {
        const absents = await ProjectAbsent.query()
          .select('*', 'project_absents.id')
          .joinRaw(
            'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
          )
          .where('project_absents.project_id', model.projectId)
          .andWhere({ absent_at: model.absentAt, parent_id: model.employee.work.id, absent: 'P' })

        await AdditionalHour.createMany(
          absents.map((v) => ({
            absentAt: model.absentAt,
            closeAt: model.closeAt,
            comeAt: model.comeAt,
            employeeId: v.employeeId,
            projectId: model.projectId,
            overtimeDuration: model.overtimeDuration,
            overtimePrice: model.overtimePrice,
            totalEarn: model.overtimeDuration * model.overtimePrice,
            requestBy: model.id,
            actionBy: auth.user?.employeeId,
            status: RequestOTStatus.CONFIRM,
          }))
        )
      }

      await model.merge({ status: payload.status, actionBy: auth.user?.employeeId }).save()
      await model.load('actionEmployee')
      await model.refresh()

      return response.ok({ data: model.serialize() })
    } catch (error) {
      return response.unprocessableEntity(error)
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await RequestOvertime.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

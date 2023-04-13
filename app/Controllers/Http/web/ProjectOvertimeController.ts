import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import codeError from 'Config/codeError'
import moment from 'moment'
import { DateTime } from 'luxon'
import { schema } from '@ioc:Adonis/Core/Validator'
import Setting, { SettingCode } from 'App/Models/Setting'
import AdditionalHour from 'App/Models/AdditionalHour'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import RequestOvertime, { OTType, RequestOTStatus } from 'App/Models/RequestOvertime'
import ProjectAbsent from 'App/Models/ProjectAbsent'
import Employee from 'App/Models/Employee'
import Logger from '@ioc:Adonis/Core/Logger'

export default class ProjectOvertimeController {
  public async index({ response, request }: HttpContextContract) {
    const query = await RequestOvertime.query()
      .select(
        '*',
        'request_overtimes.id',
        'employees.role AS request_role',
        'request_overtimes.status',
        'projects.name AS project_name',
        'projects.status AS project_status',
        'employees.name AS request_name',
        'emp.name AS employee_name',
        'emp.role AS employee_role',
        Database.raw(
          `(
            CASE
                WHEN request_overtimes.TYPE = 'PERSONAL' THEN
                1 ELSE (
                SELECT COUNT
                  ( * ) 
                FROM
                  project_workers a1
                  INNER JOIN project_absents ON project_absents.employee_id = a1.employee_id 
                  AND project_absents.project_id = request_overtimes.project_id 
                  AND project_absents.absent_at = request_overtimes.absent_at 
                WHERE
                  a1.project_id = request_overtimes.project_id 
                  AND (
                    a1.parent_id = ( SELECT id FROM project_workers WHERE project_workers.employee_id = request_overtimes.employee_id AND project_workers.project_id = request_overtimes.project_id LIMIT 1 ) 
                    OR a1.id = ( SELECT id FROM project_workers WHERE project_workers.employee_id = request_overtimes.employee_id AND project_workers.project_id = request_overtimes.project_id LIMIT 1 ) 
                  ) 
                  AND a1.status = 'ACTIVE' 
                  AND project_absents.ABSENT = 'P' 
                ) 
            END 
            ) :: INT AS total_worker`
        )
      )
      .join('projects', 'projects.id', '=', 'request_overtimes.project_id')
      .join('employees', 'employees.id', '=', 'request_overtimes.request_by')
      .join('employees as emp', 'emp.id', '=', 'request_overtimes.employee_id')
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
    const model = await RequestOvertime.query()
      .select(
        '*',
        'employees.role AS request_role',
        'request_overtimes.id',
        'request_overtimes.status',
        'projects.name AS project_name',
        'projects.status AS project_status',
        'employees.name AS request_name',
        'emp.name AS employee_name',
        'emp.role AS employee_role',
        Database.raw(
          `(
            CASE
                WHEN request_overtimes.TYPE = 'PERSONAL' THEN
                1 ELSE (
                SELECT COUNT
                  ( * ) 
                FROM
                  project_workers a1
                  INNER JOIN project_absents ON project_absents.employee_id = a1.employee_id 
                  AND project_absents.project_id = request_overtimes.project_id 
                  AND project_absents.absent_at = request_overtimes.absent_at
                WHERE
                  a1.project_id = request_overtimes.project_id 
                  AND (
                    a1.parent_id = ( SELECT id FROM project_workers WHERE project_workers.employee_id = request_overtimes.employee_id AND project_workers.project_id = request_overtimes.project_id LIMIT 1 ) 
                    OR a1.id = ( SELECT id FROM project_workers WHERE project_workers.employee_id = request_overtimes.employee_id AND project_workers.project_id = request_overtimes.project_id LIMIT 1 ) 
                  ) 
                  AND a1.status = 'ACTIVE' 
                  AND project_absents.ABSENT = 'P' 
                ) 
            END 
            ) :: INT AS total_worker`
        )
      )
      .join('projects', 'projects.id', '=', 'request_overtimes.project_id')
      .join('employees', 'employees.id', '=', 'request_overtimes.request_by')
      .join('employees as emp', 'emp.id', '=', 'request_overtimes.employee_id')
      .preload('actionEmployee')
      .where('request_overtimes.id', request.param('id'))
      .firstOrFail()

    let list: any[] = []

    if (model.type === OTType.TEAM) {
      list = await ProjectWorker.query()
        .withScopes((scope) => scope.withEmployeeAbsent())
        .joinRaw(
          'INNER JOIN project_absents ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .where({
          ['project_absents.absent_at']: model.absentAt,
          ['project_absents.absent']: 'P',
        })
        .andWhereRaw(
          '(project_workers.parent_id = (SELECT id FROM project_workers pw WHERE pw.employee_id = :employee_id AND pw.project_id = :project_id LIMIT 1 ) OR project_workers.id = ( SELECT id FROM project_workers pw WHERE pw.employee_id = :employee_id AND pw.project_id = :project_id LIMIT 1 ) )',
          {
            employee_id: model.employeeId,
            project_id: model.projectId,
          }
        )
    } else {
      const emp = await Employee.findOrFail(model.employeeId)
      list.push(emp)
    }

    return response.ok({ data: { ...model.serialize(), employees: list } })
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
          duration: schema.number(),
        }),
      })

      const model = await RequestOvertime.findOrFail(payload.id)
      if (model.status !== RequestOTStatus.PENDING) {
        return response.forbidden({ coder: codeError.forbidden, type: 'forbidden' })
      }
      model
        .merge({
          overtimeDuration: payload.duration,
          totalEarn: (payload.duration / 60) * model.overtimePrice,
        })
        .save()
      return response.ok(model.serialize())
    } catch (error) {
      return response.unprocessableEntity(error)
    }
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
          .andWhere({ absent_at: model.absentAt, absent: 'P' })

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
            parentId: model.id,
            type: 'PERSONAL',
          }))
        )
      }

      await model.merge({ status: payload.status, actionBy: auth.user?.employeeId }).save()
      await model.load('actionEmployee')
      await model.refresh()

      return response.ok({ data: model.serialize() })
    } catch (error) {
      Logger.info(error)
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

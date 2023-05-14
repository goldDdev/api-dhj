import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee, { EmployeeType } from 'App/Models/Employee'
import ProjectAbsent from 'App/Models/ProjectAbsent'
import ProjectWorker from 'App/Models/ProjectWorker'
import RequestOvertime, { OTType, RequestOTStatus } from 'App/Models/RequestOvertime'
import Setting, { SettingCode } from 'App/Models/Setting'
import codeError from 'Config/codeError'
import moment from 'moment'
import Logger from '@ioc:Adonis/Core/Logger'
export default class AdditionalHourController {
  public async index({ auth, response, request }: HttpContextContract) {
    const query = await RequestOvertime.query()
      .select(
        '*',
        'request_overtimes.id',
        'request_overtimes.status',
        'projects.name AS project_name',
        'projects.status AS project_status',
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
      .whereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .if(
        auth.user?.employee.role === 'MANDOR',
        (query) => {
          query.andWhere('employee_id', auth.user!.employeeId)
        },
        (query) => {
          query.andWhere('request_by', auth.user!.employeeId)
        }
      )
      .if(request.input('projectId'), (query) => {
        query.andHaving('project_id', '=', request.input('projectId'))
      })
      .if(request.input('status'), (query) => {
        query.andHaving('request_overtimes.status', '=', request.input('status'))
      })
      .if(request.input('absentAt'), (query) => {
        query.andHaving('absent_at', '=', request.input('absentAt'))
      })
      .if(request.input('startDate'), (query) => {
        query.andHaving('absent_at', '>=', request.input('startDate'))
      })
      .if(request.input('endDate'), (query) => {
        query.andHaving('absent_at', '<=', request.input('endDate'))
      })
      .paginate(request.input('page'), request.input('perPage', 15))

    return response.ok(
      query.serialize().data.map((v) => ({ ...v, totalEarn: v.totalEarn * v.totalWorker }))
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

    return response.ok({ ...model.serialize(), employees: list })
  }

  public async create({ auth, now, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          employeeId: schema.number(),
          projectId: schema.number(),
          comeAt: schema.string.optional(),
          closeAt: schema.string.optional(),
          duration: schema.number(),
          note: schema.string.optional(),
        }),
      })

      const find = await RequestOvertime.query()
        .where({
          employee_id: payload.employeeId,
          project_id: payload.projectId,
          absent_at: now,
        })
        .andWhereIn('status', [RequestOTStatus.CONFIRM, RequestOTStatus.PENDING])
        .first()

      const absent = await ProjectAbsent.query()
        .where({
          employee_id: payload.employeeId,
          project_id: payload.projectId,
          absent_at: now,
          absent: 'P',
        })
        .first()

      if (find) {
        return response.unprocessableEntity({ code: codeError.entity, type: 'exist' })
      }

      if (absent) {
        return response.unprocessableEntity({
          code: codeError.absentNotExist,
          type: 'absentNotExist',
        })
      }

      const employee = await Employee.findOrFail(payload.employeeId)
      const setting = await Setting.findByOrFail('code', SettingCode.OVERTIME_PRICE_PER_HOUR)
      const model = await RequestOvertime.create({
        employeeId: payload.employeeId,
        projectId: payload.projectId,
        absentAt: now,
        comeAt: payload.comeAt,
        closeAt: payload.closeAt,
        type: employee.role === EmployeeType.MANDOR ? 'TEAM' : 'PERSONAL',
        requestBy: auth.user?.employeeId,
        overtimePrice: +setting.value,
        overtimeDuration: payload.duration,
        totalEarn: (payload.duration / 60) * +setting.value,
      })
      await model.refresh()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity(error)
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          employeeId: schema.number(),
          projectId: schema.number(),
          absentAt: schema.string(),
          comeAt: schema.string.optional(),
          closeAt: schema.string.optional(),
          type: schema.string.optional(),
          duration: schema.number(),
          note: schema.string.optional(),
        }),
      })

      const model = await RequestOvertime.findOrFail(payload.id)

      if (model.status !== 'PENDING') {
        return response.notFound({ code: codeError.notFound, type: 'notFound' })
      }

      const setting = await Setting.findByOrFail('code', SettingCode.OVERTIME_PRICE_PER_HOUR)
      await model.merge({
        employeeId: payload.employeeId,
        projectId: payload.projectId,
        absentAt: payload.absentAt,
        comeAt: payload.comeAt,
        closeAt: payload.closeAt,
        type: payload.type,
        requestBy: auth.user?.employeeId,
        overtimePrice: +setting.value,
        overtimeDuration: payload.duration,
        totalEarn: (payload.duration / 60) * +setting.value,
      })
      await model.refresh()
      return response.ok(model.serialize())
    } catch (error) {
      return response.unprocessableEntity(error)
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await RequestOvertime.query()
        .where({ id: request.param('id'), status: RequestOTStatus.PENDING })
        .firstOrFail()
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.notFound({ code: codeError.notFound })
    }
  }

  public async pendingOvertime({ request, response, auth }: HttpContextContract) {
    try {
      const overtimes = await RequestOvertime.query()
        .select(
          '*',
          'employees.role AS request_role',
          'request_overtimes.id',
          'request_overtimes.status',
          'projects.name AS project_name',
          'projects.status AS project_status',
          'employees.name AS request_name',
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
        .join('project_workers', 'project_workers.project_id', 'request_overtimes.project_id')
        .join('projects', 'projects.id', 'request_overtimes.project_id')
        .join('employees', 'employees.id', 'request_overtimes.request_by')
        .where({
          ['project_workers.employee_id']: auth.user?.employeeId,
          ['request_overtimes.status']: RequestOTStatus.PENDING,
        })
        .andWhereNull('request_overtimes.confirm_by')
        .paginate(request.input('page'), request.input('perPage', 15))

      return response.json(overtimes.serialize().data)
    } catch (error) {
      Logger.warn(error)
      return response.notFound({ code: codeError.notFound })
    }
  }

  public async updateStatus({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          status: schema.string(),
        }),
      })

      const model = await RequestOvertime.findOrFail(payload.id)

      if (model.status !== RequestOTStatus.PENDING) {
        return response.notFound({ code: codeError.notFound, type: 'notFound' })
      }

      await model
        .merge({
          status: payload.status,
        })
        .save()

      await model.refresh()
      return response.ok(model.serialize())
    } catch (error) {
      return response.unprocessableEntity(error)
    }
  }
}

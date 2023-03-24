import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent from 'App/Models/ProjectAbsent'
import { ProjectWorkerStatus } from 'App/Models/ProjectWorker'
import RequestOvertime, { RequestOTStatus } from 'App/Models/RequestOvertime'
import codeError from 'Config/codeError'
import moment from 'moment'
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
      .whereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
        month: request.input('month', moment().month() + 1),
      })
      .andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .andWhere('employee_id', auth.user!.employeeId)
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

  public async view({ auth, request, response }: HttpContextContract) {
    const model = await RequestOvertime.query()
      .select(
        '*',
        'employees.name AS request_name',
        'request_overtimes.id',
        'request_overtimes.status',
        'projects.name AS project_name',
        'projects.status AS project_status'
      )
      .join('employees', 'employees.id', '=', 'request_overtimes.employee_id')
      .join('projects', 'projects.id', '=', 'request_overtimes.project_id')
      .preload('actionEmployee')
      .where('request_overtimes.id', request.param('id'))
      .firstOrFail()

    const workers = await ProjectAbsent.query()
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
      .where('project_absents.project_id', model.projectId)
      .andWhere({
        parent_id: auth.user!.employee.work.id,
        status: ProjectWorkerStatus.ACTIVE,
        absent: 'P',
        absent_at: model.absentAt,
      })

    model.$extras.total_worker = workers.length
    model.$extras.workers = workers
    model.totalEarn = model.totalEarn * workers.length
    return response.ok(
      model.serialize({
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
}

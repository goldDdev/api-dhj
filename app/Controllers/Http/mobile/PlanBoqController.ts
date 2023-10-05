import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import { schema } from '@ioc:Adonis/Core/Validator'
import PlanBoq from 'App/Models/PlanBoq'
import codeError from 'Config/codeError'

export default class PlanBoqController {
  public async index({ auth, response, request, month, year }: HttpContextContract) {
    const query = await PlanBoq.query()
      .select(
        'plan_boqs.project_boq_id',
        'plan_boqs.id',
        'project_boqs.name',
        'start_date',
        'end_date',
        'project_boqs.type_unit',
        'progress',
        'employee_id',
        'employees.name AS employee_name',
        'projects.name AS project_name'
      )

      .withScopes((scope) => {
        scope.withProjectBoqs()
        scope.withEmployee()
        scope.withProject()
      })
      .where('plan_boqs.project_id', request.param('id', 0))
      .if(request.input('name'), (query) => {
        query.whereILike('project_boqs.name', `%${request.input('name')}%`)
      })

      .if(
        request.input('all'),
        () => {},
        (query) => {
          query.andWhere('employee_id', auth.user!.employeeId)
        }
      )
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw(
            '(EXTRACT(MONTH FROM start_date) = :month OR EXTRACT(MONTH FROM end_date) = :month)',
            {
              month: request.input('month'),
            }
          )
        },
        (query) =>
          query.andWhereRaw(
            '(EXTRACT(MONTH FROM start_date) = :month OR EXTRACT(MONTH FROM end_date) = :month)',
            {
              month: month,
            }
          )
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw(
            '(EXTRACT(YEAR FROM start_date) = :year OR EXTRACT(YEAR FROM end_date) = :year)',
            {
              year: request.input('year'),
            }
          )
        },
        (query) =>
          query.andWhereRaw(
            '(EXTRACT(YEAR FROM start_date) = :year OR EXTRACT(YEAR FROM end_date) = :year)',
            {
              year: year,
            }
          )
      )

      .orderBy(request.input('orderBy', 'plan_boqs.id'), request.input('order', 'desc'))
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.ok(query.serialize().data)
  }

  public async create({ auth, response, request }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          projectId: schema.number(),
          projectBoqId: schema.number(),
          progress: schema.number(),
          startDate: schema.string(),
          endDate: schema.string(),
        }),
      })

      const check = await PlanBoq.query().first()
      if (check) {
      }

      await PlanBoq.create({
        employeeId: auth.user!.employeeId,
        projectId: payload.projectId,
        projectBoqId: payload.projectBoqId,
        progress: payload.progress,
        startDate: payload.startDate,
        endDate: payload.endDate,
      })

      return response.noContent()
    } catch (error) {
      Logger.info(error)
      return response.notFound({ code: codeError.badRequest, type: 'badRequest' })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await PlanBoq.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

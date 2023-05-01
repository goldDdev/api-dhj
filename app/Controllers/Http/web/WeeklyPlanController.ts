import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Boq from 'App/Models/Boq'
import Employee, { EmployeeType } from 'App/Models/Employee'
import Project from 'App/Models/Project'
import WeeklyPlans from 'App/Models/WeeklyPlan'
import { DateTime } from 'luxon'

export default class WeeklyPlanController {
  public async index({ response, month, year, request }: HttpContextContract) {
    const queryPlan = await WeeklyPlans.query()
      .select(['*', 'projects.name AS project_name', 'weekly_plans.id'])
      .withScopes((scope) => {
        scope.withProject()
        scope.withEmployee()
      })
      .if(request.input('name'), (query) =>
        query
          .whereILike('name', `%${request.input('name')}%`)
          .orWhereILike('typeUnit', `%${request.input('name')}%`)
      )
      .if(request.input('month', month), (query) => {
        query.andWhereRaw(
          '(EXTRACT(MONTH FROM start_date) = :month AND EXTRACT(YEAR FROM start_date) = :year) OR (EXTRACT(MONTH FROM end_date) = :month AND EXTRACT(YEAR FROM end_date) = :year)',
          {
            month: request.input('month', month),
            year: request.input('year', year),
          }
        )
      })
      .orderBy('start_date', 'asc')

    const newPlan = queryPlan.reduce((p: any[], n) => {
      const index = p.findIndex((v) => v && v.employeeId === n.employeeId)
      const startAt = DateTime.fromFormat(n.startDate, 'yyyy-MM-dd')
      const diff = DateTime.fromFormat(n.endDate, 'yyyy-MM-dd').diff(
        DateTime.fromFormat(n.startDate, 'yyyy-MM-dd'),
        'day'
      ).days

      const plans: any[] = []
      for (let i = 0; i <= diff; i++) {
        const day = startAt.plus({ day: i })
        const dayMonth = day.month
        if (dayMonth === +request.input('month', month)) {
          plans.push({
            startDate: n.startDate,
            endDate: n.endDate,
            projectName: n.serialize().projectName,
            projectId: n.projectId,
            id: n.id,
            day: day.day,
          })
        }
      }

      if (index > -1) {
        p[index]['plans'] = p[index]['plans'].concat(plans)
        p[index]['data'] = p[index]['data'].concat(n.serialize())
      } else {
        p.push({
          employeeId: n.employeeId,
          name: n.serialize().name,
          role: n.serialize().role,
          data: [n.serialize()],
          plans,
        })
      }

      return p
    }, [])
    return response.json({ data: newPlan })
  }

  public async projects({ response, request }: HttpContextContract) {
    return response.json({
      data: await Project.query()
        .select(['id', 'name'])
        .if(request.input('name'), (query) =>
          query.whereILike('name', `%${request.input('name')}%`)
        )
        .orderBy('id', 'desc'),
    })
  }

  public async employees({ response, request }: HttpContextContract) {
    return response.json({
      data: await Employee.query()
        .select(['id', 'name', 'role'])
        .if(request.input('name'), (query) =>
          query.whereILike('name', `%${request.input('name')}%`)
        )
        .whereNotIn('role', [
          EmployeeType.MANDOR,
          EmployeeType.STAFF,
          EmployeeType.WORKER,
          EmployeeType.ADMIN,
          EmployeeType.OWNER,
        ])
        .orderBy('id', 'desc'),
    })
  }

  public async store({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          employeeId: schema.number([]),
          projectId: schema.number([]),
          startDate: schema.string(),
          endDate: schema.string([]),
        }),
      })

      const model = await WeeklyPlans.create(payload)
      return response.created({ data: model.serialize() })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async validation({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          employeeId: schema.number([]),
          projectId: schema.number([]),
          startDate: schema.string(),
          endDate: schema.string([]),
        }),
      })

      return response.json({ error: [] })
    } catch (error) {
      return response.json({ error })
    }
  }

  public async show({ request, response }: HttpContextContract) {
    try {
      const boq = await Boq.findOrFail(request.param('id'))
      return response.created({ data: boq })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          employeeId: schema.number([]),
          projectId: schema.number([]),
          startDate: schema.string(),
          endDate: schema.string([]),
        }),
      })
      const { id, ...pyld } = payload
      const model = await WeeklyPlans.find(id)
      if (model) {
        await model.merge(pyld).save()
      }
      return response.status(200).json({ data: model })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const boq = await WeeklyPlans.findOrFail(request.param('id'))
      await boq.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

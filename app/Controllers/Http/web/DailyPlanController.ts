import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Employee, { EmployeeType } from 'App/Models/Employee'
import Project from 'App/Models/Project'
import DailyPlan from 'App/Models/DailyPlan'
import { DateTime } from 'luxon'
import Logger from '@ioc:Adonis/Core/Logger'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'

export default class DailyPlanController {
  public async index({ response, month, year, request }: HttpContextContract) {
    const queryPlan = await DailyPlan.query()
      .select(['*', 'projects.name AS project_name', 'daily_plans.id'])
      .withScopes((scope) => {
        scope.withProject()
        scope.withEmployee()
      })
      .if(request.input('name'), (query) =>
        query
          .whereILike('name', `%${request.input('name')}%`)
          .orWhereILike('typeUnit', `%${request.input('name')}%`)
      )
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw('EXTRACT(MONTH FROM date) = :month ', {
            month: request.input('month'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(MONTH FROM date) = :month ', {
            month: month,
          })
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw('EXTRACT(YEAR FROM date) = :year ', {
            year: request.input('year'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(YEAR FROM date) = :year ', {
            year: year,
          })
      )
      .orderBy('date', 'asc')

    const employees = queryPlan.reduce((p: any[], n) => {
      const index = p.findIndex((v) => v && v.employeeId === n.employeeId)
      if (index === -1) {
        p.push(n.serialize())
      }
      return p
    }, [])

    const newProjects = employees.map((value) => {
      const prj = queryPlan
        .filter((v) => v.employeeId === value.employeeId)
        .reduce((p: any[], n) => {
          const index = p.findIndex((v) => v && v.projectId === n.projectId)
          const startAt = DateTime.fromFormat(n.date, 'yyyy-MM-dd')

          if (index > -1) {
            p[index]['plans'] = p[index]['plans'].concat([
              {
                date: n.date,
                projectName: n.serialize().projectName,
                projectId: n.projectId,
                id: n.id,
                latitude: n.latitude,
                longitude: n.longitude,
                locationAt: n.locationAt,
                day: startAt.day,
              },
            ])
          } else {
            p.push({
              projectName: n.serialize().projectName,
              projectId: n.projectId,
              plans: [
                {
                  date: n.date,
                  projectName: n.serialize().projectName,
                  projectId: n.projectId,
                  id: n.id,
                  latitude: n.latitude,
                  longitude: n.longitude,
                  locationAt: n.locationAt,
                  day: startAt.day,
                },
              ],
            })
          }
          return p
        }, [])

      return {
        employeeId: value.employeeId,
        name: value.name,
        role: value.role,
        data: queryPlan.filter((v) => v.employeeId === value.employeeId),
        employees: prj,
      }
    })

    return response.json({ data: newProjects })
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
    const query = await Employee.query()
      .select(['id', 'name', 'role'])
      .if(request.input('name'), (query) => query.whereILike('name', `%${request.input('name')}%`))
      .whereNotIn('role', [
        EmployeeType.STAFF,
        EmployeeType.WORKER,
        EmployeeType.ADMIN,
        EmployeeType.OWNER,
      ])
      .orderBy('id', 'desc')
    return response.json({
      data: query.map((v) => v.serialize({ fields: { pick: ['id', 'name', 'role'] } })),
    })
  }

  public async store({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          employeeId: schema.number([]),
          projectId: schema.number([]),
          date: schema.string(),
        }),
      })

      const workers = await ProjectWorker.query()
        .where({ employee_id: payload.employeeId, project_id: payload.projectId })
        .first()

      const unique = await DailyPlan.query()
        .where({
          employeeId: request.input('employeeId', 0),
          projectId: request.input('projectId', 0),
          date: request.input('date'),
        })

        .if(request.input('id'), (query) => query.andWhereNot('id', request.input('id', 0)))
        .first()

      if (unique) {
        return response.json({
          error: {
            messages: {
              errors: [
                {
                  rule: 'unique',
                  field: 'employeeId',
                  message: 'unique',
                },
              ],
            },
          },
        })
      }

      const model = await DailyPlan.create(payload)
      if (!workers) {
        const emp = await Employee.find(payload.employeeId)
        if (emp) {
          await ProjectWorker.create({
            employeeId: payload.employeeId,
            projectId: payload.projectId,
            role: emp.role,
            status: ProjectWorkerStatus.ACTIVE,
            joinAt: DateTime.now(),
          })
        }
      }
      return response.created({ data: model.serialize() })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async validation({ request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          employeeId: schema.number(),
          projectId: schema.number([]),
          date: schema.string(),
        }),
      })

      const unique = await DailyPlan.query()
        .where({
          employeeId: request.input('employeeId', 0),
          projectId: request.input('projectId', 0),
          date: request.input('date'),
        })

        .if(request.input('id'), (query) => query.andWhereNot('id', request.input('id', 0)))
        .first()

      if (unique) {
        return response.json({
          error: {
            messages: {
              errors: [
                {
                  rule: 'unique',
                  field: 'employeeId',
                  message: 'unique',
                },
              ],
            },
          },
        })
      }

      return response.json({ error: [] })
    } catch (error) {
      Logger.error(error)
      return response.json({ error })
    }
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          employeeId: schema.number([]),
          projectId: schema.number([]),
          date: schema.string(),
        }),
      })
      const { id, ...pyld } = payload
      const model = await DailyPlan.find(id)
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
      const boq = await DailyPlan.findOrFail(request.param('id'))
      await boq.delete()
      return response.send(200)
    } catch (error) {
      return response.notFound({ error })
    }
  }
}

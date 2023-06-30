import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectProgres from 'App/Models/ProjectProgres'
import moment from 'moment'
import ProjectBoq from 'App/Models/ProjectBoq'
import { schema } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'
import PlanBoq from 'App/Models/PlanBoq'

export default class ProjectProgresController {
  public async index({ response, request }: HttpContextContract) {
    const query = await ProjectProgres.query()
      .select(
        'project_progres.id',
        'project_progres.project_boq_id',
        'project_boqs.name',
        'project_boqs.type_unit',
        'progres',
        'progres_at',
        'submited_progres',
        'project_progres.created_at',
        'employees.name AS submited_name'
      )
      .join('project_boqs', 'project_boqs.id', 'project_progres.project_boq_id')
      .join('users', 'users.id', 'project_progres.submited_by')
      .join('employees', 'employees.id', 'users.employee_id')
      .where('project_progres.project_id', request.param('id'))
      .if(request.input('pboid'), (query) => {
        query.andWhere('project_boqs.id', request.input('pboid'))
      })
      .if(request.input('name'), (query) => {
        query.whereILike('project_boqs.name', `%${request.input('name')}%`)
      })
      .orderBy(request.input('orderBy', 'project_progres.id'), request.input('order', 'desc'))
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.ok(query)
  }

  public async all({ year, month, response, request }: HttpContextContract) {
    const boq = await ProjectBoq.query()
      .select('project_boqs.name', 'project_boqs.id', 'project_boqs.type_unit', 'project_boqs.type')
      .where('project_id', request.param('id'))

    const query = await Database.query()
      .from('project_progres')
      .select(
        'project_progres.id',
        'project_progres.project_boq_id',
        'project_boqs.name',
        'project_boqs.type_unit',
        'project_boqs.type',
        'progres',
        'progres_at',
        'submited_progres',
        'project_progres.created_at',
        'submit.name AS submited_name',
        'aprove.name AS aprove_name'
      )
      .join('project_boqs', 'project_boqs.id', 'project_progres.project_boq_id')
      .joinRaw(
        'LEFT JOIN (SELECT name, users.id FROM users INNER JOIN employees ON employees.id = users.employee_id) AS submit ON submit.id = project_progres.submited_by'
      )
      .joinRaw(
        'LEFT JOIN (SELECT name, users.id FROM users INNER JOIN employees ON employees.id = users.employee_id) AS aprove ON aprove.id = project_progres.aproved_by'
      )
      .where('project_progres.project_id', request.param('id'))
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw('EXTRACT(MONTH FROM project_progres.progres_at) = :month ', {
            month: request.input('month'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(MONTH FROM project_progres.progres_at) = :month ', {
            month: month,
          })
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw('EXTRACT(YEAR FROM project_progres.progres_at) = :year ', {
            year: request.input('year'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(YEAR FROM project_progres.progres_at) = :year ', {
            year: year,
          })
      )
      .if(request.input('id'), (query) => {
        query.andWhere('project_absents.project_id', request.input('id'))
      })

    const queryPlan = await PlanBoq.query()
      .select('*', 'employees.name AS plan_by', 'plan_boqs.id')
      .withScopes((scope) => scope.withEmployee())
      .where('plan_boqs.project_id', request.param('id'))
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

    const newData = query.map((n) => ({
      id: n.id,
      createdAt: n.created_at,
      progresAt: DateTime.fromJSDate(n.progres_at, { zone: 'UTC+7' }).toFormat('yyyy-MM-dd'),
      submitedProgres: n.submited_progres,
      progres: n.progres,
      submitedName: n.submited_name,
      aproveName: n.aprove_name,
      projectBoqId: n.project_boq_id,
      day: +moment(n.progres_at).format('D'),
    }))

    const newPlan = queryPlan.reduce((p: any[], n) => {
      const startAt = DateTime.fromFormat(n.startDate, 'yyyy-MM-dd')
      const diff = DateTime.fromFormat(n.endDate, 'yyyy-MM-dd').diff(
        DateTime.fromFormat(n.startDate, 'yyyy-MM-dd'),
        'day'
      ).days

      for (let i = 0; i <= diff; i++) {
        const day = startAt.plus({ day: i })
        const dayMonth = day.month
        if (dayMonth === +request.input('month', month)) {
          p.push({ ...n.serialize(), day: day.day })
        }
      }
      return p
    }, [])

    return response.ok({
      data: boq.map((v) => ({
        ...v.serialize(),
        data: newData.filter((f) => f.projectBoqId === v.id),
        plans: newPlan.filter((f) => f.projectBoqId === v.id),
      })),
    })
  }

  public async update({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          progres: schema.number(),
        }),
      })

      const boq = await ProjectProgres.find(payload.id)
      if (boq) {
        await boq.merge({ progres: payload.progres, submitedProgres: payload.progres }).save()
      }
      return response.status(200).json({ data: boq })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async confirm({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
        }),
      })

      const boq = await ProjectProgres.find(payload.id)
      if (boq) {
        await boq.merge({ aprovedBy: auth.user?.id }).save()
      }
      return response.status(200).json({ data: boq })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async delete({ request, response }: HttpContextContract) {
    try {
      const boq = await ProjectProgres.find(request.param('id', 0))
      if (boq) {
        await boq.delete()
      }
      return response.status(200).json({ data: request.param('id', 0) })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

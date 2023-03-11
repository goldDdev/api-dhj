import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import ProjectAbsent, { AbsentType } from 'App/Models/ProjectAbsent'
import codeError from 'Config/codeError'
import moment from 'moment'
import Logger from '@ioc:Adonis/Core/Logger'

export default class ProjectsController {
  public async index({ auth, response, request }: HttpContextContract) {
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
        month: request.input('month', moment().month() + 1),
      })
      .andHavingRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
        year: request.input('year', moment().year()),
      })
      .if(request.input('projectId'), (query) => {
        query.andHaving('project_absents.project_id', '=', request.input('projectId'))
      })

    return response.ok({
      data: query,
    })
  }

  public async current({ auth, response }: HttpContextContract) {
    const currentDate = moment().format('yyyy-MM-DD')
    const model = await ProjectAbsent.query()
      .select(
        '*',
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
      .preload('replaceEmployee')
      .where('project_absents.project_id', auth.user!.employee.work.projectId)
      .andWhere('project_workers.parent_id', auth.user!.employee.work.id)
      .andWhere('absent_at', currentDate)

    const summary = model.reduce(
      (p, n) => ({
        present: p.present + Number(n.absent === AbsentType.P),
        absent: p.absent + Number(n.absent === AbsentType.A),
        noAbsent: p.noAbsent + Number(n.absent === null),
      }),
      { present: 0, absent: 0, noAbsent: 0 }
    )
    summary['total'] = model.length

    return response.ok({
      data: {
        absentAt: currentDate,
        summary,
        members: model.map((v) =>
          v.serialize({
            fields: {
              omit: ['created_at', 'updated_at', 'latitude', 'longitude'],
            },
          })
        ),
      },
    })
  }

  public async create({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const currentDate = moment().format('yyyy-MM-DD')
      request.updateBody({
        absentAt: currentDate,
      })

      if (auth.user) {
        await request.validate({
          schema: schema.create({
            absentAt: schema.date({}, [
              rules.unique({
                table: 'project_absents',
                column: 'absent_at',
                where: {
                  project_id: auth.user?.employee.work.projectId,
                  absent_by: auth.user?.employeeId,
                },
              }),
            ]),
          }),
        })

        const model = auth.user.employee.work
        await model?.load('members')
        const data = model?.members.map((value) => ({
          absentAt: currentDate,
          absentBy: auth.user?.employeeId,
          projectId: value.projectId,
          employeeId: value.employeeId,
        }))

        const absents = await ProjectAbsent.createMany(data, { client: trx })
        await trx.commit()
        return response.created({
          data: absents,
        })
      }
      await trx.rollback()
    } catch (error) {
      await trx.rollback()
      return response.ok({
        error: [
          {
            code: codeError.exists,
            fields: 'absentAt',
            type: 'exists',
            value: request.input('absentAt'),
          },
        ],
      })
    }
  }

  public async addCome({ auth, request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          absent: schema.string(),
          comeAt: schema.string(),
          latitude: schema.number.optional(),
          longitude: schema.number.optional(),
        }),
      })

      const { id, ...body } = payload
      const model = await ProjectAbsent.findOrFail(id)
      if (model) {
        await model.merge({ absentBy: auth.user?.employeeId, ...body }).save()
      }
      return response.ok({ data: payload })
    } catch (error) {
      Logger.info(error)
      return response.unprocessableEntity({ error })
    }
  }

  public async addClose({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          closeAt: schema.string(),
        }),
      })

      const { id, closeAt } = payload
      const model = await ProjectAbsent.findOrFail(id)
      if (model) {
        await model.merge({ closeAt }).save()
      }
      return response.ok({ data: payload })
    } catch (error) {
      Logger.info(error)
      return response.unprocessableEntity({ error })
    }
  }
}

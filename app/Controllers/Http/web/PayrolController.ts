import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee from 'App/Models/Employee'
import Logger from '@ioc:Adonis/Core/Logger'
import Payrol from 'App/Models/Payrol'
export default class PayrolController {
  public async index({ month, year, request, response }: HttpContextContract) {
    const query = await Payrol.query()
      .select('*', 'payrols.id')
      .where({ month: request.input('month', month), year: request.input('year', year) })
      .withScopes((scope) => scope.withEmployee())
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.ok(query)
  }

  public async view({ request, response }: HttpContextContract) {
    const query = await Payrol.firstOrFail(request.param('id'))
    await query.load('employee')
    return response.ok({
      data: query.serialize(),
    })
  }

  public async create({ request, response }: HttpContextContract) {
    try {
      // const payload = await request.validate({
      //   schema: schema.create({
      //     employeeId: schema.number.optional(),
      //     salary: schema.number.optional(),
      //     hourlyWages: schema.number.optional(),
      //     total: schema.number.optional(),
      //     duration: schema.number.optional(),
      //     month: schema.number.optional(),
      //     year: schema.number.optional(),
      //     payAt: schema.string.optional(),
      //     overtimePrice: schema.number.optional(),
      //     latePrice: schema.number.optional(),
      //     totalPresent: schema.number.optional(),
      //     totalAbsent: schema.number.optional(),
      //     totalOvertime: schema.number.optional(),
      //     totalLate: schema.number.optional(),
      //     totalOvertimeDuration: schema.number.optional(),
      //     totalLateDuration: schema.number.optional(),
      //     otherCut: schema.number.optional(),
      //     salaryCut: schema.number.optional(),
      //     otherAdditional: schema.number.optional(),
      //     status: schema.string.optional(),
      //     note: schema.string.optional(),
      //     noteOtherCut: schema.string.optional(),
      //     noteOtherAdditional: schema.string.optional(),
      //   }),
      // })

      return response.created({
        data: request.all(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async employee({ month, year, request, response }: HttpContextContract) {
    const emp = await Employee.findOrFail(request.param('id'))
    const report = await Database.from('project_absents')
      .select(
        Database.raw('SUM(late_duration)::int AS "totalLateDuration"'),
        Database.raw('SUM(late_price)::int AS "totalLatePrice"'),
        Database.raw('SUM(duration)::int AS "totalDuration"'),
        Database.raw('SUM(CASE WHEN absent = \'P\' THEN 1 ELSE 0 END)::int AS "totalPresent"'),
        Database.raw('SUM(CASE WHEN absent != \'P\' THEN 1 ELSE 0 END)::int AS "totalAbsent"'),
        Database.raw("MIN(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS start"),
        Database.raw("MAX(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS end")
      )
      .joinRaw(
        'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .where({
        ['project_absents.employee_id']: request.param('id', 0),
      })
      .first()

    const absent = await Database.from('project_absents')
      .select(
        Database.raw('COALESCE(SUM(late_duration),0)::int AS "totalLateDuration"'),
        Database.raw('COALESCE(SUM(late_price),0)::int AS "totalLatePrice"'),
        Database.raw('COALESCE(SUM(duration),0)::int AS "totalDuration"'),
        Database.raw(
          'COALESCE(SUM(CASE WHEN absent = \'P\' THEN 1 ELSE 0 END),0)::int AS "totalPresent"'
        ),
        Database.raw(
          'COALESCE(SUM(CASE WHEN absent != \'P\' THEN 1 ELSE 0 END),0)::int AS "totalAbsent"'
        ),
        Database.raw("MIN(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS start"),
        Database.raw("MAX(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS end")
      )
      .joinRaw(
        'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .where({
        ['project_absents.employee_id']: request.param('id', 0),
      })
      .andWhereRaw('EXTRACT(MONTH FROM project_absents.absent_at) = :month ', {
        month: request.input('month', month),
      })
      .andWhereRaw('EXTRACT(YEAR FROM project_absents.absent_at) = :year ', {
        year: request.input('year', year),
      })
      .first()

    // const report = await Database.from('additional_hours')
    // .select(
    //   Database.raw('SUM(late_duration)::int AS "totalLateDuration"'),
    //   Database.raw('SUM(late_price)::int AS "totalLatePrice"'),
    //   Database.raw('SUM(duration)::int AS "totalDuration"'),
    //   Database.raw('SUM(CASE WHEN absent = \'P\' THEN 1 ELSE 0 END)::int AS "totalPresent"'),
    //   Database.raw('SUM(CASE WHEN absent != \'P\' THEN 1 ELSE 0 END)::int AS "totalAbsent"'),
    //   Database.raw("MIN(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS start"),
    //   Database.raw("MAX(TO_CHAR(absent_at, 'YYYY-MM-DD')) AS end")
    // )
    // .joinRaw(
    //   'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
    // )
    // .where({
    //   ['project_absents.employee_id']: request.param('id', 0),
    // })

    return response.ok({
      data: {
        ...emp.serialize(),
        report,
        absent,
      },
      // data: query.map((v) =>
      //   v.serialize({
      //     fields: {
      //       omit: ['updated_at', 'created_at', 'employeeId', 'latitude', 'longitude'],
      //     },
      //   })
      // ),
    })
  }

  public async employeeAll({ month, year, request, response }: HttpContextContract) {
    const exsitId = await Database.from('payrols')
      .select('employee_id')
      .where({ month: request.input('month', month), year: request.input('year', year) })

    const absent = await Database.from('project_absents')
      .select(
        'project_absents.employee_id AS id',
        'employees.name',
        'project_workers.role',
        Database.raw('"employees"."salary"::int'),
        Database.raw('COALESCE(SUM(late_duration),0)::int AS "totalLateDuration"'),
        Database.raw('COALESCE(SUM(late_price),0)::int AS "totalLatePrice"'),
        Database.raw('COALESCE(SUM(duration),0)::int AS "totalDuration"'),
        Database.raw(
          'COALESCE(SUM(CASE WHEN absent = \'P\' THEN 1 ELSE 0 END),0)::int AS "totalPresent"'
        ),
        Database.raw(
          'COALESCE(SUM(CASE WHEN absent != \'P\' THEN 1 ELSE 0 END),0)::int AS "totalAbsent"'
        ),
        Database.raw("MIN(TO_CHAR(project_absents.absent_at, 'YYYY-MM-DD')) AS start"),
        Database.raw("MAX(TO_CHAR(project_absents.absent_at, 'YYYY-MM-DD')) AS end"),
        Database.raw('COALESCE(SUM(total_earn),0)::int AS "totalEarn"'),
        Database.raw('COALESCE(SUM(overtime_duration),0)::int AS "totalOvertimeDuration"')
      )
      .join('employees', 'employees.id', 'project_absents.employee_id')
      .joinRaw(
        'LEFT JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .joinRaw(
        "LEFT JOIN (SELECT employee_id, absent_at, total_earn, overtime_duration FROM additional_hours WHERE status = 'CONFIRM') AS ah ON ah.employee_id = project_absents.employee_id AND ah.absent_at = project_absents.absent_at"
      )
      .whereNotIn(
        'project_absents.employee_id',
        exsitId.map((v) => v.employee_id)
      )
      .andWhereRaw('EXTRACT(MONTH FROM project_absents.absent_at) = :month', {
        month: request.input('month', month),
      })
      .andWhereRaw('EXTRACT(YEAR FROM project_absents.absent_at) = :year ', {
        year: request.input('year', year),
      })
      .if(request.input('role'), (query) => {
        query.andWhereIn('employees.role', request.input('role'))
      })
      .if(request.input('ids'), (query) => {
        query.andWhereIn('project_absents.employee_id', request.input('role'))
      })
      .orderByRaw(
        "CASE WHEN project_workers.role = 'WORKER' THEN 3 WHEN project_workers.role = 'MANDOR' THEN 2 ELSE 1 END ASC"
      )
      .groupBy(
        'project_absents.employee_id',
        'employees.name',
        'project_workers.role',
        'employees.salary'
      )

    return response.ok({
      data: absent,
    })
  }

  public async addMulti({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          month: schema.number(),
          year: schema.number(),
          items: schema.array().anyMembers(),
        }),
      })

      const absent = await Database.from('project_absents')
        .select(
          'project_absents.employee_id',
          'project_workers.role',
          Database.raw('"employees"."salary"::int'),
          Database.raw('COALESCE(SUM(late_duration),0)::int AS "totalLateDuration"'),
          Database.raw('COALESCE(SUM(late_price),0)::int AS "totalLatePrice"'),
          Database.raw('COALESCE(SUM(duration),0)::int AS duration'),
          Database.raw(
            'COALESCE(SUM(CASE WHEN absent = \'P\' THEN 1 ELSE 0 END),0)::int AS "totalPresent"'
          ),
          Database.raw(
            'COALESCE(SUM(CASE WHEN absent != \'P\' THEN 1 ELSE 0 END),0)::int AS "totalAbsent"'
          ),
          Database.raw('COALESCE(SUM(total_earn),0)::int AS "totalOvertimePrice"'),
          Database.raw('COALESCE(SUM(overtime_duration),0)::int AS "totalOvertimeDuration"')
        )
        .join('employees', 'employees.id', 'project_absents.employee_id')
        .joinRaw(
          'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
        )
        .joinRaw(
          "LEFT JOIN (SELECT employee_id, absent_at, total_earn, overtime_duration FROM additional_hours WHERE status = 'CONFIRM') AS ah ON ah.employee_id = project_absents.employee_id AND ah.absent_at = project_absents.absent_at"
        )
        .whereIn(
          'project_absents.employee_id',
          payload.items.map((v) => v.id)
        )
        .andWhereRaw('EXTRACT(MONTH FROM project_absents.absent_at) = :month', {
          month: payload.month,
        })
        .andWhereRaw('EXTRACT(YEAR FROM project_absents.absent_at) = :year ', {
          year: payload.year,
        })

        .groupBy('project_absents.employee_id', 'employees.salary', 'project_workers.role')

      const model = await Payrol.createMany(
        absent.map((value) => {
          let otherCut = 0
          let noteOtherCut = ''
          let otherAdditional = 0
          let noteOtherAdditional = 0

          const find = payload.items.find((v) => v.id === value.employee_id)
          if (find) {
            otherCut = find.otherCut
            noteOtherCut = find.noteOtherCut
            otherAdditional = find.otherAdditional
            noteOtherAdditional = find.noteOtherAdditional
          }

          return {
            ...value,
            month: payload.month,
            year: payload.year,
            total:
              value.salary +
              value.totalOvertimePrice +
              otherAdditional -
              (value.totalLatePrice + otherCut),

            otherAdditional,
            otherCut,
            noteOtherAdditional,
            noteOtherCut,
          }
        })
      )

      return response.json({ data: model })
    } catch (err) {
      Logger.info(err)
      return response.unprocessableEntity({ error: err })
    }
  }
}

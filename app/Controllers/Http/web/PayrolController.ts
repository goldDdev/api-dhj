import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee from 'App/Models/Employee'
import ProjectAbsent from 'App/Models/ProjectAbsent'

export default class PayrolController {
  public async create({ request, response }: HttpContextContract) {
    try {
      const payload = await request.validate({
        schema: schema.create({
          employeeId: schema.number.optional(),
          salary: schema.number.optional(),
          hourlyWages: schema.number.optional(),
          total: schema.number.optional(),
          duration: schema.number.optional(),
          month: schema.number.optional(),
          year: schema.number.optional(),
          payAt: schema.string.optional(),
          overtimePrice: schema.number.optional(),
          latePrice: schema.number.optional(),
          totalPresent: schema.number.optional(),
          totalAbsent: schema.number.optional(),
          totalOvertime: schema.number.optional(),
          totalLate: schema.number.optional(),
          totalOvertimeDuration: schema.number.optional(),
          totalLateDuration: schema.number.optional(),
          otherCut: schema.number.optional(),
          salaryCut: schema.number.optional(),
          otherAdditional: schema.number.optional(),
          status: schema.string.optional(),
          note: schema.string.optional(),
          noteOtherCut: schema.string.optional(),
          noteOtherAdditional: schema.string.optional(),
        }),
      })

      return response.created({
        data: request.all(),
      })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
  public async employee({ auth, month, year, request, response }: HttpContextContract) {
    const emp = await Employee.findOrFail(request.param('id'))
    const query = await ProjectAbsent.query().where({ employee_id: request.param('id', 0) })

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

  public async employeeAll({ auth, month, year, request, response }: HttpContextContract) {
    // const emp = await Employee.findOrFail(request.param('id'))
    const query = await ProjectAbsent.query().where({ employee_id: request.param('id', 0) })

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
        'employees.name',
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
      .join('employees', 'employees.id', 'project_absents.employee_id')
      .joinRaw(
        'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      // .where({
      //   ['project_absents.employee_id']: request.param('id', 0),
      // })
      .andWhereRaw('EXTRACT(MONTH FROM project_absents.absent_at) = :month ', {
        month: request.input('month', month),
      })
      .andWhereRaw('EXTRACT(YEAR FROM project_absents.absent_at) = :year ', {
        year: request.input('year', year),
      })
      .groupBy('project_absents.employee_id', 'employees.name')

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
        // ...emp.serialize(),
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
}

// @ts-nocheck
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Employee, { EmployeeType } from 'App/Models/Employee'
import Project from 'App/Models/Project'
import ProjectAbsent from 'App/Models/ProjectAbsent'
import ProjectWorker, { ProjectWorkerStatus } from 'App/Models/ProjectWorker'

export default class EmployeesController {
  public async index({ response, request }: HttpContextContract) {
    return response.send(
      await Employee.query()
        .select([
          'employees.id',
          'name',
          'phoneNumber',
          'role',
          'card_id',
          'inactive_at',
          'users.email',
        ])
        .leftJoin('users', 'users.employee_id', 'employees.id')
        .where('role', 'NOT IN', ['ADMIN', 'OWNER', 'PM', 'PCC', 'QCC', 'SUP'])

        .if(request.input('name'), (query) =>
          query.andWhereILike('name', `%${request.input('name')}%`)
        )
        .if(request.input('role'), (query) => query.andWhere('role', request.input('role')))
        .if(request.input('type'), (query) => {
          if (request.input('type') === 'lead') {
            query.andWhereNotIn('role', ['WORKER', 'STAFF'])
          } else {
            query.andWhereIn('role', ['WORKER', 'STAFF'])
          }
        })
        .if(request.input('except'), async (query) => {
          const model = await ProjectWorker.query().where({
            project_id: request.input('except'),
            status: ProjectWorkerStatus.ACTIVE,
          })
          query.andWhereNotIn(
            'employees.id',
            model.map((v) => v.employeeId)
          )
        })
        .if(request.input('status'), (query) => {
          if (request.input('status') === 'ACTIVE') {
            query.andWhereNull('inactive_at')
          } else {
            query.andWhereNotNull('inactive_at')
          }
        })
        .orderBy('id', 'desc')
        .paginate(request.input('page', 1), request.input('perPage', 15))
    )
  }

  public async view({ auth, request, response }: HttpContextContract) {
    try {
      const employee = await Employee.query()
        .where('id', request.param('id'))
        .preload('user')
        .firstOrFail()
      return response.created({ data: employee })
    } catch (error) {
      return response.notFound({ error })
    }
  }

  public async create({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const payload = await request.validate({
        schema: schema.create({
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
            }),
          ]),
          cardID: schema.string([
            rules.minLength(8),
            rules.unique({
              table: 'employees',
              column: 'card_id',
            }),
          ]),
          role: schema.string(),
          hourlyWages: schema.number.optional(),
          salary: schema.number.optional(),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
              },
            }),
          ]),
        }),
      })

      const { email, ...emp } = payload
      const model = await Employee.create(emp, { client: trx })
      if (payload.role !== EmployeeType.WORKER) {
        await model.related('user').create({ email, password: model.phoneNumber })
      }
      await trx.commit()
      return response.created({ data: { ...model.serialize(), email } })
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const payload = await request.validate({
        schema: schema.create({
          id: schema.number(),
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
              whereNot: {
                id: request.input('id'),
              },
            }),
          ]),
          cardID: schema.string([
            rules.unique({
              table: 'employees',
              column: 'card_id',
              whereNot: {
                id: request.input('id'),
              },
            }),
          ]),
          role: schema.string(),
          hourlyWages: schema.number.optional(),
          salary: schema.number.optional(),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
                employee_id: request.input('id'),
              },
            }),
          ]),
        }),
      })

      const { email, ...emp } = payload
      const model = await Employee.find(request.input('id'), { client: trx })
      if (model) {
        const current = model
        await model.load('user')
        await model.merge(emp).save()
        if (email) {
          await model.user.merge({ email }).save()
        }
        await trx.commit()
        return response
          .status(200)
          .json({ data: { ...current.serialize(), email: model.user.email } })
      }
    } catch (error) {
      await trx.rollback()
      return response.unprocessableEntity({ error })
    }
  }

  public async status({ auth, request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          id: schema.number([rules.exists({ table: 'employees', column: 'id' })]),
          inactiveNote: schema.string.nullable(),
        }),
      })

      const employee = await Employee.find(request.input('id'))
      if (employee) {
        // employee.inactiveAt = employee.inactiveAt ? null : moment().format()
        employee.inactiveNote = request.input('inactiveNote')
        await employee.save()
      }
      return response.status(200).json({ data: employee })
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async project({ response, request }: HttpContextContract) {
    const query = await Project.query()
      .select('*', 'projects.id', 'project_workers.status')
      .join('project_workers', 'projects.id', 'project_workers.project_id')
      .where({ employee_id: request.param('id', 0) })
      .orderBy('projects.id', 'desc')
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.ok(
      query.serialize({
        fields: {
          pick: ['id', 'name', 'status', 'companyName', 'location'],
        },
      })
    )
  }

  public async absent({ response, request }: HttpContextContract) {
    const query = await ProjectAbsent.query()
      .select(
        'project_absents.id',
        'project_absents.project_id',
        'projects.name AS project_name',
        'projects.status AS project_status',
        'projects.company_name AS project_company',
        'projects.location AS project_location',
        'project_absents.absent_at',
        'project_absents.come_at',
        'project_absents.close_at',
        'project_absents.late_duration',
        'project_absents.late_price',
        'project_absents.duration',
        'project_absents.absent'
      )
      .join('projects', 'projects.id', 'project_absents.project_id')
      .where({ employee_id: request.param('id', 0) })
      .orderBy('project_absents.id', 'desc')
      .paginate(request.input('page', 1), request.input('perPage', 15))

    return response.ok(query.serialize())
  }

  public async destroy({ request, response }: HttpContextContract) {
    try {
      const model = await Employee.findOrFail(request.param('id'))
      await model.delete()
      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }

  public async validation({ auth, request, response }: HttpContextContract) {
    try {
      await request.validate({
        schema: schema.create({
          id: schema.number.optional(),
          name: schema.string([rules.minLength(3)]),
          phoneNumber: schema.string([
            rules.minLength(10),
            rules.unique({
              table: 'employees',
              column: 'phone_number',
              whereNot: {
                id: request.input('id', 0),
              },
            }),
          ]),
          cardID: schema.string([
            rules.minLength(8),
            rules.unique({
              table: 'employees',
              column: 'card_id',
              whereNot: {
                id: request.input('id', 0),
              },
            }),
          ]),
          role: schema.string(),
          hourlyWages: schema.number.optional(),
          salary: schema.number.optional(),
          email: schema.string.optional([
            rules.unique({
              table: 'users',
              column: 'email',
              whereNot: {
                email: null,
                employee_id: request.input('id', 0),
              },
            }),
          ]),
        }),
      })

      return response.noContent()
    } catch (error) {
      return response.unprocessableEntity({ error })
    }
  }
}

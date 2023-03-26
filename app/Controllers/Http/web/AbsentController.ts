import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import moment from 'moment'

export default class AbsentController {
  public async index({ response, request }: HttpContextContract) {
    const model = await Database.query()
      .from('project_absents')
      .select(
        Database.raw("TO_CHAR(absent_at, 'YYYY-MM-DD') as absent_at"),
        'employees.name',
        'project_absents.employee_id',
        'project_absents.absent',
        'project_workers.role',
        'come_at',
        'close_at'
      )
      .join('employees', 'employees.id', '=', 'project_absents.employee_id')
      .joinRaw(
        'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
      )
      .if(
        request.input('month'),
        (query) => {
          query.andWhereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
            month: request.input('month'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(MONTH FROM absent_at) = :month ', {
            month: moment().month() + 1,
          })
      )
      .if(
        request.input('year'),
        (query) => {
          query.andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
            year: request.input('year'),
          })
        },
        (query) =>
          query.andWhereRaw('EXTRACT(YEAR FROM absent_at) = :year ', {
            year: moment().year(),
          })
      )
      .if(request.input('id'), (query) => {
        query.andWhere('project_absents.project_id', request.input('id'))
      })
      .orderBy('parent_id', 'desc')

    return response.ok({
      data: model.reduce((group: any[], absent: any) => {
        const index = group.findIndex((v) => v && v.employeeId === absent.employee_id)
        if (index > -1) {
          group[index]['data'].push({
            absent: absent.absent,
            absentAt: absent.absent_at,
            comeAt: absent.come_at,
            closeAt: absent.close_at,
            day: +moment(absent.absent_at).format('D'),
          })
        } else {
          group.push({
            name: absent.name,
            employeeId: absent.employee_id,
            role: absent.role,
            data: [
              {
                absent: absent.absent,
                absentAt: absent.absent_at,
                comeAt: absent.come_at,
                closeAt: absent.close_at,
                day: +moment(absent.absent_at).format('D'),
              },
            ],
          })
        }
        return group
      }, []),
    })
  }
}

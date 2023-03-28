import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ProjectProgres from 'App/Models/ProjectProgres'

export default class ProjectProgresController {
  public async index({ response, request }: HttpContextContract) {
    const query = await ProjectProgres.query()
      .select(
        'project_progres.id',
        'project_progres.project_boq_id',
        'project_boqs.name',
        'project_boqs.type_unit',
        'progres',
        'submited_progres',
        'project_progres.created_at',
        'employees.name AS submited_name'
      )
      .join('project_boqs', 'project_boqs.id', 'project_progres.project_boq_id')
      .join('bill_of_quantities', 'bill_of_quantities.id', 'project_boqs.boq_id')
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
}

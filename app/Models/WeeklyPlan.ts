import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column, scope } from '@ioc:Adonis/Lucid/Orm'
import Employee from './Employee'
import Project from './Project'
import moment from 'moment'

export default class WeeklyPlans extends BaseModel {
  public static table = 'weekly_plans'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({
    columnName: 'start_date',
    serializeAs: 'startDate',
    consume: (value) => moment(value).format('yyyy-MM-DD'),
  })
  public startDate: string

  @column({
    columnName: 'end_date',
    serializeAs: 'endDate',
    consume: (value) => moment(value).format('yyyy-MM-DD'),
  })
  public endDate: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>

  public serializeExtras() {
    return {
      name: this.$extras.name,
      cardID: this.$extras.card_id,
      phoneNumber: this.$extras.phone_number,
      role: this.$extras.role,
      projectName: this.$extras.project_name,
      projectStatus: this.$extras.project_status,
      projectCompany: this.$extras.project_company,
      projectLocation: this.$extras.project_location,
    }
  }

  public static withEmployee = scope((query) => {
    query.join('employees', 'employees.id', '=', 'weekly_plans.employee_id')
  })

  public static withProject = scope((query) => {
    query.join('projects', 'projects.id', '=', 'weekly_plans.project_id')
  })
}

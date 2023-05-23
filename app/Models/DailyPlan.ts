import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column, scope } from '@ioc:Adonis/Lucid/Orm'
import Employee from './Employee'
import Project from './Project'
import moment from 'moment'

export default class DailyPlan extends BaseModel {
  public static table = 'daily_plans'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({
    columnName: 'date',
    consume: (value) => moment(value).format('yyyy-MM-DD'),
  })
  public date: string

  @column({ columnName: 'location_at', serializeAs: 'locationAt' })
  public locationAt: string

  @column({ consume: (value) => parseFloat(value) })
  public latitude: number

  @column({ consume: (value) => parseFloat(value) })
  public longitude: number

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
    query.join('employees', 'employees.id', '=', 'daily_plans.employee_id')
  })

  public static withProject = scope((query) => {
    query.join('projects', 'projects.id', '=', 'daily_plans.project_id')
  })
}

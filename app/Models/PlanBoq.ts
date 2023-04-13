import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import moment from 'moment'

export default class PlanBoq extends BaseModel {
  public static table = 'plan_boqs'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_boq_id', serializeAs: 'projectBoqId' })
  public projectBoqId: number

  @column({ consume: (value) => +value })
  public progress: number

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

  public serializeExtras() {
    return {
      name: this.$extras.name,
      typeUnit: this.$extras.type_unit,
    }
  }
}

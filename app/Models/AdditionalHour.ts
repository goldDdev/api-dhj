import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import moment from 'moment'
import Employee from './Employee'
import Project from './Project'

export enum AdditionalStatus {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
  PENDING = 'PENDING',
}

export default class AdditionalHour extends BaseModel {
  public static table = 'additional_hours'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({
    columnName: 'absent_at',
    serializeAs: 'absentAt',
    consume: (value) => moment(value).format('yyyy-MM-DD'),
  })
  public absentAt: string

  @column({ columnName: 'come_at', serializeAs: 'comeAt' })
  public comeAt: string

  @column({ columnName: 'close_at', serializeAs: 'closeAt' })
  public closeAt: string

  @column({
    columnName: 'overtime_duration',
    serializeAs: 'overtimeDuration',
    consume: (value) => +value,
  })
  public overtimeDuration: number

  @column({
    columnName: 'overtime_price',
    serializeAs: 'overtimePrice',
    consume: (value) => +value,
  })
  public overtimePrice: number

  @column({ columnName: 'total_earn', serializeAs: 'totalEarn', consume: (value) => +value })
  public totalEarn: number

  @column({ columnName: 'request_by', serializeAs: 'requestBy' })
  public requestBy: number

  @column({ columnName: 'action_by', serializeAs: 'actionBy' })
  public actionBy: number

  @column()
  public status: string

  @column({ columnName: 'note', serializeAs: 'note' })
  public note: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'actionBy',
  })
  public actionEmployee: BelongsTo<typeof Employee>

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'requestBy',
  })
  public requestEmployee: BelongsTo<typeof Employee>

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>

  public serializeExtras() {
    return {
      name: this.$extras.name,
      cardID: this.$extras.cardID,
      phoneNumber: this.$extras.phoneNumber,
      role: this.$extras.role,
    }
  }
}

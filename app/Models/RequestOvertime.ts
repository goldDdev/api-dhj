import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import moment from 'moment'
import Employee from './Employee'
import Project from './Project'

export enum RequestOTStatus {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
  PENDING = 'PENDING',
}

export enum OTType {
  PERSONAL = 'PERSONAL',
  TEAM = 'TEAM',
}

export default class RequestOvertime extends BaseModel {
  public static table = 'request_overtimes'

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

  @column({ columnName: 'action_by', serializeAs: 'actionBy' })
  public actionBy: number

  @column({ columnName: 'request_by', serializeAs: 'requestBy' })
  public requestBy: number

  @column({ columnName: 'confirm_by', serializeAs: 'confirmBy' })
  public confirmBy: number

  @column()
  public type: string

  @column()
  public status: string

  @column({ columnName: 'confirm_status', serializeAs: 'confirmStatus' })
  public confirmStatus: string

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
    foreignKey: 'confirmBy',
  })
  public confirmEmployee: BelongsTo<typeof Employee>

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>

  public serializeExtras() {
    return {
      requestName: this.$extras.request_name,
      requestRole: this.$extras.request_role,
      employeeName: this.$extras.employee_name,
      employeeRole: this.$extras.employee_role,
      cardID: this.$extras.card_id,
      phoneNumber: this.$extras.phone_number,
      role: this.$extras.role,
      projectName: this.$extras.project_name,
      projectStatus: this.$extras.project_status,
      totalWorker: +this.$extras.total_worker,
      workers: this.$extras.workers,
    }
  }
}

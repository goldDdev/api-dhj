import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import Employee from './Employee'
import Payrol from './Payrol'
import Project from './Project'

export default class PayrolProject extends BaseModel {
  public static table = 'payrol_projects'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'payrol_id', serializeAs: 'payrolId' })
  public payrolId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'hourly_wages', serializeAs: 'hourlyWages', consume: (value) => +value })
  public hourlyWages: number

  @column()
  public total: number

  @column()
  public duration: number

  @column({ columnName: 'overtime_price', serializeAs: 'overtimePrice' })
  public overtimePrice: string

  @column({ columnName: 'late_price', serializeAs: 'latePrice' })
  public latePrice: string

  @column({ columnName: 'total_present', serializeAs: 'totalPresent' })
  public totalPresent: number

  @column({ columnName: 'total_absent', serializeAs: 'totalAbsent' })
  public totalAbsent: number

  @column({ columnName: 'total_overtime', serializeAs: 'totalOvertime' })
  public totalOvertime: number

  @column({ columnName: 'total_late', serializeAs: 'totalLate' })
  public totalLate: number

  @column({ columnName: 'total_overtime_duration', serializeAs: 'totalOvertimeDuration' })
  public totalOvertimeDuration: number

  @column({ columnName: 'total_late_duration', serializeAs: 'totalLateDuration' })
  public totalLateDuration: number

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

  @belongsTo(() => Payrol, {
    localKey: 'id',
    foreignKey: 'payrolId',
  })
  public payrol: BelongsTo<typeof Payrol>
}

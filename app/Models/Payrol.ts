import {
  BaseModel,
  BelongsTo,
  HasMany,
  belongsTo,
  column,
  hasMany,
  scope,
} from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import Employee from './Employee'
import PayrolProject from './PayrolProject'

export enum PayrolStatus {
  DRAFT = 'DRAFT',
  PROGRESS = 'PROGRESS',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  DONE = 'DONE',
  REVIEW = 'REVIEW',
}

export default class Payrol extends BaseModel {
  public static table = 'payrols'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'role', serializeAs: 'role' })
  public role: string

  @column({ consume: (value) => +value })
  public salary: number

  @column({ columnName: 'hourly_wages', serializeAs: 'hourlyWages', consume: (value) => +value })
  public hourlyWages: number

  @column({ consume: (value) => +value })
  public total: number

  @column({ consume: (value) => +value })
  public duration: number

  @column({ consume: (value) => +value })
  public month: number

  @column({ consume: (value) => +value })
  public year: number

  @column({ columnName: 'pay_at', serializeAs: 'payAt' })
  public payAt: string

  @column({ columnName: 'overtime_price', serializeAs: 'overtimePrice' })
  public overtimePrice: string

  @column({ columnName: 'late_price', serializeAs: 'latePrice' })
  public latePrice: string

  @column({ columnName: 'total_present', serializeAs: 'totalPresent', consume: (value) => +value })
  public totalPresent: number

  @column({ columnName: 'total_absent', serializeAs: 'totalAbsent', consume: (value) => +value })
  public totalAbsent: number

  @column({
    columnName: 'total_overtime_price',
    serializeAs: 'totalOvertimePrice',
    consume: (value) => +value,
  })
  public totalOvertimePrice: number

  @column({
    columnName: 'total_late_price',
    serializeAs: 'totalLatePrice',
    consume: (value) => +value,
  })
  public totalLatePrice: number

  @column({
    columnName: 'total_overtime',
    serializeAs: 'totalOvertime',
    consume: (value) => +value,
  })
  public totalOvertime: number

  @column({ columnName: 'total_late', serializeAs: 'totalLate' })
  public totalLate: number

  @column({ columnName: 'total_overtime_duration', serializeAs: 'totalOvertimeDuration' })
  public totalOvertimeDuration: number

  @column({ columnName: 'total_late_duration', serializeAs: 'totalLateDuration' })
  public totalLateDuration: number

  @column({ columnName: 'other_cut', serializeAs: 'otherCut', consume: (value) => +value })
  public otherCut: number

  @column({ columnName: 'salary_cut', serializeAs: 'salaryCut', consume: (value) => +value })
  public salaryCut: number

  @column({
    columnName: 'other_additional',
    serializeAs: 'otherAdditional',
    consume: (value) => +value,
  })
  public otherAdditional: number

  @column({ columnName: 'status', serializeAs: 'status' })
  public status: string

  @column()
  public note: string

  @column({ columnName: 'note_other_cut', serializeAs: 'noteOtherCut' })
  public noteOtherCut: string

  @column({ columnName: 'note_other_additional', serializeAs: 'noteOtherAdditional' })
  public noteOtherAdditional: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  @hasMany(() => PayrolProject, { foreignKey: 'payrolId', localKey: 'id' })
  public payrolProjects: HasMany<typeof PayrolProject>

  public serializeExtras() {
    return {
      name: this.$extras.name,
      cardID: this.$extras.card_id,
      phoneNumber: this.$extras.phone_number,
    }
  }

  public static withEmployee = scope((query) => {
    query.join('employees', 'employees.id', '=', 'payrols.employee_id')
  })
}

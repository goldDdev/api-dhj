import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Employee from './Employee'

export enum ProjectWorkerStatus {
  ACTIVE = 'ACTIVE',
  DONE = 'DONE',
}

export default class ProjectWorker extends BaseModel {
  public static table = 'project_workers'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'role', serializeAs: 'role' })
  public role: string

  @column({ columnName: 'status', serializeAs: 'status' })
  public status: string

  @column.date({ columnName: 'join_at', serializeAs: 'joinAt', autoCreate: true })
  public joinAt: DateTime

  @column({ columnName: 'note', serializeAs: 'note' })
  public note: string

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  public serializeExtras() {
    return {
      name: this.$extras.name,
      cardID: this.$extras.card_id,
      phoneNumber: this.$extras.phone_number,
    }
  }
}
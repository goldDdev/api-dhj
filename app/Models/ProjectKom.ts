import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Project from './Project'

export enum KomStatus {
  PLAN = 'PLAN',
  CANCEL = 'CANCEL',
  DONE = 'DONE',
}

export default class ProjectKom extends BaseModel {
  public static table = 'project_koms'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'date_plan', serializeAs: 'datePlan' })
  public datePlan: string

  @column({ columnName: 'time_plan', serializeAs: 'timePlan' })
  public timePlan: string

  @column({ columnName: 'actual_date', serializeAs: 'actualDate' })
  public actualDate: string

  @column({ columnName: 'actual_time', serializeAs: 'actualTime' })
  public actualTime: string

  @column({ columnName: 'status', serializeAs: 'status' })
  public status: string

  @column()
  public title: string

  @column()
  public description: string

  @column()
  public result: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>
}

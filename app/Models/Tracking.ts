import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Tracking extends BaseModel {
  public static table = 'trackings'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'latitude', serializeAs: 'latitude' })
  public latitude: number

  @column({ columnName: 'longitude', serializeAs: 'longitude' })
  public longitude: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}

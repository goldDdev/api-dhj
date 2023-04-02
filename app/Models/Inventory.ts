import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Inventory extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'type' })
  public type: string

  @column({ columnName: 'name' })
  public name: string

  @column({ columnName: 'unit' })
  public unit: string

  @column({ columnName: 'qty' })
  public qty: string

  @column({ columnName: 'min_qty', serializeAs: 'minQty' })
  public minQty: string

  @column({ columnName: 'project_id', serializeAs: 'projectID' })
  public projectID: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}

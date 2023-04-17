import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class InventoryRequestDetail extends BaseModel {
  public static table = 'inventory_request_details'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'request_id', serializeAs: 'requestId' })
  public requestId: number

  @column({ columnName: 'inventory_id', serializeAs: 'inventoryId' })
  public inventoryId: number

  @column({ columnName: 'type' })
  public type: string

  @column({ columnName: 'name' })
  public name: string

  @column({ columnName: 'unit' })
  public unit: string

  @column({ columnName: 'qty' })
  public qty: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}

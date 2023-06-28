import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'

export default class CenterLocation extends BaseModel {
  public static table = 'center_locations'

  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column({ consume: (value) => parseFloat(value) })
  public latitude: number

  @column({ consume: (value) => parseFloat(value) })
  public longitude: number

  @column()
  public description: string

  @column.dateTime({ autoCreate: true, columnName: 'created_at', serializeAs: 'updatedAt' })
  public createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    columnName: 'updated_at',
    serializeAs: 'updatedAt',
  })
  public updatedAt: DateTime
}

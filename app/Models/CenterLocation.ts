import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

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
}

import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class ProjectAbsent extends BaseModel {
  public static table = 'project_absents'

  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public contact: string

  @column({ columnName: 'no_spk', serializeAs: 'noSpk' })
  public noSpk: string

  @column({ columnName: 'company_name', serializeAs: 'companyName' })
  public companyName: string

  @column.date({ columnName: 'start_at', serializeAs: 'startAt' })
  public startAt: DateTime

  @column.date({ columnName: 'finish_at', serializeAs: 'finishAt' })
  public finishAt: DateTime

  @column({ columnName: 'duration', serializeAs: 'duration' })
  public duration: number

  @column({ columnName: 'price', serializeAs: 'price', consume: (value) => +value })
  public price: number

  @column({ columnName: 'location', serializeAs: 'location' })
  public location: string

  @column({ columnName: 'latitude', serializeAs: 'latitude' })
  public latitude: number

  @column({ columnName: 'longitude', serializeAs: 'longitude' })
  public longitude: number

  @column({ columnName: 'status', serializeAs: 'status' })
  public status: string

  @column({ columnName: 'note', serializeAs: 'note' })
  public note: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}

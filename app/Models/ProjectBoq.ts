import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Project from './Project'
import Boq from './Boq'

export default class ProjectBoq extends BaseModel {
  public static table = 'project_boqs'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'boq_id', serializeAs: 'boqId' })
  public boqId: number

  @column({ columnName: 'name', serializeAs: 'name' })
  public name: string

  @column({ columnName: 'type_unit', serializeAs: 'typeUnit' })
  public typeUnit: string

  @column()
  public unit: number

  @column({ consume: (value) => +value })
  public price: number

  @column({ columnName: 'additional_unit', serializeAs: 'additionalUnit' })
  public additionalUnit: number

  @column({
    columnName: 'additional_price',
    serializeAs: 'additionalPrice',
    consume: (value) => +value,
  })
  public additionalPrice: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: 'updatedAt' })
  public updatedAt: DateTime

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>

  @belongsTo(() => Boq, {
    localKey: 'id',
    foreignKey: 'boqId',
  })
  public boq: BelongsTo<typeof Boq>
}

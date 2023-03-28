import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class ProjectProgres extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'project_boq_id', serializeAs: 'projectBoqId' })
  public projectBoqId: number

  @column({
    columnName: 'submited_progres',
    serializeAs: 'submitedProgres',
    consume: (value) => +value,
  })
  public submitedProgres: number

  @column({ columnName: 'progres', serializeAs: 'progres', consume: (value) => +value })
  public progres: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column({ columnName: 'submited_by', serializeAs: 'submitedBy', consume: (value) => +value })
  public submitedBy: number

  @column({ columnName: 'aproved_by', serializeAs: 'aprovedBy', consume: (value) => +value })
  public aprovedBy: number

  public serializeExtras() {
    return {
      name: this.$extras.name,
      typeUnit: this.$extras.type_unit,
      submitedName: this.$extras.submited_name,
    }
  }
}

import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class InventoryRequest extends BaseModel {
  public static table = 'inventory_requests'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'start_date', serializeAs: 'startDate' })
  public startDate: string

  @column({ columnName: 'end_date', serializeAs: 'endDate' })
  public endDate: string

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column({ columnName: 'total_material' })
  public totalMaterial: number

  @column({ columnName: 'total_equipment' })
  public totalEquipment: number

  @column({ columnName: 'status' })
  public status: string

  @column({ columnName: 'created_by', serializeAs: 'createdBy' })
  public createdBy: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  public serializeExtras() {
    return {
      name: this.$extras.name,
      projectName: this.$extras.project_name,
    }
  }
}

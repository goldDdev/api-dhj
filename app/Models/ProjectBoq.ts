import { DateTime } from 'luxon'
import {
  BaseModel,
  BelongsTo,
  HasMany,
  belongsTo,
  column,
  hasMany,
  scope,
} from '@ioc:Adonis/Lucid/Orm'
import Project from './Project'
import Boq from './Boq'
import ProjectProgres from './ProjectProgres'

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

  @hasMany(() => ProjectProgres, { foreignKey: 'projectBoqId', localKey: 'id' })
  public progress: HasMany<typeof ProjectProgres>

  @hasMany(() => ProjectProgres, { foreignKey: 'projectBoqId', localKey: 'id' })
  public planProgress: HasMany<typeof ProjectProgres>

  public serializeExtras() {
    return {
      totalProgres: +this.$extras.total_progres,
      totalPending: +this.$extras.total_pending,
      lastProgresAt: this.$extras.progres_at,
      lastProgres: +this.$extras.progres,
      planStart: this.$extras.start_date,
      planEnd: this.$extras.end_date,
      planProgres: +this.$extras.plan_progres,
      planBy: this.$extras.plan_by,
    }
  }

  public static withTotalProgress = scope((query) => {
    query.joinRaw(
      'LEFT OUTER JOIN (SELECT SUM(progres) as total_progres, project_boq_id FROM project_progres WHERE aproved_by IS NOT NULL GROUP BY project_boq_id) AS progres ON progres.project_boq_id = project_boqs.id'
    )
  })

  public static withTotalPending = scope((query) => {
    query.joinRaw(
      'LEFT OUTER JOIN (SELECT COUNT(*) as total_pending, project_boq_id FROM project_progres WHERE aproved_by IS NULL GROUP BY project_boq_id) AS pending ON pending.project_boq_id = project_boqs.id'
    )
  })
}

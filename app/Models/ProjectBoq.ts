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

  @column({ consume: (value) => parseFloat(value || 0) })
  public unit: number

  @column({ consume: (value) => +(value || 0) })
  public price: number

  @column({
    columnName: 'total_price',
    serializeAs: 'totalPrice',
    consume: (value) => +(value || 0),
  })
  public totalPrice: number

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
      progresBy: this.$extras.progres_by,
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

  public static withLastProgres = scope((query) => {
    query.joinRaw(
      "LEFT OUTER JOIN (SELECT DISTINCT ON (project_boq_id) project_boq_id, TO_CHAR(progres_at, 'YYYY-MM-DD') AS progres_at, progres, employees.name AS progres_by FROM project_progres LEFT JOIN employees ON employees.id = project_progres.employee_id ORDER BY project_boq_id, progres_at DESC) AS progress ON progress.project_boq_id = project_boqs.id"
    )
  })

  public static withLastPlan = scope((query, now: string) => {
    query.joinRaw(
      "LEFT OUTER JOIN (SELECT TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,  TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date, progress as plan_progres, employees.name AS plan_by, project_boq_id FROM plan_boqs INNER JOIN employees ON employees.id = plan_boqs.employee_id WHERE :date >= start_date AND :date <= end_date LIMIT 1) AS planprogress ON planprogress.project_boq_id = project_boqs.id",
      { date: now }
    )
  })
}

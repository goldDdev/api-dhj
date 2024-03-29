import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column, scope } from '@ioc:Adonis/Lucid/Orm'
import Employee from './Employee'
import Project from './Project'
import moment from 'moment'

export enum AbsentType {
  A = 'A',
  P = 'P',
  O = 'O',
  L = 'L',
}

export default class ProjectAbsent extends BaseModel {
  public static table = 'project_absents'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column({ columnName: 'project_id', serializeAs: 'projectId' })
  public projectId: number

  @column()
  // TODO : pls make coment here to inform jar, Thanks
  // A = Absent = tidak datanng, P = Present = hadir
  public absent: string

  @column({
    columnName: 'absent_at',
    serializeAs: 'absentAt',
    consume: (value) => moment(value).format('yyyy-MM-DD'),
  })
  public absentAt: string

  @column({ columnName: 'come_at', serializeAs: 'comeAt' })
  public comeAt: string

  @column({ columnName: 'close_at', serializeAs: 'closeAt' })
  public closeAt: string

  @column({ columnName: 'location_at', serializeAs: 'locationAt' })
  public locationAt: string

  @column({ columnName: 'late_duration', serializeAs: 'lateDuration', consume: (value) => +value })
  public lateDuration: number

  @column({ columnName: 'late_price', serializeAs: 'latePrice', consume: (value) => +value })
  public latePrice: number

  @column({ columnName: 'duration', serializeAs: 'duration', consume: (value) => +value })
  public duration: number

  @column()
  public photo: string

  @column({ consume: (value) => parseFloat(value) })
  public latitude: number

  @column({ consume: (value) => parseFloat(value) })
  public longitude: number

  @column({
    columnName: 'close_latitude',
    serializeAs: 'closeLatitude',
    consume: (value) => parseFloat(value),
  })
  public closeLatitude: number

  @column({
    columnName: 'close_longitude',
    serializeAs: 'closeLongitude',
    consume: (value) => parseFloat(value),
  })
  public closeLongitude: number

  @column({ columnName: 'absent_by', serializeAs: 'absentBy' })
  public absentBy: number

  @column({ columnName: 'replace_by', serializeAs: 'replaceBy' })
  public replaceBy: number

  @column({ columnName: 'note', serializeAs: 'note' })
  public note: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'replaceBy',
  })
  public replaceEmployee: BelongsTo<typeof Employee>

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'absentBy',
  })
  public absentEmployee: BelongsTo<typeof Employee>

  @belongsTo(() => Project, {
    localKey: 'id',
    foreignKey: 'projectId',
  })
  public project: BelongsTo<typeof Project>

  public serializeExtras() {
    return {
      name: this.$extras.name,
      cardID: this.$extras.cardID,
      phoneNumber: this.$extras.phoneNumber,
      role: this.$extras.role,
      parentId: this.$extras.parent_id,
      workerId: this.$extras.worker_id,
      projectName: this.$extras.project_name,
      projectStatus: this.$extras.project_status,
      projectCompany: this.$extras.project_company,
      projectLocation: this.$extras.project_location,
    }
  }

  public static withWorker = scope((query) => {
    query.joinRaw(
      'INNER JOIN project_workers ON project_absents.employee_id = project_workers.employee_id AND project_absents.project_id = project_workers.project_id'
    )
  })

  public static withEmployee = scope((query) => {
    query.join('employees', 'employees.id', '=', 'project_absents.employee_id')
  })
}

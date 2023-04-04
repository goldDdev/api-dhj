import {
  BaseModel,
  HasMany,
  HasOne,
  column,
  computed,
  hasMany,
  hasOne,
  scope,
} from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import User from './User'
import ProjectWorker from './ProjectWorker'

export enum EmployeeType {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PM = 'PM',
  PCC = 'PCC',
  PC = 'PC',
  QS = 'QS',
  QCC = 'QCC',
  QC = 'QC',
  SUP = 'SUP',
  SPV = 'SPV',
  MANDOR = 'MANDOR',
  STAFF = 'STAFF',
  WORKER = 'WORKER',
}

export default class Employee extends BaseModel {
  public static table = 'employees'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'name' })
  public name: string

  @column({ columnName: 'card_id', serializeAs: 'cardID' })
  public cardID: string

  @column({ columnName: 'phone_number', serializeAs: 'phoneNumber' })
  public phoneNumber: string

  @column({ columnName: 'inactive_at', serializeAs: 'inactiveAt' })
  public inactiveAt?: string

  @column({
    columnName: 'inactive_note',
    serializeAs: 'inactiveNote',
  })
  public inactiveNote?: string

  @column({ columnName: 'hourly_wages', serializeAs: 'hourlyWages', consume: (value) => +value })
  public hourlyWages?: number

  @column({ columnName: 'salary', serializeAs: 'salary', consume: (value) => +value })
  public salary: number

  @computed()
  public get status() {
    return this.inactiveAt === null ? 'ACTIVE' : 'INACTIVE'
  }

  @column({ columnName: 'role', serializeAs: 'role' })
  public role: string

  @column.dateTime({ autoCreate: true, columnName: 'created_at', serializeAs: 'updatedAt' })
  public createdAt: DateTime

  @column.dateTime({
    autoCreate: true,
    autoUpdate: true,
    columnName: 'updated_at',
    serializeAs: 'updatedAt',
  })
  public updatedAt: DateTime

  @hasOne(() => User)
  public user: HasOne<typeof User>

  @hasOne(() => ProjectWorker, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public work: HasOne<typeof ProjectWorker>

  @hasMany(() => ProjectWorker, {
    localKey: 'id',
    foreignKey: 'employeeId',
    onQuery: (query) => {
      if (query.isRelatedQuery) {
        query
          .join('projects', 'projects.id', 'project_workers.project_id')
          .select(
            'project_workers.id',
            'project_id',
            'join_at',
            'project_workers.status',
            'projects.name AS project_name',
            'projects.status AS project_status'
          )
      }
    },
  })
  public works: HasMany<typeof ProjectWorker>

  public serializeExtras() {
    return {
      email: this.$extras.email,
    }
  }

  public static withUser = scope((query) => {
    query.leftJoin('users', 'users.employee_id', 'employees.id')
  })
}

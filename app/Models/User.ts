import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import {
  column,
  beforeSave,
  BaseModel,
  belongsTo,
  BelongsTo,
  HasOne,
  hasOne,
  afterFind,
} from '@ioc:Adonis/Lucid/Orm'
import Employee from './Employee'
import { ProjectWorkerStatus } from './ProjectWorker'

export default class User extends BaseModel {
  public static table = 'users'

  @column({ isPrimary: true })
  public id: number

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column({ serializeAs: null })
  public rememberMeToken: string | null

  @column({ columnName: 'employee_id', serializeAs: 'employeeId' })
  public employeeId: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => Employee, {
    localKey: 'id',
    foreignKey: 'employeeId',
  })
  public employee: BelongsTo<typeof Employee>

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  @afterFind()
  public static async afterFindHook(user: User) {
    await user.load('employee', (query) => {
      query.preload('work', (query) => {
        query.where('status', ProjectWorkerStatus.ACTIVE).orderBy('id', 'asc')
      })
    })
  }
}

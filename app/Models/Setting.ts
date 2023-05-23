import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export enum SettingCode {
  START_TIME = 'START_TIME',
  CLOSE_TIME = 'CLOSE_TIME',
  OVERTIME_PRICE_PER_MINUTE = 'OVERTIME_PRICE_PER_MINUTE',
  OVERTIME_PRICE_PER_HOUR = 'OVERTIME_PRICE_PER_HOUR',
  LATETIME_PRICE_PER_MINUTE = 'LATETIME_PRICE_PER_MINUTE',
  LATE_TRESHOLD = 'LATE_TRESHOLD',
  RADIUS = 'RADIUS',
}

export default class Setting extends BaseModel {
  public static table = 'settings'

  @column({ isPrimary: true })
  public id: number

  @column()
  public code: string

  @column()
  public label: string

  @column()
  public description: string

  @column()
  public value: string

  @column()
  public type: string

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime
}

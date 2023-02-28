import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'employees'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name', 64).index('emp_name').notNullable()
      table.string('card_id', 100).nullable().unique()
      table.string('phone_number', 16).nullable()
      table
        .enum('role', [
          'PM',
          'PCC',
          'PC',
          'QS',
          'QCC',
          'QC',
          'SUP',
          'SPV',
          'MANDOR',
          'STAFF',
          'WORKER',
        ])
        .defaultTo('WORKER')
      table.bigInteger('hourly_wages').nullable().defaultTo(0)
      table.bigInteger('salary').nullable().defaultTo(0)
      table.string('inactive_at', 32).nullable().defaultTo(null)
      table.text('inactive_note').nullable().defaultTo(null)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

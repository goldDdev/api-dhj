import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'request_overtimes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('employee_id').index()
      table.integer('project_id').index()
      table.date('absent_at').nullable().nullable().defaultTo(null).comment('tanggal')
      table.time('come_at').nullable().defaultTo(null).comment('jam mulai lembur')
      table.time('close_at').nullable().defaultTo(null).comment('jam selesai lembur')
      table.smallint('overtime_duration').nullable().defaultTo(0).comment('durasi lembur ')
      table.bigInteger('overtime_price').nullable().defaultTo(0).comment('biaya perjam')
      table.bigInteger('total_earn').nullable().defaultTo(0).comment('total pendapatan')
      table.text('note').nullable().defaultTo(null)
      table.enum('status', ['PENDING', 'CONFIRM', 'REJECT']).nullable().defaultTo('PENDING')
      table.integer('action_by', 10).unsigned().nullable().defaultTo(null)

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('employee_id')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('project_id')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('action_by')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

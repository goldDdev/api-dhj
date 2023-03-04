import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_koms'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('project_id', 10).unsigned().index()
      table.date('date_plan').nullable().defaultTo(null)
      table.time('time_plan').nullable().defaultTo(null)
      table.date('actual_date').nullable().defaultTo(null)
      table.time('actual_plan').nullable().defaultTo(null)
      table.string('title').nullable().defaultTo(null)
      table.enum('status', ['PLAN', 'CANCEL', 'DONE']).defaultTo('PLAN')
      table.text('description').nullable().defaultTo(null)
      table.text('result').nullable().defaultTo(null)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('project_id')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

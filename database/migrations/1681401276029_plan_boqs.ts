import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'plan_boqs'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('employee_id').index()
      table.integer('project_id').index()
      table.integer('project_boq_id', 10).index()
      table.smallint('progress')
      table.date('start_date').nullable().defaultTo(null)
      table.date('end_date').nullable().defaultTo(null)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
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
        .foreign('project_boq_id')
        .references('id')
        .inTable('project_boqs')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down () {
  }
}

// @ts-nocheck
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_progres'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('employee_id').index('pp_emp_id')
      table.integer('project_id').index('pp_prj_id')
      table.integer('project_boq_id', 10).index('pp_prj_bq_id')
      table.smallint('submited_progres')
      table.smallint('progres')
      table.integer('submited_by')
      table.integer('aproved_by')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table
        .foreign('employee_id', 'pp_emp')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('project_id', 'pp_prj')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('project_boq_id', 'pp_prj_bq_id')
        .references('id')
        .inTable('project_boqs')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

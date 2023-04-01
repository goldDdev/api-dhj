import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'payrol_projects'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('project_id', 10).unsigned().index().nullable().defaultTo(null)
      table.integer('employee_id', 10).unsigned().index().nullable().defaultTo(null)
      table.bigInteger('hourly_wages').nullable().defaultTo(0)
      table.smallint('total_present').unsigned().nullable().defaultTo(0)
      table.smallint('total_absent').unsigned().nullable().defaultTo(0)
      table.smallint('total_overtime').unsigned().nullable().defaultTo(0)
      table.smallint('total_late').unsigned().nullable().defaultTo(0)
      table.smallint('overtime_price').unsigned().nullable().defaultTo(0)
      table.smallint('late_price').unsigned().nullable().defaultTo(0)
      table.smallint('total_overtime_duration').unsigned().nullable().defaultTo(0)
      table.smallint('total_late_duration').unsigned().nullable().defaultTo(0)
      table.smallint('duration').nullable().defaultTo(0)
      table.bigInteger('total').unsigned().nullable().defaultTo(0)


      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table
      .foreign('project_id')
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .onDelete('CASCADE')
      table
      .foreign('employee_id')
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE')
      .onDelete('CASCADE')
    })
  }

  public async down () {
  }
}

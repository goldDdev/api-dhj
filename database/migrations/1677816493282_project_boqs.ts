import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_boqs'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table.integer('project_id', 10).unsigned().index('pkom_prj_id')
      table.integer('boq_id', 10).unsigned().index().nullable().defaultTo(null)
      table.string('typeUnit').nullable().defaultTo(null)
      table.smallint('unit').defaultTo(0)
      table.smallint('additional_unit').defaultTo(0)
      table.bigInteger('price').defaultTo(0)
      table.bigInteger('additional_price').defaultTo(0)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('project_id', 'pkom_prj')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('boq_id')
        .references('id')
        .inTable('bill_of_quantities')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

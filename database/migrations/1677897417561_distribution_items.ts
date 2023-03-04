import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'distribution_items'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('distribution_id', 10).unsigned().index()
      table.integer('boq_id', 10).unsigned().index().nullable().defaultTo(null)
      table.string('typeUnit').nullable().defaultTo(null)
      table.smallint('unit').defaultTo(0)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('distribution_id')
        .references('id')
        .inTable('distribution')
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

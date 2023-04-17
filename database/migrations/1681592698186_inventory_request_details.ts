import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'inventory_request_details'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('request_id').unsigned().nullable().index()
      table.integer('inventory_id').unsigned().nullable().index()
      table.string('type')
      table.string('name')
      table.string('unit')
      table.integer('qty')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true }).nullable()
      table
        .foreign('request_id')
        .references('id')
        .inTable('inventory_requests')
        .onDelete('CASCADE')
      table
        .foreign('inventory_id')
        .references('id')
        .inTable('inventories')
        // .onDelete('CASCADE')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}

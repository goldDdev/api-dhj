import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'inventories'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('type')
      table.string('name')
      table.string('unit')
      table.integer('qty')
      table.integer('minQty')
      table.integer('project_id').index('inv_prj_id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table
        .foreign('project_id', 'inv_prj')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'activity_materials'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('project_activity_id', 10).unsigned().index()
      table.integer('project_boc_id', 10).unsigned().index()
      table.string('name').nullable().defaultTo(null)
      table.string('typeUnit').nullable().defaultTo(null)
      table.smallint('unit').defaultTo(0)

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('project_activity_id')
        .references('id')
        .inTable('project_activities')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

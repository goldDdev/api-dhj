import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_activities'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('project_id', 10).index('pak_prj_id')
      table.string('title').nullable().defaultTo(null)
      table.date('activity_at').nullable().defaultTo(null)
      table.time('start_at').nullable().defaultTo(null)
      table.time('end_at').nullable().defaultTo(null)
      table.integer('rain_duration').defaultTo(0)
      table.integer('work_duration').defaultTo(0)
      table.text('note_operation').nullable().defaultTo(null)
      table.text('note_equipment').nullable().defaultTo(null)
      table.text('none_material').nullable().defaultTo(null)
      table.text('note').nullable().defaultTo(null)
      table.decimal('latitude', 10, 8).defaultTo(0)
      table.decimal('longitude', 11, 8).defaultTo(0)

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

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('target_date').nullable().defaultTo(null)
    })

    this.schema.alterTable('project_absents', (table) => {
      table.time('location_at').nullable().defaultTo(null)
    })

    this.schema.alterTable('request_overtimes', (table) => {
      table.string('type').nullable().defaultTo(null)
      table.integer('request_by', 10).unsigned().index().nullable().defaultTo(null)
    })

    this.schema.alterTable('additional_hours', (table) => {
      table.string('type').nullable().defaultTo(null)
      table.integer('parent_id', 10).unsigned().index().nullable().defaultTo(null)
    })
  }

  public async down() {}
}

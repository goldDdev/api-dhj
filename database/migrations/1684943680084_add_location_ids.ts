import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('trackings', (table) => {
      table.integer('location_id').index().nullable().defaultTo(null)
    })

    this.schema.alterTable('inventory_requests', (table) => {
      table.date('arrived_date').nullable().defaultTo(null)
      table.time('arrived_time').nullable().defaultTo(null)
    })
  }

  public async down() {}
}

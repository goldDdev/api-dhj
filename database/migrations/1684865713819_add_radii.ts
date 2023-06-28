import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('daily_plans', (table) => {
      table.time('location_at').nullable().defaultTo(null)
      table.decimal('latitude', 10, 8).defaultTo(0)
      table.decimal('longitude', 11, 8).defaultTo(0)
    })

    this.schema.raw(
      `INSERT INTO "settings" ( "code", "value", "label", "description", "type", "inactive_at", "created_at", "updated_at") VALUES ( 'RADIUS', '100', 'Radius', 'Radius', 'NUMBER', NULL, NULL, NULL);`
    )
  }

  public async down() {}
}

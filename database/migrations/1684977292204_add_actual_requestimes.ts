import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'add_actual_requestimes'

  public async up() {
    this.schema.alterTable('additional_hours', (table) => {
      table.smallint('actual_duration').nullable().defaultTo(0)
      table.time('actual_close').nullable().defaultTo(null)
    })
  }

  public async down() {}
}

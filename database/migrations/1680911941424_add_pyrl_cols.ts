import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'payrols'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('total_late_price').unsigned().nullable().defaultTo(0)
      table.bigInteger('total_overtime_price').unsigned().nullable().defaultTo(0)
    })
  }

  public async down() {}
}

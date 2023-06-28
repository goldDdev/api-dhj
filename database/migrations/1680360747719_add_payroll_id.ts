import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('payrol_projects', (table) => {
      table.integer('payrol_id', 10).unsigned().nullable().defaultTo(null)
      table
        .foreign('payrol_id')
        .references('id')
        .inTable('payrols')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {}
}

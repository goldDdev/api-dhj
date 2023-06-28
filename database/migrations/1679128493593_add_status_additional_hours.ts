import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'additional_hours'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('status', ['PENDING', 'CONFIRM', 'REJECT']).nullable().defaultTo('PENDING')
      table.integer('action_by', 10).unsigned().nullable().defaultTo(null)

      table
        .foreign('action_by')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }
}

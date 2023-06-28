import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'additional_hours'

  public async up() {
    this.schema.raw('DELETE FROM additional_hours')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('request_by')
      table
        .foreign('request_by')
        .references('id')
        .inTable('request_overtimes')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {}
}

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_absents'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('close_latitude', 10, 8).defaultTo(0)
      table.decimal('close_longitude', 11, 8).defaultTo(0)
    })
  }

  public async down () {
  }
}

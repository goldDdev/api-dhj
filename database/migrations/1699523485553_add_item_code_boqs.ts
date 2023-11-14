import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_boqs'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('code').nullable().defaultTo(null)
      table.string('description').nullable().defaultTo(null)
    })
  }

  public async down() {}
}

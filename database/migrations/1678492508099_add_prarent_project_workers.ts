import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_workers'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('parent_id', 10).unsigned().nullable().defaultTo(null).after('project_id')
    })
  }
}

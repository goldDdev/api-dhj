import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_koms'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      this.schema.raw('ALTER TABLE "project_koms" RENAME actual_plan TO actual_time')
    })
  }
}

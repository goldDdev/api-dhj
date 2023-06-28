import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_boqs'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      this.schema.raw('ALTER TABLE "project_boqs" RENAME "typeUnit" TO type_unit')
    })
  }
}

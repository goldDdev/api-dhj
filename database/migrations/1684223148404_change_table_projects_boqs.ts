import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_boqs'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('total_price').defaultTo(0)
    })

    this.schema.raw('ALTER TABLE "project_boqs" ALTER COLUMN unit TYPE decimal(9,2);')
    this.schema.raw('ALTER TABLE "project_boqs" ALTER boq_id SET DEFAULT NULL')
  }

  public async down() {}
}

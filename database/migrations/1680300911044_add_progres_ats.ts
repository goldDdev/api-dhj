import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_progres'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('progres_at').nullable().nullable().defaultTo(null).comment('tanggal')
    })
  }

  public async down () {
   
  }
}

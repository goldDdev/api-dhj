import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'employees'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('role', [
          'OWNER',
          'ADMIN',
          'PM',
          'PCC',
          'PC',
          'QS',
          'QCC',
          'QC',
          'SUP',
          'SPV',
          'MANDOR',
          'STAFF',
          'WORKER',
        ])
        .defaultTo('WORKER')
    })
  }

  public async down() {
    //
  }
}

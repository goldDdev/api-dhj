import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'inventory_requests'

  public async up () {
    this.schema.raw('ALTER TABLE inventory_requests ADD created_by int4 NULL;')
  }

  public async down () {
  }
}

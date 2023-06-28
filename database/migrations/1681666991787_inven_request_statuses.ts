import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up () {
    this.schema.raw('ALTER TABLE inventory_requests ADD status varchar NULL;')
  }

  public async down () {
  }
}

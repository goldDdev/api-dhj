import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_absents'

  public async up() {
    this.schema.raw('ALTER TABLE "project_absents" ALTER absent SET DEFAULT NULL')
  }
}

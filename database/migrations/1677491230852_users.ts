import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('email', 255).notNullable().unique()
      table.string('password', 180).nullable()
      table.string('remember_me_token').nullable()
      table.integer('employee_id', 10).unsigned().nullable().index('employee_idx').defaultTo(null)
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table
        .foreign('employee_id', 'account')
        .references('id')
        .inTable('employees')
        .onDelete('cascade')
        .onDelete('cascade')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

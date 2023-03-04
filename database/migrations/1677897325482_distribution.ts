import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'distribution'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('from_location').nullable().defaultTo(null)
      table.integer('project_id', 10).index()
      table.integer('created_by', 10).unsigned().index().nullable().defaultTo(null)
      table.integer('accepted_by', 10).unsigned().index().nullable().defaultTo(null)
      table.smallint('total_item').defaultTo(0)
      table.date('distributed_at').nullable().defaultTo(null)
      table.date('accepted_at').nullable().defaultTo(null)
      table.decimal('latitude', 10, 8).defaultTo(0)
      table.decimal('longitude', 11, 8).defaultTo(0)
      table.text('note').nullable().defaultTo(null)
      table
        .enum('status', ['DRAFT', 'CANCEL', 'PENDING', 'CONFIRM', 'REVIEW', 'IN_DISTRIBUTION'])
        .defaultTo('DRAFT')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('project_id')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('created_by')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('accepted_by')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

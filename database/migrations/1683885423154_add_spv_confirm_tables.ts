import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up () {
    this.schema.alterTable('additional_hours', (table) => {
      table.integer('confirm_by', 10).unsigned().nullable().defaultTo(null)
      table.enum('confirm_status', ['PENDING', 'CONFIRM', 'REJECT']).nullable().defaultTo('PENDING')
      table
      .foreign('confirm_by')
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE')
      .onDelete('CASCADE')
    })

    this.schema.alterTable('request_overtimes', (table) => {
      table.integer('confirm_by', 10).unsigned().nullable().defaultTo(null)
      table.enum('confirm_status', ['PENDING', 'CONFIRM', 'REJECT']).nullable().defaultTo('PENDING')
      table
      .foreign('confirm_by')
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE')
      .onDelete('CASCADE')
    })
  }

  public async down () {}
}

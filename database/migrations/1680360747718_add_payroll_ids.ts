import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up () {
    this.schema.alterTable('project_absents', (table) => {
      table.integer('payrol_id', 10).unsigned().nullable().defaultTo(null)
    })

    this.schema.alterTable('additional_hours', (table) => {
      table.integer('payrol_id', 10).unsigned().nullable().defaultTo(null)
    })
  }

  public async down () {
   
  }
}

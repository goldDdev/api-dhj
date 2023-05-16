import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up () {
    this.schema.alterTable('project_koms', (table) => {
      table.date('revise_1').nullable().defaultTo(null)
      table.date('revise_2').nullable().defaultTo(null)
    })

   
  }

  public async down () {}
}

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up () {
    this.schema.alterTable('project_koms', (table) => {
      table.time('revise_time_1').nullable().defaultTo(null)
      table.time('revise_time_2').nullable().defaultTo(null)
    })

   
  }

  public async down () {}
}

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('projects', (table) => {
      table.dropColumn('status')
    })

    this.schema.alterTable('projects', (table) => {
      table
        .enum('status', [
          'DRAFT',
          'PROGRESS',
          'CANCELLED',
          'PENDING',
          'DONE',
          'REVIEW',
          'WAP',
          'SPK',
          'KOM',
          'SITE_KOM',
          'RFD',
          'POP',
          'CLOSE',
        ])
        .nullable()
        .defaultTo('DRAFT')
    })

    this.schema.alterTable('employees', (table) => {
      table.enum('type', ['PIPING', 'CIVIL', 'ELECTRICAL']).nullable().defaultTo(null)
    })

    this.schema.alterTable('project_boqs', (table) => {
      table.enum('type', ['PIPING', 'CIVIL', 'ELECTRICAL']).nullable().defaultTo(null)
    })
  }

  public async down() {}
}

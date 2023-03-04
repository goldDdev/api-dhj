import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').index('prj_name')

      table.string('no_spk').nullable().defaultTo(null)
      table.string('company_name', 64).nullable().defaultTo(null).index('prj_cmp_name')
      table
        .text('contact')
        .nullable()
        .defaultTo(null)
        .index('prj_contact')
        .comment('kontak yang bisa dihubungi klien proyek')
      table.date('start_at').nullable().defaultTo(null).comment('tanggal plan')
      table.date('finish_at').nullable().defaultTo(null).comment('tanggal plan')
      table.smallint('duration').nullable().defaultTo(0).comment('lama penngerjaan')
      table.bigInteger('price').nullable().defaultTo(0).comment('biaya proyek')
      table.text('location').nullable().defaultTo(null)
      table.decimal('latitude', 10, 8)
      table.decimal('longitude', 11, 8)
      table
        .enum('status', ['DRAFT', 'PROGRESS', 'CANCELLED', 'PENDING', 'DONE', 'REVIEW'])
        .nullable()
        .defaultTo('DRAFT')
      table.text('note').nullable().defaultTo(null)

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_absents'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('employee_id').index('pa_emp_id')
      table.integer('project_id').index('pa_prj_id')
      table.enum('absent', ['A', 'P', 'O']).nullable().defaultTo('P').comment('jenis kehadiran')
      table.date('absent_at').nullable().nullable().defaultTo(null).comment('tanggal')
      table.time('come_at').nullable().defaultTo(null).comment('jam kehadiran')
      table.time('close_at').nullable().defaultTo(null).comment('jam pulang')
      table.decimal('latitude', 10, 8)
      table.decimal('longitude', 11, 8)
      table.smallint('late_duration').nullable().defaultTo(0).comment('durasi keterlambatan')
      table.bigInteger('late_price').nullable().defaultTo(0).comment('potongan ketelmabatan')
      table.smallint('duration').nullable().defaultTo(0).comment('durasi jam kerja')
      table
        .integer('replace_by', 10)
        .nullable()
        .defaultTo(null)
        .index('pa_rplc_emp_id')
        .comment('pengganti')
      table
        .integer('absent_by', 10)
        .nullable()
        .defaultTo(null)
        .index('pa_absnt_emp_id')
        .comment('tukang absent')
      table.text('note').nullable().defaultTo(null)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('replace_by', 'pa_rplc_emp')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('absent_by', 'pa_absnt_emp')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('employee_id', 'pa_emp')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('project_id', 'pa_prj')
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}

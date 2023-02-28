import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'project_workers'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('employee_id').index('pw_emp_id')
      table.integer('project_id').index('pw_prj_id')
      table
        .enum('role', [
          'PM',
          'PCC',
          'PC',
          'QS',
          'QCC',
          'QC',
          'SUP',
          'SPV',
          'MANDOR',
          'STAFF',
          'WORKER',
        ])
        .defaultTo('WORKER')
        .comment('kadang bisa saja pekerja jadi mandor')
      table.enum('status', ['ACTIVE', 'DONE']).comment('status pekerja dalam proyek')
      table.date('join_at').nullable().defaultTo(null).comment('tanggal bergabung')
      table.text('note').nullable().defaultTo(null)

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable().defaultTo(null)
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(null)
      table
        .foreign('employee_id', 'pw_emp')
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('project_id', 'pw_prj')
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

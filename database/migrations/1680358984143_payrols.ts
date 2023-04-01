import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'payrols'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('employee_id', 10).unsigned().index().nullable().defaultTo(null)
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
      table.bigInteger('salary').unsigned().nullable().defaultTo(0)
      table.bigInteger('hourly_wages').nullable().defaultTo(0)
      table.smallint('total_present').unsigned().nullable().defaultTo(0)
      table.smallint('total_absent').unsigned().nullable().defaultTo(0)
      table.smallint('total_overtime').unsigned().nullable().defaultTo(0)
      table.smallint('total_late').unsigned().nullable().defaultTo(0)
      table.smallint('overtime_price').unsigned().nullable().defaultTo(0)
      table.smallint('late_price').unsigned().nullable().defaultTo(0)
      table.smallint('total_overtime_duration').unsigned().nullable().defaultTo(0)
      table.smallint('total_late_duration').unsigned().nullable().defaultTo(0)
      table.smallint('duration').nullable().defaultTo(0)
      table.bigInteger('salary_cut').unsigned().nullable().defaultTo(0)
      table.bigInteger('other_cut').unsigned().nullable().defaultTo(0)
      table.bigInteger('other_additional').unsigned().nullable().defaultTo(0)
      table.bigInteger('total').unsigned().nullable().defaultTo(0)
      table.smallint('month').unsigned().nullable().defaultTo(0)
      table.smallint('year').nullable().defaultTo(0)
      table.date('pay_at').nullable().nullable().defaultTo(null).comment('tanggal')
      table.text('note').nullable().defaultTo(null)
      table.text('note_other_cut').nullable().defaultTo(null)
      table.text('note_other_additional').nullable().defaultTo(null)
      table
        .enum('status', ['DRAFT', 'PROGRESS', 'CANCELLED', 'PENDING', 'DONE', 'REVIEW'])
        .nullable()
        .defaultTo('DRAFT')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table
      .foreign('employee_id')
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE')
      .onDelete('CASCADE')
    })
  }

  public async down () {
  }
}

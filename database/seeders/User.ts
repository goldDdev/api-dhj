import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import User from 'App/Models/User'
import Employee from 'App/Models/Employee'

export default class extends BaseSeeder {
  public async run() {
    await Employee.createMany([
      {
        id: 1,
        name: 'Budi',
        cardID: '123412341234',
        phoneNumber: '089123123123',
        role: 'SPV',
      },
    ])

    await User.createMany([
      {
        email: 'test@example.com',
        password: 'P@ssw0rd',
      },
      {
        email: 'spv@example.com',
        password: 'P@ssw0rd',
        employeeId: 1,
      },
    ])
  }
}

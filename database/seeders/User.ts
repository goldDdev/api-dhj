import User from 'App/Models/User'
import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'

export default class extends BaseSeeder {
  public async run() {
    await User.createMany([
      {
        email: 'test@example.com',
        password: 'P@ssw0rd',
      },
    ])
  }
}

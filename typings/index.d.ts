declare module '@ioc:Adonis/Core/HttpContext' {
  import { AuthContract } from '@ioc:Adonis/Addons/Auth'
  interface HttpContextContract {
    month: number
    year: number
    now: string
    time: string
    day: number
  }
}

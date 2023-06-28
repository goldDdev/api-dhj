import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AuthController {
  public async login({ auth, request, response }: HttpContextContract) {
    try {
      const { email, password } = request.body()
      const { token } = await auth.use('api').attempt(email, password)
      return response.send({
        data: {
          token,
          user: auth.user?.serialize(),
        },
      })
    } catch {
      return response.badRequest({ error: 'Invalid credentials' })
    }
  }

  public async logout({ auth, response }: HttpContextContract) {
    await auth.use('api').revoke()
    return response.ok({
      revoked: true,
    })
  }
}

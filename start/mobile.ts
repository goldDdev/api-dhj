import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/login', 'AuthController.login')
  }).prefix('auth')
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

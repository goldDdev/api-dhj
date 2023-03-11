import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/login', 'AuthController.login')
  }).prefix('auth')

  Route.group(() => {
    Route.group(() => {
      Route.put('/come', 'AbsentController.addCome')
      Route.put('/close', 'AbsentController.addClose')
      Route.get('/current', 'AbsentController.current')
      Route.get('/generate', 'AbsentController.create')
      Route.get('/', 'AbsentController.index')
    }).prefix('absent')
  }).middleware(['auth'])
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

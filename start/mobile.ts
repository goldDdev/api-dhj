import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/login', 'AuthController.login')
    Route.post('/logout', 'AuthController.logout')
    Route.get('/current', 'AuthController.current')
    Route.put('/edit-profile', 'AuthController.editProfile')
    Route.put('/change-password', 'AuthController.changePassword')
  }).prefix('auth')

  Route.group(() => {
    Route.group(() => {
      Route.put('/come', 'AbsentController.addCome')
      Route.put('/close', 'AbsentController.addClose')
      Route.get('/current', 'AbsentController.current')
      Route.get('/generate', 'AbsentController.create')
      Route.get('/', 'AbsentController.index')
    }).prefix('absent')

    Route.group(() => {
      Route.get('/', 'ProjectsController.index')
      Route.get('/absent', 'ProjectsController.index')
      Route.get('/detail', 'ProjectsController.view')
      Route.get('/:id', 'ProjectsController.view')
    }).prefix('project')

    Route.group(() => {
      Route.post('/', 'AdditionalHourController.create')
      Route.put('/', 'AdditionalHourController.update')
      Route.put('/status', 'AdditionalHourController.status')
      Route.get('/', 'AdditionalHourController.index')
      Route.get('/:id', 'AdditionalHourController.view')
    }).prefix('additional')

    Route.group(() => {
      Route.post('/', 'TrackingController.create')
    }).prefix('tracking')
  }).middleware(['auth'])
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

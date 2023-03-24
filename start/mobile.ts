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
      Route.put('/comes', 'AbsentController.addMultiple')
      Route.put('/close', 'AbsentController.addClose')
      Route.put('/closes', 'AbsentController.closeMultiple')
      Route.get('/current', 'AbsentController.current')
      Route.get('/', 'AbsentController.index')
    }).prefix('absent')

    Route.group(() => {
      Route.get('/', 'ProjectsController.index')
      Route.get('/absent', 'ProjectsController.index')
      Route.get('/detail', 'ProjectsController.view')
      Route.get('/:id', 'ProjectsController.view')
      Route.post('/scoping', 'ProjectsController.scoping')
    }).prefix('project')

    Route.group(() => {
      Route.get('/', 'AdditionalHourController.index')
      Route.get('/:id', 'AdditionalHourController.view')
      Route.delete('/:id', 'AdditionalHourController.destroy')
    }).prefix('additional')

    Route.group(() => {
      Route.post('/', 'TrackingController.create')
    }).prefix('tracking')
  }).middleware(['auth'])
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

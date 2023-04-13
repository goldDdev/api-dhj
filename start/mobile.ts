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
      Route.post('/come', 'AbsentController.addCome')
      Route.post('/project', 'AbsentController.project')
      Route.put('/project', 'AbsentController.updateProject')
      Route.put('/close', 'AbsentController.addClose')
      Route.get('/:id', 'AbsentController.view')
      Route.get('/', 'AbsentController.index')
    }).prefix('absent')

    Route.group(() => {
      Route.get('/', 'PayrolController.index')
      Route.get('/single', 'PayrolController.single')
      Route.get('/:id', 'PayrolController.view')
    }).prefix('payrol')

    Route.group(() => {
      Route.get('/', 'ProjectsController.index')
      Route.get('/absent', 'ProjectsController.index')
      Route.get('/detail', 'ProjectsController.view')
      Route.get('/test', 'ProjectsController.test')
      Route.get('/:id/boq', 'ProjectsController.listBoq')
      Route.get('/:id/progres', 'ProjectsController.listProgres')
      Route.get('/:id', 'ProjectsController.view')
      Route.post('/scoping', 'ProjectsController.scoping')
      Route.post('/:id/progres', 'ProjectsController.progres')
    }).prefix('project')

    Route.group(() => {
      Route.post('/progress', 'ProjectsController.planProgress')
    }).prefix('plan')

    Route.group(() => {
      Route.post('/', 'AdditionalHourController.create')
      Route.put('/', 'AdditionalHourController.update')
      Route.get('/', 'AdditionalHourController.index')
      Route.get('/:id', 'AdditionalHourController.view')
      Route.delete('/:id', 'AdditionalHourController.destroy')
    }).prefix('additional')

    Route.group(() => {
      Route.post('/', 'TrackingController.create')
    }).prefix('tracking')

    Route.get('/settings', 'SettingController.index')
  }).middleware(['auth', 'tz'])
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

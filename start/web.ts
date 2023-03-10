import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/login', 'AuthController.login')
  }).prefix('auth')

  Route.group(() => {
    Route.get('/', 'EmployeesController.index')
    Route.post('/', 'EmployeesController.create')
    Route.put('/', 'EmployeesController.update')
    Route.put('/status', 'EmployeesController.status')
    Route.get('/:id/detail', 'EmployeesController.view')
  }).prefix('employee')

  Route.group(() => {
    Route.get('/', 'ProjectsController.index')
    Route.post('/', 'ProjectsController.create')
    Route.put('/', 'ProjectsController.update')
    Route.put('/status', 'ProjectsController.status')
    Route.post('/worker', 'ProjectsController.addWorker')
    Route.delete('/:id/worker', 'ProjectsController.removeWorker')
    Route.get('/:id/detail', 'ProjectsController.view')
  }).prefix('project')
})
  .namespace('App/Controllers/Http/web')
  .prefix('web')

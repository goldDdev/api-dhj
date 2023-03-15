import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/login', 'AuthController.login')
  }).prefix('auth')

  Route.group(() => {
    Route.get('/', 'EmployeesController.index')
    Route.post('/', 'EmployeesController.create')
    Route.put('/:id/detail', 'EmployeesController.update')
    Route.put('/status', 'EmployeesController.status')
    Route.get('/:id/detail', 'EmployeesController.view')
  }).prefix('employee')

  Route.group(() => {
    Route.get('/', 'ProjectsController.index')
    Route.post('/', 'ProjectsController.create')
    Route.put('/', 'ProjectsController.update')
    Route.put('/status', 'ProjectsController.status')
    Route.post('/worker', 'ProjectsController.addWorker')
    Route.post('/:id/kom', 'ProjectKomController.create')
    Route.put('/:id/kom', 'ProjectKomController.create')
    Route.post('/:id/boq', 'ProjectBoqController.create')
    Route.put('/:id/boq', 'ProjectBoqController.update')
    Route.get('/:id/:parent/absent', 'ProjectsController.viewAbsent')
    Route.get('/:id/absent', 'ProjectsController.absent')
    Route.get('/:id/detail', 'ProjectsController.view')
    Route.get('/:id/worker', 'ProjectsController.listWorker')
    Route.get('/:id/kom', 'ProjectKomController.index')
    Route.get('/:id/boq', 'ProjectBoqController.index')
    Route.delete('/:id/worker', 'ProjectsController.removeWorker')
    Route.delete('/:id/kom', 'ProjectKomController.destroy')
    Route.delete('/:id/boq', 'ProjectBoqController.destroy')
  }).prefix('project')

  Route.resource('boq', 'BoqsController').except(['create', 'edit'])
  Route.resource('user', 'UsersController').except(['create', 'edit'])
})
  .namespace('App/Controllers/Http/web')
  .prefix('web')

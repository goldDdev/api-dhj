import Route from '@ioc:Adonis/Core/Route'
import EmployeesController from 'App/Controllers/Http/web/EmployeesController'

Route.group(() => {
  Route.group(() => {
    Route.get('/login', () => {
      return {}
    })
  }).prefix('auth')

  Route.group(() => {
    Route.get('/', 'EmployeesController.index')
    Route.post('/', 'EmployeesController.create')
    Route.put('/', 'EmployeesController.update')
    Route.put('/status', 'EmployeesController.status')
    Route.get('/:id/detail', 'EmployeesController.view')
  }).prefix('employee')
})
  .namespace('App/Controllers/Http/web')
  .prefix('web')

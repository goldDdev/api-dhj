import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.post('/login', 'AuthController.login')
  Route.get('/schedule/close', 'AbsentController.addClose')

  Route.group(() => {
    Route.group(() => {
      Route.get('/', 'EmployeesController.index')
      Route.get('/all', 'EmployeesController.all')
      Route.post('/', 'EmployeesController.create')
      Route.get('/:id', 'EmployeesController.view')
      Route.get('/:id/project', 'EmployeesController.project')
      Route.get('/:id/report', 'EmployeesController.reportAbsent')
      Route.post('/validation', 'EmployeesController.validation')
      Route.put('/', 'EmployeesController.update')
      Route.put('/status', 'EmployeesController.status')
      Route.put('/optional', 'EmployeesController.updateOptional')
      Route.delete('/:id', 'EmployeesController.destroy')
    }).prefix('employee')

    Route.group(() => {
      Route.get('/', 'SettingController.index')
      Route.put('/', 'SettingController.update')
    }).prefix('setting')

    Route.group(() => {
      Route.get('/', 'PayrolController.index')
      Route.get('/:id', 'PayrolController.view')
      Route.get('/:id/employee', 'PayrolController.employee')
      Route.get('/employee/all', 'PayrolController.employeeAll')
      Route.post('/multi', 'PayrolController.addMulti')
    }).prefix('payrol')

    Route.group(() => {
      Route.get('/', 'ProjectsController.index')
      Route.post('/', 'ProjectsController.create')
      Route.put('/', 'ProjectsController.update')
      Route.put('/status', 'ProjectsController.status')
      Route.post('/worker', 'ProjectsController.addWorker')
      Route.post('/validation', 'ProjectsController.validation')
      Route.post('/kom', 'ProjectKomController.create')
      Route.put('/kom', 'ProjectKomController.update')
      Route.post('/boq', 'ProjectBoqController.create')
      Route.put('/boq', 'ProjectBoqController.update')
      Route.put('/boq/value', 'ProjectBoqController.updateValue')
      Route.put('/overtime', 'ProjectOvertimeController.update')
      Route.put('/overtime/status', 'ProjectOvertimeController.status')
      Route.get('/overtime/:id', 'ProjectOvertimeController.view')
      Route.get('/:id/:parent/absent', 'ProjectsController.viewAbsent')
      Route.get('/:id/absent', 'ProjectsController.absent')
      Route.get('/:id', 'ProjectsController.view')
      Route.get('/:id/worker', 'ProjectsController.listWorker')
      Route.get('/:id/progress', 'ProjectProgresController.index')
      Route.get('/:id/koms', 'ProjectKomController.index')
      Route.get('/:id/overtimes', 'ProjectOvertimeController.index')
      Route.get('/:id/boqs', 'ProjectBoqController.index')
      Route.get('/:id/kom', 'ProjectKomController.view')
      Route.get('/:id/boq', 'ProjectBoqController.view')
      Route.get('/:id/search', 'ProjectBoqController.search')
      Route.delete('/:id', 'ProjectsController.destroy')
      Route.delete('/:id/worker', 'ProjectsController.removeWorker')
      Route.delete('/:id/kom', 'ProjectKomController.destroy')
      Route.delete('/:id/boq', 'ProjectBoqController.destroy')
      Route.delete('/:id/overtime', 'ProjectOvertimeController.destroy')
    }).prefix('project')

    Route.group(() => {
      Route.get('/', 'AbsentController.index')
    }).prefix('absent')

    Route.group(() => {
      Route.get('/', 'InventoryRequestController.index')
      Route.get('/:id/items', 'InventoryRequestController.items')
    }).prefix('use-inventory')

    Route.group(() => {
      Route.get('/:id/all', 'ProjectProgresController.all')
      Route.put('/', 'ProjectProgresController.update')
      Route.put('/confirm', 'ProjectProgresController.confirm')
      Route.delete('/:id', 'ProjectProgresController.delete')
    }).prefix('progres')

    Route.get('/tracking', 'TrackingController.index')
    Route.get('/current', 'UsersController.current')
    Route.post('/logout', 'AuthController.logout')

    Route.resource('boq', 'BoqsController').except(['create', 'edit'])
    Route.resource('user', 'UsersController').except(['create', 'edit'])
    Route.resource('inventory', 'InventoryController').except(['create', 'edit'])
  }).middleware(['auth', 'tz'])
})
  .namespace('App/Controllers/Http/web')
  .prefix('web')

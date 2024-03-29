import Route from '@ioc:Adonis/Core/Route'

Route.get('/plan-boq/progres', 'PlanBoqController.progres')

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
      Route.post('/', 'AbsentController.addSingle')
      Route.post('/offline', 'AbsentController.offlineAbsent')
      Route.post('/come', 'AbsentController.addCome')
      Route.post('/project', 'AbsentController.project')
      Route.put('/project', 'AbsentController.updateProject')
      Route.put('/close', 'AbsentController.addClose')
      Route.put('/out', 'AbsentController.closeSingle')
      Route.put('/offline', 'AbsentController.offlineAbsentClose')
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
      Route.get('/:id/plan', 'PlanBoqController.listPlan')
      Route.get('/:id', 'ProjectsController.view')
      Route.post('/scoping', 'ProjectsController.scoping')
      Route.post('/:id/progres', 'ProjectsController.progres')
      Route.delete('/:id/progres', 'ProjectsController.destroyProgres')
    }).prefix('project')

    Route.group(() => {
      Route.post('/progress', 'PlanBoqController.create')
      Route.get('/:id/progress', 'PlanBoqController.index')
      Route.get('/:id/list', 'PlanBoqController.progres')
      Route.delete('/:id', 'PlanBoqController.destroy')
    }).prefix('plan')

    Route.group(() => {
      Route.get('/:id/list', 'ProgressController.progres')
    }).prefix('progress')

    Route.group(() => {
      Route.post('/', 'AdditionalHourController.create')
      Route.put('/', 'AdditionalHourController.update')
      Route.put('/status', 'AdditionalHourController.updateStatus')
      Route.get('/', 'AdditionalHourController.index')
      Route.get('/team', 'AdditionalHourController.pendingOvertime')
      Route.get('/:id', 'AdditionalHourController.view')
      Route.delete('/:id', 'AdditionalHourController.destroy')
    }).prefix('additional')

    Route.group(() => {
      Route.get('/material', 'InventoryController.listMaterial')
      Route.get('/equipment', 'InventoryController.listEquipment')
      Route.get('/request/:id/items', 'InventoryController.details')
      Route.get('/request/:id', 'InventoryController.view')
      Route.post('/request', 'InventoryController.create')
      Route.put('/request-status', 'InventoryController.status')
    }).prefix('inventory')

    Route.group(() => {
      Route.post('/', 'TrackingController.create')
      Route.post('/daily', 'TrackingController.daily')
    }).prefix('tracking')

    Route.group(() => {
      Route.get('/', 'DailyPlanController.index')
      Route.get('/project', 'DailyPlanController.projects')
      Route.get('/employee', 'DailyPlanController.employees')
      Route.post('/', 'DailyPlanController.store')
      Route.put('/', 'DailyPlanController.update')
      Route.delete('/:id', 'DailyPlanController.destroy')
    }).prefix('daily-plan')

    Route.get('/settings', 'SettingController.index')
    Route.post('/logout', 'AuthController.logout')
  }).middleware(['auth', 'tz'])
})
  .namespace('App/Controllers/Http/mobile')
  .prefix('mobile')

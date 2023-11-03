const chartSupplements = require('./')

// Should log current cycle effective object
chartSupplements.fetchCycle().then(c => {
  console.log('current cycle effective object, no param')
  console.dir(c)
})

// Should log current cycle effective object
chartSupplements.fetchCycle('Current').then(c => {
  console.log('current cycle effective object, with param')
  console.dir(c)
})

// Should log next cycle effective object
chartSupplements.fetchCycle('Next').then(c => {
  console.log('next cycle effective object, with param')
  console.dir(c)
})

// Should log current cycle code
chartSupplements.fetchCurrentCycleCode().then(c => {
  console.log('current cycle code')
  console.log(c)
})

// Should log the current cycle effective dates
chartSupplements.getCycleEffectiveDates().then(c => {
  console.log('the current cycle effective dates, no param')
  console.log(c)
})
// Should log the current cycle effective dates
chartSupplements.getCycleEffectiveDates('Current').then(c => {
  console.log('the current cycle effective dates, with param')
  console.log(c)
})
// Should log the next cycle effective dates
chartSupplements.getCycleEffectiveDates('Next').then(c => {
  console.log('the next cycle effective dates')
  console.log(c)
})

// Should log the current cycle effective dates
chartSupplements.currentCycleEffectiveDates().then(c => {
  console.log('the current cycle effective dates')
  console.log(c)
})

// The `getNextCycle` option will get the next cycle if it is available when set to true
//  If it is omitted or set to false, the current cycle will be queried
chartSupplements.list(['PANC', 'PADK'], { getNextCycle: false }).then(results => {
  console.log(JSON.stringify(results, null, 2))
})

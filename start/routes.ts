/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { Effect } from 'effect'

router.get('/', () => {
  return Effect.gen(function* () {
    return {
      hello: 'world',
    }
  })
})

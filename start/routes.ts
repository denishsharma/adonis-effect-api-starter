/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { HttpRequestService } from '#core/http/services/request_service'
import { RuntimeUtility } from '#utils/runtime_utility'
import { SchemaUtility } from '#utils/schema_utility'
import router from '@adonisjs/core/services/router'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

router.get('/', async (ctx) => {
  return Effect.gen(function* () {
    const requestService = yield* HttpRequestService

    const payload = yield* requestService.validator.validateUsing(
      vine.compile(
        vine.object({
          __qs: vine.object({
            name: vine.string().optional(),
          }),
        }),
      ),
    )(ctx).pipe(
      Effect.flatMap(data => Effect.suspend(() =>
        Schema
          .decode(
            Schema.Struct({
              name: Schema.optionalWith(Schema.String, { nullable: true, default: () => 'world' }),
            }),
          )({ name: data.__qs.name })
          .pipe(
            SchemaUtility.toSchemaParseError('Unexpected error while decoding request', {
              name: data.__qs.name,
            }),
          ),
      )),
    )

    return {
      hello: payload.name,
    }
  }).pipe(
    RuntimeUtility.ensureDependencies(),
  )
})

/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { HttpRequestService } from '#core/http/services/request_service'
import { HttpResponseService } from '#core/http/services/response_service'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { RuntimeUtility } from '#utils/runtime_utility'
import router from '@adonisjs/core/services/router'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

router.get('/', async (ctx) => {
  return await Effect.gen(function* () {
    const responseService = yield* HttpResponseService
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

    yield* responseService.context.specifyMessage(`Hello, ${payload.name}!`)

    return {
      hello: payload.name,
    }
  }).pipe(
    RuntimeUtility.ensureDependencies(),
    RuntimeUtility.run({ ctx }),
  )
})

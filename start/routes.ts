/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { toSchemaParseError } from '#core/error/utils/error_utility'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import { ensureApplicationRuntimeDependencies } from '#shared/runtime/utils/runtime_utility'
import router from '@adonisjs/core/services/router'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

router.get('/', async () => {
  return Effect.gen(function* () {
    const responseContextService = yield* HttpResponseContextService
    const requestService = yield* HttpRequestService

    const payload = yield* requestService
      .validateRequest(
        vine.compile(
          vine.object({
            __qs: vine.object({
              name: vine.string().optional(),
            }),
          }),
        ),
      )
      .pipe(
        Effect.flatMap(data =>
          Effect.suspend(() =>
            Schema
              .decode(
                Schema.Struct({
                  name: Schema.optionalWith(Schema.String, { nullable: true, default: () => 'world' }),
                }),
              )({ name: data.__qs.name })
              .pipe(
                toSchemaParseError('Unexpected error while decoding request', {
                  name: data.__qs.name,
                }),
              ),
          ).pipe(withTelemetrySpan('decode_request_payload')),
        ),
        withTelemetrySpan('validate_request_payload'),
      )

    yield* responseContextService.setResponseMessage(`Hello, ${payload.name}!`)

    return {
      hello: payload.name,
    }
  }).pipe(
    ensureApplicationRuntimeDependencies(),
  )
})

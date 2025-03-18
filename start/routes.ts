/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { ValidateRequestService } from '#core/http/services/request/validate_request_service'
import { ResposneContextService } from '#core/http/services/response/response_context_service'
import { RuntimeUtility } from '#core/runtime/utils/runtime_utility'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { TelemetryUtility } from '#core/telemetry/utils/telemetry_utility'
import router from '@adonisjs/core/services/router'
import vine from '@vinejs/vine'
import { Effect, Schema } from 'effect'

router.get('/', async (ctx) => {
  return Effect.gen(function* () {
    const responseContextService = yield* ResposneContextService
    const validateRequestService = yield* ValidateRequestService

    const payload = yield* validateRequestService
      .validateUsing(
        vine.compile(
          vine.object({
            __qs: vine.object({
              name: vine.string().optional(),
            }),
          }),
        ),
      )(ctx)
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
                SchemaUtility.toSchemaParseError('Unexpected error while decoding request', {
                  name: data.__qs.name,
                }),
              ),
          ).pipe(TelemetryUtility.withTelemetrySpan('decode_request_payload')),
        ),
        TelemetryUtility.withTelemetrySpan('validate_request_payload'),
      )

    yield* responseContextService.specifyMessage(`Hello, ${payload.name}!`)

    return {
      hello: payload.name,
    }
  }).pipe(
    RuntimeUtility.ensureDependencies(),
  )
})

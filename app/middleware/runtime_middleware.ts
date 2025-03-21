import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ErrorUtility } from '#core/error/utils/error_utility'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import { SuccessResponse } from '#core/http/schemas/success_response_schema'
import { MakeResponseService } from '#core/http/services/response/make_response_service'
import { RuntimeUtility } from '#core/runtime/utils/runtime_utility'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { TelemetryUtility } from '#core/telemetry/utils/telemetry_utility'
import { EffectUtility } from '#utils/effect_utility'
import is from '@adonisjs/core/helpers/is'
import { Effect, Either, Ref, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export default class RuntimeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const accepts = ctx.request.accepts(['json'])

    await next()

    /**
     * Check if the response has content
     * to be processed.
     */
    if (ctx.response.hasContent) {
      /**
       * Get the content from the response
       * to be processed.
       */
      const content = ctx.response.content![0]

      const program = Effect.gen(function* () {
        const makeResponseService = yield* MakeResponseService

        /**
         * Extract the effectful program from the content
         * to be processed.
         */
        const effectProgram = yield* Effect.gen(function* () {
          const effectful = yield* Ref.make<Effect.Effect<unknown, unknown, unknown>>(content)

          /**
           * Check if the content is an effect, if so
           * set the effectful reference to the content.
           *
           * Otherwise, wrap the content in an effectful
           * program to be processed.
           */
          if (Effect.isEffect(content)) {
            yield* Ref.set(effectful, content)
          } else {
            if (is.promise(content) || is.asyncFunction(content)) {
              yield* Ref.set(effectful, Effect.tryPromise({
                try: async () => is.asyncFunction(content) ? await content() : await content,
                catch: ErrorUtility.toException(),
              }))
            } else {
              yield* Ref.set(effectful, Effect.try({
                try: () => content,
                catch: ErrorUtility.toException(),
              }))
            }
          }

          return yield* effectful.get
        }).pipe(
          TelemetryUtility.withTelemetrySpan('extract_effect'),
        )

        const effectResult = yield* effectProgram.pipe(
          TelemetryUtility.withTelemetrySpan('execute_effect'),
        )

        return yield* Effect.gen(function* () {
          /**
           * Check if the content is an exception response
           * to be sent as a response.
           *
           * If so, set the response status to the exception
           * response status and return the exception response
           * as the response content without processing it.
           */
          const exceptionResponse = Schema.decodeUnknownEither(ExceptionResponse)(effectResult)
          if (Either.isRight(exceptionResponse)) {
            ctx.response.status(exceptionResponse.right.status)
            return effectResult
          }

          /**
           * If the client accepts JSON, make a success
           * response from the content to be sent as a
           * response.
           */
          if (accepts === 'json') {
            const successResponse = yield* makeResponseService.success(ctx)(effectResult)
            ctx.response.status(successResponse.status)
            return yield* Effect.suspend(() =>
              Schema.encode(SuccessResponse, { errors: 'all' })(successResponse).pipe(
                SchemaUtility.toSchemaParseError('Unexpected error while encoding success response.', successResponse),
              ),
            ).pipe(TelemetryUtility.withTelemetrySpan('encode_success_response'))
          }

          /**
           * If the client does not accept JSON, return
           * the content as is without processing it.
           *
           * This is useful for returning binary data
           * such as images, videos, etc.
           */
          ctx.response.status(StatusCodes.OK)
          return effectResult
        }).pipe(TelemetryUtility.withTelemetrySpan('process_client_response'))
      }).pipe(EffectUtility.withContextType<any>())

      /**
       * Run the program to process the response content
       * to be sent as a response.
       */
      const response = await program.pipe(
        RuntimeUtility.ensureDependencies(),
        TelemetryUtility.withScopedTelemetry('runtime_middleware'),
        RuntimeUtility.run({ ctx }),
      )

      /**
       * Send the response to the client.
       */
      return ctx.response.send(response)
    }
  }
}

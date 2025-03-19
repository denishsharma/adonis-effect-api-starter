import type { RequestValidationOptions } from '@adonisjs/core/types/http'
import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes } from '@vinejs/vine/types'
import { CurrentHttpContext } from '#core/http/contexts/current_http_context'
import { TelemetryUtility } from '#core/telemetry/utils/telemetry_utility'
import ValidationException from '#exceptions/validation_exception'
import { Effect } from 'effect'

/**
 * Service to validate the request for the current HTTP context.
 */
export class ValidateRequestService extends Effect.Service<ValidateRequestService>()('@service/http/request/validate', {
  effect: Effect.gen(function* () {
    function validateUsing<S extends SchemaTypes, M extends undefined | Record<string, any>>(
      validator: VineValidator<S, M>,
      ...[options]: [undefined] extends M
        ? [options?: RequestValidationOptions<M> | undefined]
        : [options: RequestValidationOptions<M>]
    ) {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext

        /**
         * Merge the request body, params, cookies, headers and query string into a single object.
         * This object will be used to validate the request using the VineJS validator.
         *
         * The object will have the following properties along with request body:
         * - __params: The request params.
         * - __cookies: The request cookies.
         * - __headers: The request headers.
         * - __qs: The query string.
         */
        const data = yield* withContextOr(
          ctx => Effect.succeed({
            ...ctx.request.all(),
            ...ctx.request.allFiles(),
            __params: ctx.request.params() ?? {},
            __cookies: ctx.request.cookiesList() ?? {},
            __headers: ctx.request.headers() ?? {},
            __qs: ctx.request.qs() ?? {},
          }),
          () => Effect.succeed({}),
        ).pipe(TelemetryUtility.withTelemetrySpan('merge_request_data'))

        return yield* Effect.tryPromise({
          try: async () => (await validator.validate(data, options as any)) as Infer<S>,
          catch: ValidationException.toValidationExceptionOrUnknownError({ unknown: 'Unknown error occurred while validating the request data.' }),
        }).pipe(TelemetryUtility.withTelemetrySpan('validate_request_with_vine'))
      })
    }

    return {
      /**
       * Validate the request using the VineJS validator.
       * This is a curried function that can be used to validate the request using the VineJS validator.
       *
       * You can validate request body, params, cookies, headers and query string using this function.
       *
       * @param validator The VineJS validator to use for validation.
       * @param options The request validation options.
       *
       * @param self The HTTP context to validate the request for.
       */
      validateUsing,
    }
  }),
}) {}

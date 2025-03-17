import type { HttpContext } from '@adonisjs/core/http'
import type { RequestValidationOptions } from '@adonisjs/core/types/http'
import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes } from '@vinejs/vine/types'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import ValidationException from '#exceptions/validation_exception'
import { errors } from '@vinejs/vine'
import { Effect, Match } from 'effect'

export class ValidateRequestService extends Effect.Service<ValidateRequestService>()('@service/http/validate_request', {
  effect: Effect.gen(function* () {
    function validateUsing<S extends SchemaTypes, M extends undefined | Record<string, any>>(
      validator: VineValidator<S, M>,
      ...[options]: [undefined] extends M
        ? [options?: RequestValidationOptions<M> | undefined]
        : [options: RequestValidationOptions<M>]
    ) {
      return Effect.fn(function* (self: HttpContext) {
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
        const data = {
          ...self.request.all(),
          ...self.request.allFiles(),
          __params: self.request.params() ?? {},
          __cookies: self.request.cookiesList() ?? {},
          __headers: self.request.headers() ?? {},
          __qs: self.request.qs() ?? {},
        }

        return yield* Effect.tryPromise({
          try: async () => (await validator.validate(data, options as any)) as Infer<typeof validator>,
          catch: (error) => {
            return Match.value(error).pipe(
              Match.when(
                (err: unknown) => err instanceof errors.E_VALIDATION_ERROR,
                err => ValidationException.fromException(err),
              ),
              Match.orElse(err => ErrorUtility.toInternalServerException(err, 'Unexpected error occurred while validating the request.')),
            )
          },
        })
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

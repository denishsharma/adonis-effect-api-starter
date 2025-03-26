import type { MergedRequestData } from '#core/http/types/http_request_type'
import type { RequestValidationOptions } from '@adonisjs/core/types/http'
import type { VineValidator } from '@vinejs/vine'
import type { SchemaTypes } from '@vinejs/vine/types'
import { inferCauseFromUnknownError } from '#core/error/utils/error_utility'
import { CurrentHttpContext } from '#core/http/contexts/current_http_context'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import { validateWithVine } from '#core/validation/utils/vine_utility'
import NoSuchElementError from '#errors/no_such_element_error'
import { cuid } from '@adonisjs/core/helpers'
import { Effect, Option, pipe } from 'effect'
import * as lodash from 'lodash-es'

export default class HttpRequestService extends Effect.Service<HttpRequestService>()('@service/http/request', {
  effect: Effect.gen(function* () {
    function getRequestId<T extends boolean = false>(generateDefault?: T) {
      const resolvedGenerateDefault = lodash.defaultTo(generateDefault, false)

      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        const id = yield* withContextOr(
          ctx => Effect.succeed(ctx.request.id()),
          () => Effect.succeed(resolvedGenerateDefault ? cuid() : undefined),
        )
        return lodash.defaultTo(id, resolvedGenerateDefault ? cuid() : undefined) as T extends true ? string : string | undefined
      })
    }

    function getRequestData() {
      return Effect.gen(function* () {
        const { withContextOr } = yield* CurrentHttpContext
        /**
         * Merge the request body, params, cookies, headers and query string into a single object.
         *
         * The object will have the following properties along with request body:
         * - __params: The request params.
         * - __cookies: The request cookies.
         * - __headers: The request headers.
         * - __qs: The query string.
         */
        return yield* withContextOr(
          ctx => Option.some({
            ...ctx.request.all(),
            ...ctx.request.allFiles(),
            __params: lodash.defaultTo(ctx.request.params(), {}),
            __cookies: lodash.defaultTo(ctx.request.cookiesList(), {}),
            __headers: lodash.defaultTo(ctx.request.headers(), {}),
            __qs: lodash.defaultTo(ctx.request.qs(), {}),
          } as MergedRequestData),
          () => Option.none(),
        ).pipe(
          Effect.catchTag('NoSuchElementException', error => pipe(
            error,
            inferCauseFromUnknownError(),
            cause => new NoSuchElementError('Either the request context or request data is not available.', { cause: lodash.defaultTo(cause, error) }),
          )),
        )
      })
    }

    function validateRequest<S extends SchemaTypes, M extends undefined | Record<string, any>>(
      validator: VineValidator<S, M>,
      ...[options]: [undefined] extends M
        ? [options?: RequestValidationOptions<M> | undefined]
        : [options: RequestValidationOptions<M>]
    ) {
      return Effect.suspend(() => pipe(
        getRequestData().pipe(Effect.catchTag('@error/internal/no_such_element', () => Effect.succeed({}))),
        validateWithVine(
          validator,
          {
            validator: options as any,
            exception: {
              validation: 'Validation error occurred while validating the request data.',
              unknown: 'Unknown error occurred while validating the request data.',
            },
          },
        ),
      )).pipe(withTelemetrySpan('validate_request_with_vine'))
    }

    return {
      /**
       * Retrieves the request ID from the current HTTP context.
       * If a request ID is not found and `generateDefault` is `true`,
       * a new unique ID is generated. Otherwise, it returns `undefined`.
       *
       * @param generateDefault Whether to generate a default request ID if none exists. Defaults to `false`.
       *
       * @example
       * ```ts
       * const requestId = yield* getRequestId();
       * // Possible result: undefined (if no request ID exists)
       *
       * const requestIdWithFallback = yield* getRequestId(true);
       * // Possible result: 'ckxyz123...' (generated ID if no request ID exists)
       * ```
       */
      getRequestId,

      /**
       * Get the request data from the current HTTP context.
       *
       * This function will return the request body, params, cookies,
       * headers and query string from the current HTTP context.
       *
       * If the request context is not available, this function will
       * return `NoSuchElementError`.
       *
       * @example
       * ```ts
       * const requestData = yield* getRequestData()
       * ```
       */
      getRequestData,

      /**
       * Validate the request using the VineJS validator.
       * This is a curried function that can be used to validate the request using the VineJS validator.
       *
       * You can validate request body, params, cookies, headers and query string using this function.
       *
       * @param validator The VineJS validator to use for validation.
       * @param options The request validation options.
       *
       * @example
       * ```ts
       * const validated = yield* validateRequest()(
       *   vine.compile(
       *     vine.object({
       *       // Validates the request body.
       *       name: vine.string(),
       *       age: vine.number(),
       *
       *       // Validates the request params.
       *       __params: vine.object({
       *         id: vine.number(),
       *       }),
       *
       *       // Validates the request cookies.
       *       __cookies: vine.object({
       *         token: vine.string(),
       *       })
       *
       *       // Validates the request headers.
       *       __headers: vine.object({
       *         'x-api-key': vine.string(),
       *       }),
       *
       *       // Validates the query string.
       *       __qs: vine.object({
       *         page: vine.number(),
       *       })
       *     })
       *   )
       * )
       */
      validateRequest,
    }
  }),
}) {}

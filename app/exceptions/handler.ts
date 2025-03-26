import type { TaggedException } from '#core/error/factories/tagged_exception'
import type { HttpContext } from '@adonisjs/core/http'
import { ExceptionCode } from '#constants/exception_constant'
import { toSchemaParseError } from '#core/error/utils/error_utility'
import { ResponseType } from '#core/http/constants/response_type_constant'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import HttpMakeResponseService from '#core/http/services/http_make_response_service'
import { logErrorToTelemetry, withScopedTelemetry, withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import { toException } from '#shared/error_handler/utils/convert_error_utility'
import { ensureApplicationRuntimeDependencies, runPromise } from '#shared/runtime/utils/runtime_utility'
import { ExceptionHandler } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Cause, Effect, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * An array of HTTP status codes to ignore when reporting
   * an error
   */
  protected ignoreStatuses: number[] = [
    400,
    422,
    401,
  ]

  /**
   * An array of error codes to ignore when reporting
   * an error
   */
  protected ignoreCodes: string[] = []

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * Serialize the exception to a response
     */
    let response = {} as Schema.Schema.Encoded<typeof ExceptionResponse>
    try {
      response = await Effect.gen(function* () {
        /**
         * Convert the error to a tagged exception,
         * and handle the exception based on its type.
         */
        const exception = toException()(error) as TaggedException<string, any>

        const makeResponseService = yield* HttpMakeResponseService
        const exceptionResponse = yield* makeResponseService.makeExceptionResponse()(exception)
        return yield* Effect.suspend(() =>
          Schema.encode(ExceptionResponse, { errors: 'all' })(exceptionResponse).pipe(
            toSchemaParseError('Unexpected error while encoding exception response.', exceptionResponse),
          ),
        ).pipe(withTelemetrySpan('encode_exception_response'))
      }).pipe(
        ensureApplicationRuntimeDependencies(),
        withScopedTelemetry('global_error_handler'),
        runPromise({ ctx }),
      )
    } catch (cause) {
      /**
       * If an error occurs while encoding the exception response,
       * log the error and return a generic error response.
       */
      logger.fatal(
        Cause.die(cause).toJSON(),
        'An unexpected error was thrown during the error handling process.',
      )

      response = {
        type: ResponseType.EXCEPTION as const,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        exception: ExceptionCode.E_INTERNAL_SERVER_ERROR,
        message: 'FATAL ERROR: An unexpected error was thrown during the error handling process.',
        metadata: {
          request_id: ctx.request.id()!,
          timestamp: new Date().toISOString(),
        },
      } satisfies Schema.Schema.Encoded<typeof ExceptionResponse> as Schema.Schema.Encoded<typeof ExceptionResponse>
    }

    return ctx.response.status(response.status).json(response)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    await pipe(
      error,
      logErrorToTelemetry(['adonis_exception', 'unknown'], 'global_error_handler'),
      toSchemaParseError('Unexpected error while logging error.', error),
      withTelemetrySpan('global_error_handler'),
      runPromise({ ctx }),
    )

    return super.report(error, ctx)
  }
}

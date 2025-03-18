import type { SuccessResponse } from '#core/http/schemas/success_response_schema'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import env from '#start/env'
import { cuid } from '@adonisjs/core/helpers'
import is from '@adonisjs/core/helpers/is'
import opentelemetry from '@opentelemetry/api'
import { Either, Match, Schema } from 'effect'
import { getReasonPhrase } from 'http-status-codes'

export default class TelemetryMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Get the tracer from the OpenTelemetry API
     * and start a new span for the current request lifecycle
     */
    const tracer = opentelemetry.trace.getTracer(env.get('OTEL_APPLICATION_SERVICE_NAME'))

    /**
     * Generate a unique request ID for the current request
     * if it does not exists already
     */
    const currentRequestId = ctx.request.id() ?? cuid()
    if (is.nullOrUndefined(ctx.request.id())) {
      ctx.request.headers()['x-request-id'] = currentRequestId
    }

    /**
     * Start a new span for the current request lifecycle
     * and set the attributes for the current request span
     */
    const currentRequestSpan = tracer.startSpan(`${ctx.request.method().toUpperCase()} ${ctx.request.url()} [${currentRequestId}]`)
    currentRequestSpan.setAttributes({
      'http.method': ctx.request.method().toUpperCase(),
      'http.url': ctx.request.url(),
      'http.request_id': currentRequestId,
      'http.request_size': ctx.request.header('content-length'),
      'http.request_content_type': ctx.request.header('content-type'),
      'http.request_accept': ctx.request.header('accept'),
      'http.user_agent': ctx.request.header('user-agent'),
      'http.client_ip': ctx.request.ip(),
      'http.host': ctx.request.header('host'),
      'http.protocol': ctx.request.protocol(),
      'http.scheme': ctx.request.secure() ? 'https' : 'http',
    })

    try {
      await opentelemetry.context.with(opentelemetry.trace.setSpan(opentelemetry.context.active(), currentRequestSpan), async () => {
        /**
         * Execute the next middleware in the chain
         */
        await next()
      })

      const isResponseOK = ctx.response.getStatus() >= 200 && ctx.response.getStatus() < 300

      /**
       * Match the response content type and set the span
       * attributes and status based on the response type
       */
      Match.type<{ content: boolean, stream: boolean, fileStream: boolean }>().pipe(
        Match.when(
          ({ content }) => content,
          () => () => {
            const content = ctx.response.content![0]
            const isExceptionResponse = Schema.decodeUnknownEither(ExceptionResponse)(content).pipe(
              Either.match({
                onLeft: () => false,
                onRight: () => true,
              }),
            )

            /**
             * Match the response content type and set the span
             * attributes and status based on the response type
             */
            Match.value(isExceptionResponse || !isResponseOK).pipe(
              Match.when(true, () => () => {
                const status = ctx.response.getStatus()
                const message = (content as Schema.Schema.Encoded<typeof ExceptionResponse>).message

                /**
                 * Set the response attributes for the current request span
                 * if the response is an exception response or the status
                 * code is not OK
                 */
                currentRequestSpan.setAttributes({
                  'http.response_status': status,
                  'http.response_message': message,
                })

                /**
                 * Set the status of the current request span to error
                 * if the response is an exception response or the status
                 * code is not OK
                 */
                currentRequestSpan.setStatus({
                  code: opentelemetry.SpanStatusCode.ERROR,
                  message,
                })
              }),
              Match.when(false, () => () => {
                const status = ctx.response.getStatus()
                const message = ctx.response.context().access().message
                  ?? (content as Schema.Schema.Encoded<typeof SuccessResponse>).message
                  ?? getReasonPhrase(status)

                /**
                 * Set the response attributes for the current request span
                 * if the response is not an exception response and the status
                 * code is OK
                 */
                currentRequestSpan.setAttributes({
                  'http.response_status': status,
                  'http.response_message': message,
                })

                /**
                 * Set the status of the current request span to OK
                 * if the response is not an exception response and the status
                 * code is OK
                 */
                currentRequestSpan.setStatus({
                  message,
                  code: opentelemetry.SpanStatusCode.OK,
                })
              }),
              Match.exhaustive,
            )()
          },
        ),
        Match.orElse(() => () => {
          const status = ctx.response.getStatus()
          const message = getReasonPhrase(status)

          /**
           * Set the response attributes for the current request span
           * if the response is a stream or a file stream
           */
          currentRequestSpan.setAttributes({
            'http.response_status': status,
            'http.response_message': message,
          })

          /**
           * Set the status of the current request span to OK
           * if the response is a stream or a file stream
           */
          currentRequestSpan.setStatus({
            message,
            code: isResponseOK ? opentelemetry.SpanStatusCode.OK : opentelemetry.SpanStatusCode.ERROR,
          })
        }),
      )({ content: ctx.response.hasContent, stream: ctx.response.hasStream, fileStream: ctx.response.hasFileToStream })()
    } catch (error) {
      /**
       * Set the status of the current request span to error
       * if there was an error while setting the span
       * and rethrow the error
       */
      currentRequestSpan.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: error.message,
      })

      throw error
    } finally {
      /**
       * End the current request span after the request
       * has been processed
       */
      currentRequestSpan.end()
    }
  }
}

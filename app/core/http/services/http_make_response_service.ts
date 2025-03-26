import type { TaggedException } from '#core/error/factories/tagged_exception'
import type { MakeExceptionResponseOptions, MakeSuccessResponseOptions } from '#core/http/types/http_make_response_type'
import { toSchemaParseError } from '#core/error/utils/error_utility'
import { ResponseType } from '#core/http/constants/response_type_constant'
import { inferResponseDataModeFromData } from '#core/http/internals/shared'
import { validateResponseDataForResponseDataMode, validateResponseMetadataForResponseDataMode } from '#core/http/internals/validate_response'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import { SuccessResponse } from '#core/http/schemas/success_response_schema'
import HttpRequestService from '#core/http/services/http_request_service'
import HttpResponseContextService from '#core/http/services/http_response_context_service'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import is from '@adonisjs/core/helpers/is'
import { defu } from 'defu'
import { Effect, Function, Option, pipe, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as lodash from 'lodash-es'

export default class HttpMakeResponseService extends Effect.Service<HttpMakeResponseService>()('@service/http/make_response', {
  dependencies: [HttpRequestService.Default, HttpResponseContextService.Default],
  effect: Effect.gen(function* () {
    const request = yield* HttpRequestService
    const context = yield* HttpResponseContextService

    function makeSuccessResponse(options?: MakeSuccessResponseOptions) {
      return (data: unknown) =>
        Effect.gen(function* () {
          const metadata = yield* context.getResponseMetadata()
          const dataMode = yield* context.getResponseDataMode()
          const message = yield* context.getResponseMessage()
          const requestId = yield* request.getRequestId(true)

          const resolvedOptions = defu(options, {
            message,
            metadata,
            status: StatusCodes.OK,
            dataMode: lodash.defaultTo(dataMode, inferResponseDataModeFromData()(data)),
          })

          return yield* Effect.gen(function* () {
            const response = {
              data,
              type: ResponseType.SUCCESS as const,
              status: resolvedOptions.status,
              message: is.string(resolvedOptions.message) ? resolvedOptions.message : undefined,
              metadata: defu(
                {
                  request_id: requestId,
                  data_mode: resolvedOptions.dataMode,
                  timestamp: new Date().toISOString(),
                },
                resolvedOptions.metadata,
              ),
            } satisfies Schema.Schema.Encoded<typeof SuccessResponse>

            yield* pipe(
              { metadata: response.metadata, dataMode: resolvedOptions.dataMode },
              validateResponseMetadataForResponseDataMode(),
            ).pipe(withTelemetrySpan('validate_metadata'))

            yield* pipe(
              { data, dataMode: resolvedOptions.dataMode },
              validateResponseDataForResponseDataMode(),
            ).pipe(withTelemetrySpan('validate_data_mode'))

            return yield* Effect.suspend(() =>
              Schema.decode(SuccessResponse, { errors: 'all' })(response).pipe(
                toSchemaParseError('Unexpected error while decoding success response', response),
              ),
            ).pipe(withTelemetrySpan('decode_success_response'))
          })
        }).pipe(
          withTelemetrySpan('make_success_response'),
        )
    }

    function makeExceptionResponse(options?: MakeExceptionResponseOptions) {
      return <T extends string, F extends Schema.Struct.Fields | undefined>(exception: TaggedException<T, F>) =>
        Effect.gen(function* () {
          const metadata = yield* context.getResponseMetadata()
          const requestId = yield* request.getRequestId(true)

          const resolvedOptions = defu(options, {
            metadata,
            status: exception.status,
            message: exception.message,
          })

          return yield* Effect.gen(function* () {
            const response = {
              type: ResponseType.EXCEPTION as const,
              status: resolvedOptions.status,
              message: resolvedOptions.message,
              exception: exception.code,
              data: pipe(
                yield* exception.data(),
                Option.match({
                  onNone: () => undefined,
                  onSome: Function.identity,
                }),
              ),
              metadata: defu({
                request_id: requestId,
                timestamp: new Date().toISOString(),
              }, resolvedOptions.metadata),
            } satisfies Schema.Schema.Encoded<typeof ExceptionResponse>

            return yield* Effect.suspend(() =>
              Schema.decode(ExceptionResponse, { errors: 'all' })(response).pipe(
                toSchemaParseError('Unexpected error while decoding exception response', response),
              ),
            ).pipe(withTelemetrySpan('decode_exception_response'))
          })
        }).pipe(
          withTelemetrySpan('make_exception_response'),
        )
    }

    return {
      /**
       * Create a success response from the content to be sent as a response.
       *
       * It will infer the data mode from the content if not provided,
       * and it will merge the metadata with the existing metadata of the current response.
       *
       * This will also validate the response against the success response schema
       * to ensure that the response is valid and conforms to the schema and metadata.
       *
       * @param options The options to be used for creating the success response.
       */
      makeSuccessResponse,

      /**
       * Make an exception response from the exception to be sent as a response.
       *
       * It will merge the metadata with the existing metadata of the current response.
       *
       * This will also validate the response against the exception response schema
       * to ensure that the response is valid and conforms to the schema and metadata.
       *
       * @param options The options to be used for creating the exception response.
       */
      makeExceptionResponse,
    }
  }),
}) {}

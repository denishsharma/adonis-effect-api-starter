import type { TaggedException } from '#core/error_and_exception/tagged_exception'
import type { HttpContext } from '@adonisjs/core/http'
import { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { ResponseType } from '#core/http/constants/response_type_constant'
import { ExceptionResponse } from '#core/http/schemas/exception_response_schema'
import { SuccessResponse } from '#core/http/schemas/success_response_schema'
import { ResposneContextService } from '#core/http/services/response/response_context_service'
import { HttpUtility } from '#core/http/utils/http_utility'
import { SchemaUtility } from '#core/schema/utils/schema_utility'
import { defu } from 'defu'
import { Effect, Match, Option, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export class MakeResponseService extends Effect.Service<MakeResponseService>()('@service/http/make_response', {
  dependencies: [ResposneContextService.Default],
  effect: Effect.gen(function* () {
    const context = yield* ResposneContextService

    /**
     * Options for creating a success response.
     */
    interface MakeSuccessResponseOptions {
      /**
       * The HTTP status code of the success response.
       * If not provided, it will be defaulted to 200.
       */
      status?: StatusCodes

      /**
       * The human-readable message for the success response.
       * If not provided, it will be defaulted to undefined.
       */
      message?: string

      /**
       * The data mode of the success response.
       * If not provided, it will be inferred from the content.
       */
      dataMode?: ResponseDataMode

      /**
       * Additional metadata to be included in the success response.
       * If not provided, it will be merged with the existing metadata of the current response.
       */
      metadata?: Record<string, unknown>
    }

    /**
     * Create a success response from the content to be sent as a response.
     *
     * It will infer the data mode from the content if not provided,
     * and it will merge the metadata with the existing metadata of the current response.
     *
     * This will also validate the response against the success response schema
     * to ensure that the response is valid and conforms to the schema and metadata.
     *
     * @param ctx The HTTP context of the request.
     * @param options The options to be used for creating the success response.
     */
    function success(ctx: HttpContext, options?: MakeSuccessResponseOptions) {
      return Effect.fn(
        /**
         * @param self The content to be sent as a response.
         */
        function* (self: unknown) {
          const metadata = yield* context.metadata()
          const dataMode = yield* context.dataMode()
          const message = yield* context.message()

          const resolvedOptions = defu(options, {
            status: StatusCodes.OK,
            message: message ?? undefined,
            dataMode: dataMode ?? HttpUtility.Response.inferResponseDataModeFromData(self),
            metadata,
          })

          return yield* Effect.suspend(() => Effect.gen(function* () {
            const response = {
              type: ResponseType.SUCCESS as const,
              status: resolvedOptions.status,
              message: resolvedOptions.message ?? undefined,
              data: self,
              metadata: defu({
                request_id: ctx.request.id()!,
                timestamp: new Date().toISOString(),
                data_mode: resolvedOptions.dataMode,
              } satisfies Schema.Schema.Encoded<typeof SuccessResponse.fields.metadata>, resolvedOptions.metadata),
            } satisfies Schema.Schema.Encoded<typeof SuccessResponse>

            yield* Match.value(resolvedOptions.dataMode).pipe(
              Match.when(ResponseDataMode.PAGINATED, () => Schema.decodeUnknown(Schema.extend(
                SuccessResponse.fields.metadata,
                Schema.Struct({
                  pagination: Schema.Struct({}),
                }),
              ), { errors: 'all' })(response.metadata)),
              Match.orElse(() => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(response.metadata)),
            ).pipe(
              SchemaUtility.toSchemaParseError('Unexpected error while validating success response metadata', response.metadata),
            )

            yield* Match.value(resolvedOptions.dataMode).pipe(
              Match.when(ResponseDataMode.SINGLE, () => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(response.data)),
              Match.when(ResponseDataMode.NONE, () => Schema.decodeUnknown(Schema.NullishOr(Schema.Never), { errors: 'all' })(response.data)),
              Match.when(_ => _ === ResponseDataMode.PAGINATED || _ === ResponseDataMode.LIST, () => Schema.decodeUnknown(Schema.Array(Schema.Unknown), { errors: 'all' })(response.data)),
              Match.orElse(() => Schema.decodeUnknown(Schema.Unknown, { errors: 'all' })(response.data)),
            ).pipe(
              SchemaUtility.toSchemaParseError('Unexpected error while validating data mode with success response data', { dataMode: resolvedOptions.dataMode }),
            )

            return yield* Schema.decode(SuccessResponse, { errors: 'all' })(response).pipe(
              SchemaUtility.toSchemaParseError('Unexpected error while decoding success response', response),
            )
          }))
        },
      )
    }

    /**
     * Options for creating an exception response.
     */
    interface MakeExceptionResponseOptions {
      /**
       * The HTTP status code of the exception response.
       * If not provided, it will be inferred from the exception.
       */
      status?: StatusCodes

      /**
       * The human-readable message for the exception response.
       * If not provided, it will be inferred from the exception.
       */
      message?: string

      /**
       * Additional metadata to be included in the exception response.
       * If not provided, it will be merged with the existing metadata of the current response.
       */
      metadata?: Record<string, unknown>
    }

    /**
     * Create an exception response from the tagged exception to be sent as a response.
     *
     * It will merge the metadata with the existing metadata
     * of the current response and validate the response against the exception response schema.
     *
     * @param ctx The HTTP context of the request.
     * @param options The options to be used for creating the exception response.
     */
    function exception(ctx: HttpContext, options?: MakeExceptionResponseOptions) {
      return Effect.fn(
        /**
         * @param self The exception to be sent as a response.
         */
        function* <T extends string, F extends Schema.Struct.Fields | undefined = undefined>(self: TaggedException<T, F>) {
          const metadata = yield* context.metadata()

          const resolvedOptions = defu(options, {
            status: self.status,
            message: self.message,
            metadata,
          })

          return yield* Effect.suspend(() => Effect.gen(function* () {
            const response = {
              type: ResponseType.EXCEPTION as const,
              status: resolvedOptions.status,
              message: resolvedOptions.message,
              exception: self.code,
              data: Option.match(yield* self.data(), {
                onNone: () => undefined,
                onSome: value => value,
              }),
              metadata: defu({
                request_id: ctx.request.id()!,
                timestamp: new Date().toISOString(),
              } satisfies Schema.Schema.Encoded<typeof ExceptionResponse.fields.metadata>, resolvedOptions.metadata),
            } satisfies Schema.Schema.Encoded<typeof ExceptionResponse>

            return yield* Schema.decode(ExceptionResponse, { errors: 'all' })(response).pipe(
              SchemaUtility.toSchemaParseError('Unexpected error while decoding exception response', response),
            )
          }))
        },
      )
    }

    return {
      /**
       * Make a success response from the content to be sent as a response.
       *
       * It will infer the data mode from the content if not provided,
       * and it will merge the metadata with the existing metadata of the current response.
       *
       * This will also validate the response against the success response schema
       * to ensure that the response is valid and conforms to the schema and metadata.
       *
       * @param ctx The HTTP context of the request.
       * @param options The options to be used for creating the success response.
       *
       * @param self The content to be sent as a response.
       */
      success,

      /**
       * Make an exception response from the exception to be sent as a response.
       *
       * It will merge the metadata with the existing metadata of the current response.
       *
       * This will also validate the response against the exception response schema
       * to ensure that the response is valid and conforms to the schema and metadata.
       *
       * @param ctx The HTTP context of the request.
       * @param options The options to be used for creating the exception response.
       *
       * @param self The exception to be sent as a response.
       */
      exception,
    }
  }),
}) {}

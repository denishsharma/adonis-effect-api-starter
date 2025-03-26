import type { UnknownRecord } from 'type-fest'
import { toSchemaParseError } from '#core/error/utils/error_utility'
import { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { SuccessResponse } from '#core/http/schemas/success_response_schema'
import { Effect, Match, Schema } from 'effect'

export function validateResponseMetadataForResponseDataMode() {
  return (options: { metadata: UnknownRecord; dataMode: ResponseDataMode }) =>
    Effect.suspend(() =>
      Match.value(options.dataMode).pipe(
        Match.when(
          ResponseDataMode.PAGINATED,
          () => Schema.decodeUnknown(
            Schema.extend(
              SuccessResponse.fields.metadata,
              Schema.Struct({
                pagination: Schema.Object,
              }),
            ),
            { errors: 'all' },
          )(options.metadata),
        ),
        Match.orElse(() => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(options.metadata)),
      ).pipe(toSchemaParseError('Unexpected error while validating success response metadata', options.metadata)),
    ).pipe(Effect.asVoid)
}

export function validateResponseDataForResponseDataMode() {
  return (options: { data: unknown; dataMode: ResponseDataMode }) =>
    Effect.suspend(() =>
      Match.value(options.dataMode).pipe(
        Match.when(ResponseDataMode.SINGLE, () => Schema.decodeUnknown(Schema.Object, { errors: 'all' })(options.data)),
        Match.when(ResponseDataMode.NONE, () => Schema.decodeUnknown(Schema.NullishOr(Schema.Never), { errors: 'all' })(options.data)),
        Match.whenOr(
          Match.is(ResponseDataMode.PAGINATED),
          Match.is(ResponseDataMode.LIST),
          () => Schema.decodeUnknown(Schema.Array(Schema.Unknown), { errors: 'all' })(options.data),
        ),
        Match.orElse(() => Schema.decodeUnknown(Schema.Unknown, { errors: 'all' })(options.data)),
      ).pipe(toSchemaParseError('Unexpected error while validating data mode with success response data', { dataMode: options.dataMode })),
    ).pipe(Effect.asVoid)
}

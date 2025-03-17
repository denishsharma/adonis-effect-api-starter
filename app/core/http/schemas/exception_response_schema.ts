import { ExceptionCode } from '#constants/exception_constant'
import { ResponseType } from '#core/http/constants/response_type_constant'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_details_schema'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

export class ExceptionResponse extends Schema.Class<ExceptionResponse>('@schema/http/exception_response')({
  type: Schema.Literal(ResponseType.EXCEPTION),
  status: Schema.Enums(StatusCodes),
  message: Schema.String,
  exception: Schema.Enums(ExceptionCode),
  data: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  })),
  metadata: Schema.extend(
    DefaultResponseMetadataDetails,
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
}) {}

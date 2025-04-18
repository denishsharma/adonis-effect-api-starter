import { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { ResponseType } from '#core/http/constants/response_type_constant'
import { DefaultResponseMetadataDetails } from '#core/http/schemas/response_metadata_details_schema'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Schema to represent a standard success response structure.
 */
export class SuccessResponse extends Schema.Class<SuccessResponse>('@schema/http/success_response')({
  type: Schema.Literal(ResponseType.SUCCESS),
  status: Schema.Enums(StatusCodes),
  message: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown),
  metadata: Schema.extend(
    DefaultResponseMetadataDetails,
    Schema.Struct(
      {
        data_mode: Schema.Enums(ResponseDataMode),
      },
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    ),
  ),
}) {}

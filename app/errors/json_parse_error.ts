import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when an unexpected error occurs while parsing JSON data.
 *
 * @category Internal Error
 */
export default class JsonParseError extends TaggedInternalError('json_parse')({
  code: InternalErrorCode.I_JSON_PARSE_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_JSON_PARSE_ERROR].message,
  schema: Schema.Struct({
    data: Schema.Unknown,
  }),
}) {}

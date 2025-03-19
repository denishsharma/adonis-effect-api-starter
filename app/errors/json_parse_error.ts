import type { TaggedInternalErrorOptions } from '#core/error_and_exception/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
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
}) {
  /**
   * Create a new instance of JsonParseError from an unknown error
   * and the data that caused the error.
   *
   * @param data The data that caused the error.
   * @param message The error message.
   * @param options The options for json parse error.
   */
  static fromUnknownError(data: unknown, message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'>) {
    /**
     * @param error The unknown error.
     */
    return (error: unknown) => new JsonParseError(
      { data },
      message,
      {
        ...options,
        cause: ErrorUtility.fromUnknownErrorToCause(error),
      },
    )
  }
}

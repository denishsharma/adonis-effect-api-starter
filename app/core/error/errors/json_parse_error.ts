import type { TaggedInternalErrorOptions } from '#core/error/factories/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { inferCauseFromUnknownError } from '#core/error/internals/error_cause'
import { defu } from 'defu'
import { pipe, Schema } from 'effect'

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
   * Creates a new `JsonParseError` instance from an unknown error with the provided context.
   *
   * @param data - The data that caused the error
   * @param message - Human-readable error message to provide more context
   * @param options - Additional options for configuring the `JsonParseError`
   */
  static fromUnknownError(data: unknown, message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'>) {
    /**
     * @param error The unknown error to convert.
     */
    return (error: unknown) => pipe(
      error,
      inferCauseFromUnknownError(),
      cause => new JsonParseError(
        { data },
        message,
        defu(options, { cause }),
      ),
    )
  }
}

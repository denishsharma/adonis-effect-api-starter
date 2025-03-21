import type { TaggedInternalErrorOptions } from '#core/error/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/tagged_internal_error'
import { ErrorUtility } from '#core/error/utils/error_utility'
import { defu } from 'defu'
import { flow, Schema } from 'effect'

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
   * If the cause of the error is identifiable, it is attached to the resulting `JsonParseError`.
   *
   * @param data The context of the error.
   * @param message The error message.
   * @param options Additional options for configuring the `JsonParseError`.
   *
   * @example
   * ```ts
   * try {
   *   JSON.parse('invalid json');
   * } catch (error) {
   *   const parseError = JsonParseError.fromUnknownError({ input: 'invalid json' })(error);
   *   console.log(parseError); // JsonParseError with cause and context
   * }
   * ```
   */
  static fromUnknownError(data: unknown, message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'>) {
    /**
     * @param error The unknown error to convert.
     */
    return (error: unknown) => flow(
      ErrorUtility.causeOfUnknownError(),
      cause => new JsonParseError(
        { data },
        message,
        defu(options, { cause }),
      ),
    )(error)
  }
}

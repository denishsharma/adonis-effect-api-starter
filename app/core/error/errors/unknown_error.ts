import type { TaggedInternalErrorOptions } from '#core/error/factories/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { toSchemaParseError } from '#core/error/internals/error_conversion'
import is from '@adonisjs/core/helpers/is'
import { Effect, Option, Schema } from 'effect'

/**
 * Error occurs when an some went wrong and the cause is unknown
 * or there is no specific error to describe the issue.
 *
 * @category Internal Error
 */
export default class UnknownError extends TaggedInternalError('unknown')({
  code: InternalErrorCode.I_UNKNOWN_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_UNKNOWN_ERROR].message,
}) {
  constructor(
    message?: string,
    options?: TaggedInternalErrorOptions & {
      /**
       * Additional data to provide context to the error.
       */
      data?: Record<string, any>;
    },
  ) {
    const { data, ...rest } = options ?? {}
    super(message, rest)

    /**
     * if data is not provided, then return none
     * otherwise, decode the data and return it
     */
    Object.assign(this, {
      data: () => Effect.gen(function* () {
        if (is.nullOrUndefined(data) || !is.object(data)) {
          return Option.none()
        }

        const decoded = yield* Effect.suspend(() => Schema.decode(Schema.Object, { errors: 'all' })(data).pipe(
          toSchemaParseError('Unexpected error while decoding data context for unknown error.', { error: InternalErrorCode.I_UNKNOWN_ERROR, context: data }),
        ))

        return Option.some(decoded)
      }),
    })
  }
}

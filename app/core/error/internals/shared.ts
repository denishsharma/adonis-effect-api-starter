import { isTaggedException, isTaggedInternalError } from '#core/error/internals/validate_error'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { Match } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Extracts the root cause from an unknown error.
 *
 * If the error contains a nested cause, it returns the innermost cause.
 * If no cause is found, it returns the error itself or `undefined`.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error("Something went wrong", { cause: new TypeError("Invalid type") });
 * } catch (error) {
 *   const rootCause = causeOfUnknownError()(error);
 *   console.log(rootCause); // TypeError: Invalid type
 * }
 * ```
 */
export function causeOfUnknownError() {
  return (error: unknown) =>
    Match.value(error).pipe(
      Match.whenOr(
        isTaggedInternalError<string, any>(),
        isTaggedException<string, any>(),
        err => lodash.defaultTo(err.cause, err),
      ),
      Match.whenOr(
        Match.instanceOf(Exception),
        Match.instanceOf(TypeError),
        Match.instanceOf(Error),
        err => lodash.defaultTo(is.error(err.cause) ? err.cause : err, err),
      ),
      Match.orElse(() => undefined),
    )
}

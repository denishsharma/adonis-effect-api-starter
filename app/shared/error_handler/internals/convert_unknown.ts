import type { TaggedExceptionOptions } from '#core/error/factories/tagged_exception'
import SchemaParseError from '#core/error/errors/schema_parse_error'
import { isTaggedException, isTaggedInternalError, toInternalServerException } from '#core/error/utils/error_utility'
import ValidationException from '#core/validation/exceptions/validation_exception'
import RouteNotFoundException from '#exceptions/route_not_found_exception'
import { errors as appErrors } from '@adonisjs/core'
import is from '@adonisjs/core/helpers/is'
import { errors as vineErrors } from '@vinejs/vine'
import { Match, ParseResult, pipe } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Converts an unknown error into a known exception or returns `undefined`.
 *
 * Matches specific error types and transforms them into corresponding exceptions.
 * If the error type is unrecognized, it returns `undefined`.
 */
export function toKnownExceptionOrUndefined() {
  return (error: unknown) =>
    Match.value(error).pipe(
      Match.when(isTaggedException<string, any>(), err => err),
      Match.when(Match.instanceOf(appErrors.E_ROUTE_NOT_FOUND), RouteNotFoundException.fromException()),
      Match.when(Match.instanceOf(vineErrors.E_VALIDATION_ERROR), ValidationException.fromException()),
      Match.orElse(() => undefined),
    )
}

/**
 * Converts an unknown error into a known internal error or returns `undefined`.
 *
 * Matches specific error types and transforms them into corresponding internal errors.
 * If the error type is unrecognized, it returns `undefined`.
 */
export function toKnownInternalErrorOrUndefined() {
  return (error: unknown) =>
    Match.value(error).pipe(
      Match.when(isTaggedInternalError<string, any>(), err => err),
      Match.when(ParseResult.isParseError, SchemaParseError.fromParseError()),
      Match.orElse(() => undefined),
    )
}

/**
 * Converts an unknown error into a known exception.
 *
 * If the error cannot be identified as known or a
 * valid exception, then error is rethrown as-is.
 */
export function toExceptionOrThrowUnknown() {
  return (error: unknown) => pipe(
    error,
    toKnownExceptionOrUndefined(),
    (exception) => {
      if (is.nullOrUndefined(exception)) {
        throw error
      }

      return exception
    },
  )
}

/**
 * Converts an unknown error into a known exception.
 *
 * If the error cannot be identified, it is wrapped as an `InternalServerException`
 * using the provided message and options.
 *
 * @param message - Fallback error message if the error is unidentified.
 * @param options - Additional options for the `InternalServerException`.
 */
export function toException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
  /**
   * @param error The unknown error to convert.
   */
  return (error: unknown) => pipe(
    error,
    toKnownExceptionOrUndefined(),
    exception => lodash.defaultTo(exception, toInternalServerException(message, options)(error)),
  )
}

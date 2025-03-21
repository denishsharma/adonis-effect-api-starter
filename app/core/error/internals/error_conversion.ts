import type { TaggedExceptionOptions } from '#core/error/tagged_exception'
import type { TaggedInternalErrorOptions } from '#core/error/tagged_internal_error'
import type { UnknownRecord } from 'type-fest'
import { InternalErrorCode } from '#constants/internal_error_constant'
import { ErrorKind } from '#core/error/constants/error_kind_constant'
import { causeOfUnknownError } from '#core/error/internals/shared'
import { isTaggedException, isTaggedInternalError } from '#core/error/internals/validate_error'
import SchemaParseError from '#errors/schema_parse_error'
import UnknownError from '#errors/unknown_error'
import InternalServerException from '#exceptions/internal_server_exception'
import RouteNotFoundException from '#exceptions/route_not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import { errors as appErrors } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { errors as vineErrors } from '@vinejs/vine'
import { defu } from 'defu'
import { flow, Inspectable, Match, ParseResult, pipe } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Converts an unknown error into a known exception or returns `undefined`.
 *
 * Matches specific error types and transforms them into corresponding exceptions.
 * If the error type is unrecognized, it returns `undefined`.
 *
 * @example
 * ```ts
 * try {
 *   throw new appErrors.E_ROUTE_NOT_FOUND('Route not found');
 * } catch (error) {
 *   const exception = toKnownExceptionOrUndefined()(error);
 *   console.log(exception); // Instance of RouteNotFoundException
 * }
 * ```
 */
export function toKnownExceptionOrUndefined() {
  /**
   * @param error The unknown error to convert.
   */
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
 *
 * @example
 * ```ts
 * try {
 *   throw new Error("Something went wrong");
 * } catch (error) {
 *   const internalError = toKnownInternalErrorOrUndefined()(error);
 *   console.error(internalError); // undefined (error is not a known internal error)
 * }
 */
export function toKnownInternalErrorOrUndefined() {
  /**
   * @param error The unknown error to convert.
   */
  return (error: unknown) =>
    Match.value(error).pipe(
      Match.when(isTaggedInternalError<string, any>(), err => err),
      Match.when(ParseResult.isParseError, err => new SchemaParseError(err.issue)),
      Match.orElse(() => undefined),
    )
}

/**
 * Converts an unknown error into a known exception.
 *
 * If the error cannot be identified as known or a
 * valid exception, then error is rethrown as-is.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error("Something went wrong");
 * } catch (error) {
 *   const exception = toExceptionOrThrowUnknown()(error);
 *   console.error(exception);
 * }
 * ```
 */
export function toExceptionOrThrowUnknown() {
  return (error: unknown) => flow(
    toKnownExceptionOrUndefined(),
    (exception) => {
      if (is.nullOrUndefined(exception)) {
        throw error
      }

      return exception
    },
  )(error)
}

/**
 * Options for converting an unknown error into a known exception.
 */
export interface ToKnownExceptionOptions extends Omit<TaggedInternalErrorOptions, 'cause'> {
  /**
   * Additional context data to attach to the unknown error.
   */
  data?: UnknownRecord
}

/**
 * Converts an unknown error into a standardized internal error.
 *
 * - If the error is a tagged internal error or exception, it is wrapped in `UnknownError` while preserving its details.
 * - If the error is an `Exception` instance, relevant metadata is extracted and included.
 * - If the error does not match any known types, a new `UnknownError` is created using the provided message and extracted cause.
 *
 * @param message Custom error message.
 * @param options Additional options for the internal error.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error("Unexpected failure");
 * } catch (error) {
 *   const internalError = toInternalUnknownError("Something went wrong")(error);
 *   console.error(internalError); // UnknownError with extracted cause and metadata.
 * }
 * ```
 */
export function toInternalUnknownError(message?: string, options?: ToKnownExceptionOptions) {
  const resolvedOptions = defu(options, {
    data: undefined,
    code: undefined,
  })

  /**
   * @param error The unknown error to convert.
   */
  return (error: unknown) => {
    const cause = pipe(error, causeOfUnknownError())

    return Match.value(error).pipe(
      Match.whenOr(
        isTaggedInternalError<string, any>(),
        isTaggedException<string, any>(),
        err => new UnknownError(
          lodash.defaultTo(message, err.message),
          {
            cause,
            data: defu(lodash.defaultTo(Inspectable.toJSON(resolvedOptions.data) as UnknownRecord, err.toJSON()), err._kind === ErrorKind.EXCEPTION ? { __exception__: err.code } : {}),
            code: lodash.defaultTo(resolvedOptions.code, err._kind === ErrorKind.INTERNAL ? err.code : InternalErrorCode.I_UNKNOWN_ERROR),
          },
        ),
      ),
      Match.when(
        Match.instanceOf(Exception),
        err => new UnknownError(
          lodash.defaultTo(message, err.message),
          {
            cause,
            data: defu(lodash.defaultTo(Inspectable.toJSON(resolvedOptions.data) as UnknownRecord, {}), { __exception__: err.code }),
            code: resolvedOptions.code,
          },
        ),
      ),
      Match.orElse(() => new UnknownError(
        message,
        {
          cause: lodash.defaultTo(cause, new Error(Inspectable.toStringUnknown(error))),
          data: Inspectable.toJSON(resolvedOptions.data) as UnknownRecord,
          code: resolvedOptions.code,
        },
      )),
    )
  }
}

/**
 * Converts an unknown error into an `InternalServerException`.
 * Ensures the error is properly wrapped and retains relevant details.
 *
 * @param message Custom error message.
 * @param options Additional options for the exception.
 *
 * @example
 * ```ts
 * try {
 *   throw new TypeError("Invalid operation");
 * } catch (error) {
 *   const exception = toInternalServerException("Something went wrong")(error);
 *   console.error(exception);
 * }
 * ```
 */
export function toInternalServerException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
  /**
   * @param error The unknown error to convert.
   */
  return (error: unknown) =>
    Match.value(error).pipe(
      Match.whenOr(
        isTaggedInternalError<string, any>(),
        Match.instanceOf(Exception),
        Match.instanceOf(TypeError),
        Match.instanceOf(Error),
        InternalServerException.fromUnknownError(message, options),
      ),
      Match.orElse(flow(
        toInternalUnknownError(),
        InternalServerException.fromUnknownError(message, options),
      )),
    )
}

/**
 * Converts an unknown error into a known exception.
 *
 * If the error cannot be identified, it is wrapped as an `InternalServerException`
 * using the provided message and options.
 *
 * @param message Fallback error message if the error is unidentified.
 * @param options Additional options for the `InternalServerException`.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error("Unexpected failure");
 * } catch (error) {
 *   const exception = toException("Operation failed")(error);
 *   console.error(exception);
 * }
 * ```
 */
export function toException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
  /**
   * @param error The unknown error to convert.
   */
  return (error: unknown) => flow(
    toKnownExceptionOrUndefined(),
    exception => lodash.defaultTo(exception, toInternalServerException(message, options)(error)),
  )(error)
}

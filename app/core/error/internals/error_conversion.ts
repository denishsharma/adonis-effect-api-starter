import type { TaggedExceptionOptions } from '#core/error/factories/tagged_exception'
import type { TaggedInternalErrorOptions } from '#core/error/factories/tagged_internal_error'
import type { UnknownRecord } from 'type-fest'
import SchemaParseError from '#core/error/errors/schema_parse_error'
import InternalServerException from '#core/error/exceptions/internal_server_exception'
import { isTaggedException, isTaggedInternalError } from '#core/error/internals/is_error_type'
import { makeInternalUnknownErrorFromException, makeInternalUnknownErrorFromTaggedError, makeInternalUnknownErrorFromUnknown } from '#core/error/internals/make_internal_unknown_error'
import { Exception } from '@adonisjs/core/exceptions'
import { defu } from 'defu'
import { Effect, flow, Match, ParseResult } from 'effect'

/**
 * Converts a parse error into a schema parse error.
 * The resulting error includes the issue details, associated data, and a message.
 *
 * @param message - The custom message to include in the schema parse error.
 * @param data - The data relevant to the schema parse error.
 */
export function toSchemaParseError(message?: string, data?: unknown) {
  return <A, E, R>(
    effect: Extract<E, ParseResult.ParseError> extends never
      ? never & { error: 'E must contain ParseResult.ParseError' }
      : Effect.Effect<A, E, R>,
  ) => effect.pipe(
    Effect.catchIf(
      error => error instanceof ParseResult.ParseError,
      error => SchemaParseError.fromParseError(data, message)(error),
    ),
  )
}

/**
 * Converts an unknown error into a standardized internal error (`UnknownError`).
 *
 * This function ensures that errors are consistently formatted, preserving as
 * much relevant information as possible. It handles different error types:
 *
 * - **Tagged internal errors & exceptions**: Wrapped inside an `UnknownError`
 *   while retaining their original details.
 * - **Exception instances**: Extracts and includes relevant metadata.
 * - **Unrecognized errors**: Creates a new `UnknownError` with the provided
 *   message and extracts the original error as its cause.
 *
 * This allows for better debugging and error tracking by ensuring all errors
 * conform to a known structure.
 *
 * @param message - Custom error message to use when wrapping unknown errors.
 * @param options - Additional options for configuring the internal error.
 */
export function toInternalUnknownError(message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'> & { data?: UnknownRecord }) {
  const resolvedOptions = defu(
    options,
    {
      data: undefined,
      code: undefined,
    },
  )

  return (error: unknown) =>
    Match.value(error).pipe(
      Match.whenOr(
        isTaggedInternalError<string, any>(),
        isTaggedException<string, any>(),
        makeInternalUnknownErrorFromTaggedError({ message, ...resolvedOptions }),
      ),
      Match.when(Match.instanceOf(Exception), makeInternalUnknownErrorFromException({ message, ...resolvedOptions })),
      Match.orElse(makeInternalUnknownErrorFromUnknown({ message, ...resolvedOptions })),
    )
}

/**
 * Converts an unknown error into an `InternalServerException`, ensuring it is
 * properly wrapped while preserving relevant details.
 *
 * This function standardizes error handling by:
 * - Wrapping known and unknown errors into a structured `InternalServerException`.
 * - Retaining important metadata, such as the original error message and stack trace.
 * - Providing a consistent format for internal server errors to improve debugging.
 *
 * @param message - Custom error message for the exception.
 * @param options - Additional options to configure the exception.
 */
export function toInternalServerException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
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

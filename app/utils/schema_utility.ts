import type { ParseResult } from 'effect'
import SchemaParseError from '#errors/schema_parse_error'
import is from '@adonisjs/core/helpers/is'
import { Effect, Function } from 'effect'

export namespace SchemaUtility {
  /**
   * Makes an error message from a parse issue.
   * The error message will contain the message, expected, and actual values.
   *
   * Format: `${msg}\nExpected: ${expected}. Actual: ${self.actual}`
   *
   * @param msg The message to include in the error message
   * @param expected The expected value to include in the error message
   *
   * @param self The parse issue to make the error message from
   */
  export const makeErrorMessageFromParseIssue: {
    (msg: string, expected: string): (self: ParseResult.ParseIssue) => string
    (self: ParseResult.ParseIssue, msg: string, expected: string): string
  } = Function.dual(3, (self: ParseResult.ParseIssue, msg: string, expected: string): string => {
    return `${msg}\nExpected: ${expected}. Actual: ${self.actual}`
  })

  /**
   * Converts a parse error to a schema parse error.
   * The schema parse error will contain the issue, data, and message.
   *
   * @param message The message to include in the schema parse error
   * @param data The data to include in the schema parse error
   *
   * @param self The effect to convert to a schema parse error
   */
  export const toSchemaParseError: {
    <A, R>(message?: ((error: ParseResult.ParseError) => string) | string, data?: unknown): (self: Effect.Effect<A, ParseResult.ParseError, R>) => Effect.Effect<A, SchemaParseError, R>
    <A, R>(self: Effect.Effect<A, ParseResult.ParseError, R>, message?: ((error: ParseResult.ParseError) => string) | string, data?: unknown): Effect.Effect<A, SchemaParseError, R>
  } = Function.dual(
    args => Effect.isEffect(args[2]),
    (self: Effect.Effect<unknown, ParseResult.ParseError, unknown>, message?: ((error: ParseResult.ParseError) => string) | string, data?: unknown): Effect.Effect<unknown, SchemaParseError, unknown> => {
      return self.pipe(
        Effect.catchTag('ParseError', error => new SchemaParseError(
          error.issue,
          data,
          is.string(message) ? message : is.function(message) ? message(error) : undefined,
        )),
      )
    },
  )
}

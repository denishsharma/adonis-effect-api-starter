import type { TaggedInternalErrorOptions } from '#core/error/factories/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { ParseResult, Schema } from 'effect'

/**
 * Error occurs when a schema parsing error occurs, indicating an
 * issue with the provided structure.
 *
 * @category Internal Error
 */
export default class SchemaParseError extends TaggedInternalError('schema_parse')({
  code: InternalErrorCode.I_SCHEMA_PARSE_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_SCHEMA_PARSE_ERROR].message,
  schema: Schema.Struct({
    issue: Schema.String,
    data: Schema.optional(Schema.Unknown),
  }),
}) {
  readonly [ParseResult.ParseErrorTypeId] = ParseResult.ParseErrorTypeId

  /**
   * The parse issue associated with the error.
   */
  issue: ParseResult.ParseIssue

  constructor(issue: ParseResult.ParseIssue, data?: unknown, message?: string, options?: TaggedInternalErrorOptions) {
    super({ issue: '', data }, message, options)
    this.issue = issue
    this.update((draft) => {
      draft.issue = ParseResult.TreeFormatter.formatIssueSync(issue)
    })
  }

  override toString() {
    return `<${this._tag}> [${this.code}]: ${this.message}\n${ParseResult.TreeFormatter.formatIssueSync(this.issue)}`
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      issue: ParseResult.ArrayFormatter.formatIssueSync(this.issue),
    }
  }

  /**
   * Creates a new `SchemaParseError` instance from a `ParseResult.ParseError`
   * with the provided context.
   *
   * @param data - The data that caused the error
   * @param message - Human-readable error message to provide more context
   * @param options - Additional options for configuring the `SchemaParseError`
   */
  static fromParseError(data?: unknown, message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'>) {
    return (error: ParseResult.ParseError) => new SchemaParseError(error.issue, data, message, { ...options, cause: error })
  }
}

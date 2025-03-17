import type { TaggedInternalErrorOptions } from '#core/error_and_exception/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { ParseResult, Schema } from 'effect'

/**
 * Error occurs when a schema parsing error occurs, indicating an
 * issue with the provided structure.
 *
 * This error is thrown when a schema parsing error occurs
 * while parsing a schema.
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
  issue: ParseResult.ParseIssue

  constructor(issue: ParseResult.ParseIssue, data?: unknown, message?: string, options?: TaggedInternalErrorOptions) {
    super({ issue: '', data }, message, options)

    this.issue = issue

    this.update((draft) => {
      draft.issue = ParseResult.TreeFormatter.formatIssueSync(issue)
    })
  }

  readonly [ParseResult.ParseErrorTypeId] = ParseResult.ParseErrorTypeId

  override toString() {
    return `<${this._tag}> [${this.code}]: ${this.message}\n${ParseResult.TreeFormatter.formatIssueSync(this.issue)}`
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      issue: ParseResult.ArrayFormatter.formatIssueSync(this.issue),
    }
  }
}

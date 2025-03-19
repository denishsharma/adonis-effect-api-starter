import type { TaggedInternalErrorOptions } from '#core/error_and_exception/tagged_internal_error'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import { Schema } from 'effect'

/**
 * The schema that defines the additional data context
 * for the database transaction error.
 */
const DatabaseTransactionErrorSchema = Schema.Struct({
  operation: Schema.Literal('create', 'commit', 'rollback'),
})

/**
 * Error occurs when there was an unexpected error while performing
 * any database transaction operation.
 */
export default class DatabaseTransactionError extends TaggedInternalError('database_transaction')({
  code: InternalErrorCode.I_DB_TRANSACTION_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_DB_TRANSACTION_ERROR].message,
  schema: DatabaseTransactionErrorSchema,
}) {
  /**
   * Creates a new database transaction error
   * instance from an unknown error.
   *
   * @param data The additional data context for the error.
   * @param message The error message.
   * @param options The error options.
   */
  static fromUnknownError(data: Schema.Schema.Encoded<typeof DatabaseTransactionErrorSchema>, message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'>) {
    /**
     * @param error The unknown error that caused the database transaction error.
     */
    return (error: unknown) => new DatabaseTransactionError(data, message, { ...options, cause: ErrorUtility.toInternalUnknownError()(error) })
  }
}

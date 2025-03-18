import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when there was an unexpected error while performing
 * any database transaction operation.
 */
export default class DatabaseTransactionError extends TaggedInternalError('database_transaction')({
  code: InternalErrorCode.I_DB_TRANSACTION_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_DB_TRANSACTION_ERROR].message,
  schema: Schema.Struct({
    operation: Schema.Literal('create', 'commit', 'rollback'),
  }),
}) {}

import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'

/**
 * Error occurs when an some went wrong and the cause is unknown
 * or there is no specific error to describe the issue.
 *
 * This error is thrown when an unknown error occurs.
 *
 * @category Internal Error
 */
export default class UnknownError extends TaggedInternalError('unknown')({
  code: InternalErrorCode.I_UNKNOWN_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_UNKNOWN_ERROR].message,
}) {}

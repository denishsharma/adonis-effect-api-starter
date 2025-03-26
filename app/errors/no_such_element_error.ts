import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'

/**
 * Error occurs when the element that is being accessed does not
 * exist in the data structure.
 *
 * @category Internal Error
 */
export default class NoSuchElementError extends TaggedInternalError('no_such_element')({
  code: InternalErrorCode.I_NO_SUCH_ELEMENT_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_NO_SUCH_ELEMENT_ERROR].message,
}) {}

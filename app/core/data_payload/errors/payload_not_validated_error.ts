import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when the payload data is requested but has not been
 * validated yet.
 *
 * @category Internal Error
 */
export default class PayloadNotValidatedError extends TaggedInternalError('payload_not_validated')({
  code: InternalErrorCode.I_PAYLOAD_NOT_VALIDATED_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_PAYLOAD_NOT_VALIDATED_ERROR].message,
  schema: Schema.Struct({
    payload: Schema.String,
  }),
}) {}

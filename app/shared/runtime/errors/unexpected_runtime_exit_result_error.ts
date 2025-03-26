import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { Schema } from 'effect'

/**
 * Error occurs when an unexpected runtime exit result is returned
 * from the application runtime and not able to be handled.
 *
 * @category Internal Error
 */
export default class UnexpectedRuntimeExitResultError extends TaggedInternalError('unexpected_runtime_exit_result')({
  code: InternalErrorCode.I_UNEXPECTED_RUNTIME_EXIT_RESULT_ERROR,
  message: InternalErrorCodeMetadata[InternalErrorCode.I_UNEXPECTED_RUNTIME_EXIT_RESULT_ERROR].message,
  schema: Schema.Struct({
    result: Schema.ExitFromSelf({
      success: Schema.Any,
      defect: Schema.Defect,
      failure: Schema.Any,
    }),
  }),
}) {}

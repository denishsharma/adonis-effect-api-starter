import type { TaggedExceptionOptions } from '#core/error/tagged_exception'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error/tagged_exception'
import { ErrorUtility } from '#core/error/utils/error_utility'
import { errors } from '@vinejs/vine'
import { Match, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a validation error occurs in the application.
 *
 * This exception is thrown when a validation error occurs in the application
 * and the application is not able to process the request payload.
 *
 * @category Exception
 */
export default class ValidationException extends TaggedException('validation')({
  status: StatusCodes.UNPROCESSABLE_ENTITY,
  code: ExceptionCode.E_VALIDATION_ERROR,
  message: ExceptionCodeMetadata[ExceptionCode.E_VALIDATION_ERROR].message,
  schema: Schema.Struct({
    issues: Schema.Array(
      Schema.Struct({
        field: Schema.String,
        message: Schema.String,
        rule: Schema.String,
        meta: Schema.optionalWith(Schema.NullishOr(Schema.Object), { nullable: true, default: () => undefined }),
      }),
    ),
  }),
}) {
  /**
   * Create instance of `ValidationException` from
   * an `E_VALIDATION_ERROR` error by parsing the validation issues.
   *
   * @param message The message of the exception
   * @param options The options of the exception
   */
  static fromException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param exception The exception to create the instance from
     */
    return (exception: InstanceType<typeof errors.E_VALIDATION_ERROR>) =>
      new ValidationException(
        { issues: exception.messages },
        message,
        {
          ...options,
          cause: exception,
        },
      )
  }

  /**
   * Convert an error to a `ValidationException` or an unknown error.
   *
   * @param message The message for the validation exception and unknown error
   * @param options The options for the validation exception
   */
  static toValidationExceptionOrUnknownError(message?: { validation?: string, unknown?: string }, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param error The error to convert
     */
    return (error: unknown) => {
      return Match.value(error).pipe(
        Match.when(
          Match.instanceOf(errors.E_VALIDATION_ERROR),
          ValidationException.fromException(message?.validation, options),
        ),
        Match.orElse(ErrorUtility.toInternalUnknownError(message?.unknown ?? 'Unknown error occurred while validating the data.')),
      )
    }
  }
}

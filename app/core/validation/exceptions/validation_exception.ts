import type { TaggedExceptionOptions } from '#core/error/factories/tagged_exception'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error/factories/tagged_exception'
import { toInternalUnknownError } from '#core/error/utils/error_utility'
import { errors as vineErrors } from '@vinejs/vine'
import { Match, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception that occurs when a validation error happens in the application.
 *
 * This exception is thrown when the application encounters a validation error
 * and is unable to process the input data. It indicates that the input data
 * does not meet the expected criteria, and the request cannot be fulfilled until
 * the error is resolved.
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
   * Creates an instance of `ValidationException` from an `E_VALIDATION_ERROR`
   * error by parsing the validation issues.
   *
   * This method helps convert a validation error into a `ValidationException`
   * by extracting the validation issues from the provided error instance.
   *
   * @param message - The message of the exception
   * @param options - The options of the exception
   */

  static fromException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param exception - The exception to create the instance from
     */
    return (exception: InstanceType<typeof vineErrors.E_VALIDATION_ERROR>) =>
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
   * Converts an error to a `ValidationException` or an unknown error.
   *
   * This method will handle errors by converting them to a `ValidationException`
   * if they are validation-related, or to a generic unknown error if not.
   *
   * @param message - The message for the validation exception and unknown error
   * @param options - The options for the validation exception
   */
  static toValidationExceptionOrUnknownError(message?: { validation?: string; unknown?: string }, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param error - The unknown error to convert
     */
    return (error: unknown) => {
      return Match.value(error).pipe(
        Match.when(
          Match.instanceOf(vineErrors.E_VALIDATION_ERROR),
          ValidationException.fromException(message?.validation, options),
        ),
        Match.orElse(toInternalUnknownError(message?.unknown ?? 'Unknown error occurred while validating the data.')),
      )
    }
  }
}

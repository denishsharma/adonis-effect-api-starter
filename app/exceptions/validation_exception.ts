import type { TaggedExceptionOptions } from '#core/error_and_exception/tagged_exception'
import type { errors } from '@vinejs/vine'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error_and_exception/tagged_exception'
import { Schema } from 'effect'
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
   * @param exception The exception to create the instance from
   * @param message The message of the exception
   * @param options The options of the exception
   */
  static fromException(exception: InstanceType<typeof errors.E_VALIDATION_ERROR>, message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    return new ValidationException(
      { issues: exception.messages },
      message,
      {
        ...options,
        cause: exception,
      },
    )
  }
}

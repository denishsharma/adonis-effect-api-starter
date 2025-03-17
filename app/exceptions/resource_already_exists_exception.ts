import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error_and_exception/tagged_exception'
import { StringSchemaDataType } from '#core/schema/data_types/string_schema_data_type'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a requested resource already exists in the application.
 *
 * This exception is thrown when a requested resource already exists in the application
 * and the application is not able to fulfill the request.
 *
 * @category Exception
 */
export default class ResourceAlreadyExistsException extends TaggedException('Resource already exists.')({
  status: StatusCodes.CONFLICT,
  code: ExceptionCode.E_RESOURCE_ALREADY_EXISTS,
  message: ExceptionCodeMetadata[ExceptionCode.E_RESOURCE_ALREADY_EXISTS].message,
  schema: Schema.Struct({
    resource: Schema.compose(StringSchemaDataType.SnakeCase, Schema.Lowercase).pipe(
      Schema.annotations({
        description: 'The resource that already exists.',
      }),
    ),
  }),
}) {}

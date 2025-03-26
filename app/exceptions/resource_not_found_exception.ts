import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error/factories/tagged_exception'
import { SchemaDataType } from '#core/schema/schema_data_type'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a requested resource is not found in
 * the application, preventing it from fulfilling the request.
 *
 * @category Exception
 */
export default class ResourceNotFoundException extends TaggedException('resource_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_RESOURCE_NOT_FOUND,
  message: ExceptionCodeMetadata[ExceptionCode.E_RESOURCE_NOT_FOUND].message,
  schema: Schema.Struct({
    resource: Schema.compose(SchemaDataType.SnakeCase, Schema.Lowercase).pipe(
      Schema.annotations({
        description: 'The resource that was not found.',
      }),
    ),
  }),
}) {}

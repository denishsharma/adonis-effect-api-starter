import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error/tagged_exception'
import { SchemaDataType } from '#core/schema/schema_data_type'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a user tries to perform an action that is forbidden
 * and the user does not have necessary permissions to perform the action.
 *
 * @category Exception
 */
export default class ForbiddenActionException extends TaggedException('forbidden_action')({
  status: StatusCodes.FORBIDDEN,
  code: ExceptionCode.E_FORBIDDEN_ACTION,
  message: ExceptionCodeMetadata[ExceptionCode.E_FORBIDDEN_ACTION].message,
  schema: Schema.Struct({
    action: Schema.compose(SchemaDataType.String.SnakeCase, Schema.Uppercase).pipe(
      Schema.annotations({
        description: 'The attempted action that was forbidden.',
      }),
    ),
    target: Schema.String.pipe(
      Schema.annotations({
        description: 'The resource/entity the action was performed on or attempted to perform on.',
      }),
    ),
    reason: Schema.String.pipe(
      Schema.annotations({
        description: 'The reason why the action was forbidden.',
      }),
    ),
  }),
}) {}

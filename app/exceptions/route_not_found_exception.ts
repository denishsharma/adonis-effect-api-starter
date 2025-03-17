import type { TaggedExceptionOptions } from '#core/error_and_exception/tagged_exception'
import type { errors } from '@adonisjs/core'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error_and_exception/tagged_exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'

/**
 * Exception occurs when a route is not found in the application.
 *
 * This exception is thrown when a route is not found in the application
 * and the application is not able to handle the request.
 *
 * @category Exception
 */
export default class RouteNotFoundException extends TaggedException('route_not_found')({
  status: StatusCodes.NOT_FOUND,
  code: ExceptionCode.E_ROUTE_NOT_FOUND,
  message: ExceptionCodeMetadata[ExceptionCode.E_ROUTE_NOT_FOUND].message,
  schema: Schema.Struct({
    method: Schema.Uppercase,
    url: Schema.String,
  }),
}) {
  /**
   * Create instance of `RouteNotFoundException` from
   * an `E_ROUTE_NOT_FOUND` error by parsing the method and URL.
   *
   * @param exception The exception to create the instance from
   * @param message The message of the exception
   * @param options The options of the exception
   */
  static fromException(exception: InstanceType<typeof errors.E_ROUTE_NOT_FOUND>, message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    const pattern = /^Cannot\s+(\S[^:]*):(\S[^:]*)$/
    const matches = pattern.exec(exception.message)
    const [method, url] = matches ? matches.slice(1).map(str => str.trim()) : ['unknown', 'unknown']

    return new RouteNotFoundException(
      { method, url },
      message ?? exception.message,
      {
        ...options,
        cause: exception,
      },
    )
  }
}

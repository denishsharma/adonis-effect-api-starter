import type { TaggedExceptionOptions } from '#core/error/factories/tagged_exception'
import type { errors } from '@adonisjs/core'
import { ExceptionCode, ExceptionCodeMetadata } from '#constants/exception_constant'
import { TaggedException } from '#core/error/factories/tagged_exception'
import { Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { defaultTo } from 'lodash-es'

/**
 * Exception occurs when a requested route is not found in the application,
 * preventing it from handling the request.
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
   * Creates an instance of `RouteNotFoundException` from an `E_ROUTE_NOT_FOUND`
   * error by extracting the HTTP method and URL.
   *
   * This exception is thrown when a requested route cannot be found, often due
   * to an invalid URL or HTTP method being used. It helps to clearly define when
   * an operation cannot proceed due to a route mismatch or unavailability in the application.
   *
   * @param message - The message for the exception that provides context or details about the error
   * @param options - The additional options for the exception, such as logging or metadata
   */
  static fromException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param exception The exception to create the instance from
     */
    return (exception: InstanceType<typeof errors.E_ROUTE_NOT_FOUND>) => {
      const pattern = /^Cannot\s+(\S[^:]*):(\S[^:]*)$/
      const matches = pattern.exec(exception.message)
      const [method, url] = matches ? matches.slice(1).map(str => str.trim()) : ['unknown', 'unknown']

      return new RouteNotFoundException(
        { method, url },
        defaultTo(message, exception.message),
        {
          ...options,
          cause: exception,
        },
      )
    }
  }
}

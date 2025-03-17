import type { TaggedException, TaggedExceptionConstructor, TaggedExceptionOptions } from '#core/error_and_exception/tagged_exception'
import type { TaggedInternalError, TaggedInternalErrorConstructor } from '#core/error_and_exception/tagged_internal_error'
import type { Schema } from 'effect'
import type { Class } from 'type-fest'
import { InternalErrorCode, InternalErrorCodeMetadata } from '#constants/internal_error_constant'
import { EXCEPTION_MARKER } from '#core/error_and_exception/tagged_exception'
import { INTERNAL_ERROR_MARKER } from '#core/error_and_exception/tagged_internal_error'
import InternalServerException from '#exceptions/internal_server_exception'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'

export namespace ErrorUtility {
  /**
   * Checks if the given value is an internal error.
   *
   * You can narrow down the type of the internal error by providing a tag or an internal error class.
   *
   * Providing a tag will check if the internal error has the given tag.
   * Providing an internal error class will check if the given value is an instance of the internal error class.
   *
   * @param tagOrInternalErrorInstance The tag or internal error class to check against.
   */
  export function isInternalError<T extends string, F extends Schema.Struct.Fields | undefined = undefined>(tagOrInternalErrorInstance?: string | Class<InstanceType<Class<TaggedInternalError<T, F>>>, TaggedInternalErrorConstructor<F>> | undefined) {
    return (self: unknown): self is TaggedInternalError<T, F> => {
      if (
        is.nullOrUndefined(self)
        || !(is.object(self) || is.class(self))
        || !(
          (is.object(self)
            && is.class(Object.getPrototypeOf(self)?.constructor)
            && Object.getPrototypeOf(self).constructor[INTERNAL_ERROR_MARKER] === INTERNAL_ERROR_MARKER)
          || (is.class(self) && (self as any)[INTERNAL_ERROR_MARKER] === INTERNAL_ERROR_MARKER)
        )
      ) {
        return false
      }

      if (is.undefined(tagOrInternalErrorInstance)) {
        return true
      }

      const isInstance = is.class(self)

      if (is.string(tagOrInternalErrorInstance)) {
        return isInstance
          ? (self as any).__tag__ === `@error/internal/${tagOrInternalErrorInstance.replace(/@error\/internal\//, '')}`
          : '_tag' in self
            && is.string(self._tag)
            && self._tag.startsWith('@error/internal/')
            && Object.getPrototypeOf(self).name === `@error/internal/${tagOrInternalErrorInstance.replace(/@error\/internal\//, '')}`
      }

      return self instanceof (tagOrInternalErrorInstance as unknown as Class<any>)
    }
  }

  /**
   * Checks if the given value is an exception.
   *
   * You can narrow down the type of the exception by providing a tag or an exception class.
   *
   * Providing a tag will check if the exception has the given tag.
   * Providing an exception class will check if the given value is an instance of the exception class.
   *
   * @param tagOrExceptionInstance The tag or exception class to check against.
   */
  export function isException<T extends string, F extends Schema.Struct.Fields | undefined = undefined>(tagOrExceptionInstance?: string | Class<InstanceType<Class<TaggedException<T, F>>>, [...any[], ...TaggedExceptionConstructor<F>]> | undefined) {
    return (self: unknown): self is TaggedException<T, F> => {
      if (
        is.nullOrUndefined(self)
        || !(is.object(self) || is.class(self))
        || !(
          (is.object(self)
            && is.class(Object.getPrototypeOf(self)?.constructor)
            && Object.getPrototypeOf(self).constructor[EXCEPTION_MARKER] === EXCEPTION_MARKER)
          || (is.class(self) && (self as any)[EXCEPTION_MARKER] === EXCEPTION_MARKER)
        )
      ) {
        return false
      }

      if (is.undefined(tagOrExceptionInstance)) {
        return true
      }

      const isInstance = is.class(self)

      if (is.string(tagOrExceptionInstance)) {
        return isInstance
          ? (self as any).__tag__ === `@error/exception/${tagOrExceptionInstance.replace(/@error\/exception\//, '')}`
          : '_tag' in self
            && is.string(self._tag)
            && self._tag.startsWith('@error/exception/')
            && Object.getPrototypeOf(self).name === `@error/exception/${tagOrExceptionInstance.replace(/@error\/exception\//, '')}`
      }

      return self instanceof (tagOrExceptionInstance as unknown as Class<any>)
    }
  }

  /**
   * Converts the given error to an internal server exception.
   *
   * This function is useful when you want to convert an unknown error to an
   * internal server exception.
   *
   * If the given error is an instance of `Error` or an internal error, it will
   * be used as the cause of the internal server exception.
   *
   * If the given error is not an instance of `Error` or an internal error, it will
   * be converted to an instance of `Error` with the message of `InternalErrorCode.I_UNKNOWN_ERROR`.
   *
   * @param error The error to convert to an internal server exception.
   * @param message The message of the internal server exception.
   * @param options Additional options for the internal server exception.
   */
  export function toInternalServerException(error: unknown, message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    if (isInternalError()(error) || error instanceof Exception || is.error(error)) {
      return new InternalServerException(error, message, options)
    }

    return new InternalServerException(new Error(
      'toString' in (error as any) ? (error as any).toString() : InternalErrorCodeMetadata[InternalErrorCode.I_UNKNOWN_ERROR].message,
    ), message, options)
  }
}

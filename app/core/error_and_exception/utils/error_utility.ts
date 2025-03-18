import type { TaggedException, TaggedExceptionConstructor, TaggedExceptionOptions } from '#core/error_and_exception/tagged_exception'
import type { TaggedInternalError, TaggedInternalErrorConstructor, TaggedInternalErrorOptions } from '#core/error_and_exception/tagged_internal_error'
import type { Schema } from 'effect'
import type { Class } from 'type-fest'
import { InternalErrorCode } from '#constants/internal_error_constant'
import { ErrorKind } from '#core/error_and_exception/constants/error_kind_constant'
import { EXCEPTION_MARKER } from '#core/error_and_exception/tagged_exception'
import { INTERNAL_ERROR_MARKER } from '#core/error_and_exception/tagged_internal_error'
import UnknownError from '#errors/unknown_error'
import InternalServerException from '#exceptions/internal_server_exception'
import RouteNotFoundException from '#exceptions/route_not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import { errors as appErrors } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { errors as vineErrors } from '@vinejs/vine'
import { defu } from 'defu'
import { Inspectable, Match } from 'effect'

export namespace ErrorUtility {
  namespace internals {
    /**
     * Internal utility function to convert the given unknown error to a known exception.
     * If the given error is not a known exception, it will return `undefined`.
     *
     * @param error The error to convert to a known exception.
     */
    export function convertToStrictKnownException(error: unknown) {
      return Match.type<unknown>().pipe(
        Match.when(isException(), err => err as TaggedException<string, any>),
        Match.when(
          (err: unknown) => err instanceof appErrors.E_ROUTE_NOT_FOUND,
          err => RouteNotFoundException.fromException(err),
        ),
        Match.when(
          (err: unknown) => err instanceof vineErrors.E_VALIDATION_ERROR,
          err => ValidationException.fromException(err),
        ),
        Match.orElse(() => undefined),
      )(error)
    }

  }

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
   * @param message The message of the internal server exception.
   * @param options Additional options for the internal server exception.
   */
  export function toInternalServerException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param error The error to convert to an internal server exception.
     */
    return (error: unknown) =>
      Match.value(error).pipe(
        Match.whenOr(
          (err: unknown) => isInternalError()(err),
          (err: unknown) => err instanceof Exception,
          (err: unknown) => err instanceof TypeError,
          (err: unknown) => err instanceof Error,
          err => new InternalServerException(err, message, options),
        ),
        Match.orElse(err => new InternalServerException(toInternalUnknownError()(err), message, options)),
      )
  }

  /**
   * Converts the given unknown error to an internal unknown error.
   *
   * This function is useful when you want to convert an unknown error to an
   * internal unknown error.
   *
   * It will try to match the given error to known exceptions and internal errors
   * and convert it to the corresponding internal unknown error, but final type
   * always will be `UnknownError`.
   *
   * @param message The message of the internal unknown error.
   * @param options Additional options for the internal unknown error.
   */
  export function toInternalUnknownError(message?: string, options?: Omit<TaggedInternalErrorOptions, 'cause'> & { data?: Record<any, unknown> }) {
    /**
     * @param error The error to convert to an internal unknown error.
     */
    return (error: unknown) =>
      Match.value(error).pipe(
        Match.whenOr(
          (err: unknown) => isInternalError()(err),
          (err: unknown) => isException()(err),
          err => new UnknownError(
            message ?? err.message,
            {
              cause: err.cause ?? err,
              data: options?.data ? Inspectable.toJSON(options.data) as Record<any, unknown> : defu(err.toJSON().data, err._kind === ErrorKind.EXCEPTION ? { __exception__: err.code } : {}),
              code: options?.code ?? (err._kind === ErrorKind.INTERNAL ? err.code : InternalErrorCode.I_UNKNOWN_ERROR),
              ...options,
            },
          ),
        ),
        Match.when(
          (err: unknown) => err instanceof Exception,
          err => new UnknownError(
            message ?? err.message,
            {
              cause: (!is.nullOrUndefined(err.cause) && is.error(err.cause)) ? err.cause : err,
              data: defu(options?.data ? Inspectable.toJSON(options.data) as Record<any, unknown> : {}, { __exception__: err.code }),
              ...options,
            },
          ),
        ),
        Match.whenOr(
          (err: unknown) => err instanceof TypeError,
          (err: unknown) => err instanceof Error,
          err => new UnknownError(
            message ?? err.message,
            {
              cause: err,
              data: options?.data ? Inspectable.toJSON(options.data) as Record<any, unknown> : 'data' in err ? err.data as Record<any, unknown> : undefined,
              ...options,
            },
          ),
        ),
        Match.orElse(() => new UnknownError(
          message,
          {
            cause: new Error(Inspectable.toStringUnknown(error)),
            data: options?.data ? Inspectable.toJSON(options.data) as Record<any, unknown> : undefined,
            ...options,
          },
        )),
      )
  }

  /**
   * Converts the given unknown error to a known exception.
   *
   * If the given error is an instance of tagged exception,
   * it will be returned as is.
   *
   * Otherwise, it will be matched against known exceptions
   * and converted to the corresponding known exception.
   *
   * If the given error is not a known exception, it will
   * be converted to an internal server exception.
   *
   * @param message The message for the internal server exception.
   * @param options Additional options for the internal server exception.
   */
  export function toKnownException(message?: string, options?: Omit<TaggedExceptionOptions, 'cause'>) {
    /**
     * @param error The error to convert to a known exception.
     */
    return (error: unknown) => {
      const exception = internals.convertToStrictKnownException(error)
      if (is.nullOrUndefined(exception)) {
        return toInternalServerException(message, options)(error)
      }
      return exception
    }
  }

  /**
   * Converts the given unknown error to a known exception
   * or throws the unknown error if it is not a known exception.
   *
   * Suitable for use in catch blocks to convert unknown errors
   * to known exceptions or throw the unknown error which
   * can be caught by the global error handler.
   */
  export function toKnownExceptionOrThrowUnknown() {
    /**
     * @param error The error to convert to a known exception.
     */
    return (error: unknown) => {
      const exception = internals.convertToStrictKnownException(error)
      if (is.nullOrUndefined(exception)) {
        throw error
      }
      return exception
    }
  }
}

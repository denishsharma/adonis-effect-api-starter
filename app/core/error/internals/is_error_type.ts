import type { ITaggedException, TaggedException } from '#core/error/factories/tagged_exception'
import type { ITaggedInternalError, TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import type { Schema } from 'effect'
import { EXCEPTION_MARKER, INTERNAL_ERROR_MARKER } from '#core/error/internals/constants/error_marker_constant'
import is from '@adonisjs/core/helpers/is'

/**
 * Checks if the given value is a tagged internal error.
 *
 * Narrows down the type of the internal error by providing:
 * - a tag
 * - a tagged internal error class
 *
 * Providing a tag checks if the internal error has the given tag.
 * Providing a tagged internal error class checks if the given value is an instance of the internal error class.
 *
 * @param tagOrTaggedInternalErrorClass - The tag or tagged internal error class to check against.
 */
export function isTaggedInternalError<T extends string, F extends Schema.Struct.Fields | undefined>(tagOrTaggedInternalErrorClass?: string | ITaggedInternalError<T, F> | undefined) {
  return (value: unknown): value is TaggedInternalError<T, F> => {
    if (!is.object(value) && !is.class(value)) { return false }

    const proto = Object.getPrototypeOf(value)
    const isInstance = is.class(value)
    const constructor = isInstance ? (value as any) : proto?.constructor

    if (!constructor || constructor[INTERNAL_ERROR_MARKER] !== INTERNAL_ERROR_MARKER) {
      return false
    }

    if (!tagOrTaggedInternalErrorClass) { return true }

    if (is.string(tagOrTaggedInternalErrorClass)) {
      const tag = tagOrTaggedInternalErrorClass.startsWith('@error/internal/')
        ? tagOrTaggedInternalErrorClass
        : `@error/internal/${tagOrTaggedInternalErrorClass}`

      return isInstance
        ? (value as any).__tag__ === tag
        : '_tag' in value
          && is.string((value as any)._tag)
          && (value as any)._tag.startsWith('@error/internal/')
          && proto.name === tag
    }

    return value instanceof tagOrTaggedInternalErrorClass
  }
}

/**
 * Checks if the given value is a tagged exception.
 *
 * Narrows down the type of the exception by providing:
 * - a tag
 * - a tagged exception class
 *
 * Providing a tag checks if the exception has the given tag.
 * Providing a tagged exception class checks if the given value is an instance of the exception class.
 *
 * @param tagOrTaggedExceptionClass - The tag or tagged exception class to check against.
 */
export function isTaggedException<T extends string, F extends Schema.Struct.Fields | undefined>(tagOrTaggedExceptionClass?: string | ITaggedException<T, F> | undefined) {
  return (value: unknown): value is TaggedException<T, F> => {
    if (!is.object(value) && !is.class(value)) { return false }

    const proto = Object.getPrototypeOf(value)
    const isInstance = is.class(value)
    const constructor = isInstance ? (value as any) : proto?.constructor

    if (!constructor || constructor[EXCEPTION_MARKER] !== EXCEPTION_MARKER) {
      return false
    }

    if (!tagOrTaggedExceptionClass) { return true }

    if (is.string(tagOrTaggedExceptionClass)) {
      const tag = tagOrTaggedExceptionClass.startsWith('@error/exception/')
        ? tagOrTaggedExceptionClass
        : `@error/exception/${tagOrTaggedExceptionClass}`

      return isInstance
        ? (value as any).__tag__ === tag
        : '_tag' in value
          && is.string((value as any)._tag)
          && (value as any)._tag.startsWith('@error/exception/')
          && proto?.name === tag
    }

    return value instanceof tagOrTaggedExceptionClass
  }
}

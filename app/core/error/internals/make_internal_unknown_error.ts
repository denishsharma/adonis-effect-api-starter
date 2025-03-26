import type { TaggedException } from '#core/error/factories/tagged_exception'
import type { TaggedInternalError, TaggedInternalErrorOptions } from '#core/error/factories/tagged_internal_error'
import type { Exception } from '@adonisjs/core/exceptions'
import type { UnknownRecord } from 'type-fest'
import { InternalErrorCode } from '#constants/internal_error_constant'
import { _kind } from '#constants/proto_marker_constant'
import { ErrorKind } from '#core/error/constants/error_kind_constant'
import UnknownError from '#core/error/errors/unknown_error'
import { inferCauseFromUnknownError } from '#core/error/internals/error_cause'
import { defu } from 'defu'
import { Inspectable, pipe } from 'effect'
import * as lodash from 'lodash-es'

interface MakeOptions extends Omit<TaggedInternalErrorOptions, 'cause'> {
  message?: string;
  data?: UnknownRecord;
}

function resolveMakeOptions(options?: MakeOptions) {
  return defu(options, {
    message: undefined,
    data: undefined,
  })
}

export function makeInternalUnknownErrorFromTaggedError(options?: MakeOptions) {
  const resolvedOptions = resolveMakeOptions(options)

  return (error: TaggedInternalError<string, any> | TaggedException<string, any>) => pipe(
    error,
    inferCauseFromUnknownError(),
    cause => new UnknownError(
      lodash.defaultTo(resolvedOptions.message, error.message),
      {
        cause,
        data: defu(
          lodash.defaultTo(Inspectable.toJSON(resolvedOptions.data) as UnknownRecord, {}),
          error[_kind] === ErrorKind.EXCEPTION ? { __exception__: error.code } : {},
        ),
        code: lodash.defaultTo(resolvedOptions.code, error[_kind] === ErrorKind.INTERNAL ? error.code : InternalErrorCode.I_UNKNOWN_ERROR),
      },
    ),
  )
}

export function makeInternalUnknownErrorFromException(options?: MakeOptions) {
  const resolvedOptions = resolveMakeOptions(options)

  return (error: Exception) => pipe(
    error,
    inferCauseFromUnknownError(),
    cause => new UnknownError(
      lodash.defaultTo(resolvedOptions.message, error.message),
      {
        cause,
        data: defu(
          lodash.defaultTo(Inspectable.toJSON(resolvedOptions.data) as UnknownRecord, {}),
          { __exception__: error.code },
        ),
        code: resolvedOptions.code,
      },
    ),
  )
}

export function makeInternalUnknownErrorFromUnknown(options?: MakeOptions) {
  const resolvedOptions = resolveMakeOptions(options)

  return (error: unknown) => pipe(
    error,
    inferCauseFromUnknownError(),
    cause => new UnknownError(
      resolvedOptions.message,
      {
        cause: lodash.defaultTo(cause, new Error(Inspectable.toStringUnknown(error))),
        data: Inspectable.toJSON(resolvedOptions.data) as UnknownRecord,
        code: resolvedOptions.code,
      },
    ),
  )
}

import type { TaggedException } from '#core/error/factories/tagged_exception'
import type { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import type { Exception } from '@adonisjs/core/exceptions'
import { _kind } from '#constants/proto_marker_constant'
import { ErrorKind } from '#core/error/constants/error_kind_constant'
import is from '@adonisjs/core/helpers/is'
import otelLogs from '@opentelemetry/api-logs'
import { Effect, Function, Inspectable, Option, pipe } from 'effect'
import * as lodash from 'lodash-es'

export function logTaggedErrorToTelemetry(logger: otelLogs.Logger) {
  return (error: TaggedException<string, any> | TaggedInternalError<string, any>) =>
    Effect.gen(function* () {
      const clock = yield* Effect.clock

      const data = pipe(
        yield* error.data(),
        Option.match({
          onNone: () => undefined,
          onSome: Function.identity,
        }),
        Inspectable.toJSON,
      )

      logger.emit({
        body: error[_kind] === ErrorKind.INTERNAL ? `[INTERNAL] ${error.toString()}` : `[EXCEPTION] ${error.toString()}`,
        severityNumber: otelLogs.SeverityNumber.ERROR,
        severityText: 'ERROR',
        timestamp: new Date(),
        observedTimestamp: clock.unsafeCurrentTimeMillis(),
        attributes: {
          type: error._tag,
          kind: error[_kind],
          message: error.message,
          data: data ? JSON.stringify(data, null, 2) : undefined,
          stack: error.stack,
          cause: is.nullOrUndefined(error.cause)
            ? undefined
            : JSON.stringify(
                {
                  name: error.cause.name,
                  message: error.cause.message,
                  stack: error.cause.stack,
                },
                null,
                2,
              ),
        },
      })
    })
}

export function logExceptionToTelemetry(logger: otelLogs.Logger) {
  return (error: Exception) =>
    Effect.gen(function* () {
      const clock = yield* Effect.clock

      logger.emit({
        body: `[ADONIS_EXCEPTION] ${error.toString()}`,
        severityNumber: otelLogs.SeverityNumber.ERROR,
        severityText: 'ERROR',
        timestamp: new Date(),
        observedTimestamp: clock.unsafeCurrentTimeMillis(),
        attributes: {
          type: error.code,
          kind: 'adonis_exception',
          message: error.message,
          data: lodash.has(error, 'data') ? is.object(error.data) ? JSON.stringify(error.data, null, 2) : (error.data as any) : undefined,
          stack: error.stack,
          cause: is.nullOrUndefined(error.cause)
            ? undefined
            : error.cause instanceof Error
              ? JSON.stringify(
                  {
                    name: error.cause.name,
                    message: error.cause.message,
                    stack: error.cause.stack,
                  },
                  null,
                  2,
                )
              : undefined,
        },
      })
    })
}

export function logUnknownErrorToTelemetry(logger: otelLogs.Logger) {
  return (error: unknown) =>
    Effect.gen(function* () {
      const clock = yield* Effect.clock

      logger.emit({
        body: `[UNKNOWN ERROR] ${Inspectable.toStringUnknown(error)}`,
        severityNumber: otelLogs.SeverityNumber.ERROR,
        severityText: 'ERROR',
        timestamp: new Date(),
        observedTimestamp: clock.unsafeCurrentTimeMillis(),
        attributes: {
          type: 'unknown',
          kind: 'unknown',
          message: Inspectable.toStringUnknown(error),
          cause: error instanceof Error
            ? JSON.stringify(
                {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                  serialized: JSON.stringify(Inspectable.toJSON(lodash.omit(error, ['stack', 'message']))),
                },
                null,
                2,
              )
            : JSON.stringify(Inspectable.toJSON(error), null, 2),
        },
      })
    })
}

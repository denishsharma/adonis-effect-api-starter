import type { TaggedException } from '#core/error_and_exception/tagged_exception'
import type { TaggedInternalError } from '#core/error_and_exception/tagged_internal_error'
import type { SpanOptions } from 'effect/Tracer'
import { ErrorKind } from '#core/error_and_exception/constants/error_kind_constant'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import env from '#start/env'
import { Exception } from '@adonisjs/core/exceptions'
import is from '@adonisjs/core/helpers/is'
import { Resource, Tracer } from '@effect/opentelemetry'
import openTelemetry from '@opentelemetry/api'
import otelLogs from '@opentelemetry/api-logs'
import { defu } from 'defu'
import { Array, Effect, FiberId, Inspectable, Layer, Logger, Match, Option } from 'effect'

export namespace TelemetryUtility {
  /**
   * Transform an unknown value to an OpenTelemetry attribute value
   *
   * @param value The unknown value to transform
   */
  export function unknownToAttributeValue(value: unknown): openTelemetry.AttributeValue {
    return Match.value(value).pipe(
      Match.whenOr(
        (v: unknown) => is.string(v),
        (v: unknown) => is.number(v),
        (v: unknown) => is.boolean(v),
        v => v,
      ),
      Match.when(
        (v: unknown) => is.bigint(v),
        v => Number(v),
      ),
      Match.orElse(v => Inspectable.toStringUnknown(v)),
    )
  }

  /**
   * Create a new scoped logger layer for the specified scope and version
   * with the OpenTelemetry logs API for the Effect logger.
   *
   * This is useful for creating a new logger layer for a specific scope
   * and version in the application.
   *
   * @param scope The scope for the logger layer. This can be the name of the module, service, or any other identifier
   * @param version The version for the logger layer
   */
  export function scopedLoggerLayer(scope: string, version?: string) {
    return Logger.addEffect(
      Effect.gen(function* () {
        const clock = yield* Effect.clock
        const logger = otelLogs.logs.getLogger(scope, version ?? env.get('OTEL_APPLICATION_SERVICE_VERSION'))

        return Logger.make((options) => {
          const now = options.date.getTime()

          /**
           * Add the fiber ID and annotations to the log attributes
           * for the current log entry
           */
          const attributes: Record<string, openTelemetry.AttributeValue> = {
            fiber_id: FiberId.threadName(options.fiberId),
          }

          /**
           * Add the annotations and spans to the log attributes
           * for the current log entry
           */
          for (const [key, value] of Object.entries(options.annotations)) {
            attributes[key] = unknownToAttributeValue(value)
          }

          /**
           * Add the spans to the log attributes for the current log entry
           * and calculate the span durations
           */
          for (const span of options.spans) {
            attributes[`log_span.${span.label}`] = `${now - span.startTime}ms`
          }

          /**
           * Emit the log entry with the specified message and attributes
           * to the OpenTelemetry logs
           */
          const message = Array.ensure(options.message).map(unknownToAttributeValue)
          logger.emit({
            body: message.length === 1 ? message[0] : message,
            severityText: options.logLevel.label,
            severityNumber: Match.value(options.logLevel._tag).pipe(
              Match.when('Info', () => otelLogs.SeverityNumber.INFO),
              Match.when('Warning', () => otelLogs.SeverityNumber.WARN),
              Match.when('Error', () => otelLogs.SeverityNumber.ERROR),
              Match.when('Fatal', () => otelLogs.SeverityNumber.FATAL),
              Match.when('Debug', () => otelLogs.SeverityNumber.DEBUG),
              Match.when('Trace', () => otelLogs.SeverityNumber.TRACE),
              Match.when('None', () => otelLogs.SeverityNumber.UNSPECIFIED),
              Match.orElse(() => otelLogs.SeverityNumber.UNSPECIFIED),
            ),
            timestamp: options.date,
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes,
          })
        })
      }),
    )
  }

  /**
   * Create a new scoped tracer layer for the specified scope and version
   * with the OpenTelemetry tracer API for the Effect layer.
   *
   * This is useful for creating a new tracer layer for a specific scope
   * and version in the application.
   *
   * @param scope The scope for the tracer layer. This can be the name of the module, service, or any other identifier
   * @param version The version for the tracer layer
   */
  export function scopedTracerLayer(scope: string, version?: string) {
    return Layer.mergeAll(Tracer.layerGlobal).pipe(
      Layer.provideMerge(
        Resource.layer({
          serviceName: scope,
          serviceVersion: version,
        }),
      ),
    )
  }

  /**
   * Create a new scoped telemetry provider for the specified scope and version
   * with the OpenTelemetry tracer and logs API for the Effect layer.
   *
   * This includes the OpenTelemetry tracer and logs, as well as the OpenTelemetry
   * resource attributes for the specified scope and version in the application.
   *
   * This does not include the OpenTelemetry metrics API, as it requires
   * additional configuration and setup.
   *
   * @param scope The scope for the telemetry provider. This can be the name of the module, service, or any other identifier
   * @param version The version for the telemetry provider
   */
  export function scopedTelemetryProvider(scope: string, version?: string) {
    return Effect.provide(
      Layer.mergeAll(Tracer.layerGlobal, scopedLoggerLayer(scope, version)).pipe(
        Layer.provideMerge(
          Resource.layer({
            serviceName: scope,
            serviceVersion: version ?? env.get('OTEL_APPLICATION_SERVICE_VERSION'),
          }),
        ),
      ),
    )
  }

  /**
   * Wrap the specified effect with the active span context for the current request
   * if it exists, otherwise return the effect as is.
   */
  export function withActiveSpanContext() {
    return <A, E, R>(self: Effect.Effect<A, E, R>) => {
      const activeSpanContext = openTelemetry.trace.getSpan(openTelemetry.context.active())?.spanContext()
      return Effect.if(is.nullOrUndefined(activeSpanContext), {
        onTrue: () => self,
        onFalse: () => self.pipe(Tracer.withSpanContext(activeSpanContext!)),
      })
    }
  }

  /**
   * Wrap the specified effect with the scoped telemetry provider and the active span context
   * for the current request if it exists, otherwise return the effect as is.
   *
   * This includes the OpenTelemetry tracer and logs, as well as the OpenTelemetry
   * resource attributes for the specified scope and version in the application.
   *
   * This does not include the OpenTelemetry metrics API, as it requires
   * additional configuration and setup.
   *
   * @param scope The scope for the telemetry provider. This can be the name of the module, service, or any other identifier
   * @param version The version for the telemetry provider
   */
  export function withScopedTelemetry(scope: string, version?: string) {
    return <A, E, R>(self: Effect.Effect<A, E, R>) => {
      return self.pipe(
        withActiveSpanContext(),
        scopedTelemetryProvider(scope, version),
      )
    }
  }

  /**
   * Wrap the specified effect with the telemetry span for the specified name
   * and options, and the active span context for the current request if it exists,
   * otherwise return the effect as is.
   *
   * @param name The name for the telemetry span
   * @param options The options for the telemetry span
   */
  export function withTelemetrySpan(name: string, options?: SpanOptions) {
    return <A, E, R>(self: Effect.Effect<A, E, R>) => {
      return self.pipe(
        Effect.withSpan(name, defu(options ?? {}, { captureStackTrace: true })),
        withActiveSpanContext(),
      )
    }
  }

  /**
   * Log the specified error with the OpenTelemetry logs API for the specified scope
   * and version in the application.
   *
   * This will log the error with the specified scope and version in the application
   * and include the error message, type, kind, data, and cause in the log entry.
   *
   * If the error is an internal error or an exception, it will log the error as an error entry.
   * Otherwise, it will log the error as an unknown error entry.
   *
   * @param error The error to log with the OpenTelemetry logs API
   * @param log To log specific types of errors
   * @param scope The scope for the log entry
   * @param version The version for the log entry
   */
  export function logError(
    error: unknown,
    log: (['internal_error', 'known_exception', 'adonis_exception', 'unknown', 'all'][number])[],
    scope: string,
    version?: string,
  ) {
    const otelLogger = otelLogs.logs.getLogger(scope, version ?? env.get('OTEL_APPLICATION_SERVICE_VERSION'))

    return Match.value(error).pipe(
      Match.whenOr(
        (err: unknown) => ErrorUtility.isInternalError()(err) && (log.includes('internal_error') || log.includes('all')),
        (err: unknown) => ErrorUtility.isException()(err) && (log.includes('known_exception') || log.includes('all')),
        err => Effect.gen(function* () {
          const clock = yield* Effect.clock
          const e = err as TaggedException<any, any> | TaggedInternalError<any, any>

          const errorData = Option.match(yield* e.data(), {
            onNone: () => undefined,
            onSome: data => data as Record<string, any>,
          })

          otelLogger.emit({
            body: e._kind === ErrorKind.INTERNAL ? `[INTERNAL] ${e.toString()}` : `[EXCEPTION] ${e.toString()}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: e._tag,
              kind: e._kind,
              message: e.message,
              data: errorData,
              cause: is.nullOrUndefined(e.cause)
                ? undefined
                : {
                    name: e.cause.name,
                    message: e.cause.message,
                    stack: e.cause.stack,
                  },
            },
          })
        }),
      ),
      Match.when(
        (err: unknown) => err instanceof Exception && (log.includes('adonis_exception') || log.includes('all')),
        err => Effect.gen(function* () {
          const clock = yield* Effect.clock
          const e = err as Exception

          otelLogger.emit({
            body: `[ADONIS_EXCEPTION] ${e.toString()}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: e.code,
              kind: 'adonis_exception',
              message: e.message,
              data: 'data' in e ? (e.data as any) : undefined,
              cause: is.nullOrUndefined(e.cause)
                ? undefined
                : e.cause instanceof Error
                  ? {
                      name: e.cause.name,
                      message: e.cause.message,
                      stack: e.cause.stack,
                    }
                  : undefined,
            },
          })
        }),
      ),
      Match.when(
        (err: unknown) => (log.includes('unknown') || log.includes('all')) && (!ErrorUtility.isInternalError()(err) && !ErrorUtility.isException()(err) && !(err instanceof Exception)),
        err => Effect.gen(function* () {
          const clock = yield* Effect.clock

          otelLogger.emit({
            body: `[UNKNOWN ERROR] ${String(err)}`,
            severityNumber: otelLogs.SeverityNumber.ERROR,
            severityText: 'ERROR',
            timestamp: new Date(),
            observedTimestamp: clock.unsafeCurrentTimeMillis(),
            attributes: {
              type: 'unknown',
              kind: 'unknown',
              message: String(err),
            },
          })
        }),
      ),
      Match.orElse(() => Effect.void),
    )
  }
}

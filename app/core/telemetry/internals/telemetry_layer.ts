import type opentelemetry from '@opentelemetry/api'
import { transformUnknownToTelemetryAttributeValue } from '#core/telemetry/internals/shared'
import env from '#start/env'
import { Resource, Tracer } from '@effect/opentelemetry'
import otelLogs from '@opentelemetry/api-logs'
import { Array, Effect, FiberId, Layer, Logger, Match } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Creates a new scoped logger layer using the OpenTelemetry logs API
 * for the Effect logger.
 *
 * This allows logging within a specific module, service, or component,
 * ensuring structured and contextualized log messages.
 *
 * @param scope - A unique identifier for the logger layer, such as
 *                a module or service name.
 * @param version - The version associated with the logger layer,
 *                  useful for tracking changes over time.
 */
export function createScopedLoggerLayer(scope: string, version?: string) {
  return Logger.addEffect(
    Effect.gen(function* () {
      const clock = yield* Effect.clock
      const logger = otelLogs.logs.getLogger(scope, lodash.defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')))

      return Logger.make((options) => {
        const now = options.date.getTime()

        /**
         * Add the fiber ID and annotations to the log attributes
         * for the current log entry
         */
        const attributes: Record<string, opentelemetry.AttributeValue> = {
          fiber_id: FiberId.threadName(options.fiberId),
        }

        /**
         * Add the annotations and spans to the log attributes
         * for the current log entry
         */
        for (const [key, value] of Object.entries(options.annotations)) {
          attributes[key] = transformUnknownToTelemetryAttributeValue(value)
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
        const message = Array.ensure(options.message).map(transformUnknownToTelemetryAttributeValue)
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
 * Creates a scoped tracer layer using the OpenTelemetry Tracer API
 * for the specified scope and version.
 *
 * This allows tracing operations within a defined module, service,
 * or component, enabling better observability and debugging.
 *
 * @param scope - The scope for the tracer layer (e.g., module or service name).
 * @param version - The version associated with the tracer layer.
 */
export function createScopedTracerLayer(scope: string, version?: string) {
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
 * Creates a scoped telemetry provider using the OpenTelemetry Tracer and Logs API
 * for a specified scope and version.
 *
 * This provider includes:
 * - OpenTelemetry tracing and logging capabilities.
 * - Resource attributes for enhanced context within the application.
 *
 * Note: This does *not* include OpenTelemetry metrics, as additional configuration
 * and setup are required.
 *
 * @param scope - The scope for the telemetry provider (e.g., module, service, or component name).
 * @param version - The version associated with the telemetry provider.
 */
export function createScopedTelemetryProvider(scope: string, version?: string) {
  return Effect.provide(
    Layer.mergeAll(Tracer.layerGlobal, createScopedLoggerLayer(scope, version)).pipe(
      Layer.provideMerge(
        Resource.layer({
          serviceName: scope,
          serviceVersion: lodash.defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')),
        }),
      ),
    ),
  )
}

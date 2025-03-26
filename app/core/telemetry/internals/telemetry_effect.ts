import type { SpanOptions } from 'effect/Tracer'
import { createScopedTelemetryProvider } from '#core/telemetry/internals/telemetry_layer'
import is from '@adonisjs/core/helpers/is'
import { Tracer } from '@effect/opentelemetry'
import opentelemetry from '@opentelemetry/api'
import { defu } from 'defu'
import { Effect } from 'effect'

/**
 * Wraps the given effect with the active span context for the current request,
 * if available. If no active span context exists, the effect is returned unchanged.
 *
 * This ensures that any telemetry data associated with the current request
 * is properly propagated within the execution context.
 */
export function withActiveSpanContext() {
  /**
   * @param effect - The effect to be wrapped with the active span context.
   */
  return <A, E, R>(self: Effect.Effect<A, E, R>) => {
    const activeSpanContext = opentelemetry.trace.getSpan(opentelemetry.context.active())?.spanContext()
    return Effect.if(is.nullOrUndefined(activeSpanContext), {
      onTrue: () => self,
      onFalse: () => self.pipe(Tracer.withSpanContext(activeSpanContext!)),
    })
  }
}

/**
 * Wraps the given effect with a scoped telemetry provider and the active span
 * context for the current request, if available. If no active span context exists,
 * the effect is returned unchanged.
 *
 * This ensures that telemetry data, including OpenTelemetry tracing and logs,
 * is properly propagated within the specified scope and version of the application.
 * The telemetry provider also includes OpenTelemetry resource attributes.
 *
 * Note: This does not include the OpenTelemetry metrics API, as it requires
 * additional configuration and setup.
 *
 * @param scope - The scope for the telemetry provider, typically the module,
 *                service, or another identifier.
 * @param version - The version of the telemetry provider.
 */
export function withScopedTelemetry(scope: string, version?: string) {
  return <A, E, R>(self: Effect.Effect<A, E, R>) => {
    return self.pipe(
      withActiveSpanContext(),
      createScopedTelemetryProvider(scope, version),
    )
  }
}

/**
 * Wraps the specified effect with a telemetry span using the given name and options.
 * If an active span context exists for the current request, it is propagated; otherwise,
 * the effect is returned unchanged.
 *
 * This ensures that tracing data is correctly captured and associated with
 * the specified telemetry span.
 *
 * @param name - The name of the telemetry span.
 * @param options - The options for configuring the telemetry span.
 */
export function withTelemetrySpan(name: string, options?: SpanOptions) {
  return <A, E, R>(self: Effect.Effect<A, E, R>) => {
    return self.pipe(
      Effect.withSpan(name, defu(options ?? {}, { captureStackTrace: true })),
      withActiveSpanContext(),
    )
  }
}

import type opentelemetry from '@opentelemetry/api'
import { Inspectable, Match } from 'effect'

/**
 * Transforms an unknown value into a valid OpenTelemetry attribute value.
 *
 * Ensures compatibility with OpenTelemetry by converting the value
 * into a format that can be used as an attribute in tracing, metrics,
 * or logs.
 *
 * @param value - The unknown value to transform.
 */
export function transformUnknownToTelemetryAttributeValue(value: unknown): opentelemetry.AttributeValue {
  return Match.value(value).pipe(
    Match.whenOr(
      Match.string,
      Match.number,
      Match.boolean,
      v => v,
    ),
    Match.when(
      Match.bigint,
      v => v.toString(),
    ),
    Match.orElse(v => Inspectable.toStringUnknown(v)),
  )
}

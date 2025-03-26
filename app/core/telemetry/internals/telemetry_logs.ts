import type { TaggedException } from '#core/error/factories/tagged_exception'
import type { TaggedInternalError } from '#core/error/factories/tagged_internal_error'
import { isTaggedException, isTaggedInternalError } from '#core/error/utils/error_utility'
import { logExceptionToTelemetry, logTaggedErrorToTelemetry, logUnknownErrorToTelemetry } from '#core/telemetry/internals/log_error'
import env from '#start/env'
import { Exception } from '@adonisjs/core/exceptions'
import otelLogs from '@opentelemetry/api-logs'
import { Effect, Match, pipe } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Logs the specified error using the OpenTelemetry Logs API
 * within the given scope and version.
 *
 * Captures and structures error details, including message, type,
 * kind, data, and cause, to provide meaningful insights.
 *
 * - Internal errors and exceptions are logged as structured error entries.
 * - Unknown errors are logged as generic error entries.
 *
 * @param log - The logging function for handling specific error types.
 * @param scope - The scope associated with the log entry (e.g., module, service).
 * @param version - The version associated with the log entry.
 */
export function logErrorToTelemetry(
  log: (['internal_error', 'known_exception', 'adonis_exception', 'unknown', 'all'][number])[],
  scope: string,
  version?: string,
) {
  return (error: unknown) => {
    const otelLogger = otelLogs.logs.getLogger(scope, lodash.defaultTo(version, env.get('OTEL_APPLICATION_SERVICE_VERSION')))

    return Match.value(error).pipe(
      Match.whenOr(
        (err: unknown) => isTaggedInternalError()(err) && (log.includes('internal_error') || log.includes('all')),
        (err: unknown) => isTaggedException()(err) && (log.includes('known_exception') || log.includes('all')),
        err => pipe(
          err as TaggedException<string, any> | TaggedInternalError<string, any>,
          logTaggedErrorToTelemetry(otelLogger),
        ),
      ),
      Match.when(
        (err: unknown) => err instanceof Exception && (log.includes('adonis_exception') || log.includes('all')),
        err => pipe(
          err as Exception,
          logExceptionToTelemetry(otelLogger),
        ),
      ),
      Match.when(
        (err: unknown) => (log.includes('unknown') || log.includes('all')) && (!isTaggedInternalError()(err) && !isTaggedException()(err) && !(err instanceof Exception)),
        logUnknownErrorToTelemetry(otelLogger),
      ),
      Match.orElse(() => Effect.void),
    )
  }
}

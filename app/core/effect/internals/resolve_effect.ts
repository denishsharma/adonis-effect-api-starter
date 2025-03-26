import { toInternalUnknownError } from '#core/error/utils/error_utility'
import is from '@adonisjs/core/helpers/is'
import { Effect, Match } from 'effect'

/**
 * Resolves a given value into an `Effect`.
 *
 * - If the value is already an `Effect`, it is returned as is.
 * - If the value is a `Promise`, it is wrapped in `Effect.tryPromise`.
 * - If the value is an async function, it is executed and wrapped in `Effect.tryPromise`.
 * - Otherwise, it is wrapped in `Effect.try`.
 */
export function resolveEffect<A = unknown, E = never, R = never>() {
  return (self: Effect.Effect<A, E, R> | unknown) =>
    Effect.suspend(() =>
      Match.value(self).pipe(
        Match.when(Effect.isEffect, effect => effect as Effect.Effect<A, E, R>),
        Match.when(is.promise, promise => Effect.tryPromise(async () => await promise)),
        Match.when(is.asyncFunction, asyncFunction => Effect.tryPromise(async () => await asyncFunction())),
        Match.orElse(() => Effect.try(() => self as A)),
      ),
    ).pipe(Effect.catchTag('UnknownException', toInternalUnknownError()))
}

/**
 * Resolves a given value into an `Effect`.
 *
 * - If the value is already an `Effect`, it is returned as is.
 * - Otherwise, it is wrapped in `Effect.sync`.
 *
 * This is useful when you want to ensure that the value is
 * an `Effect` or a synchronous value which will never fail.
 */
export function resolveEffectOrSync<A = unknown, E = never, R = never>() {
  return (self: Effect.Effect<A, E, R> | A) =>
    Effect.suspend(() => {
      if (Effect.isEffect(self)) {
        return self as Effect.Effect<A, E, R>
      }
      return Effect.sync(() => self as A)
    })
}

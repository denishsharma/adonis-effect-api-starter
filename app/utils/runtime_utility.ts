import type { HttpContext } from '@adonisjs/core/http'
import type { ManagedRuntime, Scope } from 'effect'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import { CurrentHttpContext } from '#core/http/contexts/current_http_context'
import UnexpectedRuntimeExitResultError from '#errors/unexpected_runtime_exit_result_error'
import InternalServerException from '#exceptions/internal_server_exception'
import { ApplicationRuntime } from '#start/runtime'
import logger from '@adonisjs/core/services/logger'
import { Cause, Effect, Exit, Function, Match, Option, Ref } from 'effect'

export namespace RuntimeUtility {
  /**
   * The context of the application runtime.
   * It has all the services that are available in the application runtime.
   */
  type C = ManagedRuntime.ManagedRuntime.Context<typeof ApplicationRuntime>

  /**
   * The error type of the application runtime.
   * It has all the errors that are available in the application runtime.
   */
  type ER = ManagedRuntime.ManagedRuntime.Error<typeof ApplicationRuntime>

  /**
   * Resolves the requirement of the effect.
   * It ensures that the effect has all defined dependencies resolved.
   *
   * Ensure that effect already has `Scope` as a dependency.
   */
  type ResolveRequirement<T, L> = [T] extends [never] ? L : T extends L ? T : T | L
  type R = ResolveRequirement<C, Scope.Scope | CurrentHttpContext>

  /**
   * Ensures that the effect has all of its dependencies resolved
   * before executing the effect.
   *
   * This provides only a type-level guarantee that the effect has
   * all of its dependencies resolved. It does not provide a runtime
   * guarantee that the effect has all of its dependencies resolved.
   *
   * @param self The effect to ensure that all of its dependencies are resolved
   */
  export const ensureDependencies: {
    <A, E>(): (self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
  } = Function.dual(
    args => Effect.isEffect(args[0]),
    (self: Effect.Effect<unknown, unknown, R>): Effect.Effect<unknown, unknown, R> => self,
  )

  /**
   * Handles the runtime exit result and returns the value if the exit result
   * is successful. If the exit result is a failure, it throws the error.
   *
   * If the exit result is a defect, it throws an internal server exception.
   *
   * @param self The exit result to handle
   */
  export const handleRuntimeExitResult: {
    <A, E>(): (self: Exit.Exit<A, ER | E>) => A
    <A, E>(self: Exit.Exit<A, ER | E>): A
  } = Function.dual(
    args => Exit.isExit(args[0]),
    (self: Exit.Exit<unknown, ER | unknown>): unknown => {
      if (Exit.isFailure(self) && Cause.isFailType(self.cause)) {
        throw self.cause.error
      }

      if (Exit.isFailure(self) && Cause.isDieType(self.cause)) {
        throw ErrorUtility.toInternalServerException(self.cause.defect)
      }

      if (Exit.isSuccess(self)) {
        return self.value
      }

      throw new InternalServerException(new UnexpectedRuntimeExitResultError({ result: self }))
    },
  )

  /**
   * Wraps the effectful program in a managed runtime.
   *
   * It ensures that the effectful program is managed
   * and all of its dependencies are resolved.
   *
   * It also logs any errors that occur during the processing
   * of the content.
   */
  export const managed = Effect.fn(function* <A, E>(self: Effect.Effect<A, E, R>) {
    return yield* self.pipe(
      Effect.scoped,
      /**
       * Tap into the effectful program to log any
       * errors that occur during the processing
       * of the content.
       */
      Effect.tapErrorCause(cause => Effect.gen(function* () {
        const causeRef = yield* Ref.make<Cause.Cause<unknown>>(cause)

        /**
         * Convert defects to failures.
         */
        yield* Ref.set(causeRef, Cause.fail((cause as Cause.Die).defect)).pipe(
          Effect.when(() => Cause.isDieType(cause)),
        )

        const fail = (yield* causeRef.get) as Cause.Fail<unknown>

        yield* Match.value(fail.error).pipe(
          Match.when(
            (error: unknown) => ErrorUtility.isInternalError()(error) || ErrorUtility.isException()(error),
            error => Effect.suspend(() => Effect.sync(() => {
              logger.error(
                error.toJSON(),
                `[effectful] ${error.toString()}`,
              )
            })),
          ),
          Match.orElse(error => Effect.suspend(() => Effect.sync(() => {
            const err = ErrorUtility.toInternalServerException(error)
            logger.error(
              err.toJSON(),
              `[effectful] ${err.toString()}`,
            )
          }))),
        )
      })),
      /**
       * Catch all non-exception errors and convert
       * them to internal server exceptions.
       */
      Effect.catchIf(
        error => !ErrorUtility.isException()(error),
        error => Effect.fail(ErrorUtility.toKnownException(error)),
      ),
      /**
       * Catch all defects and convert them to
       * internal server exceptions.
       */
      Effect.catchAllDefect(defect => Effect.fail(ErrorUtility.toKnownException(defect))),
    )
  })

  /**
   * Options to run the effectful program in the application runtime.
   */
  interface RuntimeExecutionOptions {
    signal?: AbortSignal
    ctx?: HttpContext
  }

  /**
   * Runs the effectful program in the application runtime.
   *
   * @param options The options to run the effectful program
   */
  export function run<A, E>(options?: RuntimeExecutionOptions) {
    return async (self: Effect.Effect<A, E, R>): Promise<A> => {
      const result = await ApplicationRuntime.runPromiseExit(
        Effect.suspend(() =>
          managed(self).pipe(
            CurrentHttpContext.provide(Option.fromNullable(options?.ctx)),
          ),
        ),
        options,
      )
      return handleRuntimeExitResult(result)
    }
  }
}

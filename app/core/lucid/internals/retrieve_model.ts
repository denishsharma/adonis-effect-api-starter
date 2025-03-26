import type UnknownError from '#core/error/errors/unknown_error'
import type { LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER } from '#core/lucid/internals/constants/lucid_marker_constant'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Brand } from 'effect'
import { toInternalUnknownError } from '#core/error/utils/error_utility'
import { defu } from 'defu'
import { Cause, Effect } from 'effect'

/**
 * Defines a retrieval strategy for a Lucid model.
 *
 * A retrieval strategy determines how a resource should be queried and
 * retrieved from the database, ensuring consistent error handling and
 * exception management.
 *
 * This abstraction enables flexible data-fetching strategies with optional
 * customization for exceptions and return types.
 */
export type LucidModelRetrievalStrategy<T extends LucidModel, A, E, R, C extends boolean = false> = Brand.Branded<
  {
    model: T;
    strategy: Effect.Effect<A | null | undefined, E | UnknownError, R>;
    options?: {
      /**
       * Whether the returned type should be
       * any or the actual Lucid model defined by the query.
       *
       * @defaultValue `false`
       */
      custom?: C;
      exception?: {
        /**
         * The message to be used in the exception
         * when the resource is not found.
         */
        message?: string | ((resource: string) => string);
      };
    };
  },
  typeof LUCID_MODEL_RETRIEVAL_STRATEGY_MARKER
>

/**
 * Creates a retrieval strategy for a given Lucid model.
 *
 * Defines a structured approach for fetching resources from the database
 * using an effect-based execution strategy. This ensures consistent error
 * handling and allows optional customization of exception management.
 *
 * @param model - The Lucid model to use for resource retrieval.
 * @param strategy - A function that receives a query builder and returns an effect to fetch the resource.
 * @param options - Optional configuration for customizing retrieval behavior and exception handling.
 *
 * @example
 * ```ts
 * const strategy = makeLucidModelRetrievalStrategy(
 *   User,
 *   (query) => Effect.tryPromise(() => query.where('email', 'test@example.com').firstOrFail()),
 *   { exception: { message: 'User not found' } }
 * )
 * ```
 */
export function makeLucidModelRetrievalStrategy<T extends LucidModel, K extends InstanceType<T>, A, E, R, C extends boolean = false>(
  model: T,
  strategy: (query: ModelQueryBuilderContract<T, K>) => Effect.Effect<(C extends true ? A : (K | K[])) | null | undefined, E | Cause.UnknownException, R>,
  options?: LucidModelRetrievalStrategy<T, A, E, R, C>['options'],
) {
  const resolvedOptions = defu(options, {
    custom: false,
    exception: { message: undefined },
  })

  return {
    model,
    strategy: strategy(model.query()).pipe(
      Effect.catchIf(
        error => error instanceof Cause.UnknownException,
        error => toInternalUnknownError('Unknown error while retrieving the resource using the provided strategy.')(error.cause ?? error),
      ),
    ),
    options: resolvedOptions,
  } as LucidModelRetrievalStrategy<T, A, E extends Cause.UnknownException ? (Exclude<E, Cause.UnknownException> | UnknownError) : E, R, C>
}

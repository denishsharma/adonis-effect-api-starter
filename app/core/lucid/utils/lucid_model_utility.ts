import type UnknownError from '#errors/unknown_error'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Brand } from 'effect'
import { ErrorUtility } from '#core/error_and_exception/utils/error_utility'
import { defu } from 'defu'
import { Cause, Effect } from 'effect'

export namespace LucidModelUtility {
  export const RETRIEVAL_STRATEGY: unique symbol = Symbol('retrieval_strategy')

  /**
   * Represents a retrieval strategy for a Lucid model.
   *
   * A retrieval strategy is a combination of a query and an effect
   * that is used to retrieve a resource from the database.
   *
   * It encapsulates the query and the effect to provide a
   * consistent way to retrieve resources from the database.
   */
  export type RetrievalStrategy<T extends LucidModel, K extends InstanceType<T>, A, E, R, C extends boolean = false> = Brand.Branded<{
    query: ModelQueryBuilderContract<T, K>
    strategy: Effect.Effect<A | null | undefined, E | UnknownError, R>
    options?: {
      /**
       * Whether the returned type should be
       * any or the actual Lucid model defined by the query.
       *
       * @defaultValue `false`
       */
      custom?: C
      exception?: {
        /**
         * The message to be used in the exception
         * when the resource is not found.
         */
        message?: string | ((resource: string) => string)
      }
    }
  }, typeof RETRIEVAL_STRATEGY>

  /**
   * Make a retrieval strategy for the provided Lucid model.
   *
   * @param query The query to be used to retrieve the resource.
   * @param strategy The effect to be used to retrieve the resource.
   * @param options The options for the retrieval strategy.
   */
  export function makeRetrievalStrategy<T extends LucidModel, K extends InstanceType<T>, A, E, R, C extends boolean = false>(
    query: ModelQueryBuilderContract<T, K>,
    strategy: (query: ModelQueryBuilderContract<T, K>) => Effect.Effect<(C extends true ? A : (K | K[])) | null | undefined, E | Cause.UnknownException, R>,
    options?: RetrievalStrategy<T, K, A, E, R, C>['options'],
  ) {
    const resolvedOptions = defu(options, {
      custom: false,
      exception: { message: undefined },
    })

    return {
      query,
      strategy: strategy(query).pipe(
        Effect.catchIf(
          error => error instanceof Cause.UnknownException,
          error => ErrorUtility.toInternalUnknownError('Unknown error while retrieving the resource using the provided strategy.')(error.cause ?? error),
        ),
      ),
      options: resolvedOptions,
    } as RetrievalStrategy<T, K, A, E extends Cause.UnknownException ? (Exclude<E, Cause.UnknownException> | UnknownError) : E, R, C>
  }
}

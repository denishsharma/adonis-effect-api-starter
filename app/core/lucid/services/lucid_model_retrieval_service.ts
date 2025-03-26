import type { LucidModelRetrievalStrategy } from '#core/lucid/internals/retrieve_model'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { UnknownRecord } from 'type-fest'
import { withTelemetrySpan } from '#core/telemetry/utils/telemetry_utility'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { defu } from 'defu'
import { Array, Effect } from 'effect'
import * as lodash from 'lodash-es'

/**
 * Configuration options for retrieving a Lucid model.
 *
 * Provides customization for selecting specific columns and handling
 * exceptions when the resource is not found.
 *
 * @template T - The shape of the model's table columns.
 *
 * @example
 * ```ts
 * const options: RetrieveLucidModelOptions<UserTableColumns> = {
 *   select: ['id', 'name', 'email'],
 *   exception: { message: 'User not found' }
 * }
 * ```
 */
export interface RetrieveLucidModelOptions<T extends UnknownRecord = UnknownRecord> {
  /**
   * The columns to select from the model.
   *
   * Can be an array of column names or `'*'` to select all columns.
   */
  select?: (keyof T)[] | '*';

  /**
   * Configuration for handling exceptions when the resource is not found.
   */
  exception?: {
    /**
     * Custom message for the exception when the resource is missing.
     * Can be a string or a function that generates a message dynamically.
     */
    message?: string | ((resource: string) => string);
  };
}

export class LucidModelRetrievalService extends Effect.Service<LucidModelRetrievalService>()('@service/lucid/model_retrieval', {
  effect: Effect.gen(function* () {
    function retrieve<S extends UnknownRecord>(options?: RetrieveLucidModelOptions<S>) {
      /**
       * @param strategy - The retrieval strategy to use for fetching the resource.
       */
      return <T extends LucidModel, A, E, R, C extends boolean = false>(strategy: LucidModelRetrievalStrategy<T, A, E, R, C>) =>
        Effect.gen(function* () {
          const modelName = stringHelpers.singular(strategy.model.name)
          yield* Effect.annotateCurrentSpan('resource', modelName.toLowerCase())

          const resolvedOptions = defu(
            options,
            strategy.options ? lodash.omit(strategy.options, 'custom') : {},
            {
              select: '*' as const,
              resource: modelName.toLowerCase(),
              exception: { message: undefined },
            },
          )

          /**
           * If the select option is an array, ensure
           * that the `id` column is included in the selection.
           */
          if (Array.isArray(resolvedOptions.select)) {
            resolvedOptions.select = Array.dedupe(Array.prepend(resolvedOptions.select, 'id'))
          }

          /**
           * Retrieve the resource using the provided strategy.
           */
          const resource = yield* strategy.strategy

          /**
           * If the resource is null or undefined,
           * yield a ResourceNotFoundException.
           */
          if (is.nullOrUndefined(resource)) {
            return yield* new ResourceNotFoundException(
              { resource: stringHelpers.singular(resolvedOptions.resource) },
              typeof resolvedOptions.exception.message === 'function'
                ? resolvedOptions.exception.message(resolvedOptions.resource)
                : resolvedOptions.exception.message ?? `${stringHelpers.titleCase(resolvedOptions.resource)} for provided retrieval strategy does not exist.`,
            )
          }

          return resource
        }).pipe(
          withTelemetrySpan('with_retrieval_strategy'),
        )
    }

    return {
      /**
       * Retrieves a resource using the provided retrieval strategy while handling errors consistently.
       *
       * This function applies the specified retrieval strategy to fetch a resource from the database,
       * ensuring that missing resources trigger a `ResourceNotFoundException`. It also allows for
       * optional customization of selection fields and exception messages.
       *
       * @param options - Configuration options for selecting columns and customizing exception messages.
       *
       * @example
       * ```ts
       * const strategy = makeLucidModelRetrievalStrategy(
       *   User,
       *   (query) => Effect.tryPromise(() => query.where('id', 1).firstOrFail()),
       *   { exception: { message: 'User not found' } }
       * )
       *
       * const user = yield* retrieve<UserTableColumns>({ select: ['id', 'name'] })(strategy)
       * ```
       */
      retrieve,
    }
  }),
}) {}

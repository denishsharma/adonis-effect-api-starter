import type { LucidModelUtility } from '#core/lucid/utils/lucid_model_utility'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import { TelemetryUtility } from '#core/telemetry/utils/telemetry_utility'
import ResourceNotFoundException from '#exceptions/resource_not_found_exception'
import is from '@adonisjs/core/helpers/is'
import stringHelpers from '@adonisjs/core/helpers/string'
import { defu } from 'defu'
import { Effect } from 'effect'
import * as lodash from 'lodash-es'

export class LucidModelRetrievalService extends Effect.Service<LucidModelRetrievalService>()('@service/lucid/model_retrieval', {
  effect: Effect.gen(function* () {
    /**
     * Options for the retrieve method.
     */
    interface RetrieveOptions {
      exception?: {
        /**
         * The message to be used in the exception
         * when the resource is not found.
         */
        message?: string | ((resource: string) => string)
      }
    }

    function retrieve<T extends LucidModel, K extends InstanceType<T>, A, E, R, C extends boolean>(strategy: LucidModelUtility.RetrievalStrategy<T, K, A, E, R, C>, options?: RetrieveOptions) {
      const modelName = stringHelpers.singular(strategy.query.model.name)

      return Effect.gen(function* () {
        const resolvedOptions = defu(
          options,
          strategy.options ? lodash.omit(strategy.options, 'custom') : {},
          {
            resource: modelName.toLowerCase(),
            exception: { message: undefined },
          },
        )

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
        TelemetryUtility.withTelemetrySpan('with_retrieval_strategy', {
          attributes: {
            resource: modelName.toLowerCase(),
          },
        }),
      )
    }

    return {
      /**
       * Retrieve a resource using the provided retrieval strategy.
       *
       * @param strategy The retrieval strategy to use.
       * @param options The options for the retrieval.
       */
      retrieve,
    }
  }),
}) {}

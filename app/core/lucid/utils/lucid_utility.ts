import { LucidModelRetrievalService } from '#core/lucid/services/lucid_model_retrieval_service'
import { Layer } from 'effect'

export namespace LucidUtility {
  export namespace Module {
    /**
     * Provide a layer that merges all Lucid services.
     *
     * This layer can be used to provide the necessary services
     * to the effect runtime.
     */
    export function layer() {
      return Layer.mergeAll(
        LucidModelRetrievalService.Default,
      )
    }
  }
}

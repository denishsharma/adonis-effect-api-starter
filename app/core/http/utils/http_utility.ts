import { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import { ValidateRequestService } from '#core/http/services/request/validate_request_service'
import { MakeResponseService } from '#core/http/services/response/make_response_service'
import { ResposneContextService } from '#core/http/services/response/response_context_service'
import is from '@adonisjs/core/helpers/is'
import { Layer, Match } from 'effect'

export namespace HttpUtility {
  export namespace Module {
    /**
     * Provide a layer that merges all response and request services.
     *
     * This layer can be used to provide the necessary services
     * to the effect runtime.
     */
    export function layer() {
      return Layer.mergeAll(
        /**
         * Response services
         */
        MakeResponseService.Default,
        ResposneContextService.Default,

        /**
         * Request services
         */
        ValidateRequestService.Default,
      )
    }
  }

  export namespace Response {
    /**
     * Infer the response data mode from the provided data.
     * - If the data is an object, it is inferred as a single data mode.
     * - If the data is an array, it is inferred as a list data mode.
     * - If the data is undefined, it is inferred as a none data mode.
     * - Otherwise, it is inferred as a raw data mode.
     *
     * For paginated data, try setting the data mode manually,
     * as it is not possible to infer it from the data.
     *
     * @param data The data to infer the response data mode from.
     */
    export function inferResponseDataModeFromData(data: unknown) {
      return Match.value(data).pipe(
        Match.withReturnType<ResponseDataMode>(),
        Match.when((_: unknown) => is.undefined(_), () => ResponseDataMode.NONE),
        Match.when((_: unknown) => is.array(_), () => ResponseDataMode.LIST),
        Match.when((_: unknown) => is.object(_), () => ResponseDataMode.SINGLE),
        Match.orElse(() => ResponseDataMode.RAW),
      )
    }
  }
}

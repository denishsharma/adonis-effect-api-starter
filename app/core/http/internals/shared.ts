import { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import is from '@adonisjs/core/helpers/is'
import { Match } from 'effect'

/**
 * Determines the appropriate response data mode based on the provided data.
 *
 * This function categorizes data into a predefined response mode, ensuring
 * consistent handling in APIs, data processing, and response management.
 */
export function inferResponseDataModeFromData() {
  return (data: unknown) =>
    Match.value(data).pipe(
      Match.withReturnType<ResponseDataMode>(),
      Match.when(Match.undefined, () => ResponseDataMode.NONE),
      Match.when(is.array, () => ResponseDataMode.LIST),
      Match.orElse(() => ResponseDataMode.RAW),
    )
}

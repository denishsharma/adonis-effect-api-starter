import type { ModuleUtility } from '#types/module_type'
import * as module from '#core/error/internals/module_layer'
import { ErrorUtility } from '#core/error/utils/error_utility'

/**
 * Type of the error module that combines
 * all error-related module utilities and ensures no key conflicts.
 */
export type ErrorModule = ModuleUtility<[
  typeof module,
  {
    utils: ErrorUtility
  },
]>

/**
 * Combines error-related module utilities into a single
 * readonly module object.
 */
export const ErrorModule = {
  utils: ErrorUtility,
  ...module,
} satisfies ErrorModule as Readonly<ErrorModule>

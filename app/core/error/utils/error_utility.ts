import type { ModuleUtility } from '#types/module_type'
import * as conversion from '#core/error/internals/error_conversion'
import * as shared from '#core/error/internals/shared'
import * as validate from '#core/error/internals/validate_error'

/**
 * Type of the error utility object that combines
 * all error-related utilities and ensures no key conflicts.
 */
export type ErrorUtility = ModuleUtility<[
  typeof validate,
  typeof conversion,
  typeof shared,
]>

/**
 * Combines error-related utilities into a single
 * readonly utility object.
 */
export const ErrorUtility = {
  ...validate,
  ...conversion,
  ...shared,
} satisfies ErrorUtility as Readonly<ErrorUtility>

import { Layer } from 'effect'

/**
 * Provides a module layer for error and exception handling.
 *
 * Allows injecting error and exception-related dependencies
 * into other modules or the application runtime.
 */
export function provide() {
  return Layer.empty
}

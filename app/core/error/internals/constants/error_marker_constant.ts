/**
 * Unique symbol to mark the error as an exception.
 *
 * This is used to identify the error as an exception
 * and is used for filtering out exceptions from other
 * errors.
 */
export const EXCEPTION_MARKER: unique symbol = Symbol('@marker/error/exception')

/**
 * Unique symbol to mark the error as an internal error.
 *
 * This is used to identify the error as an internal error
 * and is used for type checking and filtering.
 */
export const INTERNAL_ERROR_MARKER: unique symbol = Symbol('@marker/error/internal')

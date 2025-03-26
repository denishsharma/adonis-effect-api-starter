import { resolveEffectOrSync } from '#core/effect/utils/effect_utility'
import JsonParseError from '#core/error/errors/json_parse_error'
import { defu } from 'defu'
import { Effect, pipe } from 'effect'

/**
 * Options for customizing the error message when
 * parsing/serializing JSON fails.
 */
export interface JsonParseErrorOptions {
  /**
   * Custom error message to include in the error.
   */
  message?: string;
}

/**
 * Safely stringifies a JSON object, with error handling for invalid objects.
 * If the JSON object cannot be stringified, it will catch the error and return
 * a parsed error message with the relevant details.
 *
 * The function also allows for customization of the indentation in the output and
 * a custom error message for when stringifying fails.
 *
 * @param space - Optional number of spaces used for indentation in the resulting JSON string.
 *              If not provided, the output will be a compact JSON string.
 * @param options - Optional configuration object for customizing error messages.
 *                If not provided, a default error message will be used.
 *
 * @example
 * ```ts
 * const json = { name: "John", age: 30 };
 * const result = yield* stringifyJson(2)({ json });
 * // result will be a JSON string with 2 spaces indentation.
 *
 * // If stringifying fails, it returns a custom error message:
 * const invalidJson = undefined;
 * const result = yield* stringifyJson(2, { message: "Custom stringify error" })(invalidJson);
 * // throws an error with the message "Custom stringify error"
 * ```
 */
export function stringifyJson(space?: number, options?: JsonParseErrorOptions) {
  const resolvedOptions = defu(options, {
    message: 'Unexpected error occurred while stringifying JSON.',
  })

  /**
   * @param json - The JSON object to stringify.
   */
  return <E, R>(json: Effect.Effect<unknown, E, R> | unknown) =>
    Effect.gen(function* () {
      const data = yield* pipe(json, resolveEffectOrSync<unknown, E, R>())
      return yield* Effect.try({
        try: () => JSON.stringify(data, undefined, space),
        catch: JsonParseError.fromUnknownError(data, resolvedOptions.message),
      })
    })
}

/**
 * Safely parses a JSON string into an object, with error handling for invalid JSON.
 * If the JSON string cannot be parsed, it will catch the error and return
 * a parsed error message with the relevant details.
 *
 * The function allows for customizing the error message when parsing fails.
 *
 * @param options - Optional configuration object for customizing error messages.
 *                If not provided, a default error message will be used.
 *
 * @example
 * ```ts
 * const jsonString = '{"name": "John", "age": 30}';
 * const result = yield* parseJson()({ jsonString });
 * // result will be the parsed object { name: "John", age: 30 }
 *
 * // If parsing fails, it returns a custom error message:
 * const invalidJson = '{"name": "John", "age":}';
 * const result = yield* parseJson({ message: "Custom parsing error" })(invalidJson);
 * // result will contain an error with the message "Custom parsing error"
 * ```
 */
export function parseJson<A = any>(options?: JsonParseErrorOptions) {
  const resolvedOptions = defu(options, {
    message: 'Unexpected error occurred while parsing JSON.',
  })

  /**
   * @param json - The JSON string to parse.
   */
  return <E, R>(json: string | Effect.Effect<string, E, R>) =>
    Effect.gen(function* () {
      const data = yield* pipe(json, resolveEffectOrSync<string, E, R>())
      return yield* Effect.try({
        try: () => JSON.parse(data) as A,
        catch: JsonParseError.fromUnknownError(data, resolvedOptions.message),
      })
    })
}

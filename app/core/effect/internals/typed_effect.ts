import type { Effect } from 'effect'

/**
 * Changes the success type of the effect to the specified type.
 *
 * Suitable in cases where effect will succeed with one
 * of the specified success types.
 */
export const ensureSuccessType = <S>() => <A extends S, E, R>(self: Effect.Effect<A, E, R> & (A extends S ? unknown : never)): Effect.Effect<A, E, R> => self

/**
 * Enforces the success type of the effect to the specified type.
 *
 * Suitable in cases where effect will always succeed with the specified
 * success type and the success type is not `never`.
 */
export const enforceSuccessType = <S>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<S, E, R> => self as unknown as Effect.Effect<S, E, R>

/**
 * Changes the error type of the effect to the specified type.
 * It will not throw a type error if effect has `never` error type.
 *
 * Suitable in cases where effect will either never fail or will
 * fail with one of the specified error types (including `never`).
 */
export const ensureErrorType = <K>() => <A, E extends K, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => self

/**
 * Enforces the error type of the effect to the specified type.
 *
 * Suitable in cases where effect will always fail with the specified
 * error type and the error type is not `never`.
 */
export const enforceErrorType = <K>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, K, R> => self as unknown as Effect.Effect<A, K, R>

/**
 * Changes the error type of the effect to the specified type.
 * It will throw a type error if effect has `never` error type.
 *
 * Suitable in cases where effect will always fail with the specified
 * error type and the error type is not `never`.
 */
export const ensureExplicitErrorType = <K>() => <A, E extends K & (K extends E ? unknown : never), R>(self: Effect.Effect<A, E, R> & (E extends K ? unknown : never)): Effect.Effect<A, K, R> => self

/**
 * Changes the context type of the effect to the specified type.
 * It will throw a type error if context type does not match the specified type.
 *
 * Suitable in cases where effect will always require the specified context type.
 */
export const ensureContextType = <C>() => <A, E, R extends C & (C extends R ? unknown : never)>(self: Effect.Effect<A, E, R> & (R extends C ? unknown : never)): Effect.Effect<A, E, C> => self

/**
 * Enforces the context type of the effect to the specified type.
 *
 * Suitable in cases where effect will always require the specified context type.
 */
export const enforceContextType = <C>() => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, C> => self as unknown as Effect.Effect<A, E, C>

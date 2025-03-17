export enum ErrorKind {
  INTERNAL = 'internal_error',
  EXCEPTION = 'exception',
}

export interface ErrorKindMetadata {
  /**
   * Describes what the error kind is
   * and what it is used for.
   */
  description: string

  /**
   * Whether the error kind is critical.
   *
   * Critical errors are errors that are
   * considered to be critical and should
   * be handled with care.
   */
  critical?: boolean
}

export const ErrorKindMetadata: Record<ErrorKind, ErrorKindMetadata> = {
  [ErrorKind.INTERNAL]: {
    description: 'Internal errors are errors that are raised by the application itself. This kind of errors are not exposed to the client and are used for debugging purposes.',
    critical: true,
  },
  [ErrorKind.EXCEPTION]: {
    description: 'Exceptions are errors that are raised in request cycle. This kind of errors are exposed to the client and exception handler is used to handle these errors.',
    critical: false,
  },
}

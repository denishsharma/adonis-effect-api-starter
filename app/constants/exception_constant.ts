export enum ExceptionCode {
  E_ROUTE_NOT_FOUND = 'E_ROUTE_NOT_FOUND',
  E_INTERNAL_SERVER_ERROR = 'E_INTERNAL_SERVER_ERROR',
}

export interface ExceptionCodeMetadata {
  /**
   * A human-readable message describing the exception code.
   *
   * This also serves as the default error message when an exception
   * is thrown without a message.
   */
  message: string
}

/**
 * Metadata for exception codes.
 */
export const ExceptionCodeMetadata: Record<ExceptionCode, ExceptionCodeMetadata> = {
  [ExceptionCode.E_ROUTE_NOT_FOUND]: {
    message: 'Could not find the requested route for the requested method.',
  },
  [ExceptionCode.E_INTERNAL_SERVER_ERROR]: {
    message: 'Unexpected error occurred while processing the request and the server is unable to fulfill the request.',
  },
}

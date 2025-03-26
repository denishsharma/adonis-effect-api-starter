export enum ExceptionCode {
  E_ROUTE_NOT_FOUND = 'E_ROUTE_NOT_FOUND',
  E_VALIDATION_ERROR = 'E_VALIDATION_ERROR',
  E_RESOURCE_NOT_FOUND = 'E_RESOURCE_NOT_FOUND',
  E_RESOURCE_ALREADY_EXISTS = 'E_RESOURCE_ALREADY_EXISTS',
  E_FORBIDDEN_ACTION = 'E_FORBIDDEN_ACTION',
  E_INTERNAL_SERVER_ERROR = 'E_INTERNAL_SERVER_ERROR',
}

export interface ExceptionCodeMetadata {
  /**
   * A human-readable message describing the exception code.
   *
   * This also serves as the default error message when an exception
   * is thrown without a message.
   */
  message: string;
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
  [ExceptionCode.E_RESOURCE_NOT_FOUND]: {
    message: 'The requested resource you are looking for could not be found.',
  },
  [ExceptionCode.E_RESOURCE_ALREADY_EXISTS]: {
    message: 'The resource you are trying to create already exists.',
  },
  [ExceptionCode.E_VALIDATION_ERROR]: {
    message: 'Validation failed for the request while processing the request payload.',
  },
  [ExceptionCode.E_FORBIDDEN_ACTION]: {
    message: 'You do not have necessary permissions to perform the requested action.',
  },
}

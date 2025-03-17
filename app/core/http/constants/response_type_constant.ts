export enum ResponseType {
  /**
   * The request was successful and the response does not contain
   * any exception details but may contain requested data.
   */
  SUCCESS = 'success',

  /**
   * An exception occurred while processing the request and the
   * response contains the exception details.
   */
  EXCEPTION = 'exception',
}

export interface ResponseTypeMetadata {
  /**
   * A human-readable message describing the structured response type.
   */
  message: string
}

/**
 * Metadata for structured response types.
 */
export const ResponseTypeMetadata: Record<ResponseType, ResponseTypeMetadata> = {
  [ResponseType.SUCCESS]: {
    message: 'The request was successful and the response does not contain any exception details but may contain requested data.',
  },
  [ResponseType.EXCEPTION]: {
    message: 'An exception occurred while processing the request and the response contains the exception details.',
  },
}

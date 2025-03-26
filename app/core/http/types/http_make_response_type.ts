import type { ResponseDataMode } from '#core/http/constants/response_data_mode_constant'
import type { StatusCodes } from 'http-status-codes'

/**
 * Options for creating a success response.
 */
export interface MakeSuccessResponseOptions {
  /**
   * The HTTP status code of the success response.
   * If not provided, it will be defaulted to 200.
   */
  status?: StatusCodes;

  /**
   * The human-readable message for the success response.
   * If not provided, it will be defaulted to undefined.
   */
  message?: string;

  /**
   * The data mode of the success response.
   * If not provided, it will be inferred from the content.
   */
  dataMode?: ResponseDataMode;

  /**
   * Additional metadata to be included in the success response.
   * If not provided, it will be merged with the existing metadata of the current response.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating an exception response.
 */
export interface MakeExceptionResponseOptions {
  /**
   * The HTTP status code of the exception response.
   * If not provided, it will be inferred from the exception.
   */
  status?: StatusCodes;

  /**
   * The human-readable message for the exception response.
   * If not provided, it will be inferred from the exception.
   */
  message?: string;

  /**
   * Additional metadata to be included in the exception response.
   * If not provided, it will be merged with the existing metadata of the current response.
   */
  metadata?: Record<string, unknown>;
}

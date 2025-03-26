/**
 * Type that represents the merged request data
 * from the request body, params, cookies, headers and query string.
 */
export interface MergedRequestData extends Record<string, unknown> {
  __params: Record<string, unknown>;
  __cookies: Record<string, unknown>;
  __headers: Record<string, unknown>;
  __qs: Record<string, unknown>;
}

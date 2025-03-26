import type { ParseResult } from 'effect'

/**
 * Generates an error message from a parsing issue.
 * The resulting message includes the provided message, expected value, and actual value.
 *
 * **Format:**
 * `${msg}\nExpected: ${expected}. Actual: ${self.actual}`
 *
 * @param message - The custom message to include in the error.
 * @param expected - The expected value in the parsing process.
 */
export function makeErrorMessageFromParseIssue(message: string, expected: string) {
  /**
   * @param issue - The parse issue object containing the actual value encountered.
   */
  return (issue: ParseResult.ParseIssue) => `${message}\nExpected: ${expected}. Actual: ${issue.actual}`
}

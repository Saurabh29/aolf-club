/**
 * Shared library types
 * `ApiResult<T>` is the canonical success/error shape returned by services and actions.
 */

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

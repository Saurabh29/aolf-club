/**
 * Shared types for service layer
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

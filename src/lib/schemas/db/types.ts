/**
 * Common types and enums for DynamoDB schema
 */

import { z } from "zod";

/**
 * User types within the system
 */
export const UserTypeEnum = z.enum(["MEMBER", "LEAD"]);
export type UserType = z.infer<typeof UserTypeEnum>;

/**
 * Group types (ReBAC core - determines base permissions)
 */
export const GroupTypeEnum = z.enum(["TEACHER", "VOLUNTEER"]);
export type GroupType = z.infer<typeof GroupTypeEnum>;

/**
 * Permission values (binary access control)
 */
export const PermissionEnum = z.enum(["ALLOW", "DENY"]);
export type Permission = z.infer<typeof PermissionEnum>;

/**
 * OAuth provider types
 */
export const OAuthProviderEnum = z.enum(["google", "github", "microsoft"]);
export type OAuthProvider = z.infer<typeof OAuthProviderEnum>;

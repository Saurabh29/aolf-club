/**
 * Entity schemas (Nodes) for DynamoDB single-table design
 */

import { z } from "zod";
import { UserTypeEnum, GroupTypeEnum, OAuthProviderEnum } from "./types";

// ============================================================================
// EMAIL IDENTITY
// ============================================================================
/**
 * EmailIdentity - OAuth login lookup entity
 * 
 * PK: "EMAIL#<email>", SK: "META"
 * Query Pattern: GetItem(PK="EMAIL#user@example.com", SK="META") → userId
 */
export const EmailIdentitySchema = z.object({
  PK: z.string().regex(/^EMAIL#.+$/),
  SK: z.literal("META"),
  email: z.string().email(),
  userId: z.string().ulid(),
  provider: OAuthProviderEnum.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;

// ============================================================================
// USER
// ============================================================================
/**
 * User - Primary user entity
 * 
 * PK: "USER#<userId>", SK: "META"
 * Query Pattern: GetItem(PK="USER#<userId>", SK="META") → user
 */
export const UserSchema = z.object({
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),
  SK: z.literal("META"),
  userId: z.string().ulid(),
  displayName: z.string().min(1).max(255),
  userType: UserTypeEnum,
  isAdmin: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// ============================================================================
// USER GROUP
// ============================================================================
/**
 * UserGroup - ReBAC core entity (scoped to location)
 * 
 * PK: "GROUP#<groupId>", SK: "META"
 * Query Pattern: GetItem(PK="GROUP#<groupId>", SK="META") → group
 */
export const UserGroupSchema = z.object({
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),
  SK: z.literal("META"),
  groupId: z.string().ulid(),
  locationId: z.string().ulid(),
  groupType: GroupTypeEnum,
  name: z.string().min(1).max(255),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserGroup = z.infer<typeof UserGroupSchema>;

// ============================================================================
// ROLE (Global)
// ============================================================================
/**
 * Role - Global role definition
 * 
 * PK: "ROLE#<roleName>", SK: "META"
 * Query Pattern: GetItem(PK="ROLE#teacher", SK="META") → role
 */
export const RoleSchema = z.object({
  PK: z.string().regex(/^ROLE#.+$/),
  SK: z.literal("META"),
  roleName: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Role = z.infer<typeof RoleSchema>;

// ============================================================================
// PAGE (Global)
// ============================================================================
/**
 * Page - Page definition for permission control
 * 
 * PK: "PAGE#<pageName>", SK: "META"
 * Query Pattern: GetItem(PK="PAGE#dashboard", SK="META") → page
 */
export const PageSchema = z.object({
  PK: z.string().regex(/^PAGE#.+$/),
  SK: z.literal("META"),
  pageName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});
export type Page = z.infer<typeof PageSchema>;

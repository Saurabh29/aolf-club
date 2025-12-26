/**
 * User UI Schemas
 * 
 * These schemas are DERIVED from the authoritative DB schema using Zod composition.
 * Used for User Management page and authentication.
 * 
 * Pattern: Import DB schema and derive using omit/pick/extend.
 */

import { z } from "zod";
import { UserSchema as UserDbSchema } from "~/lib/schemas/db/user.schema";

/**
 * UserListViewModel - Simplified view model for user list display
 * Omits DynamoDB internal fields (PK, SK)
 */
export const UserListViewModelSchema = UserDbSchema.omit({
  PK: true,
  SK: true,
});

export type UserListViewModel = z.infer<typeof UserListViewModelSchema>;

/**
 * UserProfileSchema - Basic user profile for display in header/nav
 */
export const UserProfileSchema = z.object({
  userId: z.string().ulid(),
  displayName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  isAdmin: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * AuthSessionSchema - Simplified authentication session data
 * Maps to OAuth provider responses
 */
export const AuthSessionSchema = z.object({
  user: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    image: z.string().url().optional(),
  }),
  provider: z.enum(["google", "github"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

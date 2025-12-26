/**
 * ============================================================================
 * PHASE 1: DynamoDB Single-Table Schema Design
 * ============================================================================
 * 
 * ReBAC (Relationship-Based Access Control) Schema for SolidStart Application
 * 
 * HARD CONSTRAINTS:
 * - Single DynamoDB table (NO GSI, NO Scan)
 * - ULID for all primary entity IDs
 * - Email is NOT the User primary key (separate EmailIdentity entity)
 * - Permissions are data-driven (no hardcoded role/permission logic)
 * 
 * ARCHITECTURE OVERVIEW:
 * - Entities are modeled as "nodes" with PK=<TYPE>#<id>, SK="META"
 * - Relationships are modeled as "edges" with bidirectional items when needed
 * - All lookups use GetItem or Query on PK (no GSI, no Scan)
 */

import { z } from "zod";

// ============================================================================
// COMMON TYPES & ENUMS
// ============================================================================

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

// ============================================================================
// ENTITY SCHEMAS (Nodes)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. EMAIL IDENTITY
// ----------------------------------------------------------------------------
/**
 * EmailIdentity - OAuth login lookup entity
 * 
 * PURPOSE:
 * - O(1) lookup from email → userId after OAuth authentication
 * - Email is the stable identifier from OAuth providers
 * - Resolves to the internal User entity
 * 
 * PK/SK PATTERN:
 * - PK: "EMAIL#<email>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="EMAIL#user@example.com", SK="META") → Get userId for email
 * 
 * WHY THIS SHAPE:
 * - Email cannot be User PK (constraint), so we need a separate lookup entity
 * - GetItem provides O(1) lookup without GSI
 * - Stores provider info for audit/debugging
 */
export const EmailIdentitySchema = z.object({
  // Keys
  PK: z.string().regex(/^EMAIL#.+$/),           // EMAIL#<email>
  SK: z.literal("META"),
  
  // Attributes
  email: z.string().email(),
  userId: z.string().ulid(),                     // References USER#<userId>
  provider: OAuthProviderEnum.optional(),        // OAuth provider used
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;

// ----------------------------------------------------------------------------
// 2. USER
// ----------------------------------------------------------------------------
/**
 * User - Primary user entity
 * 
 * PURPOSE:
 * - Core user record with ULID as primary key
 * - Stores user type (MEMBER/LEAD) and admin flag
 * - Referenced by all relationship items
 * 
 * PK/SK PATTERN:
 * - PK: "USER#<userId>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="USER#<userId>", SK="META") → Get user by ID
 * 
 * WHY THIS SHAPE:
 * - ULID provides sortable, unique identifier (not email per constraint)
 * - userType and isAdmin are user-level properties, not location-scoped
 * - Email lookup is via EmailIdentity entity (O(1) chain: email → userId → user)
 */
export const UserSchema = z.object({
  // Keys
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),   // USER#<ULID>
  SK: z.literal("META"),
  
  // Attributes
  userId: z.string().ulid(),
  displayName: z.string().min(1).max(255),
  userType: UserTypeEnum,                         // MEMBER or LEAD
  isAdmin: z.boolean().default(false),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// ----------------------------------------------------------------------------
// 3. LOCATION
// ----------------------------------------------------------------------------
/**
 * Location - Primary location entity
 * 
 * PURPOSE:
 * - Represents a physical or logical location/chapter
 * - Has ULID as PK and human-readable locationCode
 * - Scopes UserGroups and user memberships
 * 
 * PK/SK PATTERN:
 * - PK: "LOCATION#<locationId>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="LOCATION#<locationId>", SK="META") → Get location by ID
 * 
 * WHY THIS SHAPE:
 * - ULID provides stable, sortable primary key
 * - locationCode is for human use, looked up via separate item
 */
export const LocationSchema = z.object({
  // Keys
  PK: z.string().regex(/^LOCATION#[0-9A-Z]{26}$/), // LOCATION#<ULID>
  SK: z.literal("META"),
  
  // Attributes
  locationId: z.string().ulid(),
  locationCode: z.string().min(1).max(50),         // Human-readable unique code
  name: z.string().min(1).max(255),
  address: z.string().optional(),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Location = z.infer<typeof LocationSchema>;

// ----------------------------------------------------------------------------
// 4. LOCATION CODE LOOKUP
// ----------------------------------------------------------------------------
/**
 * LocationCodeLookup - Human-readable code → locationId resolver
 * 
 * PURPOSE:
 * - O(1) lookup from locationCode → locationId
 * - Enables use of human-readable codes in URLs/forms
 * 
 * PK/SK PATTERN:
 * - PK: "LOCATION_CODE#<locationCode>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="LOCATION_CODE#NYC001", SK="META") → Get locationId
 * 
 * WHY THIS SHAPE:
 * - Separate lookup item avoids GSI requirement
 * - GetItem provides O(1) resolution
 */
export const LocationCodeLookupSchema = z.object({
  // Keys
  PK: z.string().regex(/^LOCATION_CODE#.+$/),     // LOCATION_CODE#<code>
  SK: z.literal("META"),
  
  // Attributes
  locationCode: z.string().min(1).max(50),
  locationId: z.string().ulid(),
  
  // Timestamps
  createdAt: z.string().datetime(),
});
export type LocationCodeLookup = z.infer<typeof LocationCodeLookupSchema>;

// ----------------------------------------------------------------------------
// 5. USER GROUP
// ----------------------------------------------------------------------------
/**
 * UserGroup - ReBAC core entity (scoped to location)
 * 
 * PURPOSE:
 * - Represents a group within a location (TEACHER, VOLUNTEER, etc.)
 * - Users are assigned to groups to inherit roles/permissions
 * - Each group is scoped to exactly one location
 * 
 * PK/SK PATTERN:
 * - PK: "GROUP#<groupId>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="GROUP#<groupId>", SK="META") → Get group details
 * 
 * WHY THIS SHAPE:
 * - ULID as groupId enables multiple groups of same type per location
 * - locationId attribute scopes the group (no GSI needed - queried via relationships)
 * - groupType determines which roles the group maps to
 */
export const UserGroupSchema = z.object({
  // Keys
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),   // GROUP#<ULID>
  SK: z.literal("META"),
  
  // Attributes
  groupId: z.string().ulid(),
  locationId: z.string().ulid(),                   // Scoped to this location
  groupType: GroupTypeEnum,                        // TEACHER or VOLUNTEER
  name: z.string().min(1).max(255),                // e.g., "NYC Teachers 2024"
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserGroup = z.infer<typeof UserGroupSchema>;

// ----------------------------------------------------------------------------
// 6. ROLE (Global)
// ----------------------------------------------------------------------------
/**
 * Role - Global role definition (NOT location-scoped)
 * 
 * PURPOSE:
 * - Defines a role that can be assigned to groups
 * - Roles are global constants, not per-location
 * - Maps to page permissions
 * 
 * PK/SK PATTERN:
 * - PK: "ROLE#<roleName>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="ROLE#admin", SK="META") → Get role details
 * 
 * WHY THIS SHAPE:
 * - roleName as key (not ULID) because roles are global constants
 * - Description for documentation/UI display
 */
export const RoleSchema = z.object({
  // Keys
  PK: z.string().regex(/^ROLE#.+$/),              // ROLE#<roleName>
  SK: z.literal("META"),
  
  // Attributes
  roleName: z.string().min(1).max(50),            // e.g., "teacher", "volunteer", "admin"
  description: z.string().max(500).optional(),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Role = z.infer<typeof RoleSchema>;

// ----------------------------------------------------------------------------
// 7. PAGE (Global)
// ----------------------------------------------------------------------------
/**
 * Page - Page definition for permission control
 * 
 * PURPOSE:
 * - Registers pages that require permission checks
 * - Adding a new page = adding a data item (no code change)
 * 
 * PK/SK PATTERN:
 * - PK: "PAGE#<pageName>"
 * - SK: "META"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - GetItem(PK="PAGE#dashboard", SK="META") → Get page details
 * 
 * WHY THIS SHAPE:
 * - pageName as key for direct lookup
 * - Metadata for UI/documentation
 */
export const PageSchema = z.object({
  // Keys
  PK: z.string().regex(/^PAGE#.+$/),              // PAGE#<pageName>
  SK: z.literal("META"),
  
  // Attributes
  pageName: z.string().min(1).max(100),           // e.g., "dashboard", "settings", "reports"
  description: z.string().max(500).optional(),
  
  // Timestamps
  createdAt: z.string().datetime(),
});
export type Page = z.infer<typeof PageSchema>;

// ============================================================================
// RELATIONSHIP SCHEMAS (Edges)
// ============================================================================

// ----------------------------------------------------------------------------
// 8. USER ↔ LOCATION MEMBERSHIP (Bidirectional)
// ----------------------------------------------------------------------------
/**
 * UserLocationMembership - Bidirectional user-location relationship
 * 
 * PURPOSE:
 * - Links users to locations they belong to
 * - Requires TWO items per membership (bidirectional) for query patterns
 * 
 * QUERY PATTERNS SUPPORTED:
 * - Query(PK="USER#<userId>", SK begins_with "LOCATION#") → All locations for user
 * - Query(PK="LOCATION#<locationId>", SK begins_with "USER#") → All users in location
 * 
 * WHY BIDIRECTIONAL:
 * - "Get all locations for user" requires items under USER# PK
 * - "Get all users in location" requires items under LOCATION# PK
 * - No GSI constraint forces duplication of relationship edges
 */

// User → Location edge (stored under USER# PK)
export const UserLocationEdgeSchema = z.object({
  // Keys
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),    // USER#<userId>
  SK: z.string().regex(/^LOCATION#[0-9A-Z]{26}$/), // LOCATION#<locationId>
  
  // Attributes (denormalized for query efficiency)
  userId: z.string().ulid(),
  locationId: z.string().ulid(),
  locationCode: z.string().optional(),             // Denormalized for display
  locationName: z.string().optional(),             // Denormalized for display
  
  // Timestamps
  joinedAt: z.string().datetime(),
});
export type UserLocationEdge = z.infer<typeof UserLocationEdgeSchema>;

// Location → User edge (stored under LOCATION# PK)
export const LocationUserEdgeSchema = z.object({
  // Keys
  PK: z.string().regex(/^LOCATION#[0-9A-Z]{26}$/), // LOCATION#<locationId>
  SK: z.string().regex(/^USER#[0-9A-Z]{26}$/),     // USER#<userId>
  
  // Attributes (denormalized for query efficiency)
  locationId: z.string().ulid(),
  userId: z.string().ulid(),
  userDisplayName: z.string().optional(),          // Denormalized for display
  userType: UserTypeEnum.optional(),               // Denormalized for filtering
  
  // Timestamps
  joinedAt: z.string().datetime(),
});
export type LocationUserEdge = z.infer<typeof LocationUserEdgeSchema>;

// ----------------------------------------------------------------------------
// 9. USER ↔ GROUP MEMBERSHIP (Bidirectional)
// ----------------------------------------------------------------------------
/**
 * UserGroupMembership - Bidirectional user-group relationship
 * 
 * PURPOSE:
 * - Links users to groups within a location
 * - Used to resolve "Is user a teacher/volunteer in this location?"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - Query(PK="USER#<userId>", SK begins_with "GROUP#") → All groups for user
 * - Query(PK="GROUP#<groupId>", SK begins_with "USER#") → All users in group
 * - Query(PK="USER#<userId>", SK begins_with "GROUP#") + filter locationId
 *   → Groups for user in specific location
 * 
 * WHY BIDIRECTIONAL:
 * - "Get user's groups" and "Get group's members" both need Query support
 * - locationId denormalized on user edge for efficient filtering
 */

// User → Group edge (stored under USER# PK)
export const UserGroupEdgeSchema = z.object({
  // Keys
  PK: z.string().regex(/^USER#[0-9A-Z]{26}$/),    // USER#<userId>
  SK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),   // GROUP#<groupId>
  
  // Attributes
  userId: z.string().ulid(),
  groupId: z.string().ulid(),
  locationId: z.string().ulid(),                   // Denormalized for filtering by location
  groupType: GroupTypeEnum,                        // Denormalized for quick type check
  groupName: z.string().optional(),                // Denormalized for display
  
  // Timestamps
  joinedAt: z.string().datetime(),
});
export type UserGroupEdge = z.infer<typeof UserGroupEdgeSchema>;

// Group → User edge (stored under GROUP# PK)
export const GroupUserEdgeSchema = z.object({
  // Keys
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),   // GROUP#<groupId>
  SK: z.string().regex(/^USER#[0-9A-Z]{26}$/),    // USER#<userId>
  
  // Attributes
  groupId: z.string().ulid(),
  userId: z.string().ulid(),
  userDisplayName: z.string().optional(),          // Denormalized for display
  
  // Timestamps
  joinedAt: z.string().datetime(),
});
export type GroupUserEdge = z.infer<typeof GroupUserEdgeSchema>;

// ----------------------------------------------------------------------------
// 10. GROUP → ROLE ASSIGNMENT
// ----------------------------------------------------------------------------
/**
 * GroupRoleAssignment - Maps groups to roles
 * 
 * PURPOSE:
 * - Assigns roles to groups (e.g., TEACHER group gets "teacher" role)
 * - One group can have multiple roles
 * - This is the ReBAC "group → role" edge
 * 
 * PK/SK PATTERN:
 * - PK: "GROUP#<groupId>"
 * - SK: "ROLE#<roleName>"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - Query(PK="GROUP#<groupId>", SK begins_with "ROLE#") → All roles for group
 * - GetItem(PK="GROUP#<groupId>", SK="ROLE#<roleName>") → Check if group has role
 * 
 * WHY THIS SHAPE:
 * - Query on GROUP# PK gets all roles for a group efficiently
 * - No reverse lookup needed (we don't query "groups with role X")
 */
export const GroupRoleEdgeSchema = z.object({
  // Keys
  PK: z.string().regex(/^GROUP#[0-9A-Z]{26}$/),   // GROUP#<groupId>
  SK: z.string().regex(/^ROLE#.+$/),              // ROLE#<roleName>
  
  // Attributes
  groupId: z.string().ulid(),
  roleName: z.string(),
  
  // Timestamps
  assignedAt: z.string().datetime(),
});
export type GroupRoleEdge = z.infer<typeof GroupRoleEdgeSchema>;

// ----------------------------------------------------------------------------
// 11. ROLE → PAGE PERMISSION
// ----------------------------------------------------------------------------
/**
 * RolePagePermission - Maps roles to page access
 * 
 * PURPOSE:
 * - Defines which pages a role can access
 * - Binary permission: ALLOW or DENY
 * - This is the ReBAC "role → permission" edge
 * 
 * PK/SK PATTERN:
 * - PK: "ROLE#<roleName>"
 * - SK: "PAGE#<pageName>"
 * 
 * QUERY PATTERNS SUPPORTED:
 * - Query(PK="ROLE#<roleName>", SK begins_with "PAGE#") → All page permissions for role
 * - GetItem(PK="ROLE#<roleName>", SK="PAGE#<pageName>") → Check specific permission
 * 
 * WHY THIS SHAPE:
 * - GetItem provides O(1) permission check
 * - Query gets all permissions for a role (for UI display)
 * - Adding a new page = adding new RolePagePermission items (data-driven)
 */
export const RolePagePermissionSchema = z.object({
  // Keys
  PK: z.string().regex(/^ROLE#.+$/),              // ROLE#<roleName>
  SK: z.string().regex(/^PAGE#.+$/),              // PAGE#<pageName>
  
  // Attributes
  roleName: z.string(),
  pageName: z.string(),
  permission: PermissionEnum,                      // ALLOW or DENY
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RolePagePermission = z.infer<typeof RolePagePermissionSchema>;

// ============================================================================
// COMPOSITE/LOOKUP SCHEMAS FOR TYPE SAFETY
// ============================================================================

/**
 * Union of all entity types stored in the table
 * Useful for type guards and generic operations
 */
export const EntitySchema = z.union([
  EmailIdentitySchema,
  UserSchema,
  LocationSchema,
  LocationCodeLookupSchema,
  UserGroupSchema,
  RoleSchema,
  PageSchema,
]);
export type Entity = z.infer<typeof EntitySchema>;

/**
 * Union of all relationship edge types
 */
export const RelationshipSchema = z.union([
  UserLocationEdgeSchema,
  LocationUserEdgeSchema,
  UserGroupEdgeSchema,
  GroupUserEdgeSchema,
  GroupRoleEdgeSchema,
  RolePagePermissionSchema,
]);
export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Union of all item types in the table
 */
export const TableItemSchema = z.union([EntitySchema, RelationshipSchema]);
export type TableItem = z.infer<typeof TableItemSchema>;

// ============================================================================
// INPUT SCHEMAS (For creating new entities - without PK/SK/timestamps)
// ============================================================================

export const CreateEmailIdentityInputSchema = z.object({
  email: z.string().email(),
  userId: z.string().ulid(),
  provider: OAuthProviderEnum.optional(),
});
export type CreateEmailIdentityInput = z.infer<typeof CreateEmailIdentityInputSchema>;

export const CreateUserInputSchema = z.object({
  displayName: z.string().min(1).max(255),
  userType: UserTypeEnum.default("MEMBER"),
  isAdmin: z.boolean().default(false),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateLocationInputSchema = z.object({
  locationCode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  address: z.string().optional(),
});
export type CreateLocationInput = z.infer<typeof CreateLocationInputSchema>;

export const CreateUserGroupInputSchema = z.object({
  locationId: z.string().ulid(),
  groupType: GroupTypeEnum,
  name: z.string().min(1).max(255),
});
export type CreateUserGroupInput = z.infer<typeof CreateUserGroupInputSchema>;

export const CreateRoleInputSchema = z.object({
  roleName: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const CreatePageInputSchema = z.object({
  pageName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreatePageInput = z.infer<typeof CreatePageInputSchema>;

// ============================================================================
// END PHASE 1
// ============================================================================

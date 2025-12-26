# DynamoDB Single-Table Schema Design (Phase 1)

## Overview

This document describes the ReBAC (Relationship-Based Access Control) schema design for the application. The schema follows a single-table design with **NO GSIs** and **NO Scans**.

## Hard Constraints

| Constraint | Implementation |
|------------|----------------|
| Single DynamoDB table | All entities and relationships in one table |
| NO GSI | All queries use PK or PK+SK |
| NO Scan | All access patterns use GetItem or Query |
| ULID for entity IDs | User, Location, UserGroup use ULID |
| Email ≠ User PK | Separate EmailIdentity entity |
| Data-driven permissions | No hardcoded role/permission logic |

---

## Entity Schemas (Nodes)

### 1. EmailIdentity

**Purpose**: O(1) lookup from OAuth email → internal userId

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `EMAIL#<email>` | Partition key |
| SK | `META` | Sort key (constant) |
| email | string | User's email (lowercase) |
| userId | ULID | References User entity |
| provider | enum | OAuth provider (google/github/microsoft) |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `GetItem(PK="EMAIL#user@example.com", SK="META")` → Get userId for email

**Why this shape**: Email cannot be User PK (per constraint). This entity provides O(1) email→userId resolution without GSI.

---

### 2. User

**Purpose**: Core user entity with ULID identifier

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `USER#<userId>` | Partition key |
| SK | `META` | Sort key (constant) |
| userId | ULID | Unique user identifier |
| displayName | string | User's display name |
| userType | enum | MEMBER or LEAD |
| isAdmin | boolean | Global admin flag |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `GetItem(PK="USER#01ARZ3NDEK...", SK="META")` → Get user by ID

**Why this shape**: ULID as PK (not email per constraint). userType and isAdmin are user-level, not location-scoped.

---

### 3. Location

**Purpose**: Physical or logical location/chapter

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `LOCATION#<locationId>` | Partition key |
| SK | `META` | Sort key (constant) |
| locationId | ULID | Unique location identifier |
| locationCode | string | Human-readable code (e.g., "NYC001") |
| name | string | Location name |
| address | string? | Optional address |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `GetItem(PK="LOCATION#01ARZ3NDEK...", SK="META")` → Get location by ID

---

### 4. LocationCodeLookup

**Purpose**: O(1) lookup from human-readable code → locationId

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `LOCATION_CODE#<code>` | Partition key |
| SK | `META` | Sort key (constant) |
| locationCode | string | Human-readable code |
| locationId | ULID | References Location entity |
| createdAt | ISO8601 | Creation timestamp |

**Query Patterns**:
- `GetItem(PK="LOCATION_CODE#NYC001", SK="META")` → Get locationId for code

---

### 5. UserGroup

**Purpose**: ReBAC group entity, scoped to a location

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `GROUP#<groupId>` | Partition key |
| SK | `META` | Sort key (constant) |
| groupId | ULID | Unique group identifier |
| locationId | ULID | Scoped to this location |
| groupType | enum | TEACHER or VOLUNTEER |
| name | string | Group name |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `GetItem(PK="GROUP#01ARZ3NDEK...", SK="META")` → Get group by ID

**Why this shape**: ULID enables multiple groups of same type per location. locationId attribute scopes the group.

---

### 6. Role (Global)

**Purpose**: Global role definition

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `ROLE#<roleName>` | Partition key |
| SK | `META` | Sort key (constant) |
| roleName | string | Role identifier (e.g., "teacher", "admin") |
| description | string? | Role description |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `GetItem(PK="ROLE#teacher", SK="META")` → Get role details

**Why this shape**: Roles are global constants, not per-location. roleName as key (not ULID).

---

### 7. Page (Global)

**Purpose**: Page registration for permission control

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `PAGE#<pageName>` | Partition key |
| SK | `META` | Sort key (constant) |
| pageName | string | Page identifier |
| description | string? | Page description |
| createdAt | ISO8601 | Creation timestamp |

**Query Patterns**:
- `GetItem(PK="PAGE#dashboard", SK="META")` → Get page details

**Why this shape**: Adding a new page = adding a data item (no code change).

---

## Relationship Schemas (Edges)

### 8. User ↔ Location Membership (Bidirectional)

**Purpose**: Links users to locations

#### User → Location Edge

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `USER#<userId>` | Partition key |
| SK | `LOCATION#<locationId>` | Sort key |
| userId | ULID | User identifier |
| locationId | ULID | Location identifier |
| locationCode | string? | Denormalized for display |
| locationName | string? | Denormalized for display |
| joinedAt | ISO8601 | When user joined |

**Query Patterns**:
- `Query(PK="USER#...", SK begins_with "LOCATION#")` → All locations for user

#### Location → User Edge

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `LOCATION#<locationId>` | Partition key |
| SK | `USER#<userId>` | Sort key |
| locationId | ULID | Location identifier |
| userId | ULID | User identifier |
| userDisplayName | string? | Denormalized for display |
| userType | enum? | Denormalized for filtering |
| joinedAt | ISO8601 | When user joined |

**Query Patterns**:
- `Query(PK="LOCATION#...", SK begins_with "USER#")` → All users in location

**Why bidirectional**: No GSI constraint forces duplication. Both "get locations for user" and "get users in location" need efficient query support.

---

### 9. User ↔ Group Membership (Bidirectional)

**Purpose**: Links users to groups (ReBAC core)

#### User → Group Edge

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `USER#<userId>` | Partition key |
| SK | `GROUP#<groupId>` | Sort key |
| userId | ULID | User identifier |
| groupId | ULID | Group identifier |
| locationId | ULID | Denormalized for filtering |
| groupType | enum | TEACHER or VOLUNTEER |
| groupName | string? | Denormalized for display |
| joinedAt | ISO8601 | When user joined group |

**Query Patterns**:
- `Query(PK="USER#...", SK begins_with "GROUP#")` → All groups for user
- `Query(PK="USER#...", SK begins_with "GROUP#") + filter locationId` → Groups for user in location

#### Group → User Edge

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `GROUP#<groupId>` | Partition key |
| SK | `USER#<userId>` | Sort key |
| groupId | ULID | Group identifier |
| userId | ULID | User identifier |
| userDisplayName | string? | Denormalized for display |
| joinedAt | ISO8601 | When user joined group |

**Query Patterns**:
- `Query(PK="GROUP#...", SK begins_with "USER#")` → All users in group

---

### 10. Group → Role Assignment

**Purpose**: Maps groups to roles (ReBAC: group → role edge)

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `GROUP#<groupId>` | Partition key |
| SK | `ROLE#<roleName>` | Sort key |
| groupId | ULID | Group identifier |
| roleName | string | Role identifier |
| assignedAt | ISO8601 | When role was assigned |

**Query Patterns**:
- `Query(PK="GROUP#...", SK begins_with "ROLE#")` → All roles for group
- `GetItem(PK="GROUP#...", SK="ROLE#teacher")` → Check if group has role

**Why unidirectional**: We never query "all groups with role X". Only "roles for this group".

---

### 11. Role → Page Permission

**Purpose**: Defines page access per role (ReBAC: role → permission edge)

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | `ROLE#<roleName>` | Partition key |
| SK | `PAGE#<pageName>` | Sort key |
| roleName | string | Role identifier |
| pageName | string | Page identifier |
| permission | enum | ALLOW or DENY |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |

**Query Patterns**:
- `Query(PK="ROLE#teacher", SK begins_with "PAGE#")` → All permissions for role
- `GetItem(PK="ROLE#teacher", SK="PAGE#dashboard")` → Check specific permission

**Why this shape**: O(1) permission check with GetItem. Adding new page = adding data items.

---

## Access Control Flow (ReBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                    canUserAccessPage(userId, locationId, page)  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Query USER#<userId> SK begins_with GROUP#                    │
│    Filter: locationId = <locationId>                            │
│    Result: [groupId1, groupId2, ...]                            │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. For each groupId:                                            │
│    Query GROUP#<groupId> SK begins_with ROLE#                   │
│    Result: [role1, role2, ...]                                  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. For each role:                                               │
│    GetItem ROLE#<role> SK PAGE#<page>                           │
│    Check: permission === "ALLOW"                                │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Return true if ANY role allows access                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Email → User lookup uses GetItem | `GetItem(PK="EMAIL#...", SK="META")` | ✅ |
| Location → Users uses Query | `Query(PK="LOCATION#...", SK begins_with "USER#")` | ✅ |
| User → Locations uses Query | `Query(PK="USER#...", SK begins_with "LOCATION#")` | ✅ |
| Adding new page requires data only | Add Page entity + RolePagePermission items | ✅ |
| No permission logic in app code | All resolved via data queries | ✅ |
| No GSI | All patterns use PK or PK+SK | ✅ |
| No Scan | All patterns use GetItem or Query | ✅ |
| ULID for entity IDs | User, Location, UserGroup use ULID | ✅ |

---

## Key Generation (client.ts)

```typescript
Keys.emailPK("user@example.com")     // "EMAIL#user@example.com"
Keys.userPK("01ARZ3NDEK...")         // "USER#01ARZ3NDEK..."
Keys.locationPK("01ARZ3NDEK...")     // "LOCATION#01ARZ3NDEK..."
Keys.locationCodePK("NYC001")        // "LOCATION_CODE#NYC001"
Keys.groupPK("01ARZ3NDEK...")        // "GROUP#01ARZ3NDEK..."
Keys.rolePK("teacher")               // "ROLE#teacher"
Keys.pagePK("dashboard")             // "PAGE#dashboard"

Keys.metaSK()                        // "META"
Keys.locationSK("01ARZ3NDEK...")     // "LOCATION#01ARZ3NDEK..."
Keys.userSK("01ARZ3NDEK...")         // "USER#01ARZ3NDEK..."
Keys.groupSK("01ARZ3NDEK...")        // "GROUP#01ARZ3NDEK..."
Keys.roleSK("teacher")               // "ROLE#teacher"
Keys.pageSK("dashboard")             // "PAGE#dashboard"

// Prefixes for Query begins_with
Keys.LOCATION_PREFIX                 // "LOCATION#"
Keys.USER_PREFIX                     // "USER#"
Keys.GROUP_PREFIX                    // "GROUP#"
Keys.ROLE_PREFIX                     // "ROLE#"
Keys.PAGE_PREFIX                     // "PAGE#"
```

---

## ✅ END PHASE 1

Phase 1 deliverables complete:
- Zod schemas for all entities and relationships
- PK/SK patterns documented
- Query patterns for each entity/relationship
- Keys helper with all key generation functions
- Validation checklist verified

Ready for Phase 2 (Repository & Access Logic implementation).

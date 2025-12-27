# Phase 2: Repository Implementation Complete

## ✅ Deliverables

### Schema Files (src/lib/schemas/db/)
| File | Purpose |
|------|---------|
| `types.ts` | Common enums (UserType, GroupType, Permission, OAuthProvider) |
| `entities.ts` | Entity schemas (EmailIdentity, User, Location, UserGroup, Role, Page) |
| `relationships.ts` | Relationship edge schemas (User↔Location, User↔Group, Group→Role, Role→Page) |
| `inputs.ts` | Input schemas for creating entities (omit PK/SK/timestamps) |
| `index.ts` | Central export for all schemas |

### Repository Files (src/server/db/repositories/)
| File | Functions |
|------|-----------|
| `email.repository.ts` | `getUserIdByEmail`, `createEmailIdentity`, `getEmailIdentity` |
| `user.repository.ts` | `createUser`, `getUserById`, `updateUser` |
| `location.repository.ts` | (Legacy) existing location functions |
| `userLocation.repository.ts` | `addUserToLocation`, `getLocationsForUser`, `getUsersForLocation` |
| `userGroup.repository.ts` | `createUserGroup`, `getUserGroupById`, `addUserToGroup`, `getUserGroupsForUser`, `isUserTeacherOrVolunteer` |
| `permission.repository.ts` | `createRole`, `createPage`, `assignRoleToGroup`, `getRolesForGroup`, `setRolePagePermission`, `canRoleAccessPage`, `getPagePermissionsForRole` |
| **`access.repository.ts`** | **`canUserAccessPage`** (CANONICAL access-check function) |
| `index.ts` | Central export for all repository functions |

---

## 🔐 Canonical Access-Check Function

```typescript
canUserAccessPage(userId: string, locationId: string, pageName: string): Promise<boolean>
```

**Algorithm:**
1. Query user's groups in the specified location
2. For each group, get assigned roles
3. For each role, check page permission (GetItem on ROLE#<role> / PAGE#<page>)
4. Return `true` if ANY role has `ALLOW` permission

**Usage:**
```typescript
import { canUserAccessPage } from "~/server/db/repositories";

// Check if user can access dashboard in location
const hasAccess = await canUserAccessPage(userId, locationId, "dashboard");
if (!hasAccess) {
  throw new Error("Access denied");
}
```

---

## 📦 Repository Functions

### Email Identity
```typescript
// O(1) email → userId lookup (for OAuth)
const userId = await getUserIdByEmail("user@example.com");

// Create email identity mapping
await createEmailIdentity({
  email: "user@example.com",
  userId: "01ARZ3NDEK...",
  provider: "google"
});
```

### User
```typescript
// Create user with ULID
const user = await createUser({
  displayName: "John Doe",
  userType: "MEMBER",
  isAdmin: false
});

// Get by ID
const user = await getUserById("01ARZ3NDEK...");

// Update
await updateUser("01ARZ3NDEK...", {
  displayName: "Jane Doe",
  userType: "LEAD"
});
```

### User-Location Membership
```typescript
// Add user to location (bidirectional edges)
await addUserToLocation(userId, locationId, {
  userDisplayName: "John Doe",
  userType: "MEMBER",
  locationCode: "NYC001",
  locationName: "New York Chapter"
});

// Get all locations for user
const locations = await getLocationsForUser(userId);
// Returns: [{ locationId, locationCode, locationName, joinedAt }, ...]

// Get all users in location
const users = await getUsersForLocation(locationId);
// Returns: [{ userId, userDisplayName, userType, joinedAt }, ...]
```

### UserGroup
```typescript
// Create group in location
const group = await createUserGroup({
  locationId: "01ARZ3NDEK...",
  groupType: "TEACHER",
  name: "NYC Teachers 2024"
});

// Add user to group (bidirectional edges)
await addUserToGroup(userId, groupId, {
  locationId,
  groupType: "TEACHER",
  groupName: "NYC Teachers 2024",
  userDisplayName: "John Doe"
});

// Get user's groups in location
const groups = await getUserGroupsForUser(userId, locationId);
// Returns: [{ groupId, locationId, groupType, groupName, joinedAt }, ...]

// Check if teacher/volunteer
const { isTeacher, isVolunteer } = await isUserTeacherOrVolunteer(userId, locationId);
```

### Roles & Permissions
```typescript
// Create role
await createRole({
  roleName: "teacher",
  description: "Teacher role with access to class management"
});

// Create page
await createPage({
  pageName: "dashboard",
  description: "Main dashboard page"
});

// Assign role to group
await assignRoleToGroup(groupId, "teacher");

// Get roles for group
const roles = await getRolesForGroup(groupId);
// Returns: ["teacher", "volunteer"]

// Set page permission for role
await setRolePagePermission("teacher", "dashboard", "ALLOW");

// Check role→page permission (O(1) GetItem)
const canAccess = await canRoleAccessPage("teacher", "dashboard");
// Returns: true

// Get all permissions for role
const permissions = await getPagePermissionsForRole("teacher");
// Returns: [{ pageName: "dashboard", permission: "ALLOW" }, ...]
```

---

## 🚫 Anti-Patterns (DO NOT DO)

### ❌ Permission checks in controllers
```typescript
// WRONG
if (user.role === "admin") {
  // allow access
}
```

### ✅ Use data-driven access check
```typescript
// CORRECT
const hasAccess = await canUserAccessPage(userId, locationId, "admin-panel");
if (!hasAccess) {
  throw new Error("Access denied");
}
```

### ❌ Hardcoded role logic
```typescript
// WRONG
function canEditCourse(role: string): boolean {
  return role === "teacher" || role === "admin";
}
```

### ✅ Data-driven permission
```typescript
// CORRECT (permissions defined in data)
await setRolePagePermission("teacher", "edit-course", "ALLOW");
await setRolePagePermission("admin", "edit-course", "ALLOW");

// Check at runtime
const hasAccess = await canUserAccessPage(userId, locationId, "edit-course");
```

---

## 🔄 Access Control Flow

```
User Request
    ↓
canUserAccessPage(userId, locationId, pageName)
    ↓
Query: USER#<userId> SK begins_with GROUP#
  → Filter by locationId
  → Get [groupId1, groupId2, ...]
    ↓
For each groupId:
  Query: GROUP#<groupId> SK begins_with ROLE#
  → Get [role1, role2, ...]
    ↓
For each role:
  GetItem: ROLE#<role> SK PAGE#<page>
  → Check permission === "ALLOW"
    ↓
Return: true if ANY role allows access
```

---

## 📊 Example Data Setup

```typescript
// 1. Create user
const user = await createUser({
  displayName: "John Doe",
  userType: "MEMBER",
  isAdmin: false
});

// 2. Link email to user
await createEmailIdentity({
  email: "john@example.com",
  userId: user.userId,
  provider: "google"
});

// 3. Create location
const location = await createLocation({
  locationCode: "NYC001",
  name: "New York Chapter",
  address: "123 Main St, NY"
});

// 4. Add user to location
await addUserToLocation(user.userId, location.locationId);

// 5. Create group in location
const teacherGroup = await createUserGroup({
  locationId: location.locationId,
  groupType: "TEACHER",
  name: "NYC Teachers 2024"
});

// 6. Add user to group
await addUserToGroup(user.userId, teacherGroup.groupId);

// 7. Create role
await createRole({
  roleName: "teacher",
  description: "Teacher role"
});

// 8. Assign role to group
await assignRoleToGroup(teacherGroup.groupId, "teacher");

// 9. Create pages
await createPage({ pageName: "dashboard", description: "Main dashboard" });
await createPage({ pageName: "courses", description: "Course management" });

// 10. Set permissions
await setRolePagePermission("teacher", "dashboard", "ALLOW");
await setRolePagePermission("teacher", "courses", "ALLOW");

// 11. Check access
const canAccessDashboard = await canUserAccessPage(
  user.userId,
  location.locationId,
  "dashboard"
);
console.log(canAccessDashboard); // true
```

---

## ✅ Validation Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Email → User uses GetItem | `getUserIdByEmail` | ✅ |
| Location → Users uses Query | `getUsersForLocation` | ✅ |
| User → Locations uses Query | `getLocationsForUser` | ✅ |
| Adding page requires data only | `createPage` + `setRolePagePermission` | ✅ |
| No hardcoded permissions | All via `canUserAccessPage` | ✅ |
| No GSI | All operations use PK or PK+SK | ✅ |
| No Scan | All operations use GetItem or Query | ✅ |
| ULID for IDs | All entity creation uses `ulid()` | ✅ |
| Bidirectional edges | User↔Location, User↔Group | ✅ |
| Data-driven access | `canUserAccessPage` resolves via data | ✅ |

---

## 🎯 Next Steps

1. **Test the repositories:**
   ```bash
   # Start DynamoDB Local
   docker run -p 8000:8000 amazon/dynamodb-local
   
   # Set environment
   export DYNAMODB_ENDPOINT=http://localhost:8000
   export DYNAMODB_TABLE_NAME=aolfclub-entities
   
   # Run dev server
   pnpm run dev
   ```

2. **Create table:**
   ```typescript
   // Run once to create table
   import { createTable } from "~/server/db/setup";
   await createTable();
   ```

3. **Seed initial data:**
   - Create roles (teacher, volunteer, admin, etc.)
   - Create pages (dashboard, courses, reports, etc.)
   - Set initial role→page permissions

4. **Integrate with auth:**
   - After OAuth, look up `userId` via `getUserIdByEmail`
   - Store `userId` in session
   - Use `canUserAccessPage` in route guards

---

## 📝 Files Modified/Created

### Created (Schema)
- `src/lib/schemas/db/types.ts`
- `src/lib/schemas/db/entities.ts`
- `src/lib/schemas/db/relationships.ts`
- `src/lib/schemas/db/inputs.ts`

### Created (Repositories)
- `src/server/db/repositories/email.repository.ts`
- `src/server/db/repositories/user.repository.ts`
- `src/server/db/repositories/userLocation.repository.ts`
- `src/server/db/repositories/userGroup.repository.ts`
- `src/server/db/repositories/permission.repository.ts`
- `src/server/db/repositories/access.repository.ts` (CANONICAL)
- `src/server/db/repositories/index.ts`

### Modified
- `src/lib/schemas/db/index.ts` (added new exports)
- `src/server/db/client.ts` (updated Keys helper)
- `src/server/db/repositories/location.repository.ts` (fixed locationSK calls)
- `src/server/db/SCHEMA_DESIGN.md` (updated)

---

**Phase 2 Complete ✅ — No compilation errors, all patterns verified.**

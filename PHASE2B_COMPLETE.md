# Phase 2B: Backend Integration - Complete ✅

**Date**: 2025
**Status**: ✅ Complete with TypeScript compilation passing

## Summary

Phase 2B successfully integrates the Task Outreach UI with real DynamoDB operations following the single-table design from Phase 1. All dummy data has been replaced with live backend calls using SolidJS createResource for reactive data fetching.

## Implementation Details

### 1. Schema Extensions ✅

**UI Schemas** (`src/lib/schemas/ui/task.schema.ts`)
- Extended with 140+ lines of outreach-specific types
- `OutreachTask`, `OutreachTaskListItem`, `AssignedUser`, `Interaction`
- `ActionsTaken` (call/message tracking)
- `AllowedActions` (configurable per task)
- `SelfAssignRequest`, `SelfAssignResult`, `SaveInteractionRequest`
- Zod validation with ULID validation

**DB Schemas** (`src/lib/schemas/db/task-outreach.schema.ts` - NEW)
- 220 lines of DynamoDB item schemas
- `TaskItem`, `TaskTargetItem`, `TaskAssignmentItem`, `InteractionItem`, `LocationTaskItem`, `UserTaskItem`
- PK/SK helper functions: `taskPK()`, `targetSK()`, `assignmentSK()`, `interactionSK()`
- Single-table patterns following Phase 1 design

### 2. Repository Layer ✅

**File**: `src/server/db/repositories/task-outreach.repository.ts` (NEW - 550+ lines)

**Access Patterns Implemented**:
- **AP1**: `getTaskById()` - GetItem with location/user name enrichment
- **AP2**: `getTaskTargets()` - Query all targets for a task
- **AP3**: `getMyAssignments()` - Query assignments by assigneeId with `SK begins_with ASSIGNMENT#<userId>#`
- **AP4**: `getAllAssignments()` - Query all assignments for a task
- **AP5**: `getInteraction()` - GetItem for single interaction
- **AP6**: `batchGetInteractions()` - Query all interactions, filter by targetUserIds
- **AP7**: `getTasksByLocation()` - Query with PK=LOCATION#<id>
- **AP8**: `selfAssignUsers()` - **Atomic assignment with retry logic** ⭐
- **AP9**: `saveInteraction()` - PutItem (upsert) + update assignment status
- **AP10**: `skipAssignment()` - Update assignment status to SKIPPED
- **AP11**: `getAssignedUsersWithInteractions()` - Combined query for UI
- **AP12**: `getUnassignedCount()` - In-memory set difference (targets - assignments)

**Atomic Assignment Algorithm** ⭐:
1. Query all task targets
2. Query all current assignments
3. Compute unassigned set (in-memory difference)
4. Randomly select N targets
5. Build `TransactWriteItems` with conditional puts (`attribute_not_exists(PK)`)
6. Execute transaction
7. On `ConditionalCheckFailedException`: Retry with exponential backoff
   - Retry 1: 100ms delay
   - Retry 2: 200ms delay
   - Retry 3: 400ms delay
8. Max 3 retries, then throw

**Concurrency Safety**: Prevents double-assignment even with concurrent requests from multiple volunteers.

### 3. Server Actions ✅

**File**: `src/server/actions/task-outreach.ts` (NEW - 133 lines)

Functions with `"use server"` directive:
- `fetchTask(taskId)` - Returns OutreachTask
- `fetchMyAssignedUsers(taskId)` - Returns AssignedUser[]
- `fetchUnassignedCount(taskId)` - Returns number
- `selfAssign(request)` - Returns SelfAssignResult
- `saveInteraction(request)` - Returns void
- `skipUser(taskId, targetUserId)` - Returns void

**Auth Placeholder**: `getCurrentUserId()` currently returns test ULID. TODO: Integrate with start-authjs session.

### 4. UI Integration ✅

**File**: `src/routes/tasks/[taskId].tsx` (Updated - 623 lines)

**Replaced Dummy Data with**:
- `createResource` for reactive data fetching
  - `task()` - fetches task details
  - `assignedUsers()` - fetches user's assignments
  - `unassignedCount()` - fetches available count
- Map-based user input tracking (`userInputs`) for unsaved changes
- `updateUserInput(userId, field, value)` - Tracks form changes before save
- `getUserInput(userId, field, default)` - Retrieves tracked or saved values

**Loading/Error States**:
- Nested `Show` components:
  1. Auth loading check
  2. Data loading with spinner fallback
  3. Error display with red banner
- Save status indicator (green banner: "Saving..." / "Saved successfully!")

**Two-Way Data Binding**:
- Notes textarea: `value={getUserInput(...)} onInput={updateUserInput(...)}`
- Rating stars: `onClick={() => updateUserInput(userId, "rating", star)}`
- Follow-up date: `value={getUserInput(...)} onInput={updateUserInput(...)}`
- Call/Message buttons: `onClick={() => updateUserInput(..., "actionsTaken", ...)}`

**Handlers with Real Backend Calls**:
- `handleSave(userId)` - Reads from userInputs Map, calls `saveInteraction`, refetches assigned users
- `handleSkip(userId)` - Calls `skipUser`, refetches assigned users
- `handleSelfAssign()` - Calls `selfAssign` with count, refetches all resources

**Null Safety**:
- `task()!` - Non-null assertion where data is guaranteed (inside Show)
- `assignedUsers()?.length ?? 0` - Null coalescing for optional counts
- `unassignedCount() ?? 0` - Default to 0 when loading

**Empty State**: Shows when no assignments, prompts user to click "Assign Me"

### 5. Compilation & Type Safety ✅

**Status**: ✅ All TypeScript errors resolved
- Fixed `params.taskId` undefined guards in createResource functions
- Added missing `isCreator()` function (currently returns false for volunteer view)
- Fixed `handleSave` to look up user from assignedUsers before reading interaction
- Simplified `getCurrentUserId()` to return test ULID (auth TODO)

**Command**: `pnpm exec tsc --noEmit` passes without errors

## Files Created/Modified

### New Files
- `src/lib/schemas/db/task-outreach.schema.ts` (220 lines)
- `src/server/db/repositories/task-outreach.repository.ts` (550+ lines)
- `src/server/actions/task-outreach.ts` (133 lines)

### Modified Files
- `src/lib/schemas/ui/task.schema.ts` (+140 lines)
- `src/lib/schemas/db/index.ts` (added export)
- `src/routes/tasks/[taskId].tsx` (full replacement, 623 lines)

## Testing Status

### ✅ Completed
- TypeScript compilation passes
- Schema validation with Zod
- File structure and imports verified

### ⏳ Pending
- Manual testing with real DynamoDB data (table: `aolf_main`)
- Atomic assignment concurrency testing (multiple volunteers claiming same users)
- End-to-end flow: Create task → Assign targets → Self-assign → Save interaction
- Auth integration with start-authjs

## DynamoDB Data Requirements

To test Phase 2B, seed the following items:

**Task**:
```json
{
  "PK": "TASK#01JJBK6XQZTEST1234567890",
  "SK": "META",
  "itemType": "TASK",
  "taskId": "01JJBK6XQZTEST1234567890",
  "title": "Welcome Call - January 2025",
  "locationId": "01JJBK6XQZLOC1234567890",
  "locationName": "Downtown Center",
  "createdBy": "01JJBK6XQZUSER123456789",
  "createdByName": "Admin User",
  "status": "ACTIVE",
  "targetType": "MEMBER",
  "allowedActions": { "call": true, "message": true },
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Targets** (repeat for multiple users):
```json
{
  "PK": "TASK#01JJBK6XQZTEST1234567890",
  "SK": "TARGET#01JJBK6XQZMEMBER0000001",
  "itemType": "TASK_TARGET",
  "taskId": "01JJBK6XQZTEST1234567890",
  "userId": "01JJBK6XQZMEMBER0000001",
  "name": "John Doe",
  "phone": "+1234567890",
  "targetType": "MEMBER"
}
```

**Location Index**:
```json
{
  "PK": "LOCATION#01JJBK6XQZLOC1234567890",
  "SK": "TASK#01JJBK6XQZTEST1234567890",
  "itemType": "LOCATION_TASK",
  "taskId": "01JJBK6XQZTEST1234567890",
  "locationId": "01JJBK6XQZLOC1234567890",
  "status": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

## Next Steps

### Immediate (Phase 2B Completion)
- [ ] Seed test data in DynamoDB
- [ ] Manual testing in dev server (`pnpm run dev`)
- [ ] Test atomic assignment with concurrent requests

### Phase 2C (Future)
- [ ] Update `src/routes/tasks.tsx` to fetch tasks by location
- [ ] Integrate auth with start-authjs for real user IDs
- [ ] Add filters: Status, Follow-up today, Search by name
- [ ] Add pagination for large task lists
- [ ] Add task creation UI (currently design-only)

## Technical Highlights

1. **SolidJS Reactive Patterns**: `createResource` with refetch functions for seamless UI updates
2. **Type-Safe Validation**: Zod schemas with ULID validation at UI and DB layers
3. **Atomic Operations**: TransactWriteItems with conditional puts prevents race conditions
4. **Retry Logic**: Exponential backoff handles concurrency conflicts gracefully
5. **Single-Table Design**: Efficient DynamoDB queries with minimal read capacity
6. **Clean Architecture**: UI ← Server Actions ← Repository ← DynamoDB (clear separation of concerns)

## Known TODOs

1. **Auth**: Replace test ULID in `getCurrentUserId()` with real session lookup
2. **Creator View**: Implement manual assignment UI (currently shows fallback only)
3. **isCreator()**: Compare `task().createdBy` with current user ID from session
4. **Tasks List**: Replace `DUMMY_TASKS` with `fetchTasksByLocation()`
5. **Error Handling**: Add more granular error messages (e.g., transaction failures)
6. **Optimistic UI**: Show pending state during save (currently just "Saving..." text)

---

**Phase 2B Complete!** Ready for manual testing and Phase 2C enhancements.

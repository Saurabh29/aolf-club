# Testing Self-Assignment Flow (Without Backend)

## Quick Start

Navigate to: **http://localhost:3000/tasks/demo-self-assign**

This demo page simulates the complete volunteer self-assignment experience.

---

## What You Can Test

### 1. **View Unassigned Users Count**
- Shows how many users are available for self-assignment
- Updates in real-time as users are claimed

### 2. **Self-Assign N Users**
- Input how many users you want (default: 5)
- Click "Assign Me" button
- Users are atomically assigned to you from the pool

### 3. **Concurrent Assignment Simulation**
- Click "⚡ Simulate Concurrent Claim" button
- Simulates another volunteer claiming users simultaneously
- Demonstrates how the system handles race conditions

### 4. **View My Assigned Users**
- After self-assigning, users appear in "My Assigned Users" section
- Shows user name, phone, type (MEMBER/LEAD)
- In production, this section would have call/message/notes/rating UI

---

## Flow Demonstration

```
┌─────────────────────────────────────┐
│  Task: December Outreach Campaign   │
│  Location: Chennai Center           │
│  Status: IN_PROGRESS                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  15 unassigned users available      │
│                                     │
│  Assign [5] users to me             │
│  [Assign Me] button                 │
└─────────────────────────────────────┘
           ↓ Click "Assign Me"
┌─────────────────────────────────────┐
│  ✓ Successfully assigned 5 users!   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  My Assigned Users (5)              │
│  ├─ Amit Kumar (MEMBER) 555-0101    │
│  ├─ Priya Sharma (MEMBER) 555-0102  │
│  ├─ Raj Patel (LEAD) 555-0103       │
│  ├─ Neha Singh (MEMBER) 555-0104    │
│  └─ Vikram Reddy (MEMBER) 555-0105  │
└─────────────────────────────────────┘
```

---

## Testing Scenarios

### Scenario 1: Normal Self-Assignment
1. Open `/tasks/demo-self-assign`
2. See 15 unassigned users available
3. Set count to 5
4. Click "Assign Me"
5. Verify: 5 users appear in "My Assigned Users"
6. Verify: Unassigned count drops to 10

### Scenario 2: Concurrent Claim Conflict
1. Have 10 unassigned users
2. Request 5 users
3. Click "⚡ Simulate Concurrent Claim" (another volunteer claims 3)
4. Then click "Assign Me"
5. Verify: You get 5 users from the remaining 7
6. Demonstrates atomic assignment behavior

### Scenario 3: Request More Than Available
1. Have 3 unassigned users remaining
2. Request 5 users
3. Click "Assign Me"
4. Verify: Only 3 users assigned
5. Verify: Message shows "Assigned 3 users (2 were already claimed)"

### Scenario 4: Empty Pool
1. Assign all users until pool is empty
2. Click "Assign Me"
3. Verify: Error message "No unassigned users available"
4. Verify: Button is disabled

---

## Real Implementation (Production)

In the actual app with backend integration:

### Location: `/tasks/[taskId]` (e.g., `/tasks/01JHHX7G2TASK001`)

**Volunteer View** automatically shows:
1. Task summary (title, location, allowed actions)
2. Self-assignment panel with unassigned count
3. "Assign Me" button that calls backend API
4. My assigned users section with full interaction UI

**Backend Flow:**
```typescript
// Server Action: src/server/actions/task-outreach.ts
async function selfAssign(request: SelfAssignRequest) {
  // 1. Query unassigned targets
  const targets = await queryUnassignedTargets(taskId);
  
  // 2. Take first N from pool
  const toAssign = targets.slice(0, request.count);
  
  // 3. Atomic conditional writes
  const items = toAssign.map(target => ({
    Put: {
      TableName: "aolf_main",
      Item: {
        PK: `TASK#${taskId}`,
        SK: `ASSIGNMENT#${userId}#${target.userId}`,
        // ... other fields
      },
      ConditionExpression: "attribute_not_exists(PK)" // Prevent duplicate
    }
  }));
  
  // 4. Execute transaction
  await dynamodb.transactWrite({ TransactItems: items });
  
  // 5. Handle conflicts: retry with remaining
}
```

---

## Schema Connection

### TaskForm Step 3: Creating Unassigned Targets

When creating/editing a task, admin can mark targets as "Unassigned":

```tsx
// src/components/TaskStep3.tsx
<Combobox>
  <option value="unassigned">Unassigned</option>  // ← Self-assignment pool
  <option value="teacher1">John (Teacher)</option>
  <option value="volunteer1">Mary (Volunteer)</option>
</Combobox>

// Saves as:
assignments: {
  "targetUser1": null,              // ← Unassigned (available for self-assign)
  "targetUser2": "teacher001",      // ← Pre-assigned to teacher
  "targetUser3": "volunteer001"     // ← Pre-assigned to volunteer
}
```

### DynamoDB Items

**Unassigned Target:**
```
PK: TASK#01JHHX7G2TASK001
SK: TARGET#01JHHX7G2USER001
targetType: MEMBER
addedAt: 2025-12-27T10:00:00Z
# No TaskAssignment item exists yet
```

**After Self-Assignment:**
```
PK: TASK#01JHHX7G2TASK001
SK: ASSIGNMENT#volunteer123#01JHHX7G2USER001
assignedBy: volunteer123  (self)
assignedAt: 2025-12-27T10:30:00Z
status: PENDING
```

---

## Access Pattern (AP8)

From `docs/TASK_OUTREACH_DESIGN.md`:

```
AP8: Atomic Self-Assignment

Use Case: Volunteer claims N unassigned users from task

1. Query all targets:
   PK = TASK#<taskId>
   SK begins_with TARGET#

2. Query existing assignments:
   PK = TASK#<taskId>
   SK begins_with ASSIGNMENT#

3. Filter: targets without assignments (in-memory)

4. Take first N users from unassigned pool

5. TransactWriteItems with ConditionExpression:
   - Each assignment: attribute_not_exists(PK)
   - On conflict: partial success, retry with remaining

Concurrency Handling:
- If 2 volunteers request same users simultaneously
- Conditional write ensures only 1 succeeds per target
- Failed items are retried from remaining pool
- User gets different targets, not an error
```

---

## Files to Review

### Demo Implementation
- **`src/routes/tasks/demo-self-assign.tsx`** — This demo page (no backend required)

### Production Implementation
- **`src/routes/tasks/[taskId].tsx`** — Real task detail page with self-assignment
- **`src/server/actions/task-outreach.ts`** — Backend API (needs DynamoDB integration)
- **`src/components/TaskStep3.tsx`** — Assignment UI with "Unassigned" option

### Documentation
- **`docs/TASK_OUTREACH_DESIGN.md`** — Full system design, AP8 access pattern
- **`docs/TABLE_ASSIGNMENT_UI.md`** — Table-based assignment redesign
- **`docs/PHASE2B_COMPLETE.md`** — Backend integration checklist

---

## Next Steps for Full Testing

To test with real backend:

1. **Deploy DynamoDB Table** (`aolf_main`)
2. **Seed Test Data:**
   - Create a task with taskId
   - Add 20 targets with `assigneeUserId: null`
3. **Implement Backend:**
   - Complete `selfAssign()` in `src/server/actions/task-outreach.ts`
   - Implement AP8 query and conditional write logic
4. **Navigate to:** `/tasks/01JHHX7G2TASK001` (real taskId)
5. **Test:**
   - Self-assign users
   - Open in 2 browser tabs (different volunteers)
   - Click "Assign Me" simultaneously in both
   - Verify atomic behavior (no duplicate assignments)

---

## Why Self-Assignment Matters

### User Story: Volunteer Experience

> "As a volunteer, I open the task page and see 50 unassigned members. I click 'Assign Me 20' and immediately get 20 users to call. I start working through my list. If another volunteer also clicks at the same time, they get a different set of 20 users — no conflicts, no confusion."

### Benefits
- ✅ **Scalable**: 100 volunteers can self-assign simultaneously
- ✅ **Fair**: First-come, first-served from shared pool
- ✅ **Atomic**: No double-assignments due to race conditions
- ✅ **Flexible**: Volunteers control their workload
- ✅ **Simple**: One button, instant assignment

---

## Demo Video Script

1. Open `/tasks/demo-self-assign`
2. Show 15 unassigned users available
3. Change count to 5
4. Click "Assign Me"
5. Show success message
6. Scroll to "My Assigned Users" — 5 cards appear
7. Click "Simulate Concurrent Claim"
8. Show info message "Another volunteer claimed 3"
9. Unassigned count drops to 7
10. Click "Assign Me" again for 5 more
11. Now have 10 total assigned users
12. Explain: "In production, each card would have call/message/notes/rating UI"

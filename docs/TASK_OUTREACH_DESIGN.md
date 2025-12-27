# Task-Based Outreach System — Phase 1 Architecture

**Date:** December 27, 2025  
**Status:** Design Phase Complete  
**Target:** Minimal, production-ready outreach system for teachers and volunteers

---

## 🎯 System Overview

A location-scoped task management system enabling teachers and volunteers to conduct outreach campaigns (calls and messages) to members or leads. The system prioritizes simplicity, human-friendliness, and safe concurrent operations.

**Core Principle:** Only the latest interaction state is stored — no call history, no complex workflows, one primary screen for 90% of work.

---

## 📐 Domain Model

### 1. Task (Outreach Campaign)

Represents an outreach campaign scoped to a location.

**Attributes:**
- `taskId` (ULID) — Primary identifier
- `locationId` (ULID) — Location scope
- `createdBy` (ULID) — User who created the task
- `title` (string) — Human-readable campaign name
- `status` (enum) — `OPEN` | `IN_PROGRESS` | `COMPLETED`
- `allowedActions` (object):
  - `call` (boolean) — Whether calling is allowed
  - `message` (boolean) — Whether messaging is allowed
- `createdAt` (ISO timestamp)
- `updatedAt` (ISO timestamp)

**Design Notes:**
- No `taskType` — use `allowedActions` instead to support both call + message simultaneously
- Status transitions: `OPEN` → `IN_PROGRESS` (when first assignment made) → `COMPLETED` (manual)

---

### 2. TaskTarget (Who to Contact)

Defines which users (members or leads) are included in a task.

**Attributes:**
- `taskId` (ULID) — Parent task
- `targetUserId` (ULID) — User to contact
- `targetType` (enum) — `MEMBER` | `LEAD`
- `addedAt` (ISO timestamp)

**Design Notes:**
- Same user can appear in multiple tasks
- Lightweight relationship — no duplication of user data

---

### 3. TaskAssignment (Who Works on Which Target)

Represents assignment of a specific target user to a specific assignee within a task.

**Attributes:**
- `taskId` (ULID)
- `assigneeUserId` (ULID) — Teacher/volunteer assigned
- `targetUserId` (ULID) — User they're assigned to contact
- `assignedBy` (enum) — `CREATOR` | `SELF`
- `assignedAt` (ISO timestamp)
- `status` (enum) — `PENDING` | `DONE` | `SKIPPED`

**Key Constraints:**
- A target user can be assigned to **only one assignee** per task
- Multiple assignees can work on the same task (different targets)
- Status updated based on interaction completion

---

### 4. Interaction (Latest State Only)

Stores the **latest interaction state** for a target user within a task. Overwrites on each save.

**Attributes:**
- `taskId` (ULID)
- `targetUserId` (ULID)
- `assigneeUserId` (ULID) — Who performed the interaction
- `actionsTaken` (object):
  - `called` (boolean)
  - `messaged` (boolean)
- `notes` (string, optional)
- `rating` (integer 1-5, optional)
- `followUpAt` (ISO timestamp, optional)
- `updatedAt` (ISO timestamp)

**Design Notes:**
- **No history** — only current state
- Upserted (replaced) on each save
- Drives assignment status: if interaction exists with rating/notes → assignment status = `DONE`

---

## 🗄️ DynamoDB Single-Table Design

### Table Structure

**Table Name:** `aolf_main`

**Keys:**
- `PK` (Partition Key, string)
- `SK` (Sort Key, string)

**GSI:** None  
**Operations:** `GetItem`, `Query` (PK-based), `TransactWriteItems`

---

### Item Types & PK/SK Patterns

#### 1. Task Item

**PK:** `TASK#<taskId>`  
**SK:** `META`

**Attributes:**
```
locationId, createdBy, title, status, allowedActions, createdAt, updatedAt
```

**Access:**
- GetItem: Fetch task by taskId
- Query: Not typically queried directly; retrieved via GetItem

---

#### 2. TaskTarget Item

**PK:** `TASK#<taskId>`  
**SK:** `TARGET#<targetUserId>`

**Attributes:**
```
targetType, addedAt
```

**Access:**
- Query `TASK#<taskId>` with `SK begins_with TARGET#` → All targets for a task
- Used for displaying unassigned users and bulk operations

---

#### 3. TaskAssignment Item

**PK:** `TASK#<taskId>`  
**SK:** `ASSIGNMENT#<assigneeUserId>#<targetUserId>`

**Attributes:**
```
assignedBy, assignedAt, status
```

**Access:**
- Query `TASK#<taskId>` with `SK begins_with ASSIGNMENT#<assigneeUserId>#` → All assignments for an assignee in a task
- Query `TASK#<taskId>` with `SK begins_with ASSIGNMENT#` → All assignments for a task (creator view)
- Conditional put to prevent double assignment

**Why this SK pattern:**
- Enables efficient query for "my assignments in this task"
- Prevents duplicate assignments via conditional write on composite key

---

#### 4. Interaction Item

**PK:** `TASK#<taskId>`  
**SK:** `INTERACTION#<targetUserId>`

**Attributes:**
```
assigneeUserId, actionsTaken, notes, rating, followUpAt, updatedAt
```

**Access:**
- GetItem or Query: Fetch interaction state for a target
- PutItem (upsert): Save/update interaction

**Design Notes:**
- One interaction record per target per task (latest state only)
- Not keyed by assignee — interaction belongs to the target, not the worker

---

#### 5. Location-Scoped Task Index (Reverse Index)

**PK:** `LOCATION#<locationId>`  
**SK:** `TASK#<taskId>`

**Attributes:**
```
title, status, createdAt
```

**Access:**
- Query `LOCATION#<locationId>` with `SK begins_with TASK#` → All tasks for a location
- Used for task list screens

---

#### 6. User Assignment Index (Optional for "My Tasks" view)

**PK:** `USER#<userId>`  
**SK:** `TASKASSIGNMENT#<taskId>`

**Attributes:**
```
taskTitle, locationId, assignedAt, status
```

**Access:**
- Query `USER#<userId>` with `SK begins_with TASKASSIGNMENT#` → All tasks assigned to user
- Enables "My Tasks" dashboard

---

### Summary Table

| Item Type | PK | SK | Purpose |
|-----------|----|----|---------|
| Task | `TASK#<taskId>` | `META` | Task metadata |
| TaskTarget | `TASK#<taskId>` | `TARGET#<targetUserId>` | Task targets |
| TaskAssignment | `TASK#<taskId>` | `ASSIGNMENT#<assigneeUserId>#<targetUserId>` | Assignments |
| Interaction | `TASK#<taskId>` | `INTERACTION#<targetUserId>` | Latest state |
| Location Index | `LOCATION#<locationId>` | `TASK#<taskId>` | Task list |
| User Index | `USER#<userId>` | `TASKASSIGNMENT#<taskId>` | My tasks |

---

## 🔍 Access Patterns

### AP1: Fetch Task Details
**Use Case:** Load task metadata for Task Detail screen

**Operation:** `GetItem`
```
PK = TASK#<taskId>
SK = META
```

---

### AP2: Fetch All Targets for a Task
**Use Case:** Creator views all targets (for assignment), or backend fetches unassigned targets

**Operation:** `Query`
```
PK = TASK#<taskId>
SK begins_with TARGET#
```

**Output:** List of `{ targetUserId, targetType, addedAt }`

---

### AP3: Fetch My Assignments in a Task
**Use Case:** Volunteer opens task → sees their assigned users

**Operation:** `Query`
```
PK = TASK#<taskId>
SK begins_with ASSIGNMENT#<assigneeUserId>#
```

**Output:** List of `{ targetUserId, assignedBy, assignedAt, status }`

**Enhancement:** Batch get interactions for these targets to show current state

---

### AP4: Fetch All Assignments for a Task (Creator View)
**Use Case:** Task creator sees who is assigned to which targets

**Operation:** `Query`
```
PK = TASK#<taskId>
SK begins_with ASSIGNMENT#
```

**Output:** List of `{ assigneeUserId, targetUserId, status }`

---

### AP5: Fetch Interaction State for a Target
**Use Case:** Load current notes/rating/follow-up for a target user

**Operation:** `GetItem` or `Query`
```
PK = TASK#<taskId>
SK = INTERACTION#<targetUserId>
```

---

### AP6: Fetch Tasks for a Location
**Use Case:** Task list screen filtered by location

**Operation:** `Query`
```
PK = LOCATION#<locationId>
SK begins_with TASK#
```

**Output:** List of tasks with title, status, createdAt

---

### AP7: Fetch My Tasks (Across Locations)
**Use Case:** Volunteer dashboard showing all assigned tasks

**Operation:** `Query`
```
PK = USER#<userId>
SK begins_with TASKASSIGNMENT#
```

**Output:** List of tasks with basic metadata

---

### AP8: Atomic Self-Assignment
**Use Case:** Volunteer clicks "Assign 20 users to me"

**Operation:** `TransactWriteItems`

**Steps:**
1. Query unassigned targets (targets without assignment records)
2. Select N targets
3. Transactional write:
   - Conditional put for each assignment (condition: assignment item does not exist)
   - Update task status to `IN_PROGRESS` if first assignment
4. Retry on conflict (transaction fails if another user claimed same targets)

---

### AP9: Save/Update Interaction
**Use Case:** Volunteer adds notes, rating, or follow-up date

**Operation:** `PutItem` (upsert)
```
PK = TASK#<taskId>
SK = INTERACTION#<targetUserId>
```

**Additional Updates:**
- Update assignment status to `DONE` if interaction is sufficiently complete (e.g., has rating or notes)

---

## ⚙️ Assignment Logic & Concurrency Safety

### Mode A: Creator Assignment (Manual)

**Flow:**
1. Creator opens task
2. Views all targets via AP2
3. Selects assignee and targets
4. Backend writes assignment items:
   ```
   PutItem with condition: attribute_not_exists(PK) AND attribute_not_exists(SK)
   ```
5. If condition fails → target already assigned → return error
6. Also writes user index item for assignee dashboard

**Concurrency:** Conditional put ensures no double assignment

---

### Mode B: Self-Assignment (Volunteer-Driven)

**Flow:**
1. Volunteer opens task
2. Applies filters (optional)
3. Clicks "Assign 20 users to me"

**Backend Algorithm:**

```
1. Query TASK#<taskId> with SK begins_with TARGET#
   → Get all targets

2. Query TASK#<taskId> with SK begins_with ASSIGNMENT#
   → Get all assignments

3. Compute unassigned = targets - assigned_targets
   → In-memory set difference

4. Apply filters (if any):
   - targetType = MEMBER or LEAD
   - Exclude targets already interacted with (optional)

5. Select N = min(requested_count, available_count) targets

6. Build TransactWriteItems:
   For each selected target:
   {
     Put: {
       TableName: "aolf_main",
       Item: {
         PK: "TASK#<taskId>",
         SK: "ASSIGNMENT#<assigneeUserId>#<targetUserId>",
         ...assignment_data
       },
       ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
     }
   }

7. Execute transaction:
   - If success → assignments created atomically
   - If fails → Another user claimed same targets → retry with fresh query

8. Retry logic:
   - Max 3 retries with exponential backoff
   - On each retry, re-fetch unassigned targets (some may now be taken)
   - Re-select from remaining pool

9. Update task status to IN_PROGRESS (if first assignment)

10. Write USER#<assigneeUserId> index items for dashboard
```

**Key Safety Properties:**
- **Atomicity:** All assignments succeed or none (via `TransactWriteItems`)
- **No Double Assignment:** Conditional expression prevents overwriting existing assignments
- **Retry Safe:** Failed transaction has no side effects; safe to retry with fresh data
- **Eventual Success:** As long as unassigned targets exist, retries will succeed

**Transaction Limits:**
- DynamoDB supports max 100 items per transaction
- If user requests > 100, split into multiple sequential transactions
- First transaction locks the majority; subsequent transactions have lower conflict probability

---

## 🖥️ UI Flow — Single Task Detail Screen

### Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Tasks                                         │
├─────────────────────────────────────────────────────────┤
│ A. TASK SUMMARY                                         │
│    📋 Task: "Weekly Follow-ups - Jan 2025"             │
│    📍 Location: Bangalore Center                        │
│    Actions: 📞 Call  💬 Message                        │
│    Status: In Progress                                  │
├─────────────────────────────────────────────────────────┤
│ B. ASSIGNMENT PANEL                                     │
│                                                          │
│  [IF CREATOR]                                           │
│    Assign To: [Dropdown: Select Teacher/Volunteer]     │
│    Targets: [Multi-select: 10 users]                   │
│    [Assign Selected] button                             │
│                                                          │
│  [IF VOLUNTEER]                                         │
│    Filters: [Target Type ▾] [Follow-up Date ▾]        │
│    🎯 142 unassigned users available                    │
│    Assign [ 20 ▾ ] users to me  [Assign Me] button    │
├─────────────────────────────────────────────────────────┤
│ C. MY ASSIGNED USERS                                    │
│                                                          │
│  Inline Filters: [All ▾] [Follow-up: Today] [Rating]  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Rahul Sharma (MEMBER)                             │ │
│  │ 📞 +91-9876543210                                 │ │
│  │                                                    │ │
│  │ [📞 Call] [💬 Message]                            │ │
│  │                                                    │ │
│  │ Notes: [____________ text input ____________]     │ │
│  │ Rating: ☆ ☆ ☆ ☆ ☆                                │ │
│  │ Follow-up: [📅 Date Picker] (optional)           │ │
│  │                                                    │ │
│  │                        [Save] [Mark as Skipped]   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Priya Menon (LEAD)                                │ │
│  │ ... (same layout)                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  [Load More...] (if > 20 assigned)                     │
└─────────────────────────────────────────────────────────┘
```

---

### User Interactions & Backend Calls

#### 1. **Load Task Detail Screen**
**Trigger:** User navigates to `/tasks/<taskId>`

**Backend Calls:**
1. **AP1:** Fetch task metadata → Display section A
2. **AP3:** Fetch my assignments → Display section C (list of assigned users)
3. **Batch GetItem:** Fetch interaction state for each assigned target → Pre-fill notes/rating/follow-up
4. **AP2 (if creator):** Fetch all targets → Enable assignment UI (section B)
5. **AP4 (if creator):** Fetch all assignments → Show who's assigned to what

**UI Updates:**
- Section A: Task title, location, allowed actions
- Section B: Show creator controls OR volunteer "Assign me" controls
- Section C: Render assigned user cards with current interaction state

---

#### 2. **Creator Assigns Users (Mode A)**
**Trigger:** Creator selects assignee and targets, clicks "Assign Selected"

**Backend Calls:**
1. **AP8 (modified):** Write assignment items with conditional put for each target
2. **AP7:** Write user index items for assignee dashboard

**UI Updates:**
- Success: "Assigned 10 users to Ramesh"
- Failure: "2 users already assigned, 8 assigned successfully"
- Refresh assignment view (AP4)

---

#### 3. **Volunteer Self-Assigns (Mode B)**
**Trigger:** Volunteer clicks "Assign 20 users to me"

**Backend Calls:**
1. **AP8:** Atomic self-assignment with retry logic

**UI Updates:**
- Loading state: "Assigning users..."
- Success: "20 users assigned to you" → Auto-reload section C (AP3)
- Partial success: "15 users assigned (5 already claimed)" → Auto-reload
- Failure: "No unassigned users available"

---

#### 4. **Save Interaction**
**Trigger:** Volunteer fills notes/rating/follow-up and clicks "Save"

**Backend Calls:**
1. **AP9:** Upsert interaction item
2. Update assignment status to `DONE` (if interaction complete)

**UI Updates:**
- Success toast: "Saved"
- Card shows saved state (notes, rating, follow-up date)
- Assignment counter updates: "18 pending, 2 done"

---

#### 5. **Call Button Click**
**Trigger:** User clicks "📞 Call"

**Action:**
- Open system dialer: `tel:+91-9876543210`
- UI prompts: "Call completed? Add notes and rating below."
- Auto-check `called` in actionsTaken when user returns to save

**No backend call until Save**

---

#### 6. **Message Button Click**
**Trigger:** User clicks "💬 Message"

**Action:**
- Open SMS app or WhatsApp (platform-dependent)
- UI prompts: "Message sent? Add notes below."
- Auto-check `messaged` in actionsTaken when user returns to save

**No backend call until Save**

---

#### 7. **Mark as Skipped**
**Trigger:** User clicks "Mark as Skipped"

**Backend Calls:**
1. Update assignment status to `SKIPPED`
2. Optionally save interaction with notes: "Skipped - [reason]"

**UI Updates:**
- Card collapses or moves to bottom
- Assignment counter updates

---

#### 8. **Filter Assigned Users**
**Trigger:** User selects filter (e.g., "Follow-up: Today")

**Action:**
- Client-side filter (data already loaded)
- If large dataset, consider pagination with server-side filter:
  - Query AP3 with filter on `followUpAt` (requires composite SK design or client filter)

**Current Design:** Client-side filter (simpler, <100 assignments per user per task)

---

## 🧠 Design Justification

### 1. No GSI / No Scan

**Why it works:**
- All queries are PK-based (`TASK#<taskId>`, `LOCATION#<locationId>`, `USER#<userId>`)
- SK prefixes enable efficient range queries (`begins_with`)
- Unassigned targets computed in-memory (query all targets, query all assignments, subtract)
  - Acceptable for tasks with <1000 targets (typical: 50-200)
  - If scaling needed: add `UNASSIGNED#` index items (deleted on assignment)

**Trade-off:** In-memory unassigned computation vs. GSI complexity → Chose simplicity

---

### 2. Single-Screen UI

**Why it works:**
- 90% of work happens in one place: view assignments, call/message, add notes, rate
- No context switching between "follow-up screen" and "task screen"
- Follow-up date is just another field — no separate workflow
- Inline filters for quick navigation

**User Benefit:** Minimal clicks, fast iteration, easy to train volunteers

---

### 3. Latest Interaction Only

**Why it works:**
- Outreach tasks need current state, not full audit trail
- Reduces data size (1 interaction item per target, not N history records)
- Simplifies UI (no "view history" tab)
- If audit trail needed: add to application logs, not primary database

**Trade-off:** No call history → Explicit design choice per requirements

---

### 4. Atomic Assignment with Retry

**Why it works:**
- Conditional put prevents double assignment (database-level guarantee)
- Transaction ensures all-or-nothing (no partial assignments)
- Retry with fresh data handles race conditions gracefully
- Volunteers always get exclusive targets

**Edge Cases Handled:**
- Two volunteers click "Assign 20" simultaneously → One succeeds, other retries with remaining targets
- Creator assigns while volunteer self-assigns → Conditional put prevents conflict
- Transaction limit (100 items) → Split large requests into sequential transactions

---

### 5. allowedActions Instead of taskType

**Why it works:**
- Flexible: Task can allow both call + message
- Future-proof: Add `email: boolean` without schema migration
- UI reads `allowedActions` → Shows/hides buttons dynamically

**Alternative Rejected:** `taskType: CALL | MESSAGE` → Too rigid, forces one or the other

---

### 6. Location Scoping

**Why it works:**
- Teachers/volunteers work within specific centers
- Task lists filtered by location (AP6)
- Aligns with organizational structure (multi-location NGO)
- Reduces cognitive load (users see only relevant tasks)

---

### 7. User Assignment Index (USER#<userId>)

**Why it works:**
- Enables "My Tasks" dashboard across locations
- No GSI needed — just another PK pattern
- Write index item when assignment created (small overhead)
- Query is fast: all tasks for a user in one query

**Trade-off:** Extra write per assignment → Acceptable for this use case

---

## ✅ Success Criteria Met

| Criterion | Status | Evidence |
|-----------|--------|----------|
| One screen does 90% of work | ✅ | Task Detail screen handles assignment, calling, notes, rating, follow-up |
| Task allows 📞 + 💬 simultaneously | ✅ | `allowedActions: { call: true, message: true }` |
| Assignments never conflict | ✅ | Conditional put + transactions ensure atomicity |
| Works for small teams | ✅ | Optimized for 5-20 volunteers per location, 50-200 targets per task |
| Easy to explain | ✅ | No GSI, no complex workflows, single-screen UI |

---

## 🚀 Next Steps (Phase 2A)

**Not Started Yet** — Awaiting user approval of Phase 1 design.

Phase 2A will implement:
- UI shell with routing (`/tasks/:taskId`)
- Navigation structure
- Layout components (header, sidebar)
- No backend integration yet (dummy data)

---

## 📝 Open Questions (For User)

None at this time. Phase 1 design complete per requirements.

---

**End of Phase 1 Document**

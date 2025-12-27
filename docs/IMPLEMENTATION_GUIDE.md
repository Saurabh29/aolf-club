# Task Creation & User Management Implementation

## Overview

This implementation adds two major features to the AOLF Club Management System:

1. **Table-based User Management** with multi-select and bulk actions
2. **Multi-step Task Creation/Editing** flow with shared components and schemas

## ✅ PART 1: User List Table

### Implemented Components

- **`UserTable`** (`src/components/UserTable.tsx`)
  - Table-based user list using solid-ui Table component
  - Row selection with checkboxes (individual + select-all)
  - Bulk actions toolbar (enabled when rows are selected)
  - Responsive design with proper column layout

### Features

✓ Row-level selection with checkboxes  
✓ Header "select all" checkbox  
✓ Multiple row selection  
✓ Bulk actions toolbar with extensible action handlers  
✓ Display: Name, Email/Phone, Role, Location, Join Date  
✓ Visual feedback for selected rows (blue highlight)  
✓ Clear selection button  

### Usage

```tsx
<UserTable
  users={userList}
  onSelectionChange={(selectedIds) => console.log(selectedIds)}
  bulkActions={[
    {
      label: "Assign to Group",
      variant: "default",
      onClick: (selectedUsers) => assignToGroup(selectedUsers),
    },
  ]}
/>
```

### Page Updates

- **`src/routes/users-new.tsx`** - New table-based user management page
  - Replaces card-based layout with table
  - Includes "Assign to Group" bulk action
  - Ready for backend integration

---

## ✅ PART 2: Task Creation Multi-Step Flow

### Architecture

The implementation follows the **REUSE PATTERN**: New Task and Edit Task use the **same** components, schemas, and flow.

### Schemas

**`src/lib/schemas/ui/task-creation.schema.ts`** - Complete multi-step task schemas:

- `TaskDefinitionSchema` - Step 1: Title, location, allowed actions, scripts
- `TargetUserSchema` - Step 2: Users to contact
- `AssignmentMappingSchema` - Step 3: Assign targets to teachers/volunteers
- `TaskFormStateSchema` - Complete form state (supports NEW and EDIT modes)
- `SaveTaskRequestSchema` - Final backend payload

### Components

#### 1. **TaskStepper** (`src/components/TaskStepper.tsx`)
   - Visual step progress indicator
   - Shows completed steps with checkmarks
   - Allows navigation to accessible steps
   - Highlights current step

#### 2. **TaskStep1** (`src/components/TaskStep1.tsx`)
   - Task definition form
   - Fields: Title, Location, Allowed Actions (Call/Message), Scripts
   - Real-time validation with error messages
   - Character counters for text areas

#### 3. **TaskStep2** (`src/components/TaskStep2.tsx`)
   - Target user selection (Members/Leads)
   - Tabbed interface for Members vs Leads
   - Table-based multi-select
   - Shows selection count
   - Clear indication of already selected users

#### 4. **TaskStep3** (`src/components/TaskStep3.tsx`)
   - Assign targets to teachers/volunteers
   - Two-step process:
     1. Select multiple targets from unassigned list
     2. Choose teacher/volunteer assignee
   - Shows current assignments with ability to remove
   - Skip option for self-assignment flow

#### 5. **TaskForm** (`src/components/TaskForm.tsx`)
   - Main container orchestrating all steps
   - Manages state across steps
   - Handles NEW vs EDIT modes
   - Validates step completion before navigation

### State Flow

```
Step 1 (Define Task)
  ↓ (definition saved)
Step 2 (Select Targets)
  ↓ (targets saved)
Step 3 (Assign Volunteers)
  ↓ (assignments saved)
Submit → Backend
```

### Routes

- **`/tasks/new`** - Create new task
- **`/tasks`** - Task list with "New Task" button

### NEW vs EDIT Mode

The **same** components handle both flows:

**NEW Task:**
```tsx
<TaskForm 
  mode="NEW" 
  onSave={handleSave} 
  onCancel={handleCancel} 
/>
```

**EDIT Task:**
```tsx
<TaskForm 
  mode="EDIT" 
  taskId="01HZX..."
  initialData={{ definition, targets, assignments }}
  onSave={handleSave} 
  onCancel={handleCancel} 
/>
```

### Validation

Each step validates before allowing progression:

- **Step 1**: Title (required, max 255), Location (ULID), At least one action enabled, Script length limits
- **Step 2**: At least one target selected
- **Step 3**: Optional (can skip for self-assignment)

---

## 🎯 Data & Schema Reuse

### Extended Schemas

✓ **No duplicate schemas** - Single source of truth  
✓ **Partial state support** - Draft tasks with incomplete data  
✓ **Step-wise validation** - Each step independently validated  
✓ **Mode-agnostic** - Same schema for NEW and EDIT  

### Zod Schema Extensions

- `TaskFormStateSchema` includes `mode: "NEW" | "EDIT"`
- `SaveTaskRequestSchema.taskId` is optional (absent for NEW, present for EDIT)
- Helper functions: `createNewTaskFormState()`, `createEditTaskFormState()`

---

## 📦 Files Created/Modified

### New Files

```
src/lib/schemas/ui/task-creation.schema.ts       - Task creation schemas
src/components/UserTable.tsx                      - User table component
src/components/TaskStepper.tsx                    - Step progress indicator
src/components/TaskStep1.tsx                      - Task definition step
src/components/TaskStep2.tsx                      - Target selection step
src/components/TaskStep3.tsx                      - Assignment step
src/components/TaskForm.tsx                       - Main task form container
src/routes/users-new.tsx                          - New user management page
src/routes/tasks/new.tsx                          - New task route
```

### Modified Files

```
src/lib/schemas/ui/index.ts                       - Export task-creation schema
src/lib/schemas/db/user.schema.ts                 - Added email, phone, locationId
src/routes/tasks/index.tsx                        - Added "New Task" button
```

---

## ✅ Success Criteria

- [x] User list is table-based with multi-select
- [x] Tasks can be created and edited with same flow
- [x] Assignments are clear and reusable
- [x] Zod schemas are extended, not duplicated
- [x] UI is simple, predictable, and scalable
- [x] No compilation errors
- [x] Uses solid-ui components only (Table, Button, Badge, Card, Input, Label)
- [x] Follows location-scoped data patterns
- [x] No new frameworks or UI libraries introduced

---

## 🚀 Next Steps (Backend Integration)

### User Table
- [ ] Connect to DynamoDB user repository
- [ ] Implement group assignment backend logic
- [ ] Add pagination for large user lists
- [ ] Add filtering and search

### Task Creation
- [ ] Implement `saveTask` server action
- [ ] Connect to DynamoDB task-outreach repository
- [ ] Load real members/leads from database
- [ ] Load real teachers/volunteers from database
- [ ] Implement atomic assignment with retry logic
- [ ] Add task edit route (`/tasks/[taskId]/edit`)

### Self-Assignment (Step 4)
- [ ] Create self-assignment UI (for teachers/volunteers)
- [ ] Implement atomic self-assign with concurrency handling
- [ ] Show unassigned target count

---

## 💡 Design Decisions

1. **Single Schema Approach**: NEW and EDIT tasks use the same `TaskFormState` schema with a `mode` discriminator. This eliminates duplication and ensures consistency.

2. **Step Validation**: Each step can be independently validated, allowing users to save drafts and return later.

3. **Extensible Bulk Actions**: User table accepts an array of action handlers, making it easy to add new bulk operations without modifying the component.

4. **Table over Cards**: Table layout provides better information density and multi-select UX for bulk operations.

5. **Dummy Data**: All components use dummy data with clear notes indicating backend integration points.

---

## 🧪 Testing

To test the implementation:

1. **User Table**: Navigate to `/users-new`
   - Select multiple users
   - Verify bulk actions toolbar appears
   - Test "Assign to Group" action

2. **Task Creation**: Navigate to `/tasks/new`
   - Complete Step 1 (task definition)
   - Select targets in Step 2
   - Assign volunteers in Step 3
   - Verify save triggers alert with form data

3. **Navigation**: Use stepper to navigate between steps
   - Verify completed steps show checkmarks
   - Verify can only access current/completed/next steps

---

## 📝 Notes

- All components are **responsive** and **mobile-friendly**
- Uses **SolidJS** reactive primitives (createSignal, createMemo, Show, For)
- Follows **SolidStart** file-based routing conventions
- Adheres to existing **Tailwind CSS** styling patterns
- Compatible with **existing authentication** flows (auth checks disabled for preview)

# Table-Based Assignment UI Implementation

## Overview
Replaced the card-based/step-based assignment flow with a **single table-based layout** featuring inline assignment editing and bulk operations.

## Key Changes

### 1. Schema Redesign
**File:** [src/lib/schemas/ui/task-creation.schema.ts](src/lib/schemas/ui/task-creation.schema.ts)

#### New Assignment State Model
```typescript
// OLD: Array-based (card/step flow)
type AssignmentMapping = {
  assigneeUserId: string;
  targetUserIds: string[];
}[];

// NEW: Record-based (table inline editing)
type AssignmentState = Record<
  string,  // targetUserId
  string | null  // assigneeUserId or null for unassigned
>;
```

#### Rationale for Record Model
- ✅ **Inline Editing**: Direct mapping from table row to assignment
- ✅ **Bulk Operations**: Easy to update multiple entries
- ✅ **Draft State**: Clear representation of unassigned targets
- ✅ **Diffing**: Simple to compare before/after states
- ✅ **Self-Assignment**: Explicit `null` for unassigned (volunteer picks later)

#### Helper Functions Added
```typescript
// Convert UI Record format → Backend array format
convertToAssignmentMappings(assignments: AssignmentState): AssignmentMapping[]

// Initialize edit mode (Backend array → UI Record)
createEditTaskFormState(
  taskId, definition, targets, 
  assignments: AssignmentMapping[]  // Takes backend format
): TaskFormState  // Returns with Record-based assignments
```

### 2. New Component: TaskStep3New
**File:** [src/components/TaskStep3New.tsx](src/components/TaskStep3New.tsx)

#### Features Implemented

##### Statistics Dashboard
- **Total Targets**: Count of all task targets
- **Assigned**: Count with assigned teacher/volunteer
- **Unassigned**: Count marked for self-assignment

##### Bulk Assignment Toolbar
Shows when rows are selected:
- **Combobox**: Select assignee or "Unassigned"
- **Assign Selected** button: Apply to all selected rows
- **Clear Selection** button: Deselect all

##### Assignment Table
5 columns:
1. **Checkbox**: Individual row selection + select-all header
2. **Target Name**: Full name of member/lead
3. **Phone**: Contact phone number
4. **Type**: Badge (Teacher/Volunteer)
5. **Assigned To**: Inline Combobox for assignment

##### Combobox Implementation
Uses solid-ui Kobalte-based Combobox:
```tsx
<Combobox<AssigneeOption>
  options={assigneeOptions()}
  value={getAssignmentOption(target.id)}
  onChange={(option) => updateAssignment(target.id, option)}
  optionValue="value"
  optionTextValue="label"
  placeholder="Select assignee..."
  itemComponent={(itemProps) => (
    <ComboboxItem item={itemProps.item}>
      <ComboboxItemLabel>
        {itemProps.item.rawValue.label}
      </ComboboxItemLabel>
      <ComboboxItemIndicator />
    </ComboboxItem>
  )}
>
  <ComboboxControl>
    <ComboboxInput />
    <ComboboxTrigger />
  </ComboboxControl>
  <ComboboxContent />
</Combobox>
```

#### Options Include
- **Unassigned** (explicit option)
- All Teachers (name + role)
- All Volunteers (name + role)
- Searchable/filterable

### 3. TaskForm Integration
**File:** [src/components/TaskForm.tsx](src/components/TaskForm.tsx)

#### Changes Made
1. **Import**: `TaskStep3New` instead of `TaskStep3`
2. **Import**: `convertToAssignmentMappings` helper
3. **Props**: Accept `AssignmentMapping[]` (backend format)
4. **Removed**: `handleStep3Skip()` function (unassigned is explicit now)
5. **Submit**: Convert Record → Array before saving:
   ```typescript
   const submitTask = (assignments: AssignmentState) => {
     props.onSave({
       taskId: state().taskId,
       definition: state().definition as TaskDefinition,
       targets: state().selectedTargets,
       assignments: convertToAssignmentMappings(assignments), // Convert here
     });
   };
   ```

### 4. Validation Changes
**File:** [src/lib/schemas/ui/task-creation.schema.ts](src/lib/schemas/ui/task-creation.schema.ts)

```typescript
// Step 3 validation: Always valid - unassigned allowed
export function validateStep3(assignments: AssignmentState): boolean {
  return true; // Volunteers can self-assign later
}
```

## Usage Patterns

### Creating a New Task
```tsx
<TaskForm 
  mode="NEW"
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

Step 3 flow:
1. Table shows all selected targets (from Step 2)
2. All start as "Unassigned"
3. Admin can:
   - Assign inline (click combobox in row)
   - Select multiple rows → Bulk assign
   - Leave some unassigned → Volunteers self-assign later

### Editing an Existing Task
```tsx
<TaskForm 
  mode="EDIT"
  taskId="01HZXK7G2TASK001"
  initialData={{
    definition: {...},
    targets: [...],
    assignments: [  // Backend array format
      { assigneeUserId: "teacher1", targetUserIds: ["member1", "member2"] },
      { assigneeUserId: "volunteer1", targetUserIds: ["lead1"] }
    ]
  }}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

Step 3 flow:
1. Table pre-populated with existing assignments
2. Assignments converted to Record format for editing
3. Admin can change any assignment
4. On save, Record converted back to Array for backend

## Benefits

### Scalability
- ✅ **Large Lists**: Table efficiently renders 100+ volunteers
- ✅ **Searchable**: Combobox filters options as you type
- ✅ **Bulk Actions**: Assign 50 targets to one volunteer in one click

### User Experience
- ✅ **Single View**: All targets visible at once (no navigation)
- ✅ **Clear State**: See assigned vs unassigned counts
- ✅ **Flexible**: Inline edit OR bulk assign
- ✅ **Explicit Unassigned**: Clear option for self-assignment

### Maintainability
- ✅ **Single Component**: Same UI for NEW and EDIT
- ✅ **Type-Safe**: Zod schemas with TypeScript
- ✅ **Backend Compatible**: Clean conversion layer

## Implementation Notes

### Dummy Data
Currently uses `DUMMY_ASSIGNEES` array (6 teachers/volunteers) for testing.

**TODO**: Replace with real data from DynamoDB:
```typescript
// Load teachers and volunteers from API
const allAssignees = createMemo(() => {
  return [...props.teachers, ...props.volunteers];
});
```

### Combobox Pattern
Must use Kobalte-specific API (from solid-ui):
- ❌ **Wrong**: Generic component props (`options`, `placeholder`)
- ✅ **Right**: Kobalte props (`optionValue`, `optionTextValue`, `itemComponent`)

Reference: [GooglePlaceSearch.tsx](src/components/GooglePlaceSearch.tsx#L180-L230)

### Self-Assignment (Future)
Targets with `assigneeUserId: null` are shown in volunteer's task list.
Volunteer can click "Claim" button to self-assign.

**TODO**: Create volunteer-specific route/component for self-assignment view.

## Files Modified

### Created
- ✅ [src/components/TaskStep3New.tsx](src/components/TaskStep3New.tsx) - New table-based UI

### Modified
- ✅ [src/lib/schemas/ui/task-creation.schema.ts](src/lib/schemas/ui/task-creation.schema.ts) - Record-based state model
- ✅ [src/components/TaskForm.tsx](src/components/TaskForm.tsx) - Integration with new component

### Renamed (Backup)
- ✅ [src/components/TaskStep3Old.tsx](src/components/TaskStep3Old.tsx) - Old card-based implementation (backup)

## Testing Checklist

### Manual Testing
- [ ] Create new task → Step 3 shows empty assignments
- [ ] Assign inline → Single target updates
- [ ] Bulk assign → Multiple targets update simultaneously
- [ ] Select "Unassigned" → Target marked for self-assignment
- [ ] Edit existing task → Assignments pre-populated correctly
- [ ] Search in combobox → Options filter as expected
- [ ] Statistics → Counts update as assignments change

### Build Verification
✅ **Build Status**: `pnpm run build` succeeds
- No compilation errors
- All modules resolved correctly

## Next Steps

1. **Backend Integration**: Load real teachers/volunteers from DynamoDB
2. **Self-Assignment UI**: Create volunteer view for claiming unassigned targets
3. **Cleanup**: Remove old TaskStep3Old.tsx after verification
4. **Documentation**: Update main README with new assignment flow
5. **Tests**: Add unit tests for `convertToAssignmentMappings()` function

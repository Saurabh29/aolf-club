# Phase 2A Complete — UI Shell & Navigation

**Date:** December 27, 2025  
**Status:** UI Shell Implemented  
**Next Phase:** Phase 2B (Backend Integration)

---

## 🎯 Phase 2A Deliverables

### 1. Navigation Updates

**File:** [AppNavigation.tsx](../src/components/AppNavigation.tsx)

Added "Tasks" navigation item (4th item between Locations and Serve Hub):
- Mobile: Bottom nav bar icon + label
- Desktop: Left sidebar icon + label
- Links to `/tasks`
- Icon: Checklist/clipboard icon

---

### 2. Tasks List Page

**Route:** `/tasks`  
**File:** [tasks.tsx](../src/routes/tasks.tsx)

**Features:**
- Lists all outreach tasks for current location
- Each task card shows:
  - Title and status badge
  - Location name
  - Creation date and creator
  - Allowed actions (📞 Call, 💬 Message badges)
  - Assignment progress (87/142 assigned)
  - "View Details" button → navigates to task detail
- "New Task" button (placeholder)
- Auth check redirects to login if not authenticated

**Dummy Data:**
- 4 sample tasks with various statuses (OPEN, IN_PROGRESS, COMPLETED)
- Mixed allowed actions (call only, message only, both)

---

### 3. Task Detail Page (Single-Screen UI)

**Route:** `/tasks/:taskId`  
**File:** [tasks/[taskId].tsx](../src/routes/tasks/[taskId].tsx)

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Tasks                                         │
├─────────────────────────────────────────────────────────┤
│ A. TASK SUMMARY (Card)                                  │
│    - Title, location, creator, status                   │
│    - Allowed actions badges (📞 💬)                     │
├─────────────────────────────────────────────────────────┤
│ B. ASSIGNMENT PANEL (Card)                              │
│    [CREATOR VIEW]                                       │
│    - Assign To: dropdown                                │
│    - Number of users: input                             │
│    - "Assign Selected Users" button                     │
│                                                          │
│    [VOLUNTEER VIEW] (default in dummy data)             │
│    - "55 unassigned users available" badge              │
│    - Assign [20] users to me + [Assign Me] button      │
│    - Tip text about atomic assignment                   │
├─────────────────────────────────────────────────────────┤
│ C. MY ASSIGNED USERS (Cards)                            │
│    - Filter dropdown (All/Pending/Done/Follow-up)       │
│    - User cards (4 dummy users):                        │
│      • Name + MEMBER/LEAD badge + Status badge          │
│      • Phone number                                     │
│      • [Call] [Message] buttons                         │
│      • Notes textarea                                   │
│      • 5-star rating selector                           │
│      • Follow-up date picker                            │
│      • [Mark as Skipped] [Save] buttons                 │
│      • Last updated timestamp                           │
│    - Empty state when no assignments                    │
└─────────────────────────────────────────────────────────┘
```

**Dummy Data:**
- 1 task detail (Weekly Follow-ups)
- 4 assigned users (2 with interactions, 2 pending)
- 55 unassigned users count
- Toggle `DUMMY_IS_CREATOR` flag to switch views

**Interactions (Phase 2A — UI only):**
- Call button: Opens `tel:` link
- Message button: Opens WhatsApp web
- Save button: Console log (backend in Phase 2B)
- Skip button: Console log
- Assign Me button: Console log
- Rating stars: Visual only (no state change yet)

---

## 🗂️ File Structure

```
src/
  components/
    AppNavigation.tsx          ← Updated (added Tasks nav)
  routes/
    tasks.tsx                  ← NEW (task list)
    tasks/
      [taskId].tsx             ← NEW (task detail single-screen)
```

---

## 🎨 Design Highlights

### Single-Screen Philosophy
- All 3 sections visible on one page
- No separate follow-up screen
- Minimal navigation required
- Inline filters for quick access

### Responsive Design
- Mobile-first approach
- Cards stack on mobile
- Grid layout on desktop (assignment panel + user cards)
- Touch-friendly buttons and inputs

### User Experience
- Clear visual hierarchy (Summary → Assignment → Work Area)
- Status badges for quick scanning
- Action icons (call/message) match allowed actions
- Empty states guide user to next action
- Creator vs. Volunteer views contextual

### Dummy Data Patterns
- ULIDs for all IDs (Phase 1 design spec)
- Realistic data (Indian names, phone formats)
- Mixed states (pending, done, with/without interactions)
- Allows testing both views (creator/volunteer)

---

## ✅ Phase 2A Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Layout complete | ✅ | 3-section single-screen design implemented |
| Routing working | ✅ | `/tasks` and `/tasks/:taskId` routes functional |
| Navigation updated | ✅ | Tasks item added to mobile + desktop nav |
| Dummy data | ✅ | 4 tasks, 4 assigned users, realistic data |
| No backend calls | ✅ | All handlers use console.log placeholders |
| Mobile-first | ✅ | Responsive cards, touch-friendly UI |
| Auth check | ✅ | Both routes redirect to login if not authenticated |

---

## 🚀 Next Steps (Phase 2B)

**Not Started Yet** — Awaiting user approval of Phase 2A implementation.

Phase 2B will implement:
1. Extend existing UI Task schema with outreach-specific fields
2. Backend integration for all handlers
3. Atomic self-assignment with retry logic
4. Save/update interaction state
5. Real-time updates for assignment counts
6. Error handling and loading states

**Key Backend Operations to Implement:**
- AP1: Fetch task details (`GetItem`)
- AP3: Fetch my assignments (`Query`)
- AP8: Atomic self-assignment (`TransactWriteItems`)
- AP9: Save interaction (`PutItem` upsert)
- Batch fetch interactions for assigned users

---

## 🧪 Testing Phase 2A

**Manual Testing:**

1. **Start dev server:**
   ```bash
   pnpm run dev
   ```

2. **Test Navigation:**
   - Click "Tasks" in nav → Should load task list
   - Verify all 4 tasks display with correct badges
   - Click "View Details" on any task

3. **Test Task Detail:**
   - Verify 3 sections render
   - Check assignment panel shows volunteer view (default)
   - Verify 4 user cards display
   - Click Call button → Opens tel: link
   - Click Message button → Opens WhatsApp
   - Click Save → Check console for log
   - Try changing `DUMMY_IS_CREATOR` to `true` → Verify creator view

4. **Test Responsive:**
   - Resize window (mobile → desktop)
   - Verify cards stack on mobile
   - Verify layout adapts

---

## 📝 Known Limitations (By Design)

- No actual backend calls (Phase 2A scope)
- Rating stars visual only (no click handlers)
- Filters non-functional (client-side filtering in Phase 2B)
- No validation on inputs
- No loading/error states
- Assigned user count hardcoded (will be dynamic in Phase 2B)

---

**End of Phase 2A**

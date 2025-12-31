# AOLF Club Project Overview

## 1. Project Architecture & Overview

This project is a SolidStart (SolidJS) application using a DynamoDB single-table design for all entities, with a focus on relationship-based access control (ReBAC). The backend is integrated with AWS DynamoDB, and the frontend uses TailwindCSS for styling. Authentication is handled via OAuth (GitHub/Google) using start-authjs and session helpers.

- **Entrypoints:**
  - `src/entry-server.tsx` (server-side)
  - `src/entry-client.tsx` (client-side)
  - `src/app.tsx` (app shell, routing)
- **Routing:** File-based, under `src/routes/*`
- **Components:** UI in `src/components/*`
- **Styling:** TailwindCSS
- **Auth:** OAuth via start-authjs

## 2. DynamoDB Schema Design

### Table: `aolfclub-entities`
- **PK**: Partition Key (String)
- **SK**: Sort Key (String)
- **Billing Mode:** PAY_PER_REQUEST
- **Design:** Single-table, no GSIs, all access via PK/SK
- **ID Format:** ULID for all primary IDs

### Entity Types
- **EmailIdentity**: O(1) lookup from email → userId
- **User**: Core user entity (ULID, displayName, userType, isAdmin)
- **Location**: Physical location (ULID, code, name, address)
- **LocationCodeLookup**: Maps locationCode → locationId
- **UserGroup**: Group entity, scoped to location (TEACHER/VOLUNTEER)
- **Role**: Global role definition
- **Page**: Page registration for permission control

### Relationship Schemas
- **User ↔ Location**: Bidirectional membership edges
- **User ↔ Group**: Bidirectional group membership
- **Group → Role**: Assigns roles to groups
- **Role → Page**: Permission mapping

## 3. Access Patterns

- **Create Location**: TransactWrite for Location + LocationCodeLookup (enforces uniqueness)
- **Get Location by ID**: GetItem by PK/SK
- **Get Location by Code**: Two-step lookup (code → id → item)
- **List All Locations**: Scan with FilterExpression (itemType = 'Location')
- **User/Group/Role/Page lookups**: All via PK/SK, no scans or GSIs
- **Permission Checks**: Data-driven, never hardcoded

## 4. Implementation Guide

### User Management
- Table-based user list with multi-select and bulk actions
- Bulk actions: Assign to group, etc.
- Responsive design, clear selection feedback

### Task Creation (Multi-Step)
- Step 1: Define task (title, location, allowed actions, scripts)
- Step 2: Select targets (users)
- Step 3: Assign targets to volunteers/teachers
- Shared schemas and components for NEW/EDIT flows
- Zod schemas for validation at each step

### Backend Integration
- All mock data replaced with real DynamoDB calls
- Repository layer for all entity operations
- Server actions for task creation, assignment, and interaction
- Atomic transactions for multi-item writes
- Concurrency-safe assignment logic

## 5. Progress & Phase Log (Summary)

- **Phase 1:** UI schemas and single-table schema design complete
- **Phase 2A:** App shell, navigation, and route placeholders implemented
- **Phase 2B:** Backend integration for task outreach, all dummy data replaced, TypeScript compilation passes
- **Repository Layer:** All entity and relationship repositories implemented
- **Serve Hub:** Complete flow for task assignment, interaction, and progress tracking
- **Testing:** Type-checks pass, mock and real backend tested, ready for further manual and concurrency testing

## 6. Testing & Next Steps

- **Manual Testing:** Seed DynamoDB with sample data for end-to-end flow
- **Pending:**
  - Real authentication integration (start-authjs session)
  - Import/export for user management
  - Schema and repository updates for new features
  - Centralize and refactor authentication logic
  - Remove duplicate code/utilities

---

**This document consolidates all previous phase, schema, and implementation guides. For detailed code examples, see the repository files referenced in each section.**

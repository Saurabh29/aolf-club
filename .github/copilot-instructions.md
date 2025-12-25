# Copilot instructions for this repository

A SolidStart Location management app with DynamoDB backend, Google Places integration, and Zod validation.

## Purpose for AI agents
- Help developers build Location CRUD features using SolidStart, DynamoDB single-table design, and Google Places
- Ensure Zod schema patterns are followed (DB schema authoritative, UI schemas derived)
- Maintain light-mode-only styling with solid-ui components

## Big-picture architecture

### Frontend
- **Entrypoints**: `src/entry-server.tsx` (SSR), `src/entry-client.tsx` (hydration), `src/app.tsx` (router)
- **Routes**: File-based in `src/routes/*`; protected routes in `src/routes/(protected)/*`
- **Components**: `src/components/ui/*` (solid-ui), `src/components/*.tsx` (feature components)

### Backend
- **Server actions**: `src/server/actions/*.ts` — all mutations use `"use server"` directive
- **Repository**: `src/server/db/repositories/*.ts` — DynamoDB access layer
- **Client**: `src/server/db/client.ts` — AWS SDK v3 DocumentClient

### Data Layer
- **DynamoDB single-table**: No GSIs, uses lookup items for secondary access patterns
- **IDs**: All entity IDs use ULID format (not UUID)
- **Schemas**: `src/lib/schemas/db/*.ts` (authoritative), `src/lib/schemas/ui/*.ts` (derived)

## Critical patterns

### Zod Schema Derivation (MUST follow)
```typescript
// DB Schema is authoritative (src/lib/schemas/db/location.schema.ts)
export const LocationDbSchema = z.object({ ... });

// UI Schema MUST derive via omit/pick/extend (src/lib/schemas/ui/location.schema.ts)
export const AddLocationFormSchema = LocationDbSchema.omit({
  locationId: true, createdAt: true, updatedAt: true, status: true
});
```

### Server Action Response Shape (MUST follow)
```typescript
{ success: boolean, data?: T, error?: string }
```

### locationCode Uniqueness
Uses TransactWrite with lookup item `PK=LOCATION_CODE#<code>`. See `docs/ACCESS_PATTERNS.md`.

### Google Places Autocomplete
Address data MUST come from Places Autocomplete. Server validates `placeId` and coordinates.

## Key developer workflows

```bash
pnpm install                    # Install dependencies
pnpm db:local                   # Start DynamoDB Local (Docker)
pnpm db:create-table            # Create table
pnpm dev                        # Dev server at localhost:3000
pnpm test                       # Run unit tests
pnpm test:location              # Smoke test against DynamoDB Local
```

## Styling constraints (MUST follow)
- **Light-mode only** — no `dark:` variants, no dark theme CSS variables
- Use: `bg-white`, `text-gray-900`, `border-gray-200`
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes

## Files to inspect

| Task | Files |
|------|-------|
| Add entity | `src/lib/schemas/db/`, `src/server/db/repositories/`, `src/server/actions/` |
| Add route | `src/routes/(protected)/` |
| Add component | `src/components/`, use `src/components/ui/` base components |
| DynamoDB patterns | `docs/ACCESS_PATTERNS.md`, `src/server/db/client.ts` |

## What not to change
- Do not add GSIs to DynamoDB
- Do not use UUIDs (use ULID)
- Do not duplicate DB schema fields in UI schemas (derive instead)
- Do not add dark-mode styling
- Do not allow freeform address entry (must use Places Autocomplete)

## Future integration placeholders (TODOs in code)
- Authentication check in server actions
- Role-based authorization
- Server-side Google Places verification


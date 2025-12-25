# AOLF Club - Location Management

A minimal, production-quality Location management application built with SolidStart and DynamoDB.

## Features

- **Location CRUD**: Create, read, list, and soft-delete locations
- **Google Places Integration**: Address/geo data from Places Autocomplete only
- **DynamoDB Single-Table Design**: No GSIs, lookup item pattern for uniqueness
- **ULID IDs**: Sortable, unique identifiers for all entities
- **Type-Safe**: Zod schemas for validation, TypeScript throughout
- **Light-Mode UI**: Tailwind CSS with solid-ui components

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm
- Docker (for DynamoDB Local)
- Google Maps API Key with Places API enabled

### Setup

1. **Clone and install dependencies**

```bash
pnpm install
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your Google Maps API key
```

3. **Start DynamoDB Local**

```bash
pnpm db:local
# This runs: docker run -d -p 8000:8000 amazon/dynamodb-local
```

4. **Create the table**

```bash
pnpm db:create-table
```

5. **Start development server**

```bash
pnpm dev
```

6. **Open the app**

Navigate to http://localhost:3000/locations

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run unit tests |
| `pnpm test:location` | Run location creation smoke test |
| `pnpm db:local` | Start DynamoDB Local container |
| `pnpm db:create-table` | Create the DynamoDB table |

## Architecture

### Single-Table DynamoDB Design

All data stored in one table with PK/SK patterns:

| Entity | PK | SK |
|--------|----|----|
| Location | `LOCATION#<locationId>` | `METADATA` |
| Code Lookup | `LOCATION_CODE#<code>` | `LOOKUP` |

**No GSIs** - Uses lookup items for secondary access patterns.

See [docs/ACCESS_PATTERNS.md](docs/ACCESS_PATTERNS.md) for detailed patterns.

### locationCode Uniqueness

Enforced atomically via `TransactWriteItems`:

1. Put Location item (condition: PK not exists)
2. Put Lookup item (condition: PK not exists)

If the lookup item exists, the transaction fails → duplicate code rejected.

### Zod Schema Pattern

The **DB schema is authoritative**. UI schemas are derived:

```typescript
// DB Schema (source of truth)
const LocationDbSchema = z.object({
  locationId: z.string().regex(ulidPattern),
  locationCode: z.string(),
  // ... all fields
});

// UI Schema (derived, not duplicated)
const AddLocationFormSchema = LocationDbSchema.omit({
  locationId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
```

### Server Actions

All mutations use SolidStart server actions with consistent response shape:

```typescript
{ success: boolean, data?: T, error?: string }
```

### Google Places Autocomplete

**Critical**: Address data MUST come from Google Places Autocomplete.

- UI requires place selection before submission
- Server validates presence of `placeId` and coordinates
- No freeform address entry allowed

## Project Structure

```
src/
├── components/
│   ├── ui/                     # solid-ui components
│   ├── AddLocationDialog.tsx   # Location creation dialog
│   ├── LocationsTable.tsx      # Locations list table
│   └── PlacesAutocomplete.tsx  # Google Places input
├── lib/
│   └── schemas/
│       ├── db/                 # Authoritative DB schemas
│       └── ui/                 # Derived UI schemas
├── routes/
│   └── (protected)/
│       └── locations.tsx       # Locations page
└── server/
    ├── actions/
    │   └── locations.ts        # Server actions
    └── db/
        ├── client.ts           # DynamoDB client
        └── repositories/
            └── location.repository.ts
scripts/
├── create-local-table.ts       # Table setup script
└── test-location-creation.ts   # Smoke test script
tests/
└── location.repository.test.ts # Unit tests
docs/
└── ACCESS_PATTERNS.md          # DynamoDB patterns
```

## Styling Constraints

**Light-mode only**. No dark mode support.

- No `dark:` Tailwind variants
- No `[.dark &]` selectors
- No dark-theme CSS variables
- Use explicit light colors: `bg-white`, `text-gray-900`, `border-gray-200`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key with Places API |
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name |
| `AWS_REGION` | Yes | AWS region |
| `DYNAMODB_LOCAL_ENDPOINT` | Local only | DynamoDB Local URL |

## Testing

### Unit Tests

```bash
# Requires DynamoDB Local running
pnpm test
```

### Smoke Test

```bash
# Demonstrates create/list against DynamoDB Local
pnpm test:location
```

## Future Integration Points

These features are **not implemented** but marked with TODOs:

- **Authentication**: Add auth check before server actions
- **Authorization**: Role-based access control
- **Audit Logging**: Mutation logging
- **Google Places Verification**: Server-side placeId verification

## License

MIT


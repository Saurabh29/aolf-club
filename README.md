# AOLF Club - Location Management

A production-ready location management application built with SolidStart, DynamoDB, and TailwindCSS.

> ⚠️ **Light-mode only**: This application is light-mode only. Do not add `dark:` Tailwind classes or dark mode variants.

## Features

- **Location Management**: Create, list, view, and soft-delete locations
- **Google Places Integration**: Address/geolocation from Google Places Autocomplete only
- **Single-Table DynamoDB**: Efficient single-table design with ULID-based IDs
- **Location Code Uniqueness**: Atomic uniqueness enforcement via TransactWrite
- **Type-Safe**: Zod validation on both UI and DB boundaries

## Tech Stack

- **Frontend**: SolidStart, SolidJS, TailwindCSS
- **Backend**: SolidStart Server Actions
- **Database**: DynamoDB (single-table design)
- **Validation**: Zod
- **Build Tool**: Vinxi

## Requirements

- **Node.js**: >=22
- **Package Manager**: pnpm
- **DynamoDB Local**: For local development

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key with Places API enabled
- `DYNAMODB_ENDPOINT`: `http://localhost:8000` for local development
- `DYNAMODB_TABLE_NAME`: Table name (default: `aolfclub-entities`)

### 3. Start DynamoDB Local

Using Docker:
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

Or download the JAR from [AWS DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html).

### 4. Create the Table

```bash
pnpm db:create-table
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:test` | Test DynamoDB connection |
| `pnpm db:create-table` | Create DynamoDB table |

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Card.tsx           # Canonical Card wrapper
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── AddLocationDialog.tsx  # Location creation dialog
│   ├── GooglePlaceSearch.tsx  # Google Places integration
│   └── (locations list handled by GenericCardList)     # Locations list UI
├── lib/
│   ├── schemas/
│   │   ├── db/                # DB schemas (source of truth)
│   │   │   └── location.schema.ts
│   │   └── ui/                # UI schemas (derived from DB)
│   │       └── location.schema.ts
│   └── utils.ts               # cn() utility
├── routes/
│   ├── index.tsx              # Home page
│   ├── locations.tsx          # Locations management page
│   └── about.tsx              # About page
└── server/
    ├── actions/
    │   └── locations.ts       # Server actions
    └── db/
        ├── client.ts          # DynamoDB client
        └── repositories/
            └── location.repository.ts
```

## DynamoDB Schema

### Single-Table Design

All entities are stored in a single table with PK/SK patterns:

| Entity | PK Pattern | SK |
|--------|------------|-----|
| Location | `LOCATION#<locationId>` | `META` |
| LocationCodeLookup | `LOCATION_CODE#<code>` | `META` |

### Location Code Uniqueness

Location codes are unique across all locations. Uniqueness is enforced using a TransactWrite that atomically creates both:
1. The Location item
2. A lookup item mapping `locationCode` → `locationId`

If the lookup item already exists (code taken), the transaction fails.

See [docs/ACCESS_PATTERNS.md](docs/ACCESS_PATTERNS.md) for detailed documentation.

## Schema Design

### DB Schema (Source of Truth)

The DB Zod schema in `src/lib/schemas/db/location.schema.ts` is the authoritative definition for persisted fields.

### UI Schema (Derived)

UI schemas in `src/lib/schemas/ui/location.schema.ts` are derived from DB schemas using Zod's `omit`/`pick`/`extend` helpers:

```typescript
// UI schema derived from DB schema
export const AddLocationFormSchema = LocationDbSchema.omit({
  PK: true, SK: true, itemType: true, locationId: true, 
  createdAt: true, updatedAt: true
});
```

**Never duplicate field definitions** — always derive from the DB schema.

## Google Places Integration

Address and geolocation data must come from Google Places Autocomplete:
- Manual address entry is NOT allowed
- Server validates presence of `placeId` and coordinates
- UI requires place selection from autocomplete dropdown

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Manual Testing

```bash
# Test DynamoDB connection
pnpm db:test

# Run location creation test script
pnpm tsx scripts/test-location-creation.ts
```

## Development Guidelines

### Path Alias

Use `~/` for all workspace imports:
```typescript
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
```

### Card Wrapper

All content pages must use the reusable `Card` wrapper:
```typescript
import { Card } from "~/components/ui/Card";

<Card title="Locations" actions={<Button>Add</Button>}>
  {/* Locations list handled by GenericCardList - see src/components/GenericCardList.tsx */}
</Card>
```

### Server Actions

Server actions must use `"use server"` at both file and function level:
```typescript
"use server";

export async function createLocation(data: FormData) {
  "use server";
  // ...
}
```

### Response Shape

All server actions return:
```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

## Future Integrations

The codebase includes placeholder comments for future features:
- `// TODO: Add auth check here` — Authentication integration points
- `// TODO: Optionally verify placeId with Google Places API` — Server-side verification

## License

MIT

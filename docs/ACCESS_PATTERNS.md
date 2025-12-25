# Access Patterns Documentation

This document describes the DynamoDB single-table design and access patterns used in the AOLF Club application.

## Table Overview

**Table Name:** `aolfclub-entities` (configurable via `DYNAMODB_TABLE_NAME`)

**Key Schema:**
- **PK** (Partition Key): String
- **SK** (Sort Key): String

**Billing Mode:** PAY_PER_REQUEST (On-Demand)

**Design Philosophy:**
- Single-table design for all entities
- No Global Secondary Indexes (GSIs) for simplicity and transactional guarantees
- Lookup items for uniqueness enforcement
- ULID for all primary IDs (sortable, URL-safe)

## Entity Types

### Location

Represents a physical location managed by the organization.

**PK/SK Pattern:**
- **PK:** `LOCATION#<locationId>` (e.g., `LOCATION#01ARZ3NDEKTSV4RRFFQ69G5FAV`)
- **SK:** `META`

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition key |
| SK | String | Sort key (always "META") |
| itemType | String | Discriminator: "Location" |
| locationId | String | ULID primary identifier |
| locationCode | String | Human-readable unique code |
| name | String | Display name |
| placeId | String | Google Places API place_id |
| formattedAddress | String | Full address from Google |
| addressComponents | Map | Structured address parts |
| lat | Number | Latitude |
| lng | Number | Longitude |
| status | String | "active" or "inactive" |
| createdAt | String | ISO 8601 timestamp |
| updatedAt | String | ISO 8601 timestamp |

**Example Item:**
```json
{
  "PK": "LOCATION#01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "SK": "META",
  "itemType": "Location",
  "locationId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "locationCode": "austin-main-01",
  "name": "Austin Main Center",
  "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "formattedAddress": "123 Main St, Austin, TX 78701",
  "lat": 30.2672,
  "lng": -97.7431,
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### LocationCodeLookup

Lookup item that maps `locationCode` to `locationId` for uniqueness enforcement.

**PK/SK Pattern:**
- **PK:** `LOCATION_CODE#<locationCode>` (e.g., `LOCATION_CODE#austin-main-01`)
- **SK:** `META`

**Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition key |
| SK | String | Sort key (always "META") |
| itemType | String | Discriminator: "LocationCodeLookup" |
| locationId | String | ULID of the associated Location |
| locationCode | String | The location code |
| createdAt | String | ISO 8601 timestamp |

**Example Item:**
```json
{
  "PK": "LOCATION_CODE#austin-main-01",
  "SK": "META",
  "itemType": "LocationCodeLookup",
  "locationId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "locationCode": "austin-main-01",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## Access Patterns

### 1. Create Location (with uniqueness enforcement)

**Operation:** TransactWriteItems

**Flow:**
1. Generate ULID for new location
2. Build Location item with all fields
3. Build LocationCodeLookup item
4. Execute TransactWrite with both items

**TransactWrite Items:**
```
[
  {
    Put: {
      TableName: "aolfclub-entities",
      Item: <Location>,
      ConditionExpression: "attribute_not_exists(PK)"
    }
  },
  {
    Put: {
      TableName: "aolfclub-entities",
      Item: <LocationCodeLookup>,
      ConditionExpression: "attribute_not_exists(PK)"  // Uniqueness check!
    }
  }
]
```

**Atomicity Guarantee:**
- If the lookup item already exists (duplicate code), the entire transaction fails
- Both items are written together or neither is written
- No partial state possible

**Error Handling:**
- Catch `TransactionCanceledException`
- Check for `ConditionalCheckFailed` reason
- Return user-friendly "code already taken" message

### 2. Get Location by ID

**Operation:** GetItem

**Key:**
- PK: `LOCATION#<locationId>`
- SK: `META`

**Example:**
```typescript
await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `LOCATION#${locationId}`,
    SK: "META"
  }
}));
```

### 3. Get Location by Code (Two-Step Lookup)

**Flow:**
1. Fetch lookup item to get `locationId`
2. Fetch Location item using `locationId`

**Step 1 - Get Lookup Item:**
```typescript
await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `LOCATION_CODE#${locationCode}`,
    SK: "META"
  }
}));
```

**Step 2 - Get Location Item:**
```typescript
await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `LOCATION#${lookup.locationId}`,
    SK: "META"
  }
}));
```

### 4. List All Locations

**Operation:** Scan with FilterExpression

**Query:**
```typescript
await docClient.send(new ScanCommand({
  TableName: TABLE_NAME,
  FilterExpression: "itemType = :type",
  ExpressionAttributeValues: {
    ":type": "Location"
  }
}));
```

**Pagination:**
- Use `LastEvaluatedKey` from response
- Pass as `ExclusiveStartKey` in next request
- Continue until `LastEvaluatedKey` is undefined

**Scaling Considerations:**
- Scan reads entire table; OK for <1000 items
- For larger datasets, consider:
  - Adding a GSI on `itemType`
  - Implementing cursor-based pagination
  - Caching results

### 5. Soft-Delete Location

**Operation:** UpdateItem

**Update Expression:**
```typescript
await docClient.send(new UpdateCommand({
  TableName: TABLE_NAME,
  Key: {
    PK: `LOCATION#${locationId}`,
    SK: "META"
  },
  UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
  ExpressionAttributeNames: {
    "#status": "status"
  },
  ExpressionAttributeValues: {
    ":status": "inactive",
    ":updatedAt": new Date().toISOString()
  }
}));
```

**Note on Lookup Item:**
- The LocationCodeLookup item is NOT removed during soft-delete
- This prevents reuse of the location code
- Consider removing if code reuse is desired

## Why No GSIs?

1. **Simplicity:** Single-table with lookup items is easier to understand and maintain
2. **Transactional Guarantees:** TransactWrite works within single table
3. **Cost:** GSIs incur additional read/write costs
4. **Consistency:** Lookup items provide strong consistency (GSIs are eventually consistent)

## Scaling Considerations

### When to Add GSIs

Consider adding GSIs when:
- List operations become slow (>100ms for scans)
- Need to query by attributes other than PK/SK
- Read patterns require filtering by status, date ranges, etc.

### Potential GSI Patterns

If scaling becomes necessary:

**GSI1: By Item Type and Date**
- GSI1PK: `itemType`
- GSI1SK: `createdAt`
- Use case: List all locations sorted by creation date

### Sharding Strategy

For very high write throughput:
- Add shard key to PK: `LOCATION#<shardId>#<locationId>`
- Distribute writes across shards
- Query requires scatter-gather across shards

### Caching

For read-heavy workloads:
- Cache `listLocations()` results in memory or Redis
- Invalidate on create/update/delete
- Consider TTL-based expiration

## Testing

### Local Development

1. Start DynamoDB Local:
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

2. Create table:
   ```bash
   pnpm db:create-table
   ```

3. Run test script:
   ```bash
   pnpm tsx scripts/test-location-creation.ts
   ```

### Unit Tests

```bash
pnpm test
```

Tests verify:
- Location creation with ULID generation
- Duplicate code rejection
- Get by ID and code
- List with filtering
- Soft-delete behavior

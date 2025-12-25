# DynamoDB Access Patterns

This document describes the single-table DynamoDB design for the Location management system.

## Design Principles

1. **Single-Table Design**: All entities stored in one table
2. **No GSIs**: Uses lookup items for secondary access patterns
3. **ULID IDs**: All primary entity IDs use ULID format (sortable, unique)
4. **Atomic Uniqueness**: locationCode uniqueness enforced via TransactWrite

## Table Schema

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition Key - entity type + ID |
| SK | String | Sort Key - relationship or metadata marker |

### Billing Mode

`PAY_PER_REQUEST` - No provisioned capacity, pay per operation.

## Entity Patterns

### Location Item

Stores the full location data.

```
PK: LOCATION#<locationId>
SK: METADATA
```

**Example:**
```json
{
  "PK": "LOCATION#01HQXYZ123ABC456DEF789GHI",
  "SK": "METADATA",
  "locationId": "01HQXYZ123ABC456DEF789GHI",
  "locationCode": "SF-001",
  "name": "San Francisco Office",
  "placeId": "ChIJIQBpAG2ahYAR_6128GcTUEo",
  "formattedAddress": "123 Market St, San Francisco, CA 94105",
  "lat": 37.7749,
  "lng": -122.4194,
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Location Code Lookup Item

Enables lookup by human-friendly code without a GSI.

```
PK: LOCATION_CODE#<locationCode>
SK: LOOKUP
```

**Example:**
```json
{
  "PK": "LOCATION_CODE#SF-001",
  "SK": "LOOKUP",
  "locationId": "01HQXYZ123ABC456DEF789GHI",
  "locationCode": "SF-001"
}
```

## Access Patterns

### 1. Get Location by ID

**Pattern:** Direct GetItem on Location item

```
GetItem:
  PK = "LOCATION#<locationId>"
  SK = "METADATA"
```

**Consistency:** Strong (single item read)

### 2. Get Location by Code

**Pattern:** Two-step lookup

1. Get lookup item to find locationId
2. Get location item by ID

```
Step 1 - GetItem:
  PK = "LOCATION_CODE#<locationCode>"
  SK = "LOOKUP"

Step 2 - GetItem:
  PK = "LOCATION#<locationId>"
  SK = "METADATA"
```

**Consistency:** Eventually consistent for lookup, then strong for location

### 3. List All Locations

**Pattern:** Scan with filter

```
Scan:
  FilterExpression = "begins_with(PK, :prefix) AND #status = :active"
  ExpressionAttributeValues = {
    ":prefix": "LOCATION#",
    ":active": "active"
  }
```

**⚠️ Scaling Caveat:** Scan is suitable for small datasets (< 1000 items).
For larger scale:
- Implement pagination with `LastEvaluatedKey`
- Consider sharding by region/category
- Add a GSI for efficient listing (not implemented per constraints)

### 4. Create Location (with Code Uniqueness)

**Pattern:** TransactWriteItems

Atomically writes both the location item and lookup item.
Transaction fails if lookup item already exists, ensuring uniqueness.

```
TransactWriteItems:
  - Put Location Item (with condition: PK not exists)
  - Put Lookup Item (with condition: PK not exists)
```

**Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                    TransactWriteItems                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   Put Location      │    │   Put Lookup        │         │
│  │   ───────────────   │    │   ───────────────   │         │
│  │   PK: LOCATION#id   │    │   PK: LOCATION_CODE │         │
│  │   SK: METADATA      │    │      #<code>        │         │
│  │                     │    │   SK: LOOKUP        │         │
│  │   Condition:        │    │                     │         │
│  │   PK not exists     │    │   Condition:        │         │
│  │                     │    │   PK not exists     │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                              │
│  If EITHER condition fails → ENTIRE transaction fails        │
│  Both items written atomically on success                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Error Handling:**
- `TransactionCanceledException` → Code already exists
- Map to user-friendly error message

### 5. Soft Delete Location

**Pattern:** UpdateItem (optional: TransactWriteItems to remove lookup)

```
UpdateItem:
  PK = "LOCATION#<locationId>"
  SK = "METADATA"
  UpdateExpression = "SET #status = :inactive, updatedAt = :now"
```

**Option: Free the Code**
If allowing code reuse after deletion, use transaction:

```
TransactWriteItems:
  - Update Location (set status = inactive)
  - Delete Lookup Item
```

## Why No GSI?

1. **Simplicity:** Lookup items provide secondary access without GSI overhead
2. **Cost:** No additional GSI storage costs
3. **Consistency:** Lookup items can be updated in same transaction as main item
4. **Flexibility:** Can add more lookup patterns without provisioning GSIs

## Future Considerations

If the system grows significantly:

1. **Pagination:** Implement cursor-based pagination for listing
2. **Sharding:** Add region/category prefix to enable efficient filtering
3. **GSI:** Consider a GSI for high-volume listing requirements
4. **Caching:** Add Redis/ElastiCache for frequently accessed locations

## Example Queries

### Create with Uniqueness Check

```typescript
const transactParams = {
  TransactItems: [
    {
      Put: {
        TableName: "aolf-club-locations",
        Item: {
          PK: "LOCATION#01HQ...",
          SK: "METADATA",
          ...locationData
        },
        ConditionExpression: "attribute_not_exists(PK)"
      }
    },
    {
      Put: {
        TableName: "aolf-club-locations",
        Item: {
          PK: "LOCATION_CODE#SF-001",
          SK: "LOOKUP",
          locationId: "01HQ...",
          locationCode: "SF-001"
        },
        ConditionExpression: "attribute_not_exists(PK)"
      }
    }
  ]
};
```

### Lookup by Code

```typescript
// Step 1: Get lookup item
const lookup = await docClient.get({
  TableName: "aolf-club-locations",
  Key: { PK: "LOCATION_CODE#SF-001", SK: "LOOKUP" }
});

// Step 2: Get actual location
const location = await docClient.get({
  TableName: "aolf-club-locations",
  Key: { PK: `LOCATION#${lookup.Item.locationId}`, SK: "METADATA" }
});
```

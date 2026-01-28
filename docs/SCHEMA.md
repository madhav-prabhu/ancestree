# Ancestree Data Schema

This document describes the JSON schema for importing and exporting family tree data in Ancestree.

## Overview

The Ancestree export format is a self-contained JSON file that includes:

- **Version**: Schema version for forward compatibility
- **Export timestamp**: When the data was exported
- **Members**: All family members with their details
- **Relationships**: Connections between family members

## Schema Version

Current version: `1.0.0`

The schema follows [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes to the schema structure
- **Minor**: New optional fields added
- **Patch**: Documentation or validation improvements

## File Structure

```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "members": [...],
  "relationships": [...]
}
```

### Root Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `version` | string | Yes | Schema version in semver format (e.g., "1.0.0") |
| `exportedAt` | string | Yes | ISO 8601 datetime of when the export was created |
| `members` | array | Yes | Array of FamilyMember objects |
| `relationships` | array | Yes | Array of Relationship objects |

## Family Member

Represents a single person in the family tree.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Smith",
  "dateOfBirth": "1950-03-15",
  "placeOfBirth": "New York, USA",
  "dateOfDeath": "2020-12-01",
  "notes": "Served in the military. Loved gardening.",
  "photo": "data:image/png;base64,iVBORw0KGgo...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Member Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID recommended) |
| `name` | string | Yes | Full name of the family member |
| `dateOfBirth` | string | No | Birth date in ISO 8601 format (YYYY-MM-DD) |
| `placeOfBirth` | string | No | Place of birth (city, country, etc.) |
| `dateOfDeath` | string | No | Death date in ISO 8601 format. Omit if alive. |
| `notes` | string | No | Additional notes about the person |
| `photo` | string | No | Profile photo as base64 data URL |
| `createdAt` | string | Yes | ISO 8601 datetime when record was created |
| `updatedAt` | string | Yes | ISO 8601 datetime when record was last updated |

## Relationship

Represents a connection between two family members.

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "parent-child",
  "person1Id": "550e8400-e29b-41d4-a716-446655440000",
  "person2Id": "550e8400-e29b-41d4-a716-446655440001",
  "marriageDate": "1975-06-20",
  "divorceDate": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Relationship Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID recommended) |
| `type` | string | Yes | One of: `parent-child`, `spouse`, `sibling` |
| `person1Id` | string | Yes | ID of the first person in the relationship |
| `person2Id` | string | Yes | ID of the second person in the relationship |
| `marriageDate` | string | No | Marriage date for spouse relationships (YYYY-MM-DD) |
| `divorceDate` | string | No | Divorce date for spouse relationships (YYYY-MM-DD) |
| `createdAt` | string | Yes | ISO 8601 datetime when record was created |
| `updatedAt` | string | Yes | ISO 8601 datetime when record was last updated |

### Relationship Types

| Type | Description | person1Id | person2Id |
|------|-------------|-----------|-----------|
| `parent-child` | Parent-child relationship | Parent | Child |
| `spouse` | Marriage/partnership | Either spouse | Either spouse |
| `sibling` | Sibling relationship | Either sibling | Either sibling |

**Note**: For `parent-child` relationships, the order matters: `person1Id` is always the parent, `person2Id` is always the child. For `spouse` and `sibling` relationships, the order does not matter.

## Date Formats

All dates follow ISO 8601 standards:

- **Date only**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Datetime**: `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-01-15T10:30:00.000Z`)

Date fields (`dateOfBirth`, `dateOfDeath`, `marriageDate`, `divorceDate`) use the date-only format.

Timestamp fields (`exportedAt`, `createdAt`, `updatedAt`) use the full datetime format with timezone (always UTC).

## Validation

### Using the Validation Function

```typescript
import { validateImportData } from './schemas';

const jsonData = JSON.parse(fileContents);
const result = validateImportData(jsonData);

if (result.valid) {
  // result.data is typed as AncestreeExport
  console.log(`Imported ${result.data.members.length} members`);
  console.log(`Imported ${result.data.relationships.length} relationships`);
} else {
  // result.errors contains helpful messages
  console.error('Validation failed:');
  result.errors.forEach(error => console.error(`  - ${error}`));
}
```

### Validation Checks

The validation function performs the following checks:

1. **Structure validation**: Required fields exist and have correct types
2. **Date format validation**: All dates are valid ISO 8601 format
3. **Relationship type validation**: Only valid relationship types are accepted
4. **Referential integrity**: All `person1Id` and `person2Id` values reference existing members
5. **Unique IDs**: No duplicate IDs within members or relationships

### Example Error Messages

```
members[0].id: required and must be a non-empty string
members[2].dateOfBirth: must be a valid ISO 8601 date (YYYY-MM-DD)
relationships[1].type: must be one of: parent-child, spouse, sibling
relationships[3].person1Id: references non-existent member "unknown-id"
```

## Creating Exports

### Using the Helper Function

```typescript
import { createExport } from './schemas';

const exportData = createExport(members, relationships);
const json = JSON.stringify(exportData, null, 2);

// Save to file or send to user
downloadFile('family-tree.json', json);
```

The `createExport` function automatically:
- Sets the current schema version
- Adds the current timestamp as `exportedAt`

## Complete Example

```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "members": [
    {
      "id": "dad-001",
      "name": "Robert Johnson",
      "dateOfBirth": "1945-08-20",
      "placeOfBirth": "Chicago, Illinois",
      "notes": "Retired teacher",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    },
    {
      "id": "mom-001",
      "name": "Mary Johnson",
      "dateOfBirth": "1948-02-14",
      "placeOfBirth": "Boston, Massachusetts",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    },
    {
      "id": "child-001",
      "name": "Emily Johnson",
      "dateOfBirth": "1975-11-30",
      "placeOfBirth": "Chicago, Illinois",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    }
  ],
  "relationships": [
    {
      "id": "rel-001",
      "type": "spouse",
      "person1Id": "dad-001",
      "person2Id": "mom-001",
      "marriageDate": "1970-06-15",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    },
    {
      "id": "rel-002",
      "type": "parent-child",
      "person1Id": "dad-001",
      "person2Id": "child-001",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    },
    {
      "id": "rel-003",
      "type": "parent-child",
      "person1Id": "mom-001",
      "person2Id": "child-001",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    }
  ]
}
```

## JSON Schema

The formal JSON Schema definition is available at:
- File: `src/schemas/ancestree.schema.json`
- Schema ID: `https://ancestree.app/schemas/export/v1`

You can use this schema with any JSON Schema validator or for IDE autocompletion.

## Migration Notes

### From Version 0.x to 1.0.0

If migrating from an earlier version without the `version` field:

1. Add `"version": "1.0.0"` to the root object
2. Add `"exportedAt"` with the current timestamp
3. Ensure all `createdAt` and `updatedAt` fields are present on members and relationships
4. Validate the migrated data using `validateImportData()`

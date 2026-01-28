# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**Not Detected:**
- No external API calls in the codebase
- No HTTP client libraries (no axios, fetch wrappers, or API clients)
- No webhooks or callback endpoints
- Application operates entirely offline with local storage

## Data Storage

**Databases:**
- **IndexedDB** (local browser database)
  - Provider: Native browser API
  - Implementation: `src/services/storage/DexieStorage.ts` using Dexie.js wrapper
  - Database name: `AncestreeDB`
  - Tables: `members` and `relationships`
  - Version: 1.0.0
  - Connection: Automatic (no configuration needed)
  - Client: Dexie 4.0.11
  - Schema defined in `src/services/storage/DexieStorage.ts` lines 27-32:
    ```typescript
    this.version(1).stores({
      members: 'id, name, createdAt',
      relationships: 'id, person1Id, person2Id, type, createdAt',
    })
    ```

**File Storage:**
- Local filesystem only - No external file storage
- Image handling: Client-side processing only
  - Images compressed to ~200KB via Canvas API in `src/utils/imageUtils.ts`
  - Stored as Base64 data URLs in IndexedDB for family members
  - Max input file: 10MB
  - Max output dimension: 400x400px

**Caching:**
- None - Application is fully client-side with no cache layer
- Data persists in IndexedDB across sessions automatically

## Authentication & Identity

**Auth Provider:**
- None required - Application is single-user, no authentication system
- No user accounts or multi-user support
- No session management beyond demo data seeding flag in sessionStorage

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service (Sentry, LogRocket, etc.)
- Application uses browser console for debugging

**Logs:**
- Not detected - No logging service
- Application has `console` available for development use only

## CI/CD & Deployment

**Hosting:**
- Static file hosting only (no backend server required)
- Output: `dist/` directory from `npm run build`
- Development server: Vite at http://localhost:5173 (via `npm run dev`)

**CI Pipeline:**
- Not configured - Repository has no CI/CD workflows detected (.github/workflows not present)

## Environment Configuration

**Required env vars:**
- None - Application runs with zero configuration

**Secrets location:**
- Not applicable - No external services requiring credentials
- See `.gitignore` for excluded patterns: `.env`, `.env.local`, `.env.*.local`

## Data Exchange Formats

**Import/Export:**
- JSON format via utility functions
- Export function: `src/utils/exportUtils.ts`
  - Exports to file: `ancestree-export-YYYY-MM-DD.json`
  - Format: Object with `version`, `exportedAt`, `members[]`, `relationships[]`
  - Triggered via `exportToJson()` function - manual download from UI
- Import function: `src/utils/importUtils.ts`
  - Accepts JSON files matching export format
  - Validates schema against JSON schema in `src/schemas/ancestree.schema.json`
  - Can merge with existing data or replace (via `clearExisting` flag)

**Storage Abstraction:**
- Abstract interface: `src/services/storage/StorageInterface.ts`
- Purpose: Enables future cloud migration without changing app code
- Current implementation: DexieStorage (IndexedDB)
- Interface supports these operations:
  - Member CRUD: `getMember()`, `getAllMembers()`, `saveMember()`, `updateMember()`, `deleteMember()`
  - Relationship CRUD: `getRelationship()`, `getAllRelationships()`, `saveRelationship()`, `deleteRelationship()`
  - Bulk: `exportTree()`, `importTree()`, `clearAll()`
  - Utility: `isReady()`, `onChange()`

## Browser APIs Used

**LocalStorage:**
- `sessionStorage` for demo data seeding flag in `src/App.tsx`:
  - Key: `'ancestree-seeded'`
  - Value: `'true'` (boolean flag)
  - Purpose: Prevents duplicate demo data load on hot reload during development

**Canvas API:**
- Image resizing and compression in `src/utils/imageUtils.ts`
- Canvas methods: `getContext('2d')`, `drawImage()`, `toDataURL()`

**File API:**
- File upload handling in components (AddMemberModal, EditMemberModal)
- Blob creation for export downloads in `src/utils/exportUtils.ts`
- Object URL creation/revocation for download triggering

**WebGL:**
- Three.js rendering context (implicit - required for 3D visualization)

## Third-Party Services Not Required

- No authentication service (Firebase, Auth0, Supabase)
- No cloud database (Firestore, PostgreSQL, MongoDB Atlas)
- No email service
- No SMS service
- No payment processing
- No analytics
- No CDN (static hosting only)

---

*Integration audit: 2026-01-26*

/**
 * Storage module exports.
 *
 * The default storage implementation uses Dexie.js (IndexedDB).
 * To switch to a different backend (e.g., cloud), swap the export here.
 */

export type { StorageInterface, FamilyTreeExport } from './StorageInterface'
export { DexieStorage, ancestreeDB } from './DexieStorage'

// Default storage implementation
import { DexieStorage } from './DexieStorage'
export const storage = DexieStorage

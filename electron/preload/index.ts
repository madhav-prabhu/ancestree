// Placeholder - full implementation in Task 3
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
})

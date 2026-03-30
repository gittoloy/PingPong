import { ipcMain } from 'electron'
import { registerHttpHandlers } from './http'
import { registerDatabaseHandlers } from './database'
import { registerFileHandlers } from './file'

export function registerIpcHandlers(): void {
  registerHttpHandlers()
  registerDatabaseHandlers()
  registerFileHandlers()
  
  console.log('IPC handlers registered')
}

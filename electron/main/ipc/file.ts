import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

export interface TestCase {
  method: string
  url: string
  headers?: string
  body?: string
  expected_status?: number
}

export function registerFileHandlers(): void {
  // Select files for upload
  ipcMain.handle('file:selectFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'] },
        { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'XML', extensions: ['xml'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    return result.filePaths.map((filePath: string) => ({
      filePath,
      fileName: path.basename(filePath),
      fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
    }))
  })

  // Import test file (Excel or CSV)
  ipcMain.handle('file:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Test Files', extensions: ['xlsx', 'xls', 'csv'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<TestCase>(sheet)

    return data.map(row => ({
      method: String(row.method || 'GET').toUpperCase(),
      url: String(row.url || ''),
      headers: row.headers ? String(row.headers) : undefined,
      body: row.body ? String(row.body) : undefined,
      expected_status: row.expected_status ? Number(row.expected_status) : undefined
    }))
  })

  // Export test results
  ipcMain.handle('file:export', async (_event, results: any[]) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `test-results-${Date.now()}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    const worksheet = XLSX.utils.json_to_sheet(results)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Results')
    XLSX.writeFile(workbook, result.filePath)

    return true
  })
}

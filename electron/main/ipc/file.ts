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

function getFilterName(ext: string): string {
  const filterMap: Record<string, string> = {
    pdf: 'PDF Files',
    doc: 'Word Documents',
    docx: 'Word Documents',
    xls: 'Excel Spreadsheets',
    xlsx: 'Excel Spreadsheets',
    ppt: 'PowerPoint Presentations',
    pptx: 'PowerPoint Presentations',
    zip: 'ZIP Archives',
    rar: 'RAR Archives',
    '7z': '7z Archives',
    png: 'PNG Images',
    jpg: 'JPEG Images',
    jpeg: 'JPEG Images',
    gif: 'GIF Images',
    svg: 'SVG Images',
    json: 'JSON Files',
    xml: 'XML Files',
    csv: 'CSV Files',
    txt: 'Text Files'
  }
  return filterMap[ext] || 'Files'
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

  // Save As dialog for file downloads
  ipcMain.handle('file:saveAs', async (_event, sourceFilePath: string, defaultFileName: string) => {
    if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
      return { success: false, message: 'Source file not found' }
    }

    // Determine file extension for filter
    const ext = path.extname(defaultFileName).replace('.', '').toLowerCase()
    const filterName = getFilterName(ext)
    const filters: { name: string; extensions: string[] }[] = []
    if (ext) {
      filters.push({ name: filterName, extensions: [ext] })
    }
    filters.push({ name: 'All Files', extensions: ['*'] })

    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'Cancelled' }
    }

    try {
      fs.copyFileSync(sourceFilePath, result.filePath)
      return { success: true, filePath: result.filePath }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to save file' }
    }
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

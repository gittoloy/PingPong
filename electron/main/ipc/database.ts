import { ipcMain } from 'electron'
import { runQuery, execute, saveDatabase } from '../database'

export interface RequestRecord {
  id?: number
  name?: string
  method: string
  url: string
  headers?: string
  query_params?: string
  body?: string
  body_type?: string
  response_status?: number
  response_time?: number
  response_headers?: string
  response_body?: string
  created_at?: string
}

export interface Environment {
  id?: number
  name: string
  is_active?: number
  created_at?: string
}

export interface Variable {
  id?: number
  environment_id: number
  key: string
  value: string
}

export function registerDatabaseHandlers(): void {
  // Request history handlers
  ipcMain.handle('db:request:list', async (_event, limit = 100, offset = 0) => {
    return runQuery(
      'SELECT * FROM requests ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
  })

  ipcMain.handle('db:request:search', async (_event, keyword: string) => {
    const searchTerm = `%${keyword}%`
    return runQuery(
      'SELECT * FROM requests WHERE url LIKE ? OR name LIKE ? ORDER BY created_at DESC LIMIT 100',
      [searchTerm, searchTerm]
    )
  })

  ipcMain.handle('db:request:save', async (_event, request: RequestRecord) => {
    return execute(
      `INSERT INTO requests (name, method, url, headers, query_params, body, body_type, 
        response_status, response_time, response_headers, response_body)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.name || null,
        request.method,
        request.url,
        request.headers || null,
        request.query_params || null,
        request.body || null,
        request.body_type || null,
        request.response_status || null,
        request.response_time || null,
        request.response_headers || null,
        request.response_body || null
      ]
    )
  })

  ipcMain.handle('db:request:delete', async (_event, id: number) => {
    execute('DELETE FROM requests WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('db:request:clear', async () => {
    execute('DELETE FROM requests')
    return true
  })

  // Environment handlers
  ipcMain.handle('env:list', async () => {
    return runQuery('SELECT * FROM environments ORDER BY sort_order, created_at')
  })

  ipcMain.handle('env:reorder', async (_event, orders: { id: number; sort_order: number }[]) => {
    for (const item of orders) {
      execute('UPDATE environments SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
    }
    return true
  })

  ipcMain.handle('env:create', async (_event, name: string, host: string | null = null) => {
    return execute('INSERT INTO environments (name, host) VALUES (?, ?)', [name, host])
  })

  ipcMain.handle('env:update', async (_event, id: number, name: string, host: string | null = null) => {
    execute('UPDATE environments SET name = ?, host = ? WHERE id = ?', [name, host, id])
    return true
  })

  ipcMain.handle('env:delete', async (_event, id: number) => {
    const count = runQuery('SELECT COUNT(*) as count FROM environments')
    if (count[0]?.count <= 1) {
      throw new Error('Cannot delete the last environment')
    }
    
    const env = runQuery('SELECT is_active FROM environments WHERE id = ?', [id])
    if (env[0]?.is_active) {
      throw new Error('Cannot delete active environment')
    }
    
    execute('DELETE FROM environments WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('env:setActive', async (_event, id: number) => {
    execute('UPDATE environments SET is_active = 0')
    execute('UPDATE environments SET is_active = 1 WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('env:getActive', async () => {
    const results = runQuery('SELECT * FROM environments WHERE is_active = 1')
    return results[0] || null
  })

  // Variable handlers
  ipcMain.handle('var:list', async (_event, environmentId: number) => {
    return runQuery('SELECT * FROM variables WHERE environment_id = ?', [environmentId])
  })

  ipcMain.handle('var:save', async (_event, variable: Variable) => {
    if (variable.id) {
      execute('UPDATE variables SET key = ?, value = ? WHERE id = ?', [variable.key, variable.value, variable.id])
      return variable.id
    } else {
      return execute(
        'INSERT INTO variables (environment_id, key, value) VALUES (?, ?, ?)',
        [variable.environment_id, variable.key, variable.value]
      )
    }
  })

  ipcMain.handle('var:delete', async (_event, id: number) => {
    execute('DELETE FROM variables WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('var:getAll', async () => {
    return runQuery(`
      SELECT v.* FROM variables v
      JOIN environments e ON v.environment_id = e.id
      WHERE e.is_active = 1
    `)
  })

  // API Group handlers
  ipcMain.handle('apiGroup:list', async () => {
    return runQuery('SELECT * FROM api_groups ORDER BY sort_order, created_at')
  })

  ipcMain.handle('apiGroup:create', async (_event, name: string, parentId: number | null = null) => {
    const maxOrder = runQuery('SELECT MAX(sort_order) as max_order FROM api_groups WHERE parent_id IS ?', [parentId])
    const sortOrder = (maxOrder[0]?.max_order || 0) + 1
    return execute(
      'INSERT INTO api_groups (name, parent_id, sort_order) VALUES (?, ?, ?)',
      [name, parentId, sortOrder]
    )
  })

  ipcMain.handle('apiGroup:update', async (_event, id: number, name: string) => {
    execute('UPDATE api_groups SET name = ? WHERE id = ?', [name, id])
    return true
  })

  ipcMain.handle('apiGroup:delete', async (_event, id: number) => {
    execute('DELETE FROM api_groups WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('apiGroup:getChildren', async (_event, parentId: number | null) => {
    if (parentId === null) {
      return runQuery('SELECT * FROM api_groups WHERE parent_id IS NULL ORDER BY sort_order, created_at')
    }
    return runQuery('SELECT * FROM api_groups WHERE parent_id = ? ORDER BY sort_order, created_at', [parentId])
  })

  // API handlers
  ipcMain.handle('api:list', async () => {
    return runQuery('SELECT * FROM apis ORDER BY sort_order, created_at')
  })

  ipcMain.handle('api:listByGroup', async (_event, groupId: number | null) => {
    if (groupId === null) {
      return runQuery('SELECT * FROM apis WHERE group_id IS NULL ORDER BY sort_order, created_at')
    }
    return runQuery('SELECT * FROM apis WHERE group_id = ? ORDER BY sort_order, created_at', [groupId])
  })

  ipcMain.handle('api:get', async (_event, id: number) => {
    const results = runQuery('SELECT * FROM apis WHERE id = ?', [id])
    return results[0] || null
  })

  ipcMain.handle('api:create', async (_event, api: ApiItem) => {
    const maxOrder = runQuery('SELECT MAX(sort_order) as max_order FROM apis WHERE group_id IS ?', [api.group_id])
    const sortOrder = (maxOrder[0]?.max_order || 0) + 1
    return execute(
      `INSERT INTO apis (group_id, name, method, url, headers, query_params, body, body_type, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        api.group_id,
        api.name,
        api.method || 'GET',
        api.url,
        api.headers || null,
        api.query_params || null,
        api.body || null,
        api.body_type || 'none',
        api.description || null,
        sortOrder
      ]
    )
  })

  ipcMain.handle('api:update', async (_event, api: ApiItem) => {
    execute(
      `UPDATE apis SET group_id = ?, name = ?, method = ?, url = ?, headers = ?, query_params = ?, body = ?, body_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        api.group_id,
        api.name,
        api.method,
        api.url,
        api.headers || null,
        api.query_params || null,
        api.body || null,
        api.body_type || 'none',
        api.description || null,
        api.id
      ]
    )
    return true
  })

  ipcMain.handle('api:delete', async (_event, id: number) => {
    execute('DELETE FROM apis WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('apiGroup:reorder', async (_event, orders: { id: number; sort_order: number; parent_id: number | null }[]) => {
    for (const item of orders) {
      execute('UPDATE api_groups SET sort_order = ?, parent_id = ? WHERE id = ?', [item.sort_order, item.parent_id, item.id])
    }
    return true
  })

  ipcMain.handle('api:reorder', async (_event, orders: { id: number; sort_order: number; group_id: number | null }[]) => {
    for (const item of orders) {
      execute('UPDATE apis SET sort_order = ?, group_id = ? WHERE id = ?', [item.sort_order, item.group_id, item.id])
    }
    return true
  })
}

export interface ApiItem {
  id?: number
  group_id?: number | null
  name: string
  method: string
  url: string
  headers?: string
  query_params?: string
  body?: string
  body_type?: string
  description?: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

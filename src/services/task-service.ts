import { AgentOfficeStorage, TaskRow } from '../db/index.js'

export type ColumnName = 'idea' | 'approved idea' | 'working on' | 'blocked' | 'ready for review' | 'done'

export interface TaskInfo {
  id: number
  title: string
  description: string
  assignee: string | null
  column: string
  dependencies: number[]
  created_at: Date
  updated_at: Date
}

export interface TransitionInfo {
  id: number
  task_id: number
  from_column: string | null
  to_column: string
  timestamp: Date
}

export interface ColumnStats {
  column: string
  count: number
}

export class TaskService {
  constructor(private storage: AgentOfficeStorage) {}

  async createTask(
    title: string,
    description: string,
    assignee: string | null,
    column: string,
    dependencies: number[]
  ): Promise<TaskRow> {
    // Validate column name
    const validColumns: string[] = ['idea', 'approved idea', 'working on', 'blocked', 'ready for review', 'done']
    if (!validColumns.includes(column)) {
      throw new Error(`Invalid column "${column}". Valid columns: ${validColumns.join(', ')}`)
    }

    return this.storage.createTask(title, description, assignee, column, dependencies)
  }

  async listTasks(): Promise<TaskRow[]> {
    return this.storage.listTasks()
  }

  async getTaskById(id: number): Promise<TaskRow | null> {
    return this.storage.getTaskById(id)
  }

  async updateTask(
    id: number,
    updates: Partial<Pick<TaskRow, 'title' | 'description' | 'assignee' | 'column' | 'dependencies'>>
  ): Promise<TaskRow> {
    const task = await this.storage.getTaskById(id)
    if (!task) {
      throw new Error(`Task ${id} not found`)
    }

    // Validate column if provided
    if (updates.column) {
      const validColumns: string[] = ['idea', 'approved idea', 'working on', 'blocked', 'ready for review', 'done']
      if (!validColumns.includes(updates.column)) {
        throw new Error(`Invalid column "${updates.column}". Valid columns: ${validColumns.join(', ')}`)
      }
    }

    const updated = await this.storage.updateTask(id, updates)
    if (!updated) {
      throw new Error(`Failed to update task ${id}`)
    }
    return updated
  }

  async deleteTask(id: number): Promise<void> {
    const task = await this.storage.getTaskById(id)
    if (!task) {
      throw new Error(`Task ${id} not found`)
    }
    await this.storage.deleteTask(id)
  }

  async searchTasks(query: string, filters?: { assignee?: string; column?: string }): Promise<TaskRow[]> {
    return this.storage.searchTasks(query, filters)
  }

  async assignTask(id: number, assignee: string): Promise<TaskRow> {
    return this.updateTask(id, { assignee })
  }

  async unassignTask(id: number): Promise<TaskRow> {
    return this.updateTask(id, { assignee: null })
  }

  async moveTask(id: number, newColumn: string): Promise<TaskRow> {
    const validColumns: string[] = ['idea', 'approved idea', 'working on', 'blocked', 'ready for review', 'done']
    if (!validColumns.includes(newColumn)) {
      throw new Error(`Invalid column "${newColumn}". Valid columns: ${validColumns.join(', ')}`)
    }

    const task = await this.storage.getTaskById(id)
    if (!task) {
      throw new Error(`Task ${id} not found`)
    }

    if (task.column === newColumn) {
      throw new Error(`Task ${id} is already in column "${newColumn}"`)
    }

    return this.updateTask(id, { column: newColumn })
  }

  async getColumnStats(): Promise<ColumnStats[]> {
    const tasks = await this.storage.listTasks()
    const validColumns = ['idea', 'approved idea', 'working on', 'blocked', 'ready for review', 'done']
    const stats: Map<string, number> = new Map()

    // Initialize all columns with 0
    for (const col of validColumns) {
      stats.set(col, 0)
    }

    // Count tasks in each column
    for (const task of tasks) {
      const current = stats.get(task.column) ?? 0
      stats.set(task.column, current + 1)
    }

    return validColumns.map(col => ({ column: col, count: stats.get(col) ?? 0 }))
  }

  async getTasksByAssignee(assignee: string, column?: string): Promise<TaskRow[]> {
    return this.storage.searchTasks('', { assignee, column })
  }
}

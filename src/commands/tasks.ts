import { AgentOfficeStorage } from '../db/index.js'
import { TaskService } from '../services/index.js'

export async function addTask(
  storage: AgentOfficeStorage,
  title: string,
  description: string,
  assignee: string | null,
  column: string,
  dependencies: number[]
): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.createTask(title, description, assignee, column, dependencies)
}

export async function listTasks(
  storage: AgentOfficeStorage,
  assignee: string | undefined,
  column: string | undefined,
  search: string | undefined
): Promise<unknown> {
  const service = new TaskService(storage)

  // If any filters are provided, use searchTasks with filters
  if (assignee || column || (search && search.length > 0)) {
    const filters: any = {}
    if (assignee) filters.assignee = assignee
    if (column) filters.column = column

    return await service.searchTasks(search || '', filters)
  } else {
    // No filters, list all tasks
    return await service.listTasks()
  }
}

export async function getTask(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new TaskService(storage)
  const task = await service.getTaskById(id)
  if (!task) {
    throw new Error(`Task ${id} not found`)
  }
  return task
}

export async function updateTask(
  storage: AgentOfficeStorage,
  id: number,
  title: string | undefined,
  description: string | undefined,
  assignee: string | undefined,
  column: string | undefined,
  dependencies: number[] | undefined
): Promise<unknown> {
  const service = new TaskService(storage)
  const updates: any = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (assignee !== undefined) updates.assignee = assignee
  if (column !== undefined) updates.column = column
  if (dependencies !== undefined) updates.dependencies = dependencies

  return await service.updateTask(id, updates)
}

export async function deleteTask(storage: AgentOfficeStorage, id: number): Promise<void> {
  const service = new TaskService(storage)
  await service.deleteTask(id)
}

export async function assignTask(storage: AgentOfficeStorage, id: number, assignee: string): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.assignTask(id, assignee)
}

export async function unassignTask(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.unassignTask(id)
}

export async function moveTask(storage: AgentOfficeStorage, id: number, column: string): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.moveTask(id, column)
}

export async function taskStats(storage: AgentOfficeStorage): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.getColumnStats()
}

export async function getTaskHistory(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new TaskService(storage)
  return await service.getTaskHistory(id)
}

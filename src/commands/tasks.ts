import { AgentOfficeStorage } from '../db/index.js'
import { TaskService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function addTask(
  storage: AgentOfficeStorage,
  title: string,
  description: string,
  assignee: string | null,
  column: string,
  dependencies: number[],
  useJson: boolean
): Promise<void> {
  const service = new TaskService(storage)
  const task = await service.createTask(title, description, assignee, column, dependencies)
  console.log(formatOutput(task, useJson))
}

export async function listTasks(
  storage: AgentOfficeStorage,
  assignee: string | undefined,
  column: string | undefined,
  search: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new TaskService(storage)

  // If any filters are provided, use searchTasks with filters
  if (assignee || column || (search && search.length > 0)) {
    const filters: any = {}
    if (assignee) filters.assignee = assignee
    if (column) filters.column = column

    const tasks = await service.searchTasks(search || '', filters)
    console.log(formatOutput(tasks, useJson))
  } else {
    // No filters, list all tasks
    const tasks = await service.listTasks()
    console.log(formatOutput(tasks, useJson))
  }
}

export async function getTask(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new TaskService(storage)
  const task = await service.getTaskById(id)
  if (!task) {
    throw new Error(`Task ${id} not found`)
  }
  console.log(formatOutput(task, useJson))
}

export async function updateTask(
  storage: AgentOfficeStorage,
  id: number,
  title: string | undefined,
  description: string | undefined,
  assignee: string | undefined,
  column: string | undefined,
  dependencies: number[] | undefined,
  useJson: boolean
): Promise<void> {
  const service = new TaskService(storage)
  const updates: any = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (assignee !== undefined) updates.assignee = assignee
  if (column !== undefined) updates.column = column
  if (dependencies !== undefined) updates.dependencies = dependencies

  const task = await service.updateTask(id, updates)
  console.log(formatOutput(task, useJson))
}

export async function deleteTask(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new TaskService(storage)
  await service.deleteTask(id)
  console.log(formatOutput({ success: true, deleted: id }, useJson))
}

export async function assignTask(
  storage: AgentOfficeStorage,
  id: number,
  assignee: string,
  useJson: boolean
): Promise<void> {
  const service = new TaskService(storage)
  const task = await service.assignTask(id, assignee)
  console.log(formatOutput(task, useJson))
}

export async function unassignTask(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new TaskService(storage)
  const task = await service.unassignTask(id)
  console.log(formatOutput(task, useJson))
}

export async function moveTask(
  storage: AgentOfficeStorage,
  id: number,
  column: string,
  useJson: boolean
): Promise<void> {
  const service = new TaskService(storage)
  const task = await service.moveTask(id, column)
  console.log(formatOutput(task, useJson))
}

export async function taskStats(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new TaskService(storage)
  const stats = await service.getColumnStats()
  console.log(formatOutput(stats, useJson))
}

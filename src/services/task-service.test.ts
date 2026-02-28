import { describe, it, expect, beforeEach } from 'vitest'
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js'
import { TaskService } from './task-service.js'

describe('TaskService', () => {
  let storage: MockAgentOfficeStorage
  let service: TaskService

  beforeEach(() => {
    storage = createMockStorage()
    service = new TaskService(storage)
  })

  describe('createTask', () => {
    it('should create a new task', async () => {
      const task = await service.createTask('Test Task', 'Description', null, 'idea', [])

      expect(task.title).toBe('Test Task')
      expect(task.description).toBe('Description')
      expect(task.assignee).toBeNull()
      expect(task.column).toBe('idea')
      expect(task.dependencies).toEqual([])
    })

    it('should throw error for invalid column', async () => {
      await expect(service.createTask('Test', 'Desc', null, 'invalid-column', [])).rejects.toThrow(
        'Invalid column "invalid-column"'
      )
    })

    it('should create task with dependencies', async () => {
      const depTask = await service.createTask('Dependency', 'Desc', null, 'idea', [])
      const task = await service.createTask('Main Task', 'Desc', null, 'idea', [depTask.id])

      expect(task.dependencies).toContain(depTask.id)
    })
  })

  describe('listTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await service.listTasks()
      expect(tasks).toEqual([])
    })

    it('should return all tasks', async () => {
      await service.createTask('Task 1', 'Desc 1', null, 'idea', [])
      await service.createTask('Task 2', 'Desc 2', null, 'working on', [])

      const tasks = await service.listTasks()
      expect(tasks).toHaveLength(2)
    })
  })

  describe('getTaskById', () => {
    it('should return task by id', async () => {
      const created = await service.createTask('Test', 'Desc', null, 'idea', [])
      const retrieved = await service.getTaskById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.title).toBe('Test')
    })

    it('should return null for non-existent task', async () => {
      const task = await service.getTaskById(999)
      expect(task).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update task title', async () => {
      const task = await service.createTask('Original', 'Desc', null, 'idea', [])
      const updated = await service.updateTask(task.id, { title: 'Updated' })

      expect(updated.title).toBe('Updated')
    })

    it('should update task column', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])
      const updated = await service.updateTask(task.id, { column: 'working on' })

      expect(updated.column).toBe('working on')
    })

    it('should throw error for invalid column', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])

      await expect(service.updateTask(task.id, { column: 'invalid' })).rejects.toThrow('Invalid column "invalid"')
    })

    it('should throw error for non-existent task', async () => {
      await expect(service.updateTask(999, { title: 'Test' })).rejects.toThrow('Task 999 not found')
    })
  })

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])
      await service.deleteTask(task.id)

      const deleted = await service.getTaskById(task.id)
      expect(deleted).toBeNull()
    })

    it('should throw error for non-existent task', async () => {
      await expect(service.deleteTask(999)).rejects.toThrow('Task 999 not found')
    })
  })

  describe('searchTasks', () => {
    it('should search by query in title', async () => {
      await service.createTask('Feature A', 'Desc', null, 'idea', [])
      await service.createTask('Feature B', 'Desc', null, 'idea', [])
      await service.createTask('Bug Fix', 'Desc', null, 'idea', [])

      const results = await service.searchTasks('Feature')
      expect(results).toHaveLength(2)
    })

    it('should search by query in description', async () => {
      await service.createTask('Task 1', 'Critical fix needed', null, 'idea', [])
      await service.createTask('Task 2', 'Minor improvement', null, 'idea', [])

      const results = await service.searchTasks('Critical')
      expect(results).toHaveLength(1)
    })

    it('should filter by assignee', async () => {
      await service.createTask('Task 1', 'Desc', 'Alice', 'idea', [])
      await service.createTask('Task 2', 'Desc', 'Bob', 'idea', [])

      const results = await service.searchTasks('', { assignee: 'Alice' })
      expect(results).toHaveLength(1)
      expect(results[0].assignee).toBe('Alice')
    })

    it('should filter by column', async () => {
      await service.createTask('Task 1', 'Desc', null, 'idea', [])
      await service.createTask('Task 2', 'Desc', null, 'working on', [])

      const results = await service.searchTasks('', { column: 'idea' })
      expect(results).toHaveLength(1)
      expect(results[0].column).toBe('idea')
    })
  })

  describe('assignTask', () => {
    it('should assign task to user', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])
      const assigned = await service.assignTask(task.id, 'Alice')

      expect(assigned.assignee).toBe('Alice')
    })
  })

  describe('unassignTask', () => {
    it('should remove assignee from task', async () => {
      const task = await service.createTask('Test', 'Desc', 'Alice', 'idea', [])
      const unassigned = await service.unassignTask(task.id)

      expect(unassigned.assignee).toBeNull()
    })
  })

  describe('moveTask', () => {
    it('should move task to different column', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])
      const moved = await service.moveTask(task.id, 'working on')

      expect(moved.column).toBe('working on')
    })

    it('should throw error when task already in column', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])

      await expect(service.moveTask(task.id, 'idea')).rejects.toThrow(`Task ${task.id} is already in column "idea"`)
    })

    it('should throw error for invalid column', async () => {
      const task = await service.createTask('Test', 'Desc', null, 'idea', [])

      await expect(service.moveTask(task.id, 'invalid')).rejects.toThrow('Invalid column "invalid"')
    })

    it('should throw error for non-existent task', async () => {
      await expect(service.moveTask(999, 'working on')).rejects.toThrow('Task 999 not found')
    })
  })

  describe('getColumnStats', () => {
    it('should return stats for all columns', async () => {
      await service.createTask('Task 1', 'Desc', null, 'idea', [])
      await service.createTask('Task 2', 'Desc', null, 'idea', [])
      await service.createTask('Task 3', 'Desc', null, 'working on', [])

      const stats = await service.getColumnStats()

      expect(stats).toHaveLength(6) // All valid columns
      const ideaStat = stats.find(s => s.column === 'idea')
      const workingStat = stats.find(s => s.column === 'working on')

      expect(ideaStat?.count).toBe(2)
      expect(workingStat?.count).toBe(1)
    })

    it('should return 0 for empty columns', async () => {
      const stats = await service.getColumnStats()

      for (const stat of stats) {
        expect(stat.count).toBe(0)
      }
    })
  })

  describe('getTasksByAssignee', () => {
    it('should return tasks for assignee', async () => {
      await service.createTask('Task 1', 'Desc', 'Alice', 'idea', [])
      await service.createTask('Task 2', 'Desc', 'Alice', 'working on', [])
      await service.createTask('Task 3', 'Desc', 'Bob', 'idea', [])

      const tasks = await service.getTasksByAssignee('Alice')
      expect(tasks).toHaveLength(2)
    })

    it('should filter by column when specified', async () => {
      await service.createTask('Task 1', 'Desc', 'Alice', 'idea', [])
      await service.createTask('Task 2', 'Desc', 'Alice', 'working on', [])

      const tasks = await service.getTasksByAssignee('Alice', 'idea')
      expect(tasks).toHaveLength(1)
      expect(tasks[0].column).toBe('idea')
    })
  })
})

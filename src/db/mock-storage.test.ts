import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage, MockAgentOfficeStorage } from '../db/mock-storage.js'

describe('MockAgentOfficeStorage', () => {
  let storage: MockAgentOfficeStorage

  beforeEach(() => {
    storage = createMockStorage()
  })

  describe('close', () => {
    it('should mark storage as closed', async () => {
      expect(storage.isClosed()).toBe(false)
      await storage.close()
      expect(storage.isClosed()).toBe(true)
    })
  })

  describe('begin', () => {
    it('should execute callback', async () => {
      const result = await storage.begin(async tx => {
        return await tx.listSessions()
      })
      expect(result).toEqual([])
    })
  })

  describe('Sessions', () => {
    it('should create and retrieve sessions', async () => {
      const session = await storage.createSession('test', 'agent1')

      expect(session.name).toBe('test')
      expect(session.coworkerType).toBe('agent1')
      expect(session.id).toBeGreaterThan(0)

      const retrieved = await storage.getSessionByName('test')
      expect(retrieved?.id).toBe(session.id)
    })

    it('should list sessions sorted by created_at desc', async () => {
      await storage.createSession('first', 'agent1')
      await new Promise(resolve => setTimeout(resolve, 10))
      await storage.createSession('second', 'agent2')

      const sessions = await storage.listSessions()
      expect(sessions[0].name).toBe('second')
      expect(sessions[1].name).toBe('first')
    })

    it('should update session status', async () => {
      await storage.createSession('test', 'agent1')
      await storage.updateSession('test', { status: 'busy' })

      const updated = await storage.getSessionByName('test')
      expect(updated?.status).toBe('busy')
    })

    it('should check session existence', async () => {
      await storage.createSession('exists', 'agent1')

      expect(await storage.sessionExists('exists')).toBe(true)
      expect(await storage.sessionExists('notexists')).toBe(false)
    })
  })

  describe('Config', () => {
    it('should store and retrieve config', async () => {
      await storage.setConfig('key1', 'value1')

      const value = await storage.getConfig('key1')
      expect(value).toBe('value1')
    })

    it('should update existing config', async () => {
      await storage.setConfig('key1', 'value1')
      await storage.setConfig('key1', 'value2')

      const value = await storage.getConfig('key1')
      expect(value).toBe('value2')
    })

    it('should return null for non-existent config', async () => {
      const value = await storage.getConfig('nonexistent')
      expect(value).toBeNull()
    })

    it('should list all config', async () => {
      await storage.setConfig('key1', 'value1')
      await storage.setConfig('key2', 'value2')

      const allConfig = await storage.getAllConfig()
      expect(allConfig).toHaveLength(2)
    })
  })

  describe('Messages', () => {
    it('should create and retrieve messages', async () => {
      const message = await storage.createMessage('alice', 'bob', 'Hello!')

      expect(message.from_name).toBe('alice')
      expect(message.to_name).toBe('bob')
      expect(message.body).toBe('Hello!')
      expect(message.read).toBe(false)
    })

    it('should list messages for recipient', async () => {
      await storage.createMessage('alice', 'bob', 'Message 1')
      await storage.createMessage('charlie', 'bob', 'Message 2')
      await storage.createMessage('alice', 'charlie', 'Message 3')

      const bobMessages = await storage.listMessagesForRecipient('bob')
      expect(bobMessages).toHaveLength(2)
    })

    it('should mark messages as read', async () => {
      const message = await storage.createMessage('alice', 'bob', 'Hello!')

      await storage.markMessageAsRead(message.id)

      const messages = await storage.listMessagesForRecipient('bob', { unread: true })
      expect(messages).toHaveLength(0)
    })

    it('should count unread by sender', async () => {
      await storage.createMessage('alice', 'bob', 'Message 1')
      await storage.createMessage('alice', 'bob', 'Message 2')
      await storage.createMessage('charlie', 'bob', 'Message 3')

      const counts = await storage.countUnreadBySender('bob')
      expect(counts.get('alice')).toBe(2)
      expect(counts.get('charlie')).toBe(1)
    })
  })

  describe('Cron Jobs', () => {
    beforeEach(async () => {
      // Create a session first (required for cron jobs due to FK constraint simulation)
      await storage.createSession('test', 'agent1')
    })

    it('should create and retrieve cron jobs', async () => {
      const job = await storage.createCronJob('job1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      expect(job.name).toBe('job1')
      expect(job.enabled).toBe(true)

      const retrieved = await storage.getCronJobById(job.id)
      expect(retrieved?.name).toBe('job1')
    })

    it('should enable and disable cron jobs', async () => {
      const job = await storage.createCronJob('job1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      await storage.disableCronJob(job.id)
      let retrieved = await storage.getCronJobById(job.id)
      expect(retrieved?.enabled).toBe(false)

      await storage.enableCronJob(job.id)
      retrieved = await storage.getCronJobById(job.id)
      expect(retrieved?.enabled).toBe(true)
    })

    it('should delete cron jobs', async () => {
      const job = await storage.createCronJob('job1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      await storage.deleteCronJob(job.id)

      const retrieved = await storage.getCronJobById(job.id)
      expect(retrieved).toBeNull()
    })

    it('should check cron job existence', async () => {
      await storage.createCronJob('job1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      expect(await storage.cronJobExistsForSession('job1', 'test')).toBe(true)
      expect(await storage.cronJobExistsForSession('job2', 'test')).toBe(false)
    })
  })

  describe('Cron History', () => {
    beforeEach(async () => {
      await storage.createSession('test', 'agent1')
    })

    it('should create and list cron history', async () => {
      const job = await storage.createCronJob('job1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      await storage.createCronHistory(job.id, new Date(), true)
      await storage.createCronHistory(job.id, new Date(), false, 'Error occurred')

      const history = await storage.listCronHistory(job.id, 10)
      expect(history).toHaveLength(2)
      expect(history[0].success).toBe(true)
      expect(history[1].success).toBe(false)
      expect(history[1].error_message).toBe('Error occurred')
    })
  })

  describe('Cron Requests', () => {
    beforeEach(async () => {
      await storage.createSession('test', 'agent1')
    })

    it('should create cron requests with pending status', async () => {
      const request = await storage.createCronRequest('req1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      expect(request.status).toBe('pending')
      expect(request.name).toBe('req1')
    })

    it('should update request status', async () => {
      const request = await storage.createCronRequest('req1', 'test', '0 0 * * *', 'UTC', 'Hello!')

      await storage.updateCronRequestStatus(request.id, 'approved', 'reviewer1', 'Looks good')

      const updated = await storage.getCronRequestById(request.id)
      expect(updated?.status).toBe('approved')
      expect(updated?.reviewed_by).toBe('reviewer1')
      expect(updated?.reviewer_notes).toBe('Looks good')
    })

    it('should filter requests by status', async () => {
      const req1 = await storage.createCronRequest('req1', 'test', '0 0 * * *', 'UTC', 'Hello!')
      await storage.updateCronRequestStatus(req1.id, 'approved', 'reviewer1')
      await storage.createCronRequest('req2', 'test', '0 12 * * *', 'UTC', 'World!')

      const pending = await storage.listCronRequests({ status: 'pending' })
      expect(pending).toHaveLength(1)
      expect(pending[0].name).toBe('req2')
    })
  })

  describe('Tasks', () => {
    it('should create and retrieve tasks', async () => {
      const task = await storage.createTask('Task 1', 'Description', 'alice', 'todo', [1, 2])

      expect(task.title).toBe('Task 1')
      expect(task.column).toBe('todo')
      expect(task.dependencies).toEqual([1, 2])

      const retrieved = await storage.getTaskById(task.id)
      expect(retrieved?.title).toBe('Task 1')
    })

    it('should update tasks', async () => {
      const task = await storage.createTask('Task 1', 'Description', 'alice', 'todo', [])

      await storage.updateTask(task.id, { title: 'Updated Title', column: 'done' })

      const updated = await storage.getTaskById(task.id)
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.column).toBe('done')
    })

    it('should delete tasks', async () => {
      const task = await storage.createTask('Task 1', 'Description', 'alice', 'todo', [])

      await storage.deleteTask(task.id)

      const retrieved = await storage.getTaskById(task.id)
      expect(retrieved).toBeNull()
    })

    it('should search tasks', async () => {
      await storage.createTask('Important task', 'Do something important', 'alice', 'todo', [])
      await storage.createTask('Other task', 'Description', 'bob', 'done', [])

      const results = await storage.searchTasks('important')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Important task')
    })
  })

  describe('Watch', () => {
    it('should notify watchers when message is created', async () => {
      const states: any[] = []
      storage.watch(state => {
        states.push(state)
      })

      await storage.createMessage('alice', 'bob', 'Hello!')

      // Wait for async notification
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(states.length).toBeGreaterThan(0)
    })

    it('should allow unwatching', async () => {
      const states: any[] = []
      const unwatch = storage.watch(state => {
        states.push(state)
      })

      unwatch()

      await storage.createMessage('alice', 'bob', 'Hello!')
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should not receive any updates after unwatch
      expect(states).toHaveLength(0)
    })
  })
})

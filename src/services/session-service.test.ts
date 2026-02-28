import { describe, it, expect, beforeEach } from 'vitest'
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js'
import { SessionService } from './session-service.js'

describe('SessionService', () => {
  let storage: MockAgentOfficeStorage
  let service: SessionService

  beforeEach(() => {
    storage = createMockStorage()
    service = new SessionService(storage)
  })

  describe('listCoworkers', () => {
    it('should return empty array when no sessions exist', async () => {
      const coworkers = await service.listCoworkers()
      expect(coworkers).toEqual([])
    })

    it('should return all sessions as coworkers', async () => {
      await storage.createSession('session1', 'id1', 'agent1')
      await new Promise(resolve => setTimeout(resolve, 10)) // Ensure different timestamps
      await storage.createSession('session2', 'id2', 'agent2')

      const coworkers = await service.listCoworkers()
      expect(coworkers).toHaveLength(2)
      expect(coworkers[0].name).toBe('session2') // Most recent first
      expect(coworkers[1].name).toBe('session1')
    })

    it('should include agent and status info', async () => {
      await storage.createSession('session1', 'id1', 'agent1')
      await storage.updateSession('session1', { status: 'busy' })

      const coworkers = await service.listCoworkers()
      expect(coworkers[0].agent).toBe('agent1')
      expect(coworkers[0].status).toBe('busy')
    })
  })

  describe('updateCoworker', () => {
    it('should set status for existing session', async () => {
      await storage.createSession('session1', 'id1', 'agent1')

      const updated = await service.updateCoworker('session1', { status: 'available' })

      expect(updated.status).toBe('available')
      const stored = await storage.getSessionByName('session1')
      expect(stored?.status).toBe('available')
    })

    it('should clear status when null is passed', async () => {
      await storage.createSession('session1', 'id1', 'agent1')
      await storage.updateSession('session1', { status: 'busy' })

      const updated = await service.updateCoworker('session1', { status: null })

      expect(updated.status).toBeNull()
    })

    it('should throw error for non-existent session', async () => {
      await expect(service.updateCoworker('nonexistent', { status: 'available' })).rejects.toThrow(
        'Coworker nonexistent not found'
      )
    })
  })

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await service.createSession('session1', 'id1', 'agent1')

      expect(session.name).toBe('session1')
      expect(session.session_id).toBe('id1')
      expect(session.agent).toBe('agent1')
    })

    it('should throw error when session already exists', async () => {
      await service.createSession('session1', 'id1', 'agent1')

      await expect(service.createSession('session1', 'id2', 'agent2')).rejects.toThrow(
        'Coworker session1 already exists'
      )
    })
  })

  describe('getSessionByName', () => {
    it('should return session by name', async () => {
      await storage.createSession('session1', 'id1', 'agent1')

      const session = await service.getSessionByName('session1')

      expect(session).not.toBeNull()
      expect(session?.name).toBe('session1')
    })

    it('should return null for non-existent session', async () => {
      const session = await service.getSessionByName('nonexistent')
      expect(session).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const session = await storage.createSession('session1', 'id1', 'agent1')

      await service.deleteSession(session.id)

      const stored = await storage.getSessionByName('session1')
      expect(stored).toBeNull()
    })

    it('should not throw when deleting non-existent session', async () => {
      await expect(service.deleteSession(999)).resolves.not.toThrow()
    })
  })
})

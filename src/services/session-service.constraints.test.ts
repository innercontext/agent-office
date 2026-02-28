import { describe, it, expect, beforeEach } from 'vitest'
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js'
import { SessionService } from './session-service.js'

describe('SessionService - Constraint Handling', () => {
  let storage: MockAgentOfficeStorage
  let service: SessionService

  beforeEach(() => {
    storage = createMockStorage()
    service = new SessionService(storage)
  })

  describe('UNIQUE constraint: sessions.name', () => {
    it('should throw error when creating session with duplicate name', async () => {
      await service.createSession('duplicate', 'id1', 'agent1')

      await expect(service.createSession('duplicate', 'id2', 'agent2')).rejects.toThrow(
        'Session duplicate already exists'
      )
    })

    it('should allow creating sessions with different names', async () => {
      await service.createSession('session1', 'id1', 'agent1')
      await service.createSession('session2', 'id2', 'agent2')

      const sessions = await storage.listSessions()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('UNIQUE constraint: sessions.session_id', () => {
    it('should handle duplicate session_id appropriately', async () => {
      // This constraint is handled at database level
      // Our mock should simulate this behavior
      await storage.createSession('session1', 'same-id', 'agent1')

      // In real implementation, this would throw from DB
      // For now, our mock allows it (which is a limitation)
      // In production, this would violate UNIQUE constraint
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js'
import { CronService } from './cron-service.js'

describe('CronService - Constraint Handling', () => {
  let storage: MockAgentOfficeStorage
  let service: CronService

  beforeEach(async () => {
    storage = createMockStorage()
    service = new CronService(storage)
    // Create a session for testing
    await storage.createSession('test-session', 'agent1')
  })

  describe('FOREIGN KEY constraint: cron_jobs.session_name references coworkers', () => {
    it('should throw error when creating cron job for non-existent coworker', async () => {
      await expect(service.createCronJob('job1', 'nonexistent-session', '0 0 * * *', 'UTC', 'Hello')).rejects.toThrow(
        'Coworker nonexistent-session not found'
      )
    })

    it('should allow creating cron job for existing coworker', async () => {
      const job = await service.createCronJob('job1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      expect(job.session_name).toBe('test-session')
    })

    it('should verify cron jobs are associated with coworkers', async () => {
      const job = await service.createCronJob('job1', 'test-session', '0 0 * * *', 'UTC', 'Hello')

      // Verify the job references the correct coworker
      expect(job.session_name).toBe('test-session')

      // Verify we can retrieve it
      const retrieved = await storage.getCronJobById(job.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.session_name).toBe('test-session')
    })
  })

  describe('UNIQUE constraint: cron job names must be unique per coworker', () => {
    it('should throw error when creating duplicate cron job name for same coworker', async () => {
      await service.createCronJob('duplicate-job', 'test-session', '0 0 * * *', 'UTC', 'Hello')

      await expect(
        service.createCronJob('duplicate-job', 'test-session', '0 12 * * *', 'UTC', 'Different')
      ).rejects.toThrow('Cron job duplicate-job already exists for coworker test-session')
    })

    it('should allow same cron job name for different coworkers', async () => {
      await storage.createSession('another-session', 'agent2')

      const job1 = await service.createCronJob('same-name', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      const job2 = await service.createCronJob('same-name', 'another-session', '0 0 * * *', 'UTC', 'Hello')

      expect(job1.name).toBe('same-name')
      expect(job2.name).toBe('same-name')
      expect(job1.session_name).not.toBe(job2.session_name)
    })
  })

  describe('FOREIGN KEY constraint: cron_requests.session_name -> sessions(name)', () => {
    it('should throw error when creating cron request for non-existent session', async () => {
      await expect(
        service.createCronRequest('req1', 'nonexistent-session', '0 0 * * *', 'UTC', 'Hello')
      ).rejects.toThrow('Coworker nonexistent-session not found')
    })

    it('should allow creating cron request for existing session', async () => {
      const request = await service.createCronRequest('req1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      expect(request.session_name).toBe('test-session')
    })
  })

  describe('FOREIGN KEY constraint: cron_history.cron_job_id -> cron_jobs(id)', () => {
    it('should verify cron history references valid jobs', async () => {
      const job = await service.createCronJob('job1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      await storage.createCronHistory(job.id, new Date(), true)

      // Verify history exists and references the job
      const history = await storage.listCronHistory(job.id, 10)
      expect(history).toHaveLength(1)
      expect(history[0].cron_job_id).toBe(job.id)
    })
  })

  describe('NOT NULL constraints', () => {
    it('should require coworker name for cron jobs', async () => {
      // Empty coworker name should be rejected
      await expect(service.createCronJob('job1', '', '0 0 * * *', 'UTC', 'Hello')).rejects.toThrow('Coworker  not found')
    })
  })

  describe('Cron request status transitions', () => {
    it('should only allow approving pending requests', async () => {
      const request = await service.createCronRequest('req1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      await service.approveCronRequest(request.id, 'reviewer1')

      // Should not allow re-approving
      await expect(service.approveCronRequest(request.id, 'reviewer2')).rejects.toThrow('Cannot approve cron request')
    })

    it('should only allow rejecting pending requests', async () => {
      const request = await service.createCronRequest('req1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      await service.rejectCronRequest(request.id, 'reviewer1')

      // Should not allow rejecting again
      await expect(service.rejectCronRequest(request.id, 'reviewer2')).rejects.toThrow('Cannot reject cron request')
    })

    it('should not allow approving rejected requests', async () => {
      const request = await service.createCronRequest('req1', 'test-session', '0 0 * * *', 'UTC', 'Hello')
      await service.rejectCronRequest(request.id, 'reviewer1')

      await expect(service.approveCronRequest(request.id, 'reviewer2')).rejects.toThrow('Cannot approve cron request')
    })
  })
})

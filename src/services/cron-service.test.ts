import { describe, it, expect, beforeEach } from 'vitest';
import { MockAgentOfficeStorage, createMockStorage } from '../db/mock-storage.js';
import { CronService } from './cron-service.js';

describe('CronService', () => {
  let storage: MockAgentOfficeStorage;
  let service: CronService;

  beforeEach(() => {
    storage = createMockStorage();
    service = new CronService(storage);
  });

  describe('listCronJobs', () => {
    it('should return empty array when no cron jobs exist', async () => {
      const jobs = await service.listCronJobs();
      expect(jobs).toEqual([]);
    });

    it('should return all cron jobs sorted by name', async () => {
      // Create a session first (required for cron jobs)
      await storage.createSession('session1', 'id1', 'agent1');
      
      await service.createCronJob('job-b', 'session1', '0 0 * * *', null, 'Message B');
      await service.createCronJob('job-a', 'session1', '0 0 * * *', null, 'Message A');

      const jobs = await service.listCronJobs();
      
      expect(jobs).toHaveLength(2);
      expect(jobs[0].name).toBe('job-a'); // Sorted alphabetically
      expect(jobs[1].name).toBe('job-b');
    });
  });

  describe('listCronJobsForSession', () => {
    it('should return only cron jobs for specified session', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      await storage.createSession('session2', 'id2', 'agent2');
      
      await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Message 1');
      await service.createCronJob('job2', 'session2', '0 0 * * *', null, 'Message 2');

      const jobs = await service.listCronJobsForSession('session1');
      
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('job1');
    });
  });

  describe('createCronJob', () => {
    it('should create a new cron job', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', 'UTC', 'Hello!');
      
      expect(job.name).toBe('job1');
      expect(job.session_name).toBe('session1');
      expect(job.schedule).toBe('0 0 * * *');
      expect(job.timezone).toBe('UTC');
      expect(job.message).toBe('Hello!');
      expect(job.enabled).toBe(true);
    });

    it('should throw error when session does not exist', async () => {
      await expect(
        service.createCronJob('job1', 'nonexistent', '0 0 * * *', null, 'Hello!')
      ).rejects.toThrow('Session nonexistent not found');
    });

    it('should throw error when cron job already exists', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      
      await expect(
        service.createCronJob('job1', 'session1', '0 12 * * *', null, 'Different message')
      ).rejects.toThrow('Cron job job1 already exists for session session1');
    });
  });

  describe('deleteCronJob', () => {
    it('should delete existing cron job', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      
      await service.deleteCronJob(job.id);
      
      const stored = await storage.getCronJobById(job.id);
      expect(stored).toBeNull();
    });

    it('should throw error when cron job does not exist', async () => {
      await expect(service.deleteCronJob(999)).rejects.toThrow('Cron job 999 not found');
    });
  });

  describe('enableCronJob', () => {
    it('should enable disabled cron job', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      await storage.disableCronJob(job.id);
      
      await service.enableCronJob(job.id);
      
      const stored = await storage.getCronJobById(job.id);
      expect(stored?.enabled).toBe(true);
    });

    it('should throw error when cron job does not exist', async () => {
      await expect(service.enableCronJob(999)).rejects.toThrow('Cron job 999 not found');
    });
  });

  describe('disableCronJob', () => {
    it('should disable enabled cron job', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      expect(job.enabled).toBe(true);
      
      await service.disableCronJob(job.id);
      
      const stored = await storage.getCronJobById(job.id);
      expect(stored?.enabled).toBe(false);
    });

    it('should throw error when cron job does not exist', async () => {
      await expect(service.disableCronJob(999)).rejects.toThrow('Cron job 999 not found');
    });
  });

  describe('getCronHistory', () => {
    it('should return empty array when no history exists', async () => {
      const history = await service.getCronHistory(1);
      expect(history).toEqual([]);
    });

    it('should return cron job history sorted by executed_at desc', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      
      await storage.createCronHistory(job.id, new Date('2024-01-01'), true);
      await storage.createCronHistory(job.id, new Date('2024-01-03'), true);
      await storage.createCronHistory(job.id, new Date('2024-01-02'), false, 'Error message');

      const history = await service.getCronHistory(job.id, 10);
      
      expect(history).toHaveLength(3);
      expect(history[0].executed_at.toISOString()).toContain('2024-01-03');
      expect(history[1].executed_at.toISOString()).toContain('2024-01-02');
      expect(history[2].executed_at.toISOString()).toContain('2024-01-01');
    });

    it('should respect limit parameter', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      const job = await service.createCronJob('job1', 'session1', '0 0 * * *', null, 'Hello!');
      
      await storage.createCronHistory(job.id, new Date(), true);
      await storage.createCronHistory(job.id, new Date(), true);
      await storage.createCronHistory(job.id, new Date(), true);

      const history = await service.getCronHistory(job.id, 2);
      
      expect(history).toHaveLength(2);
    });
  });

  describe('listCronRequests', () => {
    it('should return empty array when no requests exist', async () => {
      const requests = await service.listCronRequests();
      expect(requests).toEqual([]);
    });

    it('should return all cron requests sorted by requested_at desc', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      
      await service.createCronRequest('req1', 'session1', '0 0 * * *', null, 'Message 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createCronRequest('req2', 'session1', '0 12 * * *', null, 'Message 2');

      const requests = await service.listCronRequests();
      
      expect(requests).toHaveLength(2);
      expect(requests[0].name).toBe('req2'); // Most recent first
      expect(requests[1].name).toBe('req1');
    });

    it('should filter by status', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      
      const req1 = await service.createCronRequest('req1', 'session1', '0 0 * * *', null, 'Message 1');
      await storage.updateCronRequestStatus(req1.id, 'approved', 'reviewer1');
      await service.createCronRequest('req2', 'session1', '0 12 * * *', null, 'Message 2');

      const pendingRequests = await service.listCronRequests({ status: 'pending' });
      
      expect(pendingRequests).toHaveLength(1);
      expect(pendingRequests[0].name).toBe('req2');
    });

    it('should filter by sessionName', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      await storage.createSession('session2', 'id2', 'agent2');
      
      await service.createCronRequest('req1', 'session1', '0 0 * * *', null, 'Message 1');
      await service.createCronRequest('req2', 'session2', '0 12 * * *', null, 'Message 2');

      const session1Requests = await service.listCronRequests({ sessionName: 'session1' });
      
      expect(session1Requests).toHaveLength(1);
      expect(session1Requests[0].name).toBe('req1');
    });
  });

  describe('createCronRequest', () => {
    it('should create a new cron request with pending status', async () => {
      await storage.createSession('session1', 'id1', 'agent1');
      
      const request = await service.createCronRequest('req1', 'session1', '0 0 * * *', 'UTC', 'Hello!');
      
      expect(request.name).toBe('req1');
      expect(request.session_name).toBe('session1');
      expect(request.schedule).toBe('0 0 * * *');
      expect(request.timezone).toBe('UTC');
      expect(request.message).toBe('Hello!');
      expect(request.status).toBe('pending');
    });

    it('should throw error when session does not exist', async () => {
      await expect(
        service.createCronRequest('req1', 'nonexistent', '0 0 * * *', null, 'Hello!')
      ).rejects.toThrow('Session nonexistent not found');
    });
  });

  describe('checkCronJob', () => {
    beforeEach(async () => {
      await storage.createSession('session1', 'id1', 'agent1');
    });

    it('should return true when cron job should run this minute', async () => {
      // Create a job that runs every minute
      const job = await service.createCronJob('job1', 'session1', '* * * * *', null, 'Hello!');
      
      const shouldRun = await service.checkCronJob(job.id);
      
      expect(shouldRun).toBe(true);
    });

    it('should return false when cron job should not run this minute', async () => {
      // Create a job that runs at a specific time (e.g., 3 AM)
      const job = await service.createCronJob('job1', 'session1', '0 3 * * *', null, 'Hello!');
      
      const shouldRun = await service.checkCronJob(job.id);
      
      expect(shouldRun).toBe(false);
    });

    it('should return false when cron job is disabled', async () => {
      const job = await service.createCronJob('job1', 'session1', '* * * * *', null, 'Hello!');
      await storage.disableCronJob(job.id);
      
      const shouldRun = await service.checkCronJob(job.id);
      
      expect(shouldRun).toBe(false);
    });

    it('should throw error when cron job does not exist', async () => {
      await expect(service.checkCronJob(999)).rejects.toThrow('Cron job 999 not found');
    });

    it('should check at specific reference date', async () => {
      // Create a job that runs at 3 AM
      const job = await service.createCronJob('job1', 'session1', '0 3 * * *', null, 'Hello!');
      
      // Check at 3:00 AM - should match
      const at3AM = new Date('2024-01-15T03:00:00');
      const shouldRunAt3AM = await service.checkCronJob(job.id, at3AM);
      expect(shouldRunAt3AM).toBe(true);
      
      // Check at 4:00 AM - should not match
      const at4AM = new Date('2024-01-15T04:00:00');
      const shouldRunAt4AM = await service.checkCronJob(job.id, at4AM);
      expect(shouldRunAt4AM).toBe(false);
    });
  });
});

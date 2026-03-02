import { Cron } from 'croner'
import { AgentOfficeStorage, CronJobRow, CronRequestRow, CronHistoryRow } from '../db/index.js'

export interface CronJobInfo {
  id: number
  name: string
  session_name: string
  schedule: string
  timezone: string | null
  message: string
  enabled: boolean
  created_at: Date
  last_run: Date | null
}

export interface CronRequestInfo {
  id: number
  name: string
  session_name: string
  schedule: string
  timezone: string | null
  message: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: Date
}

export class CronService {
  constructor(private storage: AgentOfficeStorage) {}

  async listCronJobs(): Promise<CronJobInfo[]> {
    const jobs = await this.storage.listCronJobs()
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      session_name: job.session_name,
      schedule: job.schedule,
      timezone: job.timezone,
      message: job.message,
      enabled: job.enabled,
      created_at: job.created_at,
      last_run: job.last_run,
    }))
  }

  async listCronJobsForSession(coworkerName: string): Promise<CronJobInfo[]> {
    const jobs = await this.storage.listCronJobsForSession(coworkerName)
    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      session_name: job.session_name,
      schedule: job.schedule,
      timezone: job.timezone,
      message: job.message,
      enabled: job.enabled,
      created_at: job.created_at,
      last_run: job.last_run,
    }))
  }

  async getCronJobById(id: number): Promise<CronJobRow | null> {
    return this.storage.getCronJobById(id)
  }

  async createCronJob(
    name: string,
    coworkerName: string,
    schedule: string,
    timezone: string,
    message: string
  ): Promise<CronJobRow> {
    // Verify coworker exists
    const coworker = await this.storage.getSessionByName(coworkerName)
    if (!coworker) {
      throw new Error(`Coworker ${coworkerName} not found`)
    }

    // Check if cron job already exists
    const exists = await this.storage.cronJobExistsForSession(name, coworkerName)
    if (exists) {
      throw new Error(`Cron job ${name} already exists for coworker ${coworkerName}`)
    }

    return this.storage.createCronJob(name, coworkerName, schedule, timezone, message)
  }

  async deleteCronJob(id: number): Promise<void> {
    const job = await this.storage.getCronJobById(id)
    if (!job) {
      throw new Error(`Cron job ${id} not found`)
    }
    await this.storage.deleteCronJob(id)
  }

  async enableCronJob(id: number): Promise<void> {
    const job = await this.storage.getCronJobById(id)
    if (!job) {
      throw new Error(`Cron job ${id} not found`)
    }
    await this.storage.enableCronJob(id)
  }

  async disableCronJob(id: number): Promise<void> {
    const job = await this.storage.getCronJobById(id)
    if (!job) {
      throw new Error(`Cron job ${id} not found`)
    }
    await this.storage.disableCronJob(id)
  }

  async getCronHistory(cronJobId: number, limit: number = 10): Promise<CronHistoryRow[]> {
    return this.storage.listCronHistory(cronJobId, limit)
  }

  async listCronRequests(filters?: { status?: string; coworkerName?: string }): Promise<CronRequestInfo[]> {
    // Map coworkerName filter to sessionName for storage layer
    const storageFilters = filters?.coworkerName ? { ...filters, sessionName: filters.coworkerName } : filters
    const requests = await this.storage.listCronRequests(storageFilters)
    return requests.map(request => ({
      id: request.id,
      name: request.name,
      session_name: request.session_name,
      schedule: request.schedule,
      timezone: request.timezone,
      message: request.message,
      status: request.status,
      requested_at: request.requested_at,
    }))
  }

  async createCronRequest(
    name: string,
    coworkerName: string,
    schedule: string,
    timezone: string,
    message: string
  ): Promise<CronRequestRow> {
    // Verify coworker exists
    const coworker = await this.storage.getSessionByName(coworkerName)
    if (!coworker) {
      throw new Error(`Coworker ${coworkerName} not found`)
    }

    return this.storage.createCronRequest(name, coworkerName, schedule, timezone, message)
  }

  async getCronRequestById(id: number): Promise<CronRequestRow | null> {
    return this.storage.getCronRequestById(id)
  }

  async approveCronRequest(id: number, reviewedBy: string, reviewerNotes?: string): Promise<CronRequestRow> {
    const request = await this.storage.getCronRequestById(id)
    if (!request) {
      throw new Error(`Cron request ${id} not found`)
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot approve cron request ${id}: status is ${request.status}, expected pending`)
    }
    const updated = await this.storage.updateCronRequestStatus(id, 'approved', reviewedBy, reviewerNotes)
    if (!updated) {
      throw new Error(`Failed to approve cron request ${id}`)
    }
    return updated
  }

  async rejectCronRequest(id: number, reviewedBy: string, reviewerNotes?: string): Promise<CronRequestRow> {
    const request = await this.storage.getCronRequestById(id)
    if (!request) {
      throw new Error(`Cron request ${id} not found`)
    }
    if (request.status !== 'pending') {
      throw new Error(`Cannot reject cron request ${id}: status is ${request.status}, expected pending`)
    }
    const updated = await this.storage.updateCronRequestStatus(id, 'rejected', reviewedBy, reviewerNotes)
    if (!updated) {
      throw new Error(`Failed to reject cron request ${id}`)
    }
    return updated
  }

  async deleteCronRequest(id: number): Promise<void> {
    const request = await this.storage.getCronRequestById(id)
    if (!request) {
      throw new Error(`Cron request ${id} not found`)
    }
    await this.storage.deleteCronRequest(id)
  }

  async checkCronJob(cronJobId: number, referenceDate: Date = new Date()): Promise<boolean> {
    const job = await this.storage.getCronJobById(cronJobId)
    if (!job) {
      throw new Error(`Cron job ${cronJobId} not found`)
    }

    if (!job.enabled) {
      return false
    }

    try {
      // Create Cron instance with timezone if specified
      const cronOptions = job.timezone ? { timezone: job.timezone } : undefined
      const cron = new Cron(job.schedule, cronOptions)

      // Check if the schedule matches the current minute
      // We truncate seconds to match by minute
      const checkDate = new Date(referenceDate)
      checkDate.setSeconds(0, 0)

      return cron.match(checkDate)
    } catch (error) {
      throw new Error(`Invalid cron schedule "${job.schedule}": ${error}`)
    }
  }

  async getActiveCronJobs(referenceDate: Date = new Date()): Promise<CronJobRow[]> {
    const allJobs = await this.storage.listCronJobs()
    const activeJobs: CronJobRow[] = []

    for (const job of allJobs) {
      if (!job.enabled) {
        continue
      }

      try {
        const cronOptions = job.timezone ? { timezone: job.timezone } : undefined
        const cron = new Cron(job.schedule, cronOptions)
        const checkDate = new Date(referenceDate)
        checkDate.setSeconds(0, 0)

        if (cron.match(checkDate)) {
          activeJobs.push(job)
        }
      } catch (error) {
        // Skip invalid cron schedules
        continue
      }
    }

    return activeJobs
  }
}

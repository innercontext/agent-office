import { parseCronExpression } from "cron-schedule"
import { AgentOfficeStorage, CronJobRow, CronRequestRow, CronHistoryRow } from "../db/index.js"

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
  status: "pending" | "approved" | "rejected"
  requested_at: Date
}

export class CronService {
  constructor(private storage: AgentOfficeStorage) {}

  async listCronJobs(): Promise<CronJobInfo[]> {
    const jobs = await this.storage.listCronJobs()
    return jobs.map((job) => ({
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

  async listCronJobsForSession(sessionName: string): Promise<CronJobInfo[]> {
    const jobs = await this.storage.listCronJobsForSession(sessionName)
    return jobs.map((job) => ({
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
    sessionName: string,
    schedule: string,
    timezone: string | null,
    message: string
  ): Promise<CronJobRow> {
    // Verify session exists
    const session = await this.storage.getSessionByName(sessionName)
    if (!session) {
      throw new Error(`Session ${sessionName} not found`)
    }

    // Check if cron job already exists
    const exists = await this.storage.cronJobExistsForSession(name, sessionName)
    if (exists) {
      throw new Error(`Cron job ${name} already exists for session ${sessionName}`)
    }

    return this.storage.createCronJob(name, sessionName, schedule, timezone, message)
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

  async listCronRequests(filters?: { status?: string; sessionName?: string }): Promise<CronRequestInfo[]> {
    const requests = await this.storage.listCronRequests(filters)
    return requests.map((request) => ({
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
    sessionName: string,
    schedule: string,
    timezone: string | null,
    message: string
  ): Promise<CronRequestRow> {
    // Verify session exists
    const session = await this.storage.getSessionByName(sessionName)
    if (!session) {
      throw new Error(`Session ${sessionName} not found`)
    }

    return this.storage.createCronRequest(name, sessionName, schedule, timezone, message)
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
      const cron = parseCronExpression(job.schedule)
      
      // Check if the schedule matches the current minute
      // We truncate seconds to match by minute
      const checkDate = new Date(referenceDate)
      checkDate.setSeconds(0, 0)
      
      return cron.matchDate(checkDate)
    } catch (error) {
      throw new Error(`Invalid cron schedule "${job.schedule}": ${error}`)
    }
  }
}

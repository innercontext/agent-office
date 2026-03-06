import { AgentOfficeStorage } from '../db/index.js'
import { CronService } from '../services/index.js'

export async function listCrons(storage: AgentOfficeStorage, coworkerName: string): Promise<unknown> {
  const service = new CronService(storage)
  return await service.listCronJobsForSession(coworkerName)
}

export async function deleteCron(storage: AgentOfficeStorage, id: number): Promise<void> {
  const service = new CronService(storage)
  await service.deleteCronJob(id)
}

export async function enableCron(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new CronService(storage)
  await service.enableCronJob(id)
  return await service.getCronJobById(id)
}

export async function disableCron(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new CronService(storage)
  await service.disableCronJob(id)
  return await service.getCronJobById(id)
}

export async function cronHistory(storage: AgentOfficeStorage, id: number, limit: number): Promise<unknown> {
  const service = new CronService(storage)
  return await service.getCronHistory(id, limit)
}

export async function requestCron(
  storage: AgentOfficeStorage,
  name: string,
  coworkerName: string,
  schedule: string,
  message: string,
  timezone: string
): Promise<unknown> {
  const service = new CronService(storage)
  return await service.createCronRequest(name, coworkerName, schedule, timezone, message)
}

export async function createCron(
  storage: AgentOfficeStorage,
  name: string,
  coworkerName: string,
  schedule: string,
  message: string,
  timezone: string
): Promise<unknown> {
  const service = new CronService(storage)
  return await service.createCronJob(name, coworkerName, schedule, timezone, message)
}

export async function checkCronJobs(storage: AgentOfficeStorage, coworkerName: string): Promise<unknown> {
  const service = new CronService(storage)
  const activeJobs = await service.getActiveCronJobs()

  // Filter by coworker
  const coworkerJobs = activeJobs.filter(job => job.session_name === coworkerName)

  // Return count similar to check-unread-messages
  return {
    hasActive: coworkerJobs.length > 0,
    count: coworkerJobs.length,
  }
}

export async function listActiveCronJobs(storage: AgentOfficeStorage, coworkerName: string): Promise<unknown> {
  const service = new CronService(storage)
  let activeJobs = await service.getActiveCronJobs()

  // Filter by coworker
  activeJobs = activeJobs.filter(job => job.session_name === coworkerName)

  // Map to return id, action (message), and timezone
  return activeJobs.map(job => ({
    id: job.id,
    action: job.message,
    timezone: job.timezone,
  }))
}

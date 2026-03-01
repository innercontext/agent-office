import { AgentOfficeStorage } from '../db/index.js'
import { CronService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function listCrons(storage: AgentOfficeStorage, coworkerName: string, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const crons = await service.listCronJobsForSession(coworkerName)
  console.log(formatOutput(crons, useJson))
}

export async function deleteCron(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  await service.deleteCronJob(id)
  console.log(formatOutput({ success: true, deleted: id }, useJson))
}

export async function enableCron(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  await service.enableCronJob(id)
  const job = await service.getCronJobById(id)
  console.log(formatOutput(job, useJson))
}

export async function disableCron(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  await service.disableCronJob(id)
  const job = await service.getCronJobById(id)
  console.log(formatOutput(job, useJson))
}

export async function cronHistory(
  storage: AgentOfficeStorage,
  id: number,
  limit: number,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const history = await service.getCronHistory(id, limit)
  console.log(formatOutput(history, useJson))
}

export async function requestCron(
  storage: AgentOfficeStorage,
  name: string,
  coworkerName: string,
  schedule: string,
  message: string,
  timezone: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const request = await service.createCronRequest(name, coworkerName, schedule, timezone ?? null, message)
  console.log(formatOutput(request, useJson))
}

export async function createCron(
  storage: AgentOfficeStorage,
  name: string,
  coworkerName: string,
  schedule: string,
  message: string,
  timezone: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const job = await service.createCronJob(name, coworkerName, schedule, timezone ?? null, message)
  console.log(formatOutput(job, useJson))
}

export async function checkCronJobs(
  storage: AgentOfficeStorage,
  coworkerName: string,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const activeJobs = await service.getActiveCronJobs()

  // Filter by coworker
  const coworkerJobs = activeJobs.filter(job => job.session_name === coworkerName)

  // Return count similar to check-unread-messages
  const result = {
    hasActive: coworkerJobs.length > 0,
    count: coworkerJobs.length,
  }

  console.log(formatOutput(result, useJson))
}

export async function listActiveCronJobs(
  storage: AgentOfficeStorage,
  coworkerName: string,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  let activeJobs = await service.getActiveCronJobs()

  // Filter by coworker
  activeJobs = activeJobs.filter(job => job.session_name === coworkerName)

  console.log(formatOutput(activeJobs, useJson))
}

import { AgentOfficeStorage } from '../db/index.js'
import { CronService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function listCrons(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const crons = await service.listCronJobs()
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

export async function listCronRequests(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const requests = await service.listCronRequests()
  console.log(formatOutput(requests, useJson))
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

export async function checkCronJob(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const shouldRun = await service.checkCronJob(id)
  console.log(formatOutput({ shouldRun }, useJson))
}

export async function getCronRequest(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const request = await service.getCronRequestById(id)
  if (!request) {
    throw new Error(`Cron request ${id} not found`)
  }
  console.log(formatOutput(request, useJson))
}

export async function approveCronRequest(
  storage: AgentOfficeStorage,
  id: number,
  reviewedBy: string,
  reviewerNotes: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const request = await service.approveCronRequest(id, reviewedBy, reviewerNotes)
  console.log(formatOutput(request, useJson))
}

export async function rejectCronRequest(
  storage: AgentOfficeStorage,
  id: number,
  reviewedBy: string,
  reviewerNotes: string | undefined,
  useJson: boolean
): Promise<void> {
  const service = new CronService(storage)
  const request = await service.rejectCronRequest(id, reviewedBy, reviewerNotes)
  console.log(formatOutput(request, useJson))
}

export async function deleteCronRequest(storage: AgentOfficeStorage, id: number, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  await service.deleteCronRequest(id)
  console.log(formatOutput({ success: true, deleted: id }, useJson))
}

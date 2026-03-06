import { AgentOfficeStorage } from '../db/index.js'
import { CronService } from '../services/index.js'

export async function listCronRequests(storage: AgentOfficeStorage): Promise<unknown> {
  const service = new CronService(storage)
  return await service.listCronRequests()
}

export async function getCronRequest(storage: AgentOfficeStorage, id: number): Promise<unknown> {
  const service = new CronService(storage)
  const request = await service.getCronRequestById(id)
  if (!request) {
    throw new Error(`Cron request ${id} not found`)
  }
  return request
}

export async function approveCronRequest(
  storage: AgentOfficeStorage,
  id: number,
  reviewedBy: string,
  reviewerNotes: string | undefined
): Promise<unknown> {
  const service = new CronService(storage)
  return await service.approveCronRequest(id, reviewedBy, reviewerNotes)
}

export async function rejectCronRequest(
  storage: AgentOfficeStorage,
  id: number,
  reviewedBy: string,
  reviewerNotes: string | undefined
): Promise<unknown> {
  const service = new CronService(storage)
  return await service.rejectCronRequest(id, reviewedBy, reviewerNotes)
}

export async function deleteCronRequest(storage: AgentOfficeStorage, id: number): Promise<void> {
  const service = new CronService(storage)
  await service.deleteCronRequest(id)
}

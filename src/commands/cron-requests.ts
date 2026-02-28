import { AgentOfficeStorage } from '../db/index.js'
import { CronService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function listCronRequests(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new CronService(storage)
  const requests = await service.listCronRequests()
  console.log(formatOutput(requests, useJson))
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

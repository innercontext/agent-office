import { AgentOfficeStorage } from '../db/index.js'
import { SessionService } from '../services/index.js'
import { formatOutput } from '../lib/output.js'

export async function listCoworkers(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const coworkers = await service.listCoworkers()
  console.log(formatOutput(coworkers, useJson))
}

export async function getCoworkerInfo(storage: AgentOfficeStorage, name: string, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const coworker = await service.getCoworkerInfo(name)
  console.log(formatOutput(coworker, useJson))
}

export async function updateCoworker(
  storage: AgentOfficeStorage,
  name: string,
  updates: {
    type?: string | null
    status?: string | null
    description?: string | null
    philosophy?: string | null
    visualDescription?: string | null
  },
  useJson: boolean
): Promise<void> {
  const service = new SessionService(storage)
  const session = await service.updateCoworker(name, {
    ...(updates.type !== undefined && updates.type !== null ? { agent: updates.type } : {}),
    status: updates.status,
    description: updates.description,
    philosophy: updates.philosophy,
    visual_description: updates.visualDescription,
  })
  console.log(formatOutput(session, useJson))
}

export async function createSession(
  storage: AgentOfficeStorage,
  name: string,
  type: string,
  useJson: boolean
): Promise<void> {
  const service = new SessionService(storage)
  const session = await service.createSession(name, name, type)
  console.log(formatOutput(session, useJson))
}

export async function deleteCoworker(storage: AgentOfficeStorage, name: string, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const session = await service.getSessionByName(name)
  if (!session) {
    throw new Error(`Coworker ${name} not found`)
  }

  await storage.begin(async tx => {
    // Delete all messages to/from this coworker
    await tx.deleteMessagesForCoworker(name)

    // Delete all cron jobs for this coworker
    const cronJobs = await tx.listCronJobsForSession(name)
    for (const job of cronJobs) {
      await tx.deleteCronJob(job.id)
    }

    // Delete all cron requests for this coworker
    const cronRequests = await tx.listCronRequests({ sessionName: name })
    for (const request of cronRequests) {
      await tx.deleteCronRequest(request.id)
    }

    // Unassign all tasks assigned to this coworker
    const tasks = await tx.searchTasks('', { assignee: name })
    for (const task of tasks) {
      await tx.updateTask(task.id, { assignee: null })
    }

    // Finally, delete the coworker session
    await tx.deleteSession(session.id)
  })

  console.log(formatOutput({ success: true, message: `Coworker ${name} deleted` }, useJson))
}

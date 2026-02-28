import { AgentOfficeStorage } from "../db/index.js"
import { SessionService } from "../services/index.js"
import { formatOutput } from "../lib/output.js"

export async function listCoworkers(storage: AgentOfficeStorage, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const coworkers = await service.listCoworkers()
  console.log(formatOutput(coworkers, useJson))
}

export async function setStatus(storage: AgentOfficeStorage, name: string, status: string | null, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const session = await service.setStatus(name, status)
  console.log(formatOutput(session, useJson))
}

export async function createSession(storage: AgentOfficeStorage, name: string, sessionId: string, agent: string, useJson: boolean): Promise<void> {
  const service = new SessionService(storage)
  const session = await service.createSession(name, sessionId, agent)
  console.log(formatOutput(session, useJson))
}

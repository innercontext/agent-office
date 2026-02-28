import { AgentOfficeStorage, SessionRow } from '../db/index.js'

export interface CoworkerInfo {
  name: string
  coworkerType: string | null
  status: string | null
  description: string | null
  philosophy: string | null
  visual_description: string | null
  created_at: Date
}

export class SessionService {
  constructor(private storage: AgentOfficeStorage) {}

  async listCoworkers(): Promise<CoworkerInfo[]> {
    const sessions = await this.storage.listSessions()
    return sessions.map(session => ({
      name: session.name,
      coworkerType: session.coworkerType,
      status: session.status,
      description: session.description,
      philosophy: session.philosophy,
      visual_description: session.visual_description,
      created_at: session.created_at,
    }))
  }

  async getCoworkerInfo(name: string): Promise<CoworkerInfo> {
    const session = await this.storage.getSessionByName(name)
    if (!session) {
      throw new Error(`Coworker ${name} not found`)
    }
    return {
      name: session.name,
      coworkerType: session.coworkerType,
      status: session.status,
      description: session.description,
      philosophy: session.philosophy,
      visual_description: session.visual_description,
      created_at: session.created_at,
    }
  }

  async updateCoworker(
    name: string,
    updates: {
      coworkerType?: string
      status?: string | null
      description?: string | null
      philosophy?: string | null
      visual_description?: string | null
    }
  ): Promise<SessionRow> {
    const session = await this.storage.getSessionByName(name)
    if (!session) {
      throw new Error(`Coworker ${name} not found`)
    }
    const updated = await this.storage.updateSession(name, updates)
    return updated!
  }

  async createSession(name: string, coworkerType: string): Promise<SessionRow> {
    const exists = await this.storage.sessionExists(name)
    if (exists) {
      throw new Error(`Coworker ${name} already exists`)
    }
    return this.storage.createSession(name, coworkerType)
  }

  async getSessionByName(name: string): Promise<SessionRow | null> {
    return this.storage.getSessionByName(name)
  }

  async deleteSession(id: number): Promise<void> {
    await this.storage.deleteSession(id)
  }
}

import { AgentOfficeStorage, SessionRow } from "../db/index.js"

export interface CoworkerInfo {
  name: string
  agent: string
  status: string | null
  created_at: Date
}

export class SessionService {
  constructor(private storage: AgentOfficeStorage) {}

  async listCoworkers(): Promise<CoworkerInfo[]> {
    const sessions = await this.storage.listSessions()
    return sessions.map((session) => ({
      name: session.name,
      agent: session.agent,
      status: session.status,
      created_at: session.created_at,
    }))
  }

  async setStatus(name: string, status: string | null): Promise<SessionRow> {
    const session = await this.storage.getSessionByName(name)
    if (!session) {
      throw new Error(`Session ${name} not found`)
    }
    await this.storage.updateSessionStatus(name, status)
    return {
      ...session,
      status,
    }
  }

  async createSession(name: string, sessionId: string, agent: string): Promise<SessionRow> {
    const exists = await this.storage.sessionExists(name)
    if (exists) {
      throw new Error(`Session ${name} already exists`)
    }
    return this.storage.createSession(name, sessionId, agent)
  }

  async getSessionByName(name: string): Promise<SessionRow | null> {
    return this.storage.getSessionByName(name)
  }

  async deleteSession(id: number): Promise<void> {
    await this.storage.deleteSession(id)
  }
}

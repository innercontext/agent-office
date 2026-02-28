import type { SessionRow, ConfigRow, MessageRow, CronJobRow, CronHistoryRow, CronRequestRow, TaskRow } from "./types.js"

export type { SessionRow, ConfigRow, MessageRow, CronJobRow, CronHistoryRow, CronRequestRow, TaskRow }

export interface SenderInfo {
  lastSent: string // ISO time string
}

export type WatchState = {
  [agentName: string]: {
    [senderName: string]: SenderInfo
  }
}

export type WatchListener = (state: WatchState) => void

/**
 * Interface for all database storage operations in Agent Office.
 * Implementations can use PostgreSQL, SQLite, or other backends.
 */
export interface AgentOfficeStorage {
  // Connection/Transaction
  close(): Promise<void>
  begin<T>(callback: (tx: AgentOfficeStorage) => Promise<T>): Promise<T>

  // Watch
  watch(listener: WatchListener): () => void

  // Sessions
  listSessions(): Promise<SessionRow[]>
  getSessionByName(name: string): Promise<SessionRow | null>
  getSessionIdByName(name: string): Promise<number | null>
  createSession(name: string, sessionId: string, agent: string): Promise<SessionRow>
  deleteSession(id: number): Promise<void>
  updateSessionAgent(name: string, agent: string): Promise<SessionRow>
  updateSessionStatus(name: string, status: string | null): Promise<void>
  updateSessionId(name: string, sessionId: string): Promise<void>
  sessionExists(name: string): Promise<boolean>

  // Config
  getAllConfig(): Promise<ConfigRow[]>
  getConfig(key: string): Promise<string | null>
  setConfig(key: string, value: string): Promise<void>

  // Messages
  listMessagesForRecipient(name: string, filters?: {unread?: boolean, olderThanHours?: number, notified?: boolean}): Promise<MessageRow[]>
  listMessagesFromSender(name: string): Promise<MessageRow[]>
  countUnreadBySender(recipientName: string): Promise<Map<string, number>>
  lastMessageAtByCoworker(humanName: string): Promise<Map<string, Date>>
  createMessage(from: string, to: string, body: string): Promise<MessageRow>
  markMessageAsRead(id: number): Promise<MessageRow | null>
  markMessageAsInjected(id: number): Promise<void>
  markMessagesAsNotified(ids: number[]): Promise<void>

  // Cron Jobs
  listCronJobs(): Promise<CronJobRow[]>
  listCronJobsForSession(sessionName: string): Promise<CronJobRow[]>
  getCronJobById(id: number): Promise<CronJobRow | null>
  getCronJobByNameAndSession(name: string, sessionName: string): Promise<CronJobRow | null>
  createCronJob(
    name: string,
    sessionName: string,
    schedule: string,
    timezone: string | null,
    message: string,
  ): Promise<CronJobRow>
  deleteCronJob(id: number): Promise<void>
  enableCronJob(id: number): Promise<void>
  disableCronJob(id: number): Promise<void>
  updateCronJobLastRun(id: number, lastRun: Date): Promise<void>
  cronJobExistsForSession(name: string, sessionName: string): Promise<boolean>

  // Cron History
  listCronHistory(cronJobId: number, limit: number): Promise<CronHistoryRow[]>
  createCronHistory(cronJobId: number, executedAt: Date, success: boolean, errorMessage?: string): Promise<void>

  // Cron Requests
  listCronRequests(filters?: { status?: string; sessionName?: string }): Promise<CronRequestRow[]>
  getCronRequestById(id: number): Promise<CronRequestRow | null>
  createCronRequest(name: string, sessionName: string, schedule: string, timezone: string | null, message: string): Promise<CronRequestRow>
  updateCronRequestStatus(id: number, status: "approved" | "rejected", reviewedBy: string, reviewerNotes?: string): Promise<CronRequestRow | null>
  deleteCronRequest(id: number): Promise<void>

  // Tasks
  listTasks(): Promise<TaskRow[]>
  getTaskById(id: number): Promise<TaskRow | null>
  createTask(title: string, description: string, assignee: string | null, column: string, dependencies: number[]): Promise<TaskRow>
  updateTask(id: number, updates: Partial<Pick<TaskRow, 'title' | 'description' | 'assignee' | 'column' | 'dependencies'>>): Promise<TaskRow | null>
  deleteTask(id: number): Promise<void>
  searchTasks(query: string, filters?: { assignee?: string; column?: string }): Promise<TaskRow[]>

  // Migrations
  runMigrations(): Promise<void>
}

import { AgentOfficeStorage } from '../db/index.js'
import { MessageService } from '../services/index.js'

export async function sendMessage(
  storage: AgentOfficeStorage,
  from: string,
  recipients: string[],
  body: string
): Promise<unknown> {
  const service = new MessageService(storage)
  return await service.sendMessage(from, recipients, body)
}

export async function checkUnreadMail(storage: AgentOfficeStorage, coworkerName: string): Promise<unknown> {
  const service = new MessageService(storage)
  const unreadCounts = await service.countUnreadBySender(coworkerName)

  // Convert Map to object for JSON serialization
  const counts: Record<string, number> = {}
  let totalUnread = 0
  for (const [sender, count] of unreadCounts) {
    if (count > 0) {
      counts[sender] = count
      totalUnread += count
    }
  }

  // Unix philosophy: return 0 on success, include both backward-compatible hasUnread and new counts
  return {
    hasUnread: totalUnread > 0,
    total: totalUnread,
    counts: counts,
  }
}

export async function getUnreadMail(storage: AgentOfficeStorage, coworkerName: string): Promise<unknown> {
  const service = new MessageService(storage)
  return await service.getUnreadMail(coworkerName)
}

export async function listMessagesBetween(
  storage: AgentOfficeStorage,
  coworker1: string,
  coworker2: string,
  startTimeIso: string | undefined,
  endTimeIso: string | undefined
): Promise<unknown> {
  const service = new MessageService(storage)
  const startTime = startTimeIso ? new Date(startTimeIso) : undefined
  const endTime = endTimeIso ? new Date(endTimeIso) : undefined
  return await service.listMessagesBetween(coworker1, coworker2, startTime, endTime)
}

export async function listMessagesToNotify(
  storage: AgentOfficeStorage,
  coworkerName: string,
  hours: number
): Promise<unknown> {
  return await storage.listMessagesForRecipient(coworkerName, {
    unread: true,
    olderThanHours: hours,
    notified: false,
  })
}

export async function markMessagesAsNotified(storage: AgentOfficeStorage, ids: number[]): Promise<void> {
  await storage.markMessagesAsNotified(ids)
}
